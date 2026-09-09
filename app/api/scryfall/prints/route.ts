import { NextRequest, NextResponse } from 'next/server';
import { searchPrintings } from '@/lib/scryfall';

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');

  if (!name || !name.trim()) {
    return NextResponse.json({ printings: [], has_more: false, total_cards: 0 });
  }

  try {
    const result = await searchPrintings(name);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Scryfall printing lookup failed' }, { status: 502 });
  }
}
