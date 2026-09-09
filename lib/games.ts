import type { Game } from '@/types/card';

export const GAME_LABELS: Record<Game, string> = {
  mtg: 'Magic: The Gathering',
  yugioh: 'Yu-Gi-Oh!',
  hololive: 'Hololive OCG',
};

export function gameLabel(game: string): string {
  return GAME_LABELS[game as Game] ?? game;
}
