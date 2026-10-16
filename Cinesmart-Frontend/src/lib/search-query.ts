// Search `q` rule: 3–100 characters after trimming (contract [DISC-3], [CFG-1]).
// Plain code, not Zod: the header's SearchBox is in the main bundle.

export const SEARCH_MIN = 3;
export const SEARCH_MAX = 100;

export type SearchQueryResult = { ok: true; value: string } | { ok: false; message: string };

export function checkSearchQuery(raw: string): SearchQueryResult {
  const value = raw.trim();
  if (value.length < SEARCH_MIN) return { ok: false, message: 'Type at least 3 characters.' };
  if (value.length > SEARCH_MAX) return { ok: false, message: 'Use 100 characters or fewer.' };
  return { ok: true, value };
}
