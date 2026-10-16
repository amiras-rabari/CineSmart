import { Menu, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { loginPath } from '@/session/redirect';
import { useSession } from '@/session/session-store';
import { BrowseMenu } from './BrowseMenu';
import { MobileNav } from './MobileNav';
import { MAIN_LINKS } from './nav-links';
import { SearchBox } from './SearchBox';
import { UserMenu } from './UserMenu';
import { Wordmark } from './Wordmark';

/**
 * Desktop: wordmark, nav, search field, user menu. Tablet: wordmark, search field, menu button.
 * Mobile: wordmark, search icon (sheet), menu button ([COMP-1], [DS-3]).
 */
export function Header() {
  const { status } = useSession();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const signedIn = status === 'authenticated';
  const onSearchPage = location.pathname === '/search';
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const pathnameRef = useRef(location.pathname);
  const openedOnRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  });

  function openSheet(setOpen: (open: boolean) => void) {
    openedOnRef.current = location.pathname;
    setOpen(true);
  }

  /** The sheets are opened by state, not a Radix trigger, so focus is handed back here. */
  function handBackFocus(event: Event, button: HTMLButtonElement | null) {
    event.preventDefault();
    // After a navigation, `RouteAnnouncer` moves focus to the new h1 instead ([ARCH-6]).
    if (pathnameRef.current === openedOnRef.current) button?.focus();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-surface">
      <div className="content-width flex h-16 items-center gap-4 page-gutter">
        <Link to="/" aria-label="CineSmart home" className="shrink-0 rounded-md">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {MAIN_LINKS.filter((link) => !link.auth || signedIn).map(({ to, label, end }) => (
              <li key={to}>
                {to === '/browse' ? (
                  <BrowseMenu />
                ) : (
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground',
                        isActive ? 'text-primary' : 'text-muted-foreground',
                      )
                    }
                  >
                    {label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!onSearchPage && <SearchBox variant="header" className="hidden w-64 sm:block xl:w-80" />}
          {!onSearchPage && (
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              aria-label="Open search"
              ref={searchButtonRef}
              onClick={() => openSheet(setSearchOpen)}
            >
              <Search aria-hidden />
            </Button>
          )}

          <div className="hidden items-center gap-2 lg:flex">
            {signedIn && <UserMenu />}
            {status === 'anonymous' && (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to={loginPath(location.pathname + location.search)}>Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            ref={menuButtonRef}
            onClick={() => openSheet(setMenuOpen)}
          >
            <Menu aria-hidden />
          </Button>
        </div>
      </div>

      <MobileNav
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onCloseAutoFocus={(event) => handBackFocus(event, menuButtonRef.current)}
      />
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent
          side="top"
          className="bg-surface p-4 pt-12"
          onCloseAutoFocus={(event) => handBackFocus(event, searchButtonRef.current)}
        >
          <SheetTitle className="sr-only">Search</SheetTitle>
          <SearchBox variant="page" onSearched={() => setSearchOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
