import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';

/** Route error boundary: "Something went wrong." + reload; logs the error ([ROUTES-11]). */
export function RouteErrorBoundary() {
  const error = useRouteError();
  useEffect(() => {
    console.error('[route]', error);
  }, [error]);
  return (
    <ErrorState
      error={error}
      title="Something went wrong."
      onRetry={() => window.location.reload()}
      className="flex-1 py-24"
    />
  );
}
