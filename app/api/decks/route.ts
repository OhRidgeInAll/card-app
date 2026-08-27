import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const decks = db
    .prepare(
      `SELECT d.id, d.name, d.game, COUNT(dc.id) AS card_count
       FROM decks d
       LEFT JOIN deck_cards dc ON dc.deck_id = d.id
       GROUP BY d.id
       ORDER BY d.id ASC`
    )
    .all();

  return NextResponse.json({ decks });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, game } = body;

  if (!name || !game) {
    return NextResponse.json({ error: 'name and game are required' }, { status: 400 });
  }

  const result = db.prepare(`INSERT INTO decks (name, game) VALUES (?, ?)`).run(name, game);

  return NextResponse.json({ ok: true, deck_id: result.lastInsertRowid });
}
