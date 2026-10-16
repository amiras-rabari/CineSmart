import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * After a client-side navigation to a new path: move focus to the page `h1` and announce the
 * new document title to screen readers ([ARCH-6]). Not on the first load.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const regionRef = useRef<HTMLParagraphElement>(null);
  // The last path handled; a ref flag for "first render" would fire on StrictMode's re-run.
  const handledPathname = useRef(pathname);

  useEffect(() => {
    if (handledPathname.current === pathname) return;
    handledPathname.current = pathname;
    // Next frame: the page's own effects (document title) have run.
    const frame = requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('#main h1');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      if (regionRef.current) regionRef.current.textContent = document.title;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return <p ref={regionRef} role="status" aria-live="polite" className="sr-only" />;
}
