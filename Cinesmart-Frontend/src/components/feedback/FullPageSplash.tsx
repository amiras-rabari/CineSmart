import { Wordmark } from '@/components/layout/Wordmark';

/** Shown while the session restores on load ([COMP-4]). */
export function FullPageSplash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="animate-splash-pulse">
        <Wordmark className="text-3xl" />
      </div>
      <span role="status" className="sr-only">
        Loading CineSmart…
      </span>
    </div>
  );
}
