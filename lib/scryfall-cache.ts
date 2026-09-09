import zlib from 'zlib';
import { db } from './db';
import { normalizeScryfallCard, searchCards, resolveCardByName, USER_AGENT, type ScryfallResolvedCard } from './scryfall';
import { normalizeCardName, levenshtein } from './card-name-matching';

export interface CacheMeta {
  last_refreshed_at: string | null;
  source_updated_at: string | null;
  rows_loaded: number | null;
  row_errors: number | null;
  status: 'ok' | 'error' | null;
  error_message: string | null;
}

export type CacheResolveOutcome =
  | { status: 'found'; card: ScryfallResolvedCard; source: 'cache' | 'live' }
  | { status: 'not_found'; source: 'live' }
  | { status: 'error'; source: 'live' };

export interface RefreshResult {
  rows_loaded: number;
  row_errors: number;
  source_updated_at: string;
  last_refreshed_at: string;
}

interface CacheRow {
  id: string;
  oracle_id: string | null;
  name: string;
  normalized_name: string;
  set_code: string | null;
  image_url: string | null;
  attributes: string;
  updated_at: string;
}

function rowToCard(row: CacheRow): ScryfallResolvedCard {
  return {
    external_id: row.id,
    name: row.name,
    set_code: row.set_code ?? '',
    image_url: row.image_url,
    attributes: JSON.parse(row.attributes),
  };
}

function cacheHasData(): boolean {
  return db.prepare(`SELECT 1 FROM scryfall_cache LIMIT 1`).get() !== undefined;
}

export function getCacheMeta(): CacheMeta | null {
  return (db.prepare(`SELECT * FROM scryfall_cache_meta WHERE id = 1`).get() as CacheMeta | undefined) ?? null;
}

/** Typeahead search: cache-first, live only as a bootstrap fallback before the cache has ever been populated. */
export async function cacheSearch(query: string): Promise<ScryfallResolvedCard[]> {
  if (!cacheHasData()) {
    return searchCards(query);
  }

  const normalized = normalizeCardName(query);
  const rows = db
    .prepare(`SELECT * FROM scryfall_cache WHERE normalized_name LIKE '%' || ? || '%' ORDER BY name ASC LIMIT 20`)
    .all(normalized) as CacheRow[];

  return rows.map(rowToCard);
}

