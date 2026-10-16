import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorState } from '@/components/feedback/ErrorState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { formatInteger, formatMonthYear } from '@/lib/format';
import { profileQuery, reactionsQuery } from '@/query/me-queries';
import { signOut } from '@/session/session-manager';
import { useViewer } from '@/session/session-store';
import { ChangeEmailForm } from './ChangeEmailForm';
import { ChangePasswordForm } from './ChangePasswordForm';

/** `/profile` (login): [ROUTES-8]; contract [ME-1] [ME-5] [AUTH-11] [AUTH-12] [AUTH-6]. */
export function Component() {
  useDocumentTitle('Profile');
  const v = useViewer();
  const navigate = useNavigate();
  const profile = useQuery(profileQuery(v));
  const reactions = useQuery(reactionsQuery(v));

  async function handleSignOut() {
    await signOut();
    void navigate('/');
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 page-gutter py-8 lg:py-10">
      <PageHeader title="Profile" />

      {profile.isPending ? (
        <ProfileSkeleton />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      ) : (
        <>
          <SectionCard title="Account">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Item label="Username">
                {profile.data.username}
                <p className="text-xs text-subtle-foreground">Usernames can&apos;t be changed.</p>
              </Item>
              <Item label="Email">{profile.data.email}</Item>
              <Item label="Member since">{formatMonthYear(profile.data.createdAt)}</Item>
            </dl>
          </SectionCard>

          <SectionCard title="Your activity">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Count label="Watchlist" value={profile.data.watchlistCount} href="/watchlist" />
              <Count label="Ratings" value={profile.data.ratingCount} href="/ratings" />
              <Count label="Watched" value={profile.data.watchedCount} />
              <Count
                label="Liked"
                value={reactions.data?.filter((r) => r.reaction === 'LIKE').length}
              />
              <Count
                label="Disliked"
                value={reactions.data?.filter((r) => r.reaction === 'DISLIKE').length}
              />
            </dl>
            {reactions.isError && (
              <p className="mt-3 text-xs text-muted-foreground">
                Couldn&apos;t load your likes.{' '}
                <button
                  type="button"
                  onClick={() => void reactions.refetch()}
                  className="text-primary underline underline-offset-4"
                >
                  Retry
                </button>
              </p>
            )}
          </SectionCard>
        </>
      )}

      <SectionCard title="Change password" description="Other devices will be signed out.">
        <ChangePasswordForm />
      </SectionCard>

      <SectionCard
        title="Change email"
        description="We'll send a confirmation link to the new address."
      >
        <ChangeEmailForm />
      </SectionCard>

      <div>
        <Button variant="secondary" onClick={() => void handleSignOut()}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="bg-surface">
      <CardHeader>
        <CardTitle>
          <h2 className="text-base font-semibold">{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-subtle-foreground">{label}</dt>
      <dd className="font-medium break-words">{children}</dd>
    </div>
  );
}

function Count({ label, value, href }: { label: string; value?: number; href?: string }) {
  const number = (
    <span className="text-2xl font-semibold tabular">
      {value === undefined ? '–' : formatInteger(value)}
    </span>
  );
  return (
    <div className="flex flex-col-reverse gap-0.5 rounded-md bg-surface-2 p-3">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd>
        {href ? (
          <Link
            to={href}
            className="rounded-sm hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`${label}: ${value ?? 'loading'}. Open`}
          >
            {number}
          </Link>
        ) : (
          number
        )}
      </dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <span role="status" className="sr-only">
        Loading…
      </span>
      <Skeleton aria-hidden className="h-40 w-full rounded-xl" />
      <Skeleton aria-hidden className="h-36 w-full rounded-xl" />
    </div>
  );
}
