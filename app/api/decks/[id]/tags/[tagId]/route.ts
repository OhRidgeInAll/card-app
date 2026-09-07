import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: { id: string; tagId: string };
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const deckId = Number(params.id);
  const tagId = Number(params.tagId);
  if (!Number.isFinite(deckId) || !Number.isFinite(tagId)) {
    return NextResponse.json({ error: 'Invalid deck or tag id' }, { status: 400 });
  }

  db.prepare(`DELETE FROM deck_tags WHERE deck_id = ? AND tag_id = ?`).run(deckId, tagId);

  return NextResponse.json({ ok: true });
}
