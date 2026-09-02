export interface ParsedBulkLine {
  raw: string;
  quantity: number;
  name: string;
}

// Lines that are section labels, not cards - common in exports from
// MTGGoldfish, Moxfield, Archidekt, etc.
const SECTION_HEADERS = new Set(['deck', 'sideboard', 'commander', 'companion', 'maybeboard']);

/**
 * Turns pasted decklist text into a list of { quantity, name } entries.
 * Accepts, per line:
 *   "4x Lightning Bolt"
 *   "4 Lightning Bolt"
 *   "4 Lightning Bolt (M10) 146"   - trailing set/collector info is stripped
 *   "4, Lightning Bolt"            - simple CSV-style
 * Blank lines, comments ("//" or "#"), and section headers are skipped.
 */
export function parseBulkList(text: string): ParsedBulkLine[] {
  const lines = text.split(/\r?\n/);
  const parsed: ParsedBulkLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    if (SECTION_HEADERS.has(line.toLowerCase().replace(/:$/, ''))) continue;

    if (line.includes(',')) {
      const [qtyPart, ...rest] = line.split(',');
      const qty = parseInt(qtyPart.trim(), 10);
      const namePart = rest.join(',').trim().replace(/^["']|["']$/g, '');

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
