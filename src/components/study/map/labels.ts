/**
 * Node label text for the Discovery Map: wrapped to at most two short lines
 * so labels stay legible without overlapping their neighbors. The full label
 * is always available to assistive technology and in the details panel.
 */

export const LABEL_LINE_CHARS = 18;
export const LABEL_MAX_LINES = 2;
/** Approximate width of one character at the label font size, in layout units. */
export const LABEL_CHAR_WIDTH = 6.1;

/** Splits a label into at most `maxLines` lines of about `lineChars` characters, ending with "…" if cut. */
export function wrapLabel(label: string, lineChars = LABEL_LINE_CHARS, maxLines = LABEL_MAX_LINES): string[] {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= lineChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);

  // Break any single word longer than a line.
  const broken = lines.flatMap((line) => {
    if (line.length <= lineChars) return [line];
    const pieces: string[] = [];
    for (let start = 0; start < line.length; start += lineChars) pieces.push(line.slice(start, start + lineChars));
    return pieces;
  });
  if (broken.length <= maxLines) return broken;

  const kept = broken.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = `${last.length >= lineChars ? shorten(last, lineChars - 1) : last}…`;
  return kept;
}

/** The line cut to at most `length` characters, at a word boundary when there is one, so no word is left half-shown. */
function shorten(line: string, length: number): string {
  const room = line.slice(0, length);
  const space = room.lastIndexOf(" ");
  const midWord = line[length] !== undefined && line[length] !== " ";
  return (midWord && space > 0 ? room.slice(0, space) : room).trimEnd();
}

/** The widest line's approximate width. */
export function labelWidth(lines: readonly string[]): number {
  return Math.max(0, ...lines.map((line) => line.length)) * LABEL_CHAR_WIDTH;
}