function upsertCacheRow(card: ScryfallResolvedCard, oracleId: string | null): void {
  db.prepare(
    `INSERT INTO scryfall_cache (id, oracle_id, name, normalized_name, set_code, image_url, attributes, updated_at)
     VALUES (@id, @oracle_id, @name, @normalized_name, @set_code, @image_url, @attributes, @updated_at)
     ON CONFLICT (id) DO UPDATE SET
       oracle_id = excluded.oracle_id,
       name = excluded.name,
       normalized_name = excluded.normalized_name,
       set_code = excluded.set_code,
       image_url = excluded.image_url,
       attributes = excluded.attributes,
       updated_at = excluded.updated_at`
  ).run({
    id: card.external_id,
    oracle_id: oracleId,
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
 * cache - only falls through to the live fuzzy-name endpoint (and writes the
 * result back into the cache) when the local cache has nothing close enough.
 */
export async function cacheResolveByName(name: string): Promise<CacheResolveOutcome> {
  const normalized = normalizeCardName(name);

  const exact = db.prepare(`SELECT * FROM scryfall_cache WHERE normalized_name = ? ORDER BY id ASC LIMIT 1`).get(normalized) as
    | CacheRow
    | undefined;

  if (exact) {
    return { status: 'found', card: rowToCard(exact), source: 'cache' };
  }

  if (normalized.length >= 3) {
    const prefix = normalized.slice(0, 4);
    const candidates = db
      .prepare(`SELECT * FROM scryfall_cache WHERE normalized_name LIKE ? || '%' LIMIT 200`)
      .all(prefix) as CacheRow[];

    const threshold = normalized.length <= 6 ? 1 : 2;
    let best: { row: CacheRow; distance: number } | null = null;

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
    // ScryfallResolvedCard doesn't carry oracle_id (normalizeScryfallCard()
    // doesn't extract it) - fine here since nothing queries scryfall_cache
    // by oracle_id; the next full refresh backfills it for this row anyway.
    upsertCacheRow(outcome.card, null);
    return { status: 'found', card: outcome.card, source: 'live' };
  }

  return { ...outcome, source: 'live' };
}

interface BulkDataEntry {
  type: string;
  updated_at: string;
  jsonl_download_uri: string;
}

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);

/** Downloads and loads Scryfall's Oracle Cards bulk-data file into scryfall_cache. */
export async function refreshScryfallCache(): Promise<RefreshResult> {
  try {
    const manifestRes = await fetch('https://api.scryfall.com/bulk-data', {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });

    if (!manifestRes.ok) {
      throw new Error(`Failed to fetch Scryfall bulk-data manifest (${manifestRes.status})`);
    }

    const manifest = (await manifestRes.json()) as { data: BulkDataEntry[] };
    const oracleCards = manifest.data.find((entry) => entry.type === 'oracle_cards');

    if (!oracleCards) {
      throw new Error('Scryfall bulk-data manifest has no oracle_cards entry');
    }

    const fileRes = await fetch(oracleCards.jsonl_download_uri, { headers: { 'User-Agent': USER_AGENT } });

    if (!fileRes.ok) {
      throw new Error(`Failed to download Oracle Cards bulk file (${fileRes.status})`);
    }

    const rawBuffer = Buffer.from(await fileRes.arrayBuffer());
    // Detect gzip by magic bytes rather than assuming fetch did or didn't
    // already decompress it - more robust than guessing either way.
    const isGzipped = rawBuffer.length >= 2 && rawBuffer.subarray(0, 2).equals(GZIP_MAGIC);
    const text = (isGzipped ? zlib.gunzipSync(rawBuffer) : rawBuffer).toString('utf-8');

    const lines = text.split('\n');
    const rows: CacheRow[] = [];
    let rowErrors = 0;
    const now = new Date().toISOString();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const raw = JSON.parse(trimmed);
        const card = normalizeScryfallCard(raw);
        rows.push({
          id: card.external_id,
          oracle_id: raw.oracle_id ?? null,
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

    const writeAll = db.transaction((toInsert: CacheRow[]) => {
      db.prepare(`DELETE FROM scryfall_cache`).run();

      const insert = db.prepare(
        `INSERT INTO scryfall_cache (id, oracle_id, name, normalized_name, set_code, image_url, attributes, updated_at)
         VALUES (@id, @oracle_id, @name, @normalized_name, @set_code, @image_url, @attributes, @updated_at)`
      );
      for (const row of toInsert) insert.run(row);

      db.prepare(
        `INSERT INTO scryfall_cache_meta (id, last_refreshed_at, source_updated_at, rows_loaded, row_errors, status, error_message)
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
        source_updated_at: oracleCards.updated_at,
        rows_loaded: toInsert.length,
        row_errors: rowErrors,
      });
    });

    writeAll(rows);

    return {
      rows_loaded: rows.length,
      row_errors: rowErrors,
      source_updated_at: oracleCards.updated_at,
      last_refreshed_at: now,
    };
  } catch (err) {
    // Any failure above (network, parsing, or the write transaction itself)
    // never touches scryfall_cache - only this meta row records the failure,
    // so the previous good cache and its stats stay intact and visible.
    const message = err instanceof Error ? err.message : 'Unknown error';
    db.prepare(
      `INSERT INTO scryfall_cache_meta (id, status, error_message) VALUES (1, 'error', @message)
       ON CONFLICT (id) DO UPDATE SET status = 'error', error_message = excluded.error_message`
    ).run({ message });
    throw err;
  }
}
