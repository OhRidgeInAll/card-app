import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upsertCard } from '@/lib/cards';
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

  const upsertCollectionItem = db.prepare(
    `INSERT INTO collection_items (card_id, quantity_owned, condition)
     VALUES (@card_id, @quantity, @condition)
     ON CONFLICT (card_id, condition) DO UPDATE SET
       quantity_owned = quantity_owned + excluded.quantity_owned`
  );

  const addToCollection = db.transaction(() => {
    const cardId = upsertCard(db, { game, external_id, name, set_code, image_url, attributes });

    upsertCollectionItem.run({
      card_id: cardId,
      quantity: qty,
      condition: cond,
    });

    return cardId;
  });

  const cardId = addToCollection();

  return NextResponse.json({ ok: true, card_id: cardId });
}
