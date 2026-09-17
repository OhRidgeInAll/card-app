import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findOrCreateTag } from '@/lib/tags';

interface RouteParams {
  params: Promise<{ cardId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { cardId: cardIdParam } = await params;
  const cardId = Number(cardIdParam);
  if (!Number.isFinite(cardId)) {
    return NextResponse.json({ error: 'Invalid card id' }, { status: 400 });
  }

  const body = await request.json();
  const label = typeof body?.label === 'string' ? body.label.trim() : '';

  if (!label) {
    return NextResponse.json({ error: 'label is required' }, { status: 400 });
  }

  const tag = findOrCreateTag(label);
  db.prepare(`INSERT INTO card_tags (card_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).run(cardId, tag.id);

  return NextResponse.json({ ok: true, tag });
}
