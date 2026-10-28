const NUMBER_PATTERN = /^[-+]?(\d+(\.\d*)?|\.\d+)(e[-+]?\d+)?$/i;
const GROUPED_INTEGER_PART = /^[-+]?\d{1,3}(,\d{3})+(\.\d*)?(e[-+]?\d+)?$/i;

/**
 * The number a direct (non-formula) manual edit represents, or null when the
 * edit is text. The whole entry must be numeric — "12 units" is text, not 12 —
 * and comma thousands separators are accepted only in valid groups
 * ("1,000" → 1000, "1,00" → text).
 */
export function parseManualEditNumber(edit: string): number | null {
  const s = edit.trim();
  if (!s) return null;
  const plain = GROUPED_INTEGER_PART.test(s) ? s.replace(/,/g, "") : s;
  if (!NUMBER_PATTERN.test(plain)) return null;
  const value = Number(plain);
  return Number.isFinite(value) ? value : null;
}
