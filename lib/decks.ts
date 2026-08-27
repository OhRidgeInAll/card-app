import { db } from './db';

export interface DeckCardAllocation {
  card_id: number;
  name: string;
  set_code: string | null;
  image_url: string | null;
  quantity_needed: number;
  total_owned: number;
  allocated: number;
  missing: number;
}

interface DeckCardRow {
  card_id: number;
  name: string;
  set_code: string | null;
  image_url: string | null;
  quantity_needed: number;
  total_owned: number;
  needed_by_earlier_decks: number;
}

/**
 * For every card in a deck, works out how many copies it can actually claim
 * from the collection.
 *
 * Rule: when two decks want the same card and there aren't enough physical
 * copies for both, the deck that was created first gets priority. So a
 * card's "available for this deck" figure is its total owned quantity minus
 * whatever earlier decks (lower id) already claim - never a stored value,
 * always recomputed here so it can't drift out of sync.
 */
export function getDeckCardsWithAllocation(deckId: number): DeckCardAllocation[] {
  const rows = db
    .prepare(
      `SELECT dc.card_id, c.name, c.set_code, c.image_url, dc.quantity_needed,
              COALESCE(owned.total_owned, 0) AS total_owned,
              COALESCE(earlier.total_needed_earlier, 0) AS needed_by_earlier_decks
       FROM deck_cards dc
       JOIN cards c ON c.id = dc.card_id
       LEFT JOIN (
         SELECT card_id, SUM(quantity_owned) AS total_owned
         FROM collection_items
         GROUP BY card_id
       ) owned ON owned.card_id = dc.card_id
       LEFT JOIN (
         SELECT dc2.card_id, SUM(dc2.quantity_needed) AS total_needed_earlier
         FROM deck_cards dc2
         JOIN decks d2 ON d2.id = dc2.deck_id
         WHERE d2.id < ?
         GROUP BY dc2.card_id
       ) earlier ON earlier.card_id = dc.card_id
       WHERE dc.deck_id = ?
       ORDER BY c.name ASC`
    )
    .all(deckId, deckId) as DeckCardRow[];

  return rows.map((row) => {
    const availableForThisDeck = Math.max(0, row.total_owned - row.needed_by_earlier_decks);
    const allocated = Math.min(row.quantity_needed, availableForThisDeck);
    const missing = row.quantity_needed - allocated;

    return {
      card_id: row.card_id,
      name: row.name,
      set_code: row.set_code,
      image_url: row.image_url,
      quantity_needed: row.quantity_needed,
      total_owned: row.total_owned,
      allocated,
      missing,
    };
  });
}
