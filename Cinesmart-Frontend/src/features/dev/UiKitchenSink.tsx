import { useMutation } from '@tanstack/react-query';
import { Film, Inbox, Plug, Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/api/errors';
import { request } from '@/api/http';
import type { NamedRef } from '@/api/types';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { FullPageSplash } from '@/components/feedback/FullPageSplash';
import { InfoTooltip } from '@/components/feedback/InfoTooltip';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { notify } from '@/components/feedback/notify';
import { RetryAfterNotice } from '@/components/feedback/RetryAfterNotice';
import {
  CardSkeleton,
  DetailsSkeleton,
  GridSkeleton,
  RowSkeleton,
} from '@/components/feedback/Skeletons';
import { Wordmark } from '@/components/layout/Wordmark';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatAverage, formatCount, formatDate, formatRating, formatRuntime } from '@/lib/format';

const sampleNetworkError = new ApiError({
  status: 0,
  code: 'NETWORK_ERROR',
  message: 'Network error',
  path: '/api/v1/home',
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function PingApi() {
  const ping = useMutation({
    // A raw call proves CORS with credentials works (contract [CONV-1], [CAT-2]).
    mutationFn: () => request<NamedRef[]>('GET', '/genres', { auth: 'optional' }),
  });

  return (
    <div className="flex flex-col items-start gap-4">
      <Button onClick={() => ping.mutate()} disabled={ping.isPending}>
        <Plug aria-hidden />
        {ping.isPending ? 'Pinging…' : 'Ping API'}
      </Button>
      <div aria-live="polite">
        {ping.isSuccess && (
          <InlineAlert variant="success" title="API reachable">
            {`GET /genres returned ${ping.data.length} genres.`}
          </InlineAlert>
        )}
      </div>
      {ping.isError && (
        <ErrorState error={ping.error} onRetry={() => ping.mutate()} className="w-full" />
      )}
    </div>
  );
}

function RateLimitedDemo() {
  const [error, setError] = useState(() => makeRateLimited());
  return (
    <ErrorState
      error={error}
      onRetry={() => {
        notify.info('Auto-retry fired.');
        setError(makeRateLimited());
      }}
    />
  );
}

function makeRateLimited() {
  return new ApiError({
    status: 429,
    code: 'RATE_LIMITED',
    message: 'Too many requests',
    path: '/api/v1/movies',
    retryAfter: 5,
  });
}

/** Dev-only kitchen sink: every primitive and feedback component (plan [P0]). */
export function Component() {
  const [rating, setRating] = useState([7.5]);

  return (
    <main className="content-width flex flex-col gap-8 page-gutter py-10">
      <header className="flex flex-col gap-2">
        <Wordmark className="text-3xl" />
        <h1 className="text-2xl font-semibold lg:text-3xl">UI kitchen sink</h1>
        <p className="text-muted-foreground">
          Dev builds only. Tab through to check the focus ring.
        </p>
      </header>

      <Section title="API connectivity">
        <PingApi />
      </Section>

      <Section title="Typography and colour">
        <div className="flex flex-col gap-1">
          <p className="text-5xl font-bold">Hero 5xl</p>
          <p className="text-4xl font-semibold">Details title 4xl</p>
          <p className="text-3xl font-semibold">Page title 3xl</p>
          <p className="text-xl font-semibold">Row title xl</p>
          <p className="text-base">Body text base</p>
          <p className="text-sm text-muted-foreground">Secondary text sm (muted)</p>
          <p className="text-xs text-subtle-foreground">Caption xs (subtle)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            'bg-background',
            'bg-surface',
            'bg-surface-2',
            'bg-surface-3',
            'bg-border',
            'bg-primary',
            'bg-primary-hover',
            'bg-like',
            'bg-dislike',
            'bg-destructive',
            'bg-info',
          ].map((c) => (
            <div key={c} className="flex flex-col items-center gap-1">
              <div className={`size-12 rounded-md border border-border ${c}`} />
              <span className="text-xs text-subtle-foreground">{c.slice(3)}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground tabular">
          {`formatRating(9) = ${formatRating(9)} · formatAverage(8.4) = ${formatAverage(8.4)} · formatCount(1234567) = ${formatCount(1234567)} · formatDate('2014-11-07') = ${formatDate('2014-11-07')} · formatRuntime(169) = ${formatRuntime(169)}`}
        </p>
      </Section>

      <Section title="Buttons and badges">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Search">
            <Search aria-hidden />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-md gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ks-email">Email</Label>
            <Input id="ks-email" type="email" placeholder="you@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ks-invalid">Invalid input</Label>
            <Input id="ks-invalid" aria-invalid defaultValue="not an email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ks-genre">Genre</Label>
            <Select>
              <SelectTrigger id="ks-genre" className="w-full">
                <SelectValue placeholder="Any genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="action">Action</SelectItem>
                <SelectItem value="drama">Drama</SelectItem>
                <SelectItem value="sci-fi">Sci-Fi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label id="ks-rating-label">Rating: {formatRating(rating[0])}</Label>
            <Slider
              aria-labelledby="ks-rating-label"
              min={1}
              max={10}
              step={0.5}
              value={rating}
              onValueChange={setRating}
            />
          </div>
        </div>
      </Section>

      <Section title="Overlays">
        <div className="flex flex-wrap gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Dropdown menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Watchlist</DropdownMenuItem>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Popover</Button>
            </PopoverTrigger>
            <PopoverContent>Popover content on surface-2.</PopoverContent>
          </Popover>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove rating?</DialogTitle>
                <DialogDescription>This clears your rating for this movie.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Remove</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Mobile navigation lives here.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip text</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Average rating
            <InfoTooltip label="About average rating">
              Average of CineSmart user ratings, updated hourly.
            </InfoTooltip>
          </div>
        </div>
      </Section>

      <Section title="Toasts">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => notify.success('Added to your watchlist.')}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => notify.info('Ratings update hourly.')}>
            Info toast
          </Button>
          <Button variant="secondary" onClick={() => notify.error(sampleNetworkError)}>
            Error toast
          </Button>
        </div>
      </Section>

      <Section title="Card and separator">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description on surface.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Card body.</p>
            <Separator className="my-3" />
            <p className="text-sm text-muted-foreground">After the separator.</p>
          </CardContent>
          <CardFooter>
            <Button size="sm">Action</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Alerts">
        <Alert>
          <Film aria-hidden />
          <AlertTitle>Plain shadcn alert</AlertTitle>
          <AlertDescription>Base primitive.</AlertDescription>
        </Alert>
        <InlineAlert variant="error" title="Error">
          Invalid username or password.
        </InlineAlert>
        <InlineAlert variant="warning" title="Warning">
          This account is locked for up to an hour.
        </InlineAlert>
        <InlineAlert variant="success" title="Success">
          Your email is verified.
        </InlineAlert>
        <InlineAlert variant="info" title="Info">
          Ratings and likes update hourly.
        </InlineAlert>
        <RetryAfterNotice seconds={42} />
      </Section>

      <Section title="Empty and error states">
        <div className="grid gap-4 lg:grid-cols-3">
          <EmptyState
            icon={Inbox}
            title="Your watchlist is empty"
            description="Add movies to watch later."
            action={<Button>Browse movies</Button>}
            className="rounded-lg bg-surface"
          />
          <ErrorState
            error={sampleNetworkError}
            onRetry={() => notify.info('Retry clicked.')}
            className="rounded-lg bg-surface"
          />
          <div className="rounded-lg bg-surface">
            <RateLimitedDemo />
          </div>
        </div>
      </Section>

      <Section title="Skeletons">
        <Skeleton className="h-4 w-48" />
        <div className="w-40">
          <CardSkeleton />
        </div>
        <RowSkeleton />
        <GridSkeleton count={6} />
        <DetailsSkeleton />
      </Section>

      <Section title="Full-page splash">
        <div className="relative h-64 overflow-hidden rounded-lg border border-border [&>div]:min-h-full">
          <FullPageSplash />
        </div>
      </Section>
    </main>
  );
}
