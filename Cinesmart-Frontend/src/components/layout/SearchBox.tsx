import { Search } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { checkSearchQuery } from '@/lib/search-query';
import { cn } from '@/lib/utils';

interface SearchBoxProps {
  variant: 'header' | 'hero' | 'page';
  defaultValue?: string;
  /** Hint shown from the start (e.g. /search opened with an invalid `q`). */
  initialHint?: string | null;
  /** Called after a valid search navigated (e.g. to close the mobile sheet). */
  onSearched?: () => void;
  className?: string;
}

/** `role="search"` form; 3–100 chars after trim, else an inline hint and no request ([COMP-1]). */
export function SearchBox({
  variant,
  defaultValue = '',
  initialHint = null,
  onSearched,
  className,
}: SearchBoxProps) {
  const navigate = useNavigate();
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const [hint, setHint] = useState<string | null>(initialHint);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get('q');
    const result = checkSearchQuery(typeof raw === 'string' ? raw : '');
    if (!result.ok) {
      setHint(result.message);
      return;
    }
    setHint(null);
    void navigate(`/search?q=${encodeURIComponent(result.value)}`);
    onSearched?.();
  }

  const large = variant === 'hero' || variant === 'page';
  return (
    <form role="search" onSubmit={onSubmit} noValidate className={cn('relative', className)}>
      <label htmlFor={inputId} className="sr-only">
        Search movies or people
      </label>
      <Search
        className={cn(
          'pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground',
          large ? 'size-5' : 'size-4',
        )}
        aria-hidden
      />
      <Input
        id={inputId}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search movies or people"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={200}
        aria-invalid={hint ? true : undefined}
        aria-describedby={hint ? hintId : undefined}
        onChange={() => hint && setHint(null)}
        className={cn(
          'bg-surface-2 pl-9 dark:bg-surface-2',
          large ? 'h-12 pr-28 pl-11 text-base md:text-base' : 'h-9 pr-3',
        )}
      />
      {large && (
        <Button type="submit" className="absolute top-1/2 right-1.5 -translate-y-1/2">
          Search
        </Button>
      )}
      {hint && (
        <p
          id={hintId}
          role="alert"
          className={cn(
            'text-xs text-destructive-foreground',
            variant === 'header'
              ? 'absolute top-full left-0 mt-1 rounded bg-popover px-2 py-1 shadow-pop'
              : 'mt-1.5',
          )}
        >
          {hint}
        </p>
      )}
    </form>
  );
}
