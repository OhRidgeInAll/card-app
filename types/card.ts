export type Game = 'mtg' | 'yugioh' | 'hololive';

export interface CardAttributes {
  [key: string]: unknown;
}

export interface CollectionRow {
  id: number;
  card_id: number;
  quantity_owned: number;
  condition: string;
  name: string;
  game: Game;
  set_code: string | null;
  image_url: string | null;
  // Which specific printing this row's copies are (MTG only, set via bulk
  // import or the print picker)
  printing_external_id: string | null;
  printing_set_code: string | null;
  printing_image_url: string | null;
  printing_attributes: string | null;
}

export interface ScryfallSearchResult {
  external_id: string;
  name: string;
  set_code: string;
  image_url: string | null;
  attributes: CardAttributes;
}

// Same shape as ScryfallSearchResult, generic name for non-MTG sources (e.g. YGOPRODeck).
export type CardSearchResult = ScryfallSearchResult;
