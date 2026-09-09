import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upsertCard } from '@/lib/cards';
import { ensureLocalYgoImage } from '@/lib/ygoprodeck-cache';

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const deckId = Number(params.id);
  if (!Number.isFinite(deckId)) {
    return NextResponse.json({ error: 'Invalid deck id' }, { status: 400 });
  }

  const body = await request.json();
  const { game, external_id, name, set_code, image_url, attributes, quantity } = body;

  if (!game || !external_id || !name) {
    return NextResponse.json({ error: 'game, external_id, and name are required' }, { status: 400 });
  }

  const qty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

  // Yugioh images must be re-hosted locally rather than hotlinked long-term
  // (YGOPRODeck's terms) - resolve this before the transaction since
  // db.transaction() callbacks must be synchronous.
  const resolvedImageUrl = game === 'yugioh' ? (await ensureLocalYgoImage(external_id, image_url)) ?? image_url : image_url;

  const upsertDeckCard = db.prepare(
    `INSERT INTO deck_cards (deck_id, card_id, quantity_needed)
     VALUES (@deck_id, @card_id, @quantity)
     ON CONFLICT (deck_id, card_id) DO UPDATE SET
       quantity_needed = quantity_needed + excluded.quantity_needed`
  );

  const addToDeck = db.transaction(() => {
    const cardId = upsertCard(db, { game, external_id, name, set_code, image_url: resolvedImageUrl, attributes });
    upsertDeckCard.run({ deck_id: deckId, card_id: cardId, quantity: qty });
    return cardId;
  });

  addToDeck();

  return NextResponse.json({ ok: true });
}
