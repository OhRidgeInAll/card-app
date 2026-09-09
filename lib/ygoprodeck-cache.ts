import fs from 'fs';
import path from 'path';
import { db } from './db';
import { normalizeYgoCard, searchCards, resolveCardByName, USER_AGENT, type YgoResolvedCard } from './ygoprodeck';
import { normalizeCardName, levenshtein } from './card-name-matching';

export interface YgoCacheMeta {
  last_refreshed_at: string | null;
  source_updated_at: string | null;
  rows_loaded: number | null;
  row_errors: number | null;
  status: 'ok' | 'error' | null;
  error_message: string | null;
}

export type YgoCacheResolveOutcome =
  | { status: 'found'; card: YgoResolvedCard; source: 'cache' | 'live' }
  | { status: 'not_found'; source: 'live' }
  | { status: 'error'; source: 'live' };

export interface YgoRefreshResult {
  rows_loaded: number;
  row_errors: number;
  source_updated_at: string;
  last_refreshed_at: string;
}

interface YgoCacheRow {
  id: string;
  name: string;
  normalized_name: string;
  set_code: string | null;
  image_url: string | null;
  attributes: string;
  updated_at: string;
}

const BASE_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

function rowToCard(row: YgoCacheRow): YgoResolvedCard {
  return {
    external_id: row.id,
    name: row.name,
    set_code: row.set_code ?? '',
    image_url: row.image_url,
    attributes: JSON.parse(row.attributes),
  };
}

function cacheHasData(): boolean {
  return db.prepare(`SELECT 1 FROM ygoprodeck_cache LIMIT 1`).get() !== undefined;
}

export function getYgoCacheMeta(): YgoCacheMeta | null {
  return (db.prepare(`SELECT * FROM ygoprodeck_cache_meta WHERE id = 1`).get() as YgoCacheMeta | undefined) ?? null;
}

/** Typeahead search: cache-first, live only as a bootstrap fallback before the cache has ever been populated. */
export async function ygoCacheSearch(query: string): Promise<YgoResolvedCard[]> {
  if (!cacheHasData()) {
    return searchCards(query);
  }

  const normalized = normalizeCardName(query);
  const rows = db
    .prepare(`SELECT * FROM ygoprodeck_cache WHERE normalized_name LIKE '%' || ? || '%' ORDER BY name ASC LIMIT 20`)
    .all(normalized) as YgoCacheRow[];

  return rows.map(rowToCard);
}

function upsertCacheRow(card: YgoResolvedCard): void {
  db.prepare(
    `INSERT INTO ygoprodeck_cache (id, name, normalized_name, set_code, image_url, attributes, updated_at)
     VALUES (@id, @name, @normalized_name, @set_code, @image_url, @attributes, @updated_at)
     ON CONFLICT (id) DO UPDATE SET
       name = excluded.name,
       normalized_name = excluded.normalized_name,
       set_code = excluded.set_code,
       image_url = excluded.image_url,
       attributes = excluded.attributes,
       updated_at = excluded.updated_at`
  ).run({
    id: card.external_id,
    name: card.name,
    normalized_name: normalizeCardName(card.name),
    set_code: card.set_code || null,
    image_url: card.image_url,
    attributes: JSON.stringify(card.attributes),
    updated_at: new Date().toISOString(),
  });
}

/**
 * Bulk-import resolution: exact match, then local fuzzy match, against the
 * cache - only falls through to the live endpoint (and writes the result
 * back into the cache) when the local cache has nothing close enough.
 */
export async function ygoResolveByName(name: string): Promise<YgoCacheResolveOutcome> {
  const normalized = normalizeCardName(name);

  const exact = db.prepare(`SELECT * FROM ygoprodeck_cache WHERE normalized_name = ? ORDER BY id ASC LIMIT 1`).get(normalized) as
    | YgoCacheRow
    | undefined;

  if (exact) {
    return { status: 'found', card: rowToCard(exact), source: 'cache' };
  }

  if (normalized.length >= 3) {
    const prefix = normalized.slice(0, 4);
    const candidates = db
      .prepare(`SELECT * FROM ygoprodeck_cache WHERE normalized_name LIKE ? || '%' LIMIT 200`)
      .all(prefix) as YgoCacheRow[];

    const threshold = normalized.length <= 6 ? 1 : 2;
    let best: { row: YgoCacheRow; distance: number } | null = null;

    for (const candidate of candidates) {
      const distance = levenshtein(normalized, candidate.normalized_name);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { row: candidate, distance };
      }
    }

    if (best) {
      return { status: 'found', card: rowToCard(best.row), source: 'cache' };
    }
  }

  const outcome = await resolveCardByName(name);

  if (outcome.status === 'found') {
    upsertCacheRow(outcome.card);
    return { status: 'found', card: outcome.card, source: 'live' };
  }

  return { ...outcome, source: 'live' };
}

