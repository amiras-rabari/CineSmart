import { describe, expect, it } from 'vitest';
import {
  formatAverage,
  formatCount,
  formatDate,
  formatInteger,
  formatRating,
  formatRuntime,
} from './format';

describe('format', () => {
  it('formats ratings with one decimal', () => {
    expect(formatRating(9)).toBe('9.0');
    expect(formatRating(8.7)).toBe('8.7');
    expect(formatRating(null)).toBe('—');
  });

  it('formats the platform average with one decimal', () => {
    expect(formatAverage(8.4)).toBe('8.4');
    expect(formatAverage(8.45)).toBe('8.5');
    expect(formatAverage(7)).toBe('7.0');
    expect(formatAverage(null)).toBe('—');
  });

  it('formats counts compactly above 1,000', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(950)).toBe('950');
    expect(formatCount(1234)).toBe('1.2K');
    expect(formatCount(2_345_678)).toBe('2.3M');
    expect(formatCount(undefined)).toBe('—');
  });

  it('formats integers with grouping', () => {
    expect(formatInteger(1234567)).toBe('1,234,567');
  });

  it('formats ISO dates and timestamps in en-CA', () => {
    expect(formatDate('2014-11-07')).toBe('Nov 7, 2014');
    expect(formatDate('2026-10-12T14:03:00.123456Z')).toMatch(/^Oct 1[12], 2026$/);
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not a date')).toBe('—');
  });

  it('formats runtimes', () => {
    expect(formatRuntime(169)).toBe('2h 49m');
    expect(formatRuntime(49)).toBe('49m');
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(0)).toBe('—');
    expect(formatRuntime(null)).toBe('—');
  });
});
