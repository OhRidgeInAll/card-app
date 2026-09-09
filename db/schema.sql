-- One row per unique card, per game, sourced once from Scryfall/Neuron/Holoarchive.
-- Game-specific fields (mana cost, ATK/DEF, HP, etc.) live in the `attributes` JSON
-- blob rather than as separate columns, so one table covers all three games.
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,             -- 'mtg' | 'yugioh' | 'hololive'
  external_id TEXT NOT NULL,      -- id from the source API (Scryfall id, etc.)
  name TEXT NOT NULL,
  set_code TEXT,
  image_url TEXT,
  attributes TEXT,                -- JSON string: mana cost, oracle text, prices, etc.
  UNIQUE (game, external_id)
);

-- How many physical copies you own. Split by condition so "3 NM + 1 LP" of the
-- same card are tracked separately.
CREATE TABLE IF NOT EXISTS collection_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards (id),
  quantity_owned INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'NM',
  UNIQUE (card_id, condition)
);

CREATE TABLE IF NOT EXISTS decks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  game TEXT NOT NULL
);

-- How many copies a deck *wants*. Deliberately has no "allocated" or "missing"
-- column - those are computed at query time from collection_items so they can
-- never drift out of sync when a card gets pulled into a different deck.
CREATE TABLE IF NOT EXISTS deck_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id INTEGER NOT NULL REFERENCES decks (id),
  card_id INTEGER NOT NULL REFERENCES cards (id),
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  UNIQUE (deck_id, card_id)
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS card_tags (
  card_id INTEGER NOT NULL REFERENCES cards (id),
  tag_id INTEGER NOT NULL REFERENCES tags (id),
  PRIMARY KEY (card_id, tag_id)
);

CREATE TABLE IF NOT EXISTS deck_tags (
  deck_id INTEGER NOT NULL REFERENCES decks (id),
  tag_id INTEGER NOT NULL REFERENCES tags (id),
  PRIMARY KEY (deck_id, tag_id)
);

-- Local mirror of Scryfall's "Oracle Cards" bulk-data file (one row per unique
-- card), refreshed on demand so lookups can resolve locally instead of
-- hitting Scryfall's live API for every search/import. See lib/scryfall-cache.ts.
CREATE TABLE IF NOT EXISTS scryfall_cache (
  id TEXT PRIMARY KEY,             -- Scryfall card id, matches cards.external_id
  oracle_id TEXT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  set_code TEXT,
  image_url TEXT,
  attributes TEXT NOT NULL,        -- JSON string, same shape as ScryfallResolvedCard['attributes']
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scryfall_cache_normalized_name ON scryfall_cache (normalized_name);

-- Single-row (id is always 1) record of the last refresh attempt, so the UI
-- can show "last refreshed" and surface failures without losing the
-- previously-good cache - a failed refresh never touches scryfall_cache.
CREATE TABLE IF NOT EXISTS scryfall_cache_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_refreshed_at TEXT,
  source_updated_at TEXT,          -- Scryfall's bulk-data manifest updated_at
  rows_loaded INTEGER,
  row_errors INTEGER,
  status TEXT,                     -- 'ok' | 'error'
  error_message TEXT
);

-- Local mirror of YGOPRODeck's full card database (cardinfo.php with no query
-- params returns every card in one JSON response - no bulk-file manifest/gzip
-- step needed, unlike Scryfall). See lib/ygoprodeck-cache.ts.
CREATE TABLE IF NOT EXISTS ygoprodeck_cache (
  id TEXT PRIMARY KEY,             -- YGOPRODeck's numeric card id (as text), matches cards.external_id
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  set_code TEXT,                   -- first card_sets[] entry only - not a unique identifier, cosmetic
  image_url TEXT,                  -- remote YGOPRODeck CDN URL; never a local path in this table
  attributes TEXT NOT NULL,        -- JSON string, same shape as YgoResolvedCard['attributes']
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ygoprodeck_cache_normalized_name ON ygoprodeck_cache (normalized_name);

-- Single-row (id is always 1) record of the last refresh attempt, mirrors
-- scryfall_cache_meta's purpose.
CREATE TABLE IF NOT EXISTS ygoprodeck_cache_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_refreshed_at TEXT,
  source_updated_at TEXT,          -- YGOPRODeck has no dataset-level timestamp; set equal to last_refreshed_at
  rows_loaded INTEGER,
  row_errors INTEGER,
  status TEXT,                     -- 'ok' | 'error'
  error_message TEXT
);
