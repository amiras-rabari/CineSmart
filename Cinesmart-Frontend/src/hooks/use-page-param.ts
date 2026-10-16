import { useSearchParams, type To } from 'react-router';

/** `?page=N` is 1-based in URLs; absent or invalid → 1 ([ARCH-6]). */
export function parsePageParam(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Search string for a page: page 1 drops the param. Keeps the other params. */
export function pageSearch(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete('page');
  else next.set('page', String(page));
  const search = next.toString();
  return search ? `?${search}` : '';
}

export function usePageParam() {
  const [params] = useSearchParams();
  const page = parsePageParam(params.get('page'));
  return {
    page,
    /** Link target for a page on the current path. */
    hrefForPage: (target: number): To => ({ search: pageSearch(params, target) }),
  };
}
