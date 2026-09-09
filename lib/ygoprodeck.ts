import { normalizeCardName } from './card-name-matching';

export interface YgoResolvedCard {
  external_id: string;
  name: string;
  set_code: string;
  image_url: string | null;
  attributes: Record<string, unknown>;
}

export type YgoResolveOutcome =
  | { status: 'found'; card: YgoResolvedCard }
  | { status: 'not_found' }
  | { status: 'error' };

export const USER_AGENT = 'personal-card-collection-app';

// YGOPRODeck's documented limit is 20 requests/second with a 1-hour IP ban
// on abuse. This gives 10/sec - half the ceiling - as headroom.
export const YGOPRODECK_REQUEST_DELAY_MS = 100;

const BASE_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

// A query with zero matches returns HTTP 400 with an error body (confirmed
// live against both `name=` and `fname=`), not a 404 like Scryfall.
const NOT_FOUND_STATUS = 400;

export function normalizeYgoCard(raw: any): YgoResolvedCard {
  return {
    external_id: String(raw.id),
    name: raw.name,
    // No single "set_code" exists per-card - one card can appear in many
    // sets via card_sets[]. First listed set is a cosmetic default, same
    // spirit as a Scryfall row representing "whichever printing this is."
    set_code: raw.card_sets?.[0]?.set_code ?? '',
    image_url: raw.card_images?.[0]?.image_url ?? null,
    attributes: {
      type: raw.type,
      frameType: raw.frameType,
      desc: raw.desc,
      atk: raw.atk, // absent (undefined) for Spell/Trap cards
      def: raw.def, // absent for Link Monsters and Spell/Trap
      level: raw.level, // absent for Link Monsters and Spell/Trap
      linkval: raw.linkval, // present only on Link Monsters
      linkmarkers: raw.linkmarkers,
      scale: raw.scale, // present only on Pendulum Monsters
      race: raw.race,
      attribute: raw.attribute, // absent on Spell/Trap
      archetype: raw.archetype,
      card_prices: raw.card_prices,
    },
  };
}

/** Live search - substring/fuzzy-ish match against YGOPRODeck's own database. */
export async function searchCards(query: string): Promise<YgoResolvedCard[]> {
  const url = `${BASE_URL}?fname=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (!res.ok) {
    if (res.status === NOT_FOUND_STATUS) return [];
    throw new Error('YGOPRODeck search failed');
  }

  const data = await res.json();
  return (data.data ?? []).slice(0, 20).map(normalizeYgoCard);
}

/**
 * Resolves one decklist line to a single card. YGOPRODeck has no fuzzy-name
 * endpoint like Scryfall's `?fuzzy=`, so this tries an exact `name=` match
 * first, then falls back to `fname=` (substring search) - but only accepts
 * a fname result if exactly one candidate's normalized name equals the
 * query's, treating it as an exact-match recovery (case/whitespace
 * differences) rather than a "best guess" picker that could silently
 * import the wrong card. Anything looser is left to the local cache's own
 * Levenshtein fuzzy match in lib/ygoprodeck-cache.ts, which runs before
 * this function is ever reached.
 */
export async function resolveCardByName(name: string): Promise<YgoResolveOutcome> {
  const exactRes = await fetch(`${BASE_URL}?name=${encodeURIComponent(name)}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (exactRes.ok) {
    const data = await exactRes.json();
    const card = data.data?.[0];
    if (card) return { status: 'found', card: normalizeYgoCard(card) };
  } else if (exactRes.status !== NOT_FOUND_STATUS) {
    return { status: 'error' };
  }

  const fnameRes = await fetch(`${BASE_URL}?fname=${encodeURIComponent(name)}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!fnameRes.ok) {
    return fnameRes.status === NOT_FOUND_STATUS ? { status: 'not_found' } : { status: 'error' };
  }

  const fnameData = await fnameRes.json();
  const candidates = (fnameData.data ?? []) as any[];
  const normalizedTarget = normalizeCardName(name);
  const match = candidates.find((c) => normalizeCardName(c.name) === normalizedTarget);

  return match ? { status: 'found', card: normalizeYgoCard(match) } : { status: 'not_found' };
}