/** Downloads and loads YGOPRODeck's full card database into ygoprodeck_cache. */
export async function refreshYgoCache(): Promise<YgoRefreshResult> {
  try {
    const res = await fetch(BASE_URL, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });

    if (!res.ok) {
      throw new Error(`Failed to fetch YGOPRODeck card database (${res.status})`);
    }

    const body = (await res.json()) as { data: any[] };
    const now = new Date().toISOString();
    const rows: YgoCacheRow[] = [];
    let rowErrors = 0;

    for (const raw of body.data) {
      try {
        const card = normalizeYgoCard(raw);
        rows.push({
          id: card.external_id,
          name: card.name,
          normalized_name: normalizeCardName(card.name),
          set_code: card.set_code || null,
          image_url: card.image_url,
          attributes: JSON.stringify(card.attributes),
          updated_at: now,
        });
      } catch {
        rowErrors++;
      }
    }

    const writeAll = db.transaction((toInsert: YgoCacheRow[]) => {
      db.prepare(`DELETE FROM ygoprodeck_cache`).run();

      const insert = db.prepare(
        `INSERT INTO ygoprodeck_cache (id, name, normalized_name, set_code, image_url, attributes, updated_at)
         VALUES (@id, @name, @normalized_name, @set_code, @image_url, @attributes, @updated_at)`
      );
      for (const row of toInsert) insert.run(row);

      db.prepare(
        `INSERT INTO ygoprodeck_cache_meta (id, last_refreshed_at, source_updated_at, rows_loaded, row_errors, status, error_message)
         VALUES (1, @last_refreshed_at, @source_updated_at, @rows_loaded, @row_errors, 'ok', NULL)
         ON CONFLICT (id) DO UPDATE SET
           last_refreshed_at = excluded.last_refreshed_at,
           source_updated_at = excluded.source_updated_at,
           rows_loaded = excluded.rows_loaded,
           row_errors = excluded.row_errors,
           status = 'ok',
           error_message = NULL`
      ).run({
        last_refreshed_at: now,
        // YGOPRODeck has no dataset-level manifest timestamp like Scryfall's
        // bulk-data entries do - just record when we pulled it.
        source_updated_at: now,
        rows_loaded: toInsert.length,
        row_errors: rowErrors,
      });
    });

    writeAll(rows);

    return {
      rows_loaded: rows.length,
      row_errors: rowErrors,
      source_updated_at: now,
      last_refreshed_at: now,
    };
  } catch (err) {
    // Any failure above never touches ygoprodeck_cache - only this meta row
    // records it, so the previous good cache and its stats stay intact.
    const message = err instanceof Error ? err.message : 'Unknown error';
    db.prepare(
      `INSERT INTO ygoprodeck_cache_meta (id, status, error_message) VALUES (1, 'error', @message)
       ON CONFLICT (id) DO UPDATE SET status = 'error', error_message = excluded.error_message`
    ).run({ message });
    throw err;
  }
}

const YGO_IMAGE_DIR = path.join(process.cwd(), 'public', 'ygo-images');

/**
 * Downloads and locally re-hosts a Yugioh card's image the first time it's
 * actually added to the collection or a deck - YGOPRODeck's terms prohibit
 * continually hotlinking their CDN, unlike Scryfall. Returns null (never
 * throws) on a failed download so a hiccup here never blocks adding the card;
 * callers should fall back to the original remote URL in that case.
 */
export async function ensureLocalYgoImage(externalId: string, remoteImageUrl: string | null): Promise<string | null> {
  if (!remoteImageUrl) return null;

  const localPath = path.join(YGO_IMAGE_DIR, `${externalId}.jpg`);
  const publicPath = `/ygo-images/${externalId}.jpg`;

  if (fs.existsSync(localPath)) return publicPath;

  try {
    if (!fs.existsSync(YGO_IMAGE_DIR)) fs.mkdirSync(YGO_IMAGE_DIR, { recursive: true });

    const res = await fetch(remoteImageUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(localPath, buffer);
    return publicPath;
  } catch {
    return null;
  }
}
