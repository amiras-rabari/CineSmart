import { Outlet } from 'react-router';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

/** App pages: skip link, sticky header, main, footer ([COMP-1]). */
export function ShellLayout() {
  return (
    <>
      <a
        href="#main"
        // Focus <main> directly: the router's hash handling would leave focus on the link.
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
