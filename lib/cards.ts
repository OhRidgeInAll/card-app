import type Database from 'better-sqlite3';

export interface UpsertCardInput {
  game: string;
  external_id: string;
  name: string;
  set_code?: string | null;
  image_url?: string | null;
  attributes?: unknown;
}

/**
 * Inserts a card if it's new, or refreshes its cached fields (name, image,
 * attributes) if we've seen it before. Returns the card's internal id.
 */
export function upsertCard(db: Database.Database, input: UpsertCardInput): number {
  const upsert = db.prepare(
    `INSERT INTO cards (game, external_id, name, set_code, image_url, attributes)
     VALUES (@game, @external_id, @name, @set_code, @image_url, @attributes)
     ON CONFLICT (game, external_id) DO UPDATE SET
       name = excluded.name,
       set_code = excluded.set_code,
       image_url = excluded.image_url,
       attributes = excluded.attributes`
  );

  upsert.run({
    game: input.game,
    external_id: input.external_id,
    name: input.name,
    set_code: input.set_code ?? null,
    image_url: input.image_url ?? null,
    attributes: input.attributes ? JSON.stringify(input.attributes) : null,
  });

  const row = db
    .prepare(`SELECT id FROM cards WHERE game = ? AND external_id = ?`)
    .get(input.game, input.external_id) as { id: number };

  return row.id;
}
