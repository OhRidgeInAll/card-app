import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upsertCard } from '@/lib/cards';
import { parseBulkList } from '@/lib/bulk-import';
import { sleep, SCRYFALL_REQUEST_DELAY_MS, resolveExactPrinting, type ScryfallResolvedCard } from '@/lib/scryfall';
import { cacheResolveByName } from '@/lib/scryfall-cache';
import { YGOPRODECK_REQUEST_DELAY_MS } from '@/lib/ygoprodeck';
import { ygoResolveByName, ensureLocalYgoImage } from '@/lib/ygoprodeck-cache';
import type { Game } from '@/types/card';

type Destination = 'collection' | 'deck' | 'both';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { text, destination, deck_id, new_deck_name, game } = body as {
    text?: string;
    destination?: Destination;
    deck_id?: number;
    new_deck_name?: string;
    game?: Game;
  };

  const resolvedGame: Game = game ?? 'mtg';

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
    const created = db.prepare(`INSERT INTO decks (name, game) VALUES (?, ?)`).run(new_deck_name.trim(), resolvedGame);
    resolvedDeckId = Number(created.lastInsertRowid);
  }

  const entries = parseBulkList(text);

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No card lines could be parsed from that text' }, { status: 400 });
  }

  const upsertCollectionItem = db.prepare(
    `INSERT INTO collection_items (
       card_id, quantity_owned, condition,
       printing_external_id, printing_set_code, printing_image_url, printing_attributes
     )
     VALUES (
       @card_id, @quantity, 'NM',
       @printing_external_id, @printing_set_code, @printing_image_url, @printing_attributes
     )
     ON CONFLICT (card_id, condition) DO UPDATE SET
       quantity_owned = quantity_owned + excluded.quantity_owned,
       printing_external_id = COALESCE(excluded.printing_external_id, printing_external_id),
       printing_set_code = COALESCE(excluded.printing_set_code, printing_set_code),
       printing_image_url = COALESCE(excluded.printing_image_url, printing_image_url),
       printing_attributes = COALESCE(excluded.printing_attributes, printing_attributes)`
  );

  const upsertDeckCard = db.prepare(
    `INSERT INTO deck_cards (deck_id, card_id, quantity_needed)
     VALUES (@deck_id, @card_id, @quantity)
     ON CONFLICT (deck_id, card_id) DO UPDATE SET
       quantity_needed = quantity_needed + excluded.quantity_needed`
  );

  const matched: Array<{ name: string; quantity: number }> = [];
  const notFound: string[] = [];
  const failed: string[] = [];

  const requestDelayMs = resolvedGame === 'yugioh' ? YGOPRODECK_REQUEST_DELAY_MS : SCRYFALL_REQUEST_DELAY_MS;

  // Sequential on purpose - a precon-sized list is 60-100 lines, and hitting
  // a live fuzzy-name endpoint that many times at once isn't polite.
  for (const entry of entries) {
    const outcome = resolvedGame === 'yugioh' ? await ygoResolveByName(entry.name) : await cacheResolveByName(entry.name);

    if (outcome.status === 'not_found') {
      notFound.push(entry.raw);
      if (outcome.source === 'live') await sleep(requestDelayMs);
      continue;
    }

    if (outcome.status === 'error') {
      // I'm so used to small little prototype projects I forgot my courtesy to Scryfall. Let's not hammer their API if we can avoid it.
      // We were being rate limited but initially were interpreting the error as a "not found" and retrying immediately.
      failed.push(entry.raw);
      if (outcome.source === 'live') await sleep(requestDelayMs);
      continue;
    }

    const resolved = outcome.card;

    // Yugioh images must be re-hosted locally rather than hotlinked long-term
    // (YGOPRODeck's terms) - resolve this before upsertCard, which is fine
    // here since (unlike the collection/deck-cards routes) this loop doesn't
    // wrap upsertCard in a db.transaction().
    const imageUrl =
      resolvedGame === 'yugioh' ? (await ensureLocalYgoImage(resolved.external_id, resolved.image_url)) ?? resolved.image_url : resolved.image_url;

    const cardId = upsertCard(db, {
      game: resolvedGame,
      external_id: resolved.external_id,
      name: resolved.name,
      set_code: resolved.set_code,
      image_url: imageUrl,
      attributes: resolved.attributes,
    });

    // A line naming an exact printing (e.g. "(M10) 146") gets that printing
    // looked up live and recorded on the collection row - purely additional
    // metadata, never changes cardId/deck-matching above. Always a live call
    // (no local cache of every printing), so it's always followed by a sleep.
    let printing: ScryfallResolvedCard | null = null;
    if (resolvedGame === 'mtg' && entry.set_code && entry.collector_number) {
      const printingOutcome = await resolveExactPrinting(entry.set_code, entry.collector_number);
      if (printingOutcome.status === 'found') {
        printing = printingOutcome.card;
      }
      await sleep(SCRYFALL_REQUEST_DELAY_MS);
    }

    if (destination === 'collection' || destination === 'both') {
      upsertCollectionItem.run({
        card_id: cardId,
        quantity: entry.quantity,
        printing_external_id: printing?.external_id ?? null,
        printing_set_code: printing?.set_code ?? null,
        printing_image_url: printing?.image_url ?? null,
        printing_attributes: printing ? JSON.stringify(printing.attributes) : null,
      });
    }

    if ((destination === 'deck' || destination === 'both') && resolvedDeckId) {
      upsertDeckCard.run({ deck_id: resolvedDeckId, card_id: cardId, quantity: entry.quantity });
    }

    matched.push({ name: resolved.name, quantity: entry.quantity });
    if (outcome.source === 'live') await sleep(requestDelayMs);
  }

  return NextResponse.json({
    ok: true,
    deck_id: resolvedDeckId,
    matched_count: matched.length,
    not_found: notFound,
    failed,
  });
}
