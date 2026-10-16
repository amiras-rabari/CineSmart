import { Star } from 'lucide-react';
import { useId, useState } from 'react';
import type { UserMovieState } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { useMovieAction } from '@/features/movie/use-movie-actions';
import { formatRating } from '@/lib/format';
import { parseRating, RATING_HINT, RATING_MAX, RATING_MIN } from '@/lib/rating';
import { cn } from '@/lib/utils';
import { PENDING_CLASS, pendingProps } from './pending-props';

interface RatingControlProps {
  movieId: number;
  rating: number | null;
  /** After a successful change (the details page shows the lag hint once). */
  onChanged?: (state: UserMovieState) => void;
}

const DEFAULT_DRAFT = 7;

/**
 * Popover with a 1–10 slider (step 0.1) and a synced number input ([COMP-3], [ARCH-5]).
 * Sends only on Save or Remove; invalid input (8.55, 0.5, 11) is never sent.
 */
export function RatingControl({ movieId, rating, onChanged }: RatingControlProps) {
  const { run, pending, signedIn, promptSignIn } = useMovieAction(movieId, 'rating');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  const value = parseRating(draft);
  const invalid = value === null;
  const unchanged = value !== null && value === rating;

  function onOpenChange(next: boolean) {
    // Opening starts from the current rating; anonymous users go to sign in instead.
    if (next && !signedIn) {
      promptSignIn();
      return;
    }
    if (next) setDraft(formatRating(rating ?? DEFAULT_DRAFT));
    setOpen(next);
  }

  function save() {
    if (value === null || unchanged) return;
    setOpen(false);
    run({ kind: 'rating', value }, { onSuccess: onChanged });
  }

  function remove() {
    setOpen(false);
    run({ kind: 'rating', value: null }, { onSuccess: onChanged });
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={rating !== null ? 'outline' : 'secondary'}
          {...pendingProps(pending)}
          aria-label={
            rating !== null ? `Your rating: ${formatRating(rating)}. Change rating` : 'Rate'
          }
          className={cn(PENDING_CLASS, rating !== null && 'border-primary/60 text-primary')}
        >
          <Star className={cn(rating !== null && 'fill-current')} aria-hidden />
          {rating !== null ? formatRating(rating) : 'Rate'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={inputId}>Your rating</Label>
            <Input
              id={inputId}
              inputMode="decimal"
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-invalid={invalid || undefined}
              aria-describedby={hintId}
              className="h-8 w-20 text-right tabular"
            />
          </div>
          <Slider
            min={RATING_MIN}
            max={RATING_MAX}
            step={0.1}
            value={[value ?? rating ?? DEFAULT_DRAFT]}
            onValueChange={([next]) => next !== undefined && setDraft(next.toFixed(1))}
            aria-label="Rating from 1 to 10"
          />
          <p
            id={hintId}
            className={cn(
              'text-xs',
              invalid ? 'text-destructive-foreground' : 'text-muted-foreground',
            )}
          >
            {RATING_HINT}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {rating !== null && (
              <Button type="button" variant="ghost" size="sm" onClick={remove} className="mr-auto">
                Remove rating
              </Button>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={invalid || unchanged}>
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
