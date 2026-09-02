import { NextRequest, NextResponse } from 'next/server';
import { searchCards } from '@/lib/scryfall';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ cards: [] });
  }

  try {
    const cards = await searchCards(q);
    return NextResponse.json({ cards });
  } catch {
    return NextResponse.json({ error: 'Scryfall lookup failed' }, { status: 502 });
  }
}
