import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ cardId: string; tagId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { cardId: cardIdParam, tagId: tagIdParam } = await params;
  const cardId = Number(cardIdParam);
  const tagId = Number(tagIdParam);
  if (!Number.isFinite(cardId) || !Number.isFinite(tagId)) {
    return NextResponse.json({ error: 'Invalid card or tag id' }, { status: 400 });
  }

  db.prepare(`DELETE FROM card_tags WHERE card_id = ? AND tag_id = ?`).run(cardId, tagId);

  return NextResponse.json({ ok: true });
}
