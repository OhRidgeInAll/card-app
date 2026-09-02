import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upsertCard } from '@/lib/cards';
import { parseBulkList } from '@/lib/bulk-import';
import { resolveCardByName, sleep } from '@/lib/scryfall';

type Destination = 'collection' | 'deck' | 'both';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, destination, deck_id, new_deck_name } = body as {
    text?: string;
    destination?: Destination;
    deck_id?: number;
    new_deck_name?: string;
  };

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  if (destination !== 'collection' && destination !== 'deck' && destination !== 'both') {
    return NextResponse.json({ error: 'destination must be collection, deck, or both' }, { status: 400 });
  }

  const needsDeck = destination === 'deck' || destination === 'both';
  let resolvedDeckId = deck_id ?? null;

  if (needsDeck && !resolvedDeckId) {
    if (!new_deck_name || !new_deck_name.trim()) {
      return NextResponse.json(
        { error: 'deck_id or new_deck_name is required for this destination' },
        { status: 400 }
      );
    }
    const created = db.prepare(`INSERT INTO decks (name, game) VALUES (?, 'mtg')`).run(new_deck_name.trim());
    resolvedDeckId = Number(created.lastInsertRowid);
  }

  const entries = parseBulkList(text);

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No card lines could be parsed from that text' }, { status: 400 });
  }

  const upsertCollectionItem = db.prepare(
    `INSERT INTO collection_items (card_id, quantity_owned, condition)
     VALUES (@card_id, @quantity, 'NM')
     ON CONFLICT (card_id, condition) DO UPDATE SET
       quantity_owned = quantity_owned + excluded.quantity_owned`
  );

  const upsertDeckCard = db.prepare(
    `INSERT INTO deck_cards (deck_id, card_id, quantity_needed)
     VALUES (@deck_id, @card_id, @quantity)
     ON CONFLICT (deck_id, card_id) DO UPDATE SET
       quantity_needed = quantity_needed + excluded.quantity_needed`
  );

  const matched: Array<{ name: string; quantity: number }> = [];
  const unmatched: string[] = [];

  // Sequential on purpose - a precon-sized list is 60-100 lines, and hitting
  // Scryfall's fuzzy-name endpoint that many times at once isn't polite.
  for (const entry of entries) {
    const resolved = await resolveCardByName(entry.name);

    if (!resolved) {
      unmatched.push(entry.raw);
      await sleep(75);
      continue;
    }

    const cardId = upsertCard(db, {
      game: 'mtg',
      external_id: resolved.external_id,
      name: resolved.name,
      set_code: resolved.set_code,
      image_url: resolved.image_url,
      attributes: resolved.attributes,
    });

    if (destination === 'collection' || destination === 'both') {
      upsertCollectionItem.run({ card_id: cardId, quantity: entry.quantity });
    }

    if ((destination === 'deck' || destination === 'both') && resolvedDeckId) {
      upsertDeckCard.run({ deck_id: resolvedDeckId, card_id: cardId, quantity: entry.quantity });
    }

    matched.push({ name: resolved.name, quantity: entry.quantity });
    await sleep(75);
  }

  return NextResponse.json({
    ok: true,
    deck_id: resolvedDeckId,
    matched_count: matched.length,
    unmatched,
  });
}
