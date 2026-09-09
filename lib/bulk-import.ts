export interface ParsedBulkLine {
  raw: string;
  quantity: number;
  name: string;
}

// Lines that are section labels, not cards - common in exports from
// MTGGoldfish, Moxfield, Archidekt, YGOPRODeck's own deck builder, etc.
const SECTION_HEADERS = new Set([
  'deck', 'sideboard', 'commander', 'companion', 'maybeboard', // MTG
  'main deck', 'extra deck', 'side deck', // Yugioh
]);

/**
 * Turns pasted decklist text into a list of { quantity, name } entries.
 * Accepts, per line:
 *   "4x Lightning Bolt"
 *   "4 Lightning Bolt"
 *   "4 Lightning Bolt (M10) 146"   - trailing set/collector info is stripped
 *   "4, Lightning Bolt"            - simple CSV-style
 *   "1 Namor, Atlantean King"      - commas that are part of the card's own
 *                                    name are preserved, not mistaken for CSV
 * Blank lines, comments ("//" or "#"), and section headers are skipped.
 */
export function parseBulkList(text: string): ParsedBulkLine[] {
  const lines = text.split(/\r?\n/);
  const parsed: ParsedBulkLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    if (SECTION_HEADERS.has(line.toLowerCase().replace(/:$/, ''))) continue;

    //Somewhat hacky but we only interpret CSV style when Comma follows a number, Let's hope they don't make a card called 1, 2, Shoot!
    const csvMatch = line.match(/^(\d+)\s*,\s*(.+)$/);
    if (csvMatch) {
      const qty = parseInt(csvMatch[1], 10);
      const namePart = csvMatch[2].trim().replace(/^["']|["']$/g, '');

      if (Number.isFinite(qty) && qty > 0 && namePart) {
        parsed.push({ raw: line, quantity: qty, name: namePart });
        continue;
      }
    }

    const match = line.match(/^(\d+)\s*[xX]?\s+(.+)$/);
    if (match) {
      const qty = parseInt(match[1], 10);
      const name = match[2]
        .trim()
        .replace(/\s*[([][^)\]]*[)\]]\s*\d*\s*$/, '') // strip trailing "(SET) 123" / "[SET] 123"
        .trim();

      if (Number.isFinite(qty) && qty > 0 && name) {
        parsed.push({ raw: line, quantity: qty, name });
      }
    }
  }

  return parsed;
}
