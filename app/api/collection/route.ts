import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { CollectionRow } from '@/types/card';

export async function GET() {
  const items = db
    .prepare(
      `SELECT ci.id, ci.card_id, ci.quantity_owned, ci.condition,
              c.name, c.game, c.set_code, c.image_url
       FROM collection_items ci
       JOIN cards c ON c.id = ci.card_id
       ORDER BY c.name ASC`
    )
    .all() as CollectionRow[];

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { game, external_id, name, set_code, image_url, attributes, quantity, condition } = body;

  if (!game || !external_id || !name) {
    return NextResponse.json({ error: 'game, external_id, and name are required' }, { status: 400 });
  }

  const qty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  const cond = typeof condition === 'string' && condition.length > 0 ? condition : 'NM';

  const upsertCard = db.prepare(
    `INSERT INTO cards (game, external_id, name, set_code, image_url, attributes)
     VALUES (@game, @external_id, @name, @set_code, @image_url, @attributes)
     ON CONFLICT (game, external_id) DO UPDATE SET
       name = excluded.name,
       set_code = excluded.set_code,
       image_url = excluded.image_url,
       attributes = excluded.attributes`
  );

  const getCard = db.prepare(`SELECT id FROM cards WHERE game = ? AND external_id = ?`);

  const upsertCollectionItem = db.prepare(
    `INSERT INTO collection_items (card_id, quantity_owned, condition)
     VALUES (@card_id, @quantity, @condition)
     ON CONFLICT (card_id, condition) DO UPDATE SET
       quantity_owned = quantity_owned + excluded.quantity_owned`
  );

  const addToCollection = db.transaction(() => {
    upsertCard.run({
      game,
      external_id,
      name,
      set_code: set_code ?? null,
      image_url: image_url ?? null,
      attributes: attributes ? JSON.stringify(attributes) : null,
    });

    const card = getCard.get(game, external_id) as { id: number };

    upsertCollectionItem.run({
      card_id: card.id,
      quantity: qty,
      condition: cond,
    });

    return card.id;
  });

  const cardId = addToCollection();

  return NextResponse.json({ ok: true, card_id: cardId });
}
