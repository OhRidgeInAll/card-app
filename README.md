# Card collection app

## What's here
- Search MTG Cards to add to acollection
- View and manage collection and qty
- Create decks and add cards **NEW BULK IMPORT** ----
 `4x Lightning Bolt`, `4 Lightning Bolt (M10) 146`, or
  `4, Lightning Bolt` all parse the same way
- Each deck shows, per card: how many you need, how many you own in total, and
  how many of those are actually available to this deck vs. already claimed by
  another deck with a per-card "Missing N" or "Have N" status and a
  deck-level summary at the top
- Cards are resolved one at a time via Scryfall's fuzzy-name lookup, with a
  small delay between each - a 75-100 card list will take roughly 10-15
  seconds, not be instant
- Anything that doesn't resolve gets reported back so you can add it by hand

Data lives in a local SQLite file at `data/collection.db` — back it up by copying that one file.
yeah yeah yucky sql

## How the allocation works
A card can only physically be in one deck at a time. Rather than storing
"which deck owns this copy" as a field that could go stale, every deck page
recomputes it on the fly (see `lib/decks.ts`):
- Total owned comes from `collection_items`
- Whatever earlier-created decks (lower deck id) already claim gets subtracted first
- **The deck created first wins ties**, will later implement a "borrowed card from" 
or something to keep track of moving cards in collection.
- "Missing" and "available" are never stored, rather derived at read time,
  so they won't desync as decks and the collection change

## Setup
1. Install Node.js 18+ if you don't already have it.
2. From this folder:
   ```bash
   npm install
   npm run dev
   ```
3. Open http://localhost:3000 on your PC.

## Reaching it from your phone
1. Find your PC's LAN IP:
   - Windows: `ipconfig`, look for "IPv4 Address"
   - Mac: System Settings → Wi-Fi → Details, or `ifconfig` in Terminal
2. Build and run the production server (`npm run start` is already configured to bind
   to `0.0.0.0`, i.e. all network interfaces, not just localhost):
   ```bash
   npm run build
   npm run start
   ```
3. On your phone, open port 3000 on the same IP

## Project layout
- `db/schema.sql` — table definitions, applied automatically on first launch
- `lib/db.ts` — opens the SQLite file and applies the schema
- `lib/cards.ts` — shared find-or-create-a-card helper (used by collection, deck, and import adds)
- `lib/decks.ts` — the owned/allocated/missing computation for a deck
- `lib/scryfall.ts` — Scryfall client: live search and fuzzy name resolution
- `lib/bulk-import.ts` — parses pasted decklist text into quantity+name pairs
- `types/card.ts` — shared TypeScript types
- `app/api/scryfall/search` — proxies card search to Scryfall (server-side, avoids CORS)
- `app/api/import` — POST parses + resolves a decklist and adds it to the collection, a deck, or both
- `app/api/collection` — GET lists your collection, POST adds/increments a card
- `app/api/collection/[id]` — PATCH adjusts a copy's quantity, DELETE removes it
- `app/api/decks` — GET lists decks, POST creates one
- `app/api/decks/[id]` — GET deck detail with allocation, DELETE removes the deck
- `app/api/decks/[id]/cards` — POST adds/increments a card's needed quantity in a deck
- `app/api/decks/[id]/cards/[cardId]` — PATCH adjusts needed quantity, DELETE removes the card from the deck
- `app/page.tsx` — collection view
- `app/add/page.tsx` — search + add to collection
- `app/import/page.tsx` — bulk paste-a-decklist import
- `app/decks/page.tsx` — deck list + create form
- `app/decks/[id]/page.tsx` — deck detail with allocation status
- `app/decks/[id]/add/page.tsx` — search + add to a specific deck

## What's comin'
- Tagging, and column/board views by tag
- Yugioh and Hololive TCG support
- TCGplayer-sourced pricing display (Scryfall's response already includes it
  under `attributes.prices` on every card — just not shown in the UI yet)
- A way to delete a whole deck from the UI (the API route exists, but there's
  no button for it yet)
