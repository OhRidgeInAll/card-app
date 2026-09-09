// Letters that don't separate into a base letter + combining accent under
// NFKD, so the generic strip below wouldn't catch them.
const SPECIAL_LETTERS: Record<string, string> = {
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  ß: 'ss',
};

/**
 * Normalizes a card name for local matching: lowercase, accents stripped,
 * punctuation (including "//" on split/double-faced cards) collapsed to
 * spaces. "Fire // Ice" and "Lim-Dûl's Vault" both normalize predictably
 * without needing to special-case split cards.
 */
export function normalizeCardName(name: string): string {
  let s = name.toLowerCase();
  for (const [special, replacement] of Object.entries(SPECIAL_LETTERS)) {
    s = s.split(special).join(replacement);
  }
  s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  return s;
}

/** Classic edit distance - fine for the short strings and small candidate sets here. */
export function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }

  return dist[rows - 1][cols - 1];
}
