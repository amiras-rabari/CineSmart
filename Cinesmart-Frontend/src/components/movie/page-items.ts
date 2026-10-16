/** First, last, current ± 1, with ellipses (1-based) ([COMP-2]). */
export function pageItems(page: number, totalPages: number): (number | 'gap')[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items: (number | 'gap')[] = [];
  for (const p of sorted) {
    const prev = items[items.length - 1];
    if (typeof prev === 'number' && p - prev === 2) items.push(prev + 1);
    else if (typeof prev === 'number' && p - prev > 2) items.push('gap');
    items.push(p);
  }
  return items;
}
