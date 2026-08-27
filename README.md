# Card collection app

## What this currently does
- Search Magic: the Gathering cards via Scryfall and add them to your collection
- View your collection in a simple table
- Data lives in a local SQLite file at `data/collection.db` — back it up by copying that one file

## What the vision is
- Full functionality for Yugioh, HoloOCG, and MtG
- Handles deck instances using copies from your collection
- Price sourcing (different implementation for each game due to tcgplayer api being closed)
- Card tagging
- Missing card logic

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