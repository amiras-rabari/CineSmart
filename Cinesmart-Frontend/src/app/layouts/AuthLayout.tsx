import { Link, Outlet } from 'react-router';
import { Wordmark } from '@/components/layout/Wordmark';

/** Auth and email-link pages: wordmark, centred 420px card, "Back to home" ([COMP-1]). */
export function AuthLayout() {
  return (
    <main
      id="main"
      className="flex flex-1 flex-col items-center justify-center gap-6 page-gutter py-10"
    >
      <Link to="/" aria-label="CineSmart home" className="rounded-md">
        <Wordmark className="text-2xl" />
      </Link>
      <div className="w-full max-w-[420px] rounded-xl border bg-surface p-6 shadow-pop sm:p-8">
        <Outlet />
      </div>
      <Link to="/" className="rounded-sm text-sm text-muted-foreground hover:text-foreground">
        Back to home
      </Link>
    </main>
  );
}
