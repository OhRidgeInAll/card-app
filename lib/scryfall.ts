export interface ScryfallResolvedCard {
  external_id: string;
  name: string;
  set_code: string;
  image_url: string | null;
  attributes: Record<string, unknown>;
}

export type ResolveOutcome =
  | { status: 'found'; card: ScryfallResolvedCard }
  | { status: 'not_found' }
  | { status: 'error' };

export const USER_AGENT = 'personal-card-collection-app';

// Scryfall's documented hard limit for /cards/named, /cards/search,
// /cards/random, and /cards/collection is 2 requests/second (500ms apart).
// This adds headroom above that floor. See lib/scryfall-cache.ts for the
// local cache that keeps most lookups from hitting this at all.
export const SCRYFALL_REQUEST_DELAY_MS = 550;

const MAX_ATTEMPTS = 3;

export function normalizeScryfallCard(c: any): ScryfallResolvedCard {
  return {
    external_id: c.id,
    name: c.name,
    set_code: c.set,
    image_url: c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? null,
    attributes: {
      mana_cost: c.mana_cost,
      type_line: c.type_line,
      oracle_text: c.oracle_text,
      colors: c.colors,
      prices: c.prices, // includes usd / usd_foil, TCGplayer-sourced market data
    },
  };
}

/** Live search-as-you-type - can return many loose matches. */
export async function searchCards(query: string): Promise<ScryfallResolvedCard[]> {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (!res.ok) {
    if (res.status === 404) return []; // no matches - not an error
    throw new Error('Scryfall search failed');
  }

  const data = await res.json();
  return (data.data ?? []).slice(0, 20).map(normalizeScryfallCard);
}

/**
 * Resolves one decklist line to a single best-guess card, using Scryfall's
 * fuzzy name endpoint - built exactly for turning "Lightning Bolt" (or a
 * slightly misspelled variant) into one specific card, rather than a list.
 *
 * A 404 means Scryfall genuinely has no match for that name - reported to
 * the caller as "not found." Anything else non-OK (429 rate limiting, a
 * transient 5xx) is treated as temporary: back off and retry a few times
 * before giving up, rather than mislabeling a real card like "Forest" as
 * unmatched just because a burst of requests got briefly throttled.
 */
export async function resolveCardByName(name: string, attempt = 1): Promise<ResolveOutcome> {
  const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (res.status === 404) {
    return { status: 'not_found' };
  }

  if (!res.ok) {
    if (attempt >= MAX_ATTEMPTS) {
      return { status: 'error' };
    }
    const retryAfterHeader = res.headers.get('retry-after');
    const backoffMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 500 * attempt;
    await sleep(backoffMs);
    return resolveCardByName(name, attempt + 1);
  }

  const card = await res.json();
  return { status: 'found', card: normalizeScryfallCard(card) };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
