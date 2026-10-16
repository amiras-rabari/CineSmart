import { Star } from 'lucide-react';
import { formatAverage, formatRating } from '@/lib/format';
import { cn } from '@/lib/utils';

interface RatingBadgesProps {
  imdb?: number | null;
  average?: number | null;
  userRating?: number | null;
  className?: string;
}

const badge = 'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium tabular';

/** IMDb (neutral), CineSmart average (amber star), your rating (amber filled) ([COMP-2]). */
export function RatingBadges({ imdb, average, userRating, className }: RatingBadgesProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {imdb != null && (
        <span className={cn(badge, 'bg-surface-3 text-foreground')}>
          <span className="text-subtle-foreground">IMDb</span>
          {formatRating(imdb)}
        </span>
      )}
      {average != null && (
        <span className={cn(badge, 'bg-surface-3 text-foreground')}>
          <Star className="size-3 text-primary" aria-hidden />
          <span className="sr-only">CineSmart average</span>
          {formatAverage(average)}
        </span>
      )}
      {userRating != null && (
        <span className={cn(badge, 'bg-primary text-primary-foreground')}>
          <Star className="size-3 fill-current" aria-hidden />
          <span className="sr-only">Your rating</span>
          {formatRating(userRating)}
        </span>
      )}
    </div>
  );
}
