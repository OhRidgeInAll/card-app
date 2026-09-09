import type { ReactNode } from 'react';
import type { CardSearchResult, Game } from '@/types/card';

// Per-game config for the shared search/add/import components. The card
// shapes are identical across games (the game-specific fields live inside the
// opaque `attributes` blob), so the only real per-game differences are:
//   - which search API to hit
//   - how to render the small subtitle line under a search result
//   - the bulk-import copy
// Everything else is shared.
export interface GameConfig {
  searchPath: string;
  subtitle: (card: CardSearchResult) => string;
  importIntro: ReactNode;
  importPlaceholder: string;
  importBothLabel: string;
  errorSource: string;
}

export const GAME_CONFIG: Record<Game, GameConfig> = {
  mtg: {
    searchPath: '/api/scryfall/search',
    subtitle: (card) => card.set_code?.toUpperCase() ?? '',
    importIntro: (
      <>
        Paste a decklist, one card per line — <code>4x Lightning Bolt</code>,{' '}
        <code>4 Lightning Bolt (M10) 146</code>, or <code>4, Lightning Bolt</code> all work. Set
        and collector-number info gets ignored.
      </>
    ),
    importPlaceholder: '4x Lightning Bolt\n1 Sol Ring\n2 Counterspell',
    importBothLabel: 'Collection + a deck (e.g. a precon you just bought)',
    errorSource: 'Scryfall',
  },
  yugioh: {
    searchPath: '/api/ygoprodeck/search',
    subtitle: (card) => (card.attributes as { type?: string }).type ?? '',
    importIntro: (
      <>
        Paste a decklist, one card per line — <code>3x Ash Blossom &amp; Joyous Spring</code>,{' '}
        <code>2 Nibiru, the Primal Being</code>, or <code>1, Called by the Grave</code> all work.
        &quot;Main Deck:&quot; / &quot;Extra Deck:&quot; / &quot;Side Deck:&quot; section labels
        are skipped automatically.
      </>
    ),
    importPlaceholder: 'Main Deck:\n3x Ash Blossom & Joyous Spring\n1 Nibiru, the Primal Being',
    importBothLabel: 'Collection + a deck (e.g. a structure deck you just bought)',
    errorSource: 'YGOPRODeck',
  },
  hololive: {
    // No Hololive search/import yet - placeholder so `Record<Game, GameConfig>`
    // stays exhaustive; nothing routes here until the API exists.
    searchPath: '/api/hololive/search',
    subtitle: () => '',
    importIntro: null,
    importPlaceholder: '',
    importBothLabel: 'Collection + a deck',
    errorSource: 'the card API',
  },
};
