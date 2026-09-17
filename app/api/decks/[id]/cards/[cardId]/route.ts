import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string; cardId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id: idParam, cardId: cardIdParam } = await params;
  const deckId = Number(idParam);
  const cardId = Number(cardIdParam);
  if (!Number.isFinite(deckId) || !Number.isFinite(cardId)) {
    return NextResponse.json({ error: 'Invalid deck or card id' }, { status: 400 });
  }

  const body = await request.json();
  const delta = Number(body?.delta);

  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta must be a non-zero number' }, { status: 400 });
  }

  const getRow = db.prepare(`SELECT quantity_needed FROM deck_cards WHERE deck_id = ? AND card_id = ?`);
  const updateRow = db.prepare(`UPDATE deck_cards SET quantity_needed = ? WHERE deck_id = ? AND card_id = ?`);
  const deleteRow = db.prepare(`DELETE FROM deck_cards WHERE deck_id = ? AND card_id = ?`);

  const applyDelta = db.transaction(() => {
    const row = getRow.get(deckId, cardId) as { quantity_needed: number } | undefined;
    if (!row) return { status: 'not_found' as const };

    const newQuantity = row.quantity_needed + delta;

    if (newQuantity <= 0) {
      deleteRow.run(deckId, cardId);
      return { status: 'deleted' as const };
    }

    updateRow.run(newQuantity, deckId, cardId);
    return { status: 'updated' as const, quantity: newQuantity };
  });

  const result = applyDelta();

  if (result.status === 'not_found') {
    return NextResponse.json({ error: 'Card not found in this deck' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: idParam, cardId: cardIdParam } = await params;
  const deckId = Number(idParam);
  const cardId = Number(cardIdParam);
  if (!Number.isFinite(deckId) || !Number.isFinite(cardId)) {
    return NextResponse.json({ error: 'Invalid deck or card id' }, { status: 400 });
  }

  const result = db.prepare(`DELETE FROM deck_cards WHERE deck_id = ? AND card_id = ?`).run(deckId, cardId);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Card not found in this deck' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
