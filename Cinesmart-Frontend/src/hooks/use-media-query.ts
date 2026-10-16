import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Desktop is ≥ 1024px ([DS-3]). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/** Tablet and up is ≥ 640px; below is mobile ([DS-3]). */
export const TABLET_UP_QUERY = '(min-width: 640px)';
