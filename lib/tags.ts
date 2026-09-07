import { db } from './db';

export interface Tag {
  id: number;
  label: string;
}

export function findOrCreateTag(label: string): Tag {
  const clean = label.trim();
  db.prepare(`INSERT INTO tags (label) VALUES (?) ON CONFLICT (label) DO NOTHING`).run(clean);
  return db.prepare(`SELECT id, label FROM tags WHERE label = ?`).get(clean) as Tag;
}

export function getAllTags(): Tag[] {
  return db.prepare(`SELECT id, label FROM tags ORDER BY label ASC`).all() as Tag[];
}

export function getTagsForCards(cardIds: number[]): Map<number, Tag[]> {
  if (cardIds.length === 0) return new Map();

  const placeholders = cardIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT ct.card_id, t.id, t.label
       FROM card_tags ct
       JOIN tags t ON t.id = ct.tag_id
       WHERE ct.card_id IN (${placeholders})
       ORDER BY t.label ASC`
    )
    .all(...cardIds) as Array<{ card_id: number; id: number; label: string }>;

  const map = new Map<number, Tag[]>();
  for (const row of rows) {
    const list = map.get(row.card_id) ?? [];
    list.push({ id: row.id, label: row.label });
    map.set(row.card_id, list);
  }
  return map;
}

export function getTagsForDecks(deckIds: number[]): Map<number, Tag[]> {
  if (deckIds.length === 0) return new Map();

  const placeholders = deckIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT dt.deck_id, t.id, t.label
       FROM deck_tags dt
       JOIN tags t ON t.id = dt.tag_id
       WHERE dt.deck_id IN (${placeholders})
       ORDER BY t.label ASC`
    )
    .all(...deckIds) as Array<{ deck_id: number; id: number; label: string }>;

  const map = new Map<number, Tag[]>();
  for (const row of rows) {
    const list = map.get(row.deck_id) ?? [];
    list.push({ id: row.id, label: row.label });
    map.set(row.deck_id, list);
  }
  return map;
}
