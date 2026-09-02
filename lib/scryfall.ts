export interface ScryfallResolvedCard {
  external_id: string;
  name: string;
  set_code: string;
  image_url: string | null;
  attributes: Record<string, unknown>;
}

const USER_AGENT = 'personal-card-collection-app';

function normalize(c: any): ScryfallResolvedCard {
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

//This is actually so cool
export async function searchCards(query: string): Promise<ScryfallResolvedCard[]> {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (!res.ok) {
    if (res.status === 404) return []; // no matches - not an error
    throw new Error('Scryfall search failed');
  }

  const data = await res.json();
  return (data.data ?? []).slice(0, 20).map(normalize);
}

/**
 * Resolves one decklist line to a single best-guess card, using Scryfall's
 * fuzzy name endpoint - built exactly for turning "Lightning Bolt" (or a
 * slightly misspelled variant) into one specific card, rather than a list.
 */
export async function resolveCardByName(name: string): Promise<ScryfallResolvedCard | null> {
  const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (!res.ok) return null;

  const card = await res.json();
  return normalize(card);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
