# Card collection app — phase 1 (MTG only)

## What this phase does
- Search Magic: the Gathering cards via Scryfall and add them to your collection
- View your collection in a simple table
- Data lives in a local SQLite file at `data/collection.db` — back it up by copying that one file

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
3. On your phone, on the same WiFi, open `http://<your-pc-ip>:3000` — e.g.
   `http://192.168.1.42:3000`. Bookmark it (or add to your home screen once we
   wire up a PWA manifest in a later pass).

## Project layout
- `db/schema.sql` — table definitions, applied automatically on first launch
- `lib/db.ts` — opens the SQLite file and applies the schema
- `types/card.ts` — shared TypeScript types
- `app/api/scryfall/search` — proxies card search to Scryfall (server-side, avoids CORS)
- `app/api/collection` — GET lists your collection, POST adds/increments a card
- `app/page.tsx` — collection view
- `app/add/page.tsx` — search + add flow

## Why no "missing card" column anywhere
That logic hasn't been built yet (it lands in phase 2, with decks) — but by
design it will never live in a stored column. A deck's missing/available
counts get computed at query time from `collection_items`, so pulling a card
from one deck to build another can't leave stale numbers behind.

## What's not here yet (later phases)
- Decks, tagging, and the "missing card" logic
- Yugioh and Hololive TCG support
- TCGplayer-sourced pricing display (Scryfall's response already includes it
  under `attributes.prices` on every card — just not shown in the UI yet)
