// Rating rule: 1.0–10.0 with at most one decimal (contract [ACT-6], [CFG-1]).

export const RATING_MIN = 1;
export const RATING_MAX = 10;
export const RATING_HINT = 'Use a number from 1 to 10 with at most one decimal.';

/** The rating typed by the user, or `null` when it breaks the rule (8.55, 0.5, 11, "abc"). */
export function parseRating(raw: string): number | null {
  const value = raw.trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d)?$/.test(value)) return null;
  const rating = Number(value);
  return rating >= RATING_MIN && rating <= RATING_MAX ? rating : null;
}
