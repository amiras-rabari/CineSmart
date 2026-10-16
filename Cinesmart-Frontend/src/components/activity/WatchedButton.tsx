import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMovieAction } from '@/features/movie/use-movie-actions';
import { cn } from '@/lib/utils';
import { PENDING_CLASS, pendingProps } from './pending-props';

interface WatchedButtonProps {
  movieId: number;
  active: boolean;
}

/** "Mark as watched" / "Watched" (tooltip "Click to unmark") ([COMP-3]). */
export function WatchedButton({ movieId, active }: WatchedButtonProps) {
  const { run, pending } = useMovieAction(movieId, 'watched');
  const button = (
    <Button
      type="button"
      variant={active ? 'outline' : 'secondary'}
      aria-pressed={active}
      {...pendingProps(pending)}
      onClick={() => run({ kind: 'watched', on: !active })}
      className={cn(PENDING_CLASS, active && 'border-primary/60 text-primary')}
    >
      {active ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
      {active ? 'Watched' : 'Mark as watched'}
    </Button>
  );
  if (!active) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>Click to unmark</TooltipContent>
    </Tooltip>
  );
}
