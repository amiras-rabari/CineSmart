import { Link } from 'react-router';
import { useSession } from '@/session/session-store';
import { Wordmark } from './Wordmark';

const linkClass = 'rounded-sm text-muted-foreground hover:text-foreground';

/** Brand line and a few links ([COMP-1], [DS-1]). */
export function Footer() {
  const { status } = useSession();
  return (
    <footer className="mt-auto border-t bg-surface">
      <div className="content-width flex flex-col gap-4 page-gutter py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Wordmark className="text-base" />
          <p className="text-xs text-subtle-foreground">
            CineSmart · Canadian streaming availability · Data from OMDb, TMDB and Watchmode
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <li>
              <Link to="/browse" className={linkClass}>
                Browse
              </Link>
            </li>
            <li>
              <Link to="/lists/imdb-top-250" className={linkClass}>
                IMDb Top 250
              </Link>
            </li>
            {status === 'anonymous' && (
              <li>
                <Link to="/login" className={linkClass}>
                  Sign in
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
