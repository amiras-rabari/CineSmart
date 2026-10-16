import { Film, Home, Search } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-document-title';

/** 404 content inside the shell: unknown paths, bad list keys, (P4) bad movie ids ([ROUTES-11]). */
export function NotFound({ variant = 'page' }: { variant?: 'page' | 'movie' }) {
  const title = variant === 'movie' ? 'Movie not found.' : "We couldn't find that page.";
  useDocumentTitle(variant === 'movie' ? 'Movie not found' : 'Page not found');
  return (
    <EmptyState
      icon={Film}
      title={title}
      headingLevel="h1"
      className="flex-1 py-24"
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/">
              <Home aria-hidden />
              Home
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/search">
              <Search aria-hidden />
              Search
            </Link>
          </Button>
        </div>
      }
    />
  );
}
