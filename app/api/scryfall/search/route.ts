import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ cards: [] });
  }

  const scryfallUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=name`;

  const res = await fetch(scryfallUrl, {
    headers: { 'User-Agent': 'personal-card-collection-app' },
  });

  if (!res.ok) {
    // Scryfall returns 404 for "no matches" - that's an empty result, not an error.
    if (res.status === 404) {
      return NextResponse.json({ cards: [] });
    }
    return NextResponse.json({ error: 'Scryfall lookup failed' }, { status: 502 });
  }

  const data = await res.json();

  const cards = (data.data ?? []).slice(0, 20).map((c: any) => ({
    external_id: c.id,
    name: c.name,
    set_code: c.set,
    image_url: c.image_uris?.normal ?? c.card_faces?.[0]?.image_uris?.normal ?? null,
    attributes: {
      mana_cost: c.mana_cost,
      type_line: c.type_line,
      oracle_text: c.oracle_text,
      colors: c.colors,
      prices: c.prices, // includes usd / usd_foil, TCGplayer-sourced market data
    },
  }));

  return NextResponse.json({ cards });
}
