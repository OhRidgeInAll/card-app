# Card collection app

## What's here
**Collection**
- Search Magic: the Gathering and Yugioh via Scryfall/YGOProDeck and add them to your collection
- View and manage collection and qty with simple +/- buttons
**Decks**
- Create decks and add cards to them (same Scryfall search UX as the collection)
- Each deck shows, per card: how many you need, how many you own in total, and
  how many of those are actually available to this deck vs. already claimed by
  another deck — with a per-card "Missing N" or "Have N" status and a
  deck-level summary at the top
**Bulk import** (`/import`)
- Paste a decklist — `4x Lightning Bolt`, `4 Lightning Bolt (M10) 146`, or
  `4, Lightning Bolt` all parse the same way, and a comma that's part of a
  card's own name (`1 Namor, Atlantean King`) is correctly kept as part of
  the name rather than mistaken for a CSV separator, this genuinely is a little bit of a
  syntax specific fix that can be broken by a single addition of a card like `3, 2, 1, Go!`
- Choose where it goes: collection only, a deck only, or **both at once** —
  the last one is for exactly the "I bought a precon, here's the list from
  MTGGoldfish" case, since it adds the same quantities to your collection and
  to a (new or existing) deck in one pass
- Cards are resolved one at a time via Scryfall's fuzzy-name lookup, with a
  delay between each and automatic retry-with-backoff if Scryfall briefly
  rate-limits (a 429) or hiccups (a 5xx) - a 75-100 card list takes roughly
  15-25 seconds, not instant
- Two separate failure categories in the result: **not found** (Scryfall
  genuinely has no match, forced to manual add) and **failed** (kept erroring
  after retries, most likely a transient rate-limit, attempt retry later)
  **Tagging and board view**
- Tag any card (from the collection table, or from a deck's card list -
  same tag either way) and tag decks themselves, via a small chip editor with
  autocomplete against tags you've already used
- Both the collection page and each deck page have a Table / Board toggle -
  board view groups cards into columns by tag, an "Untagged" column catches
  anything without one, and a multi-tagged card shows up in every column it
  belongs to
- Tags on a card are global, not per-deck, deliberate choice made for card function rather than
  flavour tags.

Data lives in a local SQLite file at `data/collection.db` — back it up by copying that one file.

## How the allocation works
A card can only physically be in one deck at a time. Rather than storing
"which deck owns this copy" as a field that could go stale, every deck page
recomputes it on the fly (see `lib/decks.ts`):
- Total owned comes from `collection_items`
- Whatever earlier-created decks (lower deck id) already claim gets subtracted first
- **The deck created first wins ties** — if two decks both want your only copy
  of a card, the older deck shows it as owned and the newer one shows it as
  missing, until you either buy another copy or remove it from the older deck
  (possible future feature is "borrowed" cards where cards can be assigned between decks to determine where they exist in real life at the time.)
- "Missing" and "available" are never stored — always derived at read time,
  so they can't drift out of sync as decks and the collection change

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
- `lib/tags.ts` — find-or-create a tag, batch tag lookups for cards/decks
- `types/card.ts` — shared TypeScript types
- `app/api/scryfall/search` — proxies card search to Scryfall (server-side, avoids CORS)
- `app/api/import` — POST parses + resolves a decklist and adds it to the collection, a deck, or both
- `app/api/collection` — GET lists your collection, POST adds/increments a card
- `app/api/collection/[id]` — PATCH adjusts a copy's quantity, DELETE removes it
- `app/api/decks` — GET lists decks, POST creates one
- `app/api/decks/[id]` — GET deck detail with allocation, DELETE removes the deck
- `app/api/decks/[id]/cards` — POST adds/increments a card's needed quantity in a deck
- `app/api/decks/[id]/cards/[cardId]` — PATCH adjusts needed quantity, DELETE removes the card from the deck
- `app/api/tags` — GET lists all tags ever used
- `app/api/cards/[cardId]/tags` — POST attaches a tag to a card
- `app/api/cards/[cardId]/tags/[tagId]` — DELETE removes a tag from a card
- `app/api/decks/[id]/tags` — POST attaches a tag to a deck
- `app/api/decks/[id]/tags/[tagId]` — DELETE removes a tag from a deck
- `app/TagEditor.tsx` — shared chip editor, used for both card and deck tags
- `app/CollectionView.tsx` — collection's Table / Board (by tag) toggle
- `app/page.tsx` — collection page (fetches data, renders CollectionView)
- `app/add/page.tsx` — search + add to collection
- `app/import/page.tsx` — bulk paste-a-decklist import
- `app/decks/page.tsx` — deck list + create form, tag chips per deck
- `app/decks/[id]/page.tsx` — deck detail page (fetches data, renders DeckCardsView)
- `app/decks/[id]/DeckCardsView.tsx` — deck's Table / Board (by tag) toggle
- `app/decks/[id]/add/page.tsx` — search + add to a specific deck

## What's comin'
- Yugioh and Hololive TCG support
- TCGplayer-sourced pricing display (Scryfall's response already includes it
  under `attributes.prices` on every card — just not shown in the UI yet)
- A way to delete a whole deck from the UI (the API route exists, but there's
  no button for it yet)
