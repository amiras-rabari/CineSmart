import { Clapperboard } from 'lucide-react';
import { cn } from '@/lib/utils';

/** "Cine**Smart**" text wordmark with the Clapperboard icon ([DS-1]). Size it with `text-*` classes. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[0.35em] text-xl font-bold tracking-tight',
        className,
      )}
    >
      <Clapperboard className="size-[1.1em] text-primary" aria-hidden />
      <span>
        Cine<span className="text-primary">Smart</span>
      </span>
    </span>
  );
}
