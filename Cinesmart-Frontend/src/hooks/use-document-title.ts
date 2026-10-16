import { useEffect } from 'react';

/** `<Page> · CineSmart` ([ARCH-6]). */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · CineSmart` : 'CineSmart';
  }, [title]);
}
