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
