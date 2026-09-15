import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getDeckCardsWithAllocation } from '@/lib/decks';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: idParam } = await params;
  const deckId = Number(idParam);
  if (!Number.isFinite(deckId)) {
    return NextResponse.json({ error: 'Invalid deck id' }, { status: 400 });
  }

  const deck = db.prepare(`SELECT id, name, game FROM decks WHERE id = ?`).get(deckId);

  if (!deck) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  const cards = getDeckCardsWithAllocation(deckId);

  return NextResponse.json({ deck, cards });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id: idParam } = await params;
  const deckId = Number(idParam);
  if (!Number.isFinite(deckId)) {
    return NextResponse.json({ error: 'Invalid deck id' }, { status: 400 });
  }

  const deleteDeck = db.transaction(() => {
    db.prepare(`DELETE FROM deck_cards WHERE deck_id = ?`).run(deckId);
    db.prepare(`DELETE FROM deck_tags WHERE deck_id = ?`).run(deckId);
    const result = db.prepare(`DELETE FROM decks WHERE id = ?`).run(deckId);
    return result.changes;
  });

  const changes = deleteDeck();

  if (changes === 0) {
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
