/** Characters that fit on one line inside a node at font-size 10 */
const NAME_LINE_CHARS = 13;

/**
 * Break a full name into at most two lines that fit inside the symbol,
 * splitting at the space closest to the middle and truncating with an
 * ellipsis when a line is still too long.
 */
export function splitName(name: string): string[] {
  const clip = (s: string) => (s.length > NAME_LINE_CHARS ? s.slice(0, NAME_LINE_CHARS - 1) + '…' : s);
  if (name.length <= NAME_LINE_CHARS) return name ? [name] : [];
  const spaces = [...name.matchAll(/ /g)].map(m => m.index as number);
  if (spaces.length === 0) return [clip(name)];
  const mid = name.length / 2;
  const at = spaces.reduce((best, i) => (Math.abs(i - mid) < Math.abs(best - mid) ? i : best));
  return [clip(name.slice(0, at)), clip(name.slice(at + 1))];
}

/** 1 -> "I", 4 -> "IV", ... (generation labels) */
export function toRoman(n: number): string {
  const table: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, sym] of table) {
    while (n >= v) {
      out += sym;
      n -= v;
    }
  }
  return out;
}
