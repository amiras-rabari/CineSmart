import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, type To } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { formatInteger } from '@/lib/format';
import { cn } from '@/lib/utils';
import { pageItems } from './page-items';

interface PaginationBarProps {
  /** 1-based. */
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => To;
  className?: string;
}

/** Prev / pages / Next as links (`?page=`). Hidden when there is one page. New pages scroll to top. */
export function PaginationBar({ page, totalPages, hrefForPage, className }: PaginationBarProps) {
  if (totalPages <= 1) return null;
  const linkClass = buttonVariants({ variant: 'ghost', size: 'sm' });
  const disabledClass = cn(linkClass, 'pointer-events-none opacity-40');

  return (
    <nav aria-label="Pagination" className={cn('flex justify-center', className)}>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          {page > 1 ? (
            <Link to={hrefForPage(page - 1)} className={linkClass} rel="prev">
              <ChevronLeft aria-hidden />
              Previous
            </Link>
          ) : (
            <span className={disabledClass} aria-disabled="true">
              <ChevronLeft aria-hidden />
              Previous
            </span>
          )}
        </li>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 text-muted-foreground">
              …
            </li>
          ) : (
            <li key={item} className={item === page ? undefined : 'hidden sm:block'}>
              <Link
                to={hrefForPage(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  linkClass,
                  'min-w-9 tabular',
                  item === page && 'bg-primary text-primary-foreground hover:bg-primary-hover',
                )}
              >
                {formatInteger(item)}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link to={hrefForPage(page + 1)} className={linkClass} rel="next">
              Next
              <ChevronRight aria-hidden />
            </Link>
          ) : (
            <span className={disabledClass} aria-disabled="true">
              Next
              <ChevronRight aria-hidden />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
