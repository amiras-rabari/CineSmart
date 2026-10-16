// All user-visible numbers and dates go through here ([DEC-3]). Locale en-CA.
const LOCALE = 'en-CA';
const EMPTY = '—';

const oneDecimal = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const dateOnlyFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: 'UTC' });
const longDateOnlyFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeZone: 'UTC' });
const monthYearFormat = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });

/** IMDb or user rating, always one decimal: 9 → "9.0" (contract [CONV-3]). */
export function formatRating(value: number | null | undefined): string {
  return value == null ? EMPTY : oneDecimal.format(value);
}

/** Platform average (sent with two decimals), shown with one: 8.4 → "8.4". */
export function formatAverage(value: number | null | undefined): string {
  return value == null ? EMPTY : oneDecimal.format(value);
}

/** Likes, votes and other counts, compact above 1,000: 1234 → "1.2K". */
export function formatCount(value: number | null | undefined): string {
  if (value == null) return EMPTY;
  return Math.abs(value) < 1000 ? integer.format(value) : compact.format(value);
}

/** Full integer with grouping: 1234567 → "1,234,567". */
export function formatInteger(value: number | null | undefined): string {
  return value == null ? EMPTY : integer.format(value);
}

/**
 * ISO timestamp ("2026-10-12T14:03:00.123Z") or ISO date ("2014-11-07") → "Oct 12, 2026".
 * Date-only strings have no time zone, so they are formatted in UTC to avoid an off-by-one day.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;
  return (/^\d{4}-\d{2}-\d{2}$/.test(value) ? dateOnlyFormat : dateFormat).format(date);
}

/** ISO date ("2014-11-07") → "November 7, 2014" (details "Released"). */
export function formatLongDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : longDateOnlyFormat.format(date);
}

/** ISO timestamp → "September 2026" (profile "Member since"). */
export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? EMPTY : monthYearFormat.format(date);
}

/** Minutes → "2h 49m", "49m", "2h". */
export function formatRuntime(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return EMPTY;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "1 movie", "1,234 movies". */
export function formatCountOf(value: number, singular: string, plural = `${singular}s`): string {
  return `${formatInteger(value)} ${value === 1 ? singular : plural}`;
}
