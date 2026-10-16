import { Film } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PosterImageProps {
  src: string | null;
  title: string;
  size?: 'card' | 'details';
  /** Above the fold: load eagerly. */
  priority?: boolean;
  className?: string;
}

/** 2:3 poster; missing, "N/A" or broken → gradient placeholder with icon + title ([DS-1], [COMP-2]). */
export function PosterImage({ src, title, size = 'card', priority, className }: PosterImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const usable = !!src && src !== 'N/A' && failedSrc !== src;

  return (
    <div
      className={cn(
        'relative aspect-[2/3] w-full overflow-hidden rounded-md bg-surface-2',
        className,
      )}
    >
      {usable ? (
        <img
          src={src}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={title}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-surface-2 to-surface-3 p-3 text-center"
        >
          <Film
            className={cn('text-subtle-foreground', size === 'details' ? 'size-12' : 'size-8')}
            aria-hidden
          />
          <span
            aria-hidden
            className={cn(
              'line-clamp-2 font-medium text-muted-foreground',
              size === 'details' ? 'text-base' : 'text-xs',
            )}
          >
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
