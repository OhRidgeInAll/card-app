import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findOrCreateTag } from '@/lib/tags';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: idParam } = await params;
  const deckId = Number(idParam);
  if (!Number.isFinite(deckId)) {
    return NextResponse.json({ error: 'Invalid deck id' }, { status: 400 });
  }

  const body = await request.json();
  const label = typeof body?.label === 'string' ? body.label.trim() : '';

  if (!label) {
    return NextResponse.json({ error: 'label is required' }, { status: 400 });
  }

  const tag = findOrCreateTag(label);
  db.prepare(`INSERT INTO deck_tags (deck_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).run(deckId, tag.id);

  return NextResponse.json({ ok: true, tag });
}
