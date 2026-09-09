import { NextRequest, NextResponse } from 'next/server';
import { ygoCacheSearch } from '@/lib/ygoprodeck-cache';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ cards: [] });
  }

  try {
    const cards = await ygoCacheSearch(q);
    return NextResponse.json({ cards });
  } catch {
    return NextResponse.json({ error: 'YGOPRODeck lookup failed' }, { status: 502 });
  }
}
