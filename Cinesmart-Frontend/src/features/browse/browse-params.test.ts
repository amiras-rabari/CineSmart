import { describe, expect, it } from 'vitest';
import {
  browseSearch,
  parseBrowseParams,
  withFilter,
  withoutFilters,
  yearOptions,
} from './browse-params';

const params = (search: string) => new URLSearchParams(search);

describe('parseBrowseParams', () => {
  it('reads the numeric filters', () => {
    expect(parseBrowseParams(params('genreId=8&languageId=1&year=2014&page=2'))).toEqual({
      filters: { genreId: 8, languageId: 1, year: 2014 },
      invalid: [],
    });
  });

  it('drops non-numeric, empty and non-positive filters and reports them', () => {
    expect(parseBrowseParams(params('genreId=abc&languageId=&year=2014'))).toEqual({
      filters: { year: 2014 },
      invalid: ['genreId', 'languageId'],
    });
    expect(parseBrowseParams(params('genreId=0&year=-1')).invalid).toEqual(['genreId', 'year']);
    expect(parseBrowseParams(params('year=20.5')).invalid).toEqual(['year']);
  });

  it('ignores other params (they are never sent)', () => {
    expect(parseBrowseParams(params('sort=x&q=abc'))).toEqual({ filters: {}, invalid: [] });
  });
});

describe('URL serialization', () => {
  it('withFilter sets or clears one filter, keeps the others and resets the page', () => {
    expect(withFilter(params('year=2014&page=3'), 'genreId', 8)).toBe('?year=2014&genreId=8');
    expect(withFilter(params('genreId=8&year=2014&page=2'), 'genreId', undefined)).toBe(
      '?year=2014',
    );
    expect(withFilter(params('page=2'), 'year', undefined)).toBe('');
  });

  it('withoutFilters drops the named params and the page, keeps the rest', () => {
    expect(withoutFilters(params('genreId=99999&year=2014&page=4&sort=x'), ['genreId'])).toBe(
      '?year=2014&sort=x',
    );
  });

  it('browseSearch writes only the set filters in a stable order', () => {
    expect(browseSearch({})).toBe('');
    expect(browseSearch({ year: 2014, genreId: 8 })).toBe('?genreId=8&year=2014');
  });

  it('year options run from the current year down to 1920', () => {
    const years = yearOptions(new Date('2026-10-12'));
    expect(years[0]).toBe(2026);
    expect(years.at(-1)).toBe(1920);
    expect(years).toHaveLength(107);
  });
});
