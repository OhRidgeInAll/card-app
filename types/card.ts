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
}

export interface ScryfallSearchResult {
  external_id: string;
  name: string;
  set_code: string;
  image_url: string | null;
  attributes: CardAttributes;
}
