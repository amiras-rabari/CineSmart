import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query';
import { env } from '@/lib/env';
import { queryClient } from '@/query/query-client';
import { router } from './router';

export function App() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        {/* Bottom-right on desktop, top-center on mobile; 4 s ([COMP-4]). */}
        <Toaster position={isDesktop ? 'bottom-right' : 'top-center'} duration={4000} />
      </TooltipProvider>
      {env.isDev && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
