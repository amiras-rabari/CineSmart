// /browse URL ⇄ filters ([ROUTES-4]): `?genreId=&languageId=&year=&page=`, only set params.
import type { BrowseFilters } from '@/api/discovery';

export const FILTER_NAMES = ['genreId', 'languageId', 'year'] as const;
export type FilterName = (typeof FILTER_NAMES)[number];

/** Year select: current year down to 1920 ([ROUTES-4]); the API accepts 1888–2100 ([DISC-2]). */
export const FIRST_YEAR_OPTION = 1920;

export function yearOptions(now = new Date()): number[] {
  const years: number[] = [];
  for (let year = now.getFullYear(); year >= FIRST_YEAR_OPTION; year--) years.push(year);
  return years;
}

export interface ParsedBrowseParams {
  filters: BrowseFilters;
  /** Filter params present in the URL but not a positive integer: dropped. */
  invalid: FilterName[];
}

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Reads the filters; non-numeric values are dropped and reported. Other params are ignored. */
export function parseBrowseParams(params: URLSearchParams): ParsedBrowseParams {
  const filters: BrowseFilters = {};
  const invalid: FilterName[] = [];
  for (const name of FILTER_NAMES) {
    const raw = params.get(name);
    if (raw === null) continue;
    const value = parseId(raw);
    if (value === null) invalid.push(name);
    else filters[name] = value;
  }
  return { filters, invalid };
}

/** The current params without the given filters (and the page, which no longer applies). */
export function withoutFilters(params: URLSearchParams, names: readonly string[]): string {
  const next = new URLSearchParams(params);
  for (const name of names) next.delete(name);
  next.delete('page');
  return searchString(next);
}

/** Sets or clears one filter and resets the page ([ROUTES-4]). Keeps the other params. */
export function withFilter(
  params: URLSearchParams,
  name: FilterName,
  value: number | undefined,
): string {
  const next = new URLSearchParams(params);
  if (value === undefined) next.delete(name);
  else next.set(name, String(value));
  next.delete('page');
  return searchString(next);
}

export function hasFilters(filters: BrowseFilters): boolean {
  return FILTER_NAMES.some((name) => filters[name] !== undefined);
}

/** `/browse` search string for a set of filters (page 1). */
export function browseSearch(filters: BrowseFilters): string {
  const next = new URLSearchParams();
  for (const name of FILTER_NAMES) {
    const value = filters[name];
    if (value !== undefined) next.set(name, String(value));
  }
  return searchString(next);
}

function searchString(params: URLSearchParams): string {
  const search = params.toString();
  return search ? `?${search}` : '';
}

/** Navigation state: which filter to focus on arrival (Browse menu "All languages…", "By year"). */
export interface BrowseLocationState {
  focus?: 'genre' | 'language' | 'year';
  /** Set when an invalid filter was just removed from the URL. */
  filterRemoved?: boolean;
}
