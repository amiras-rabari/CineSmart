import { ExternalLink, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Availability, AvailabilityType, MovieDetails } from '@/api/catalog';
import type { PersonRef } from '@/api/types';
import { InfoTooltip } from '@/components/feedback/InfoTooltip';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import {
  formatAverage,
  formatCount,
  formatCountOf,
  formatLongDate,
  formatRating,
} from '@/lib/format';

// Sections of the details page ([ROUTES-6]).

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-surface/80 p-4">
      <div className="flex items-center gap-1">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** IMDb, Rotten Tomatoes, Metascore; each hidden when null. */
export function ExternalRatings({ ratings }: { ratings: MovieDetails['ratings'] }) {
  const items = [
    ratings.imdb != null && {
      label: 'IMDb',
      value: `${formatRating(ratings.imdb)}/10`,
      note: ratings.imdbVotes != null ? `${formatCount(ratings.imdbVotes)} votes` : null,
    },
    ratings.rottenTomatoes != null && {
      label: 'Rotten Tomatoes',
      value: `${ratings.rottenTomatoes}%`,
      note: null,
    },
    ratings.metascore != null && {
      label: 'Metascore',
      value: String(ratings.metascore),
      note: null,
    },
  ].filter((item) => item !== false);

  return (
    <Panel title="Ratings">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ratings yet.</p>
      ) : (
        <dl className="flex flex-wrap gap-x-6 gap-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col">
              <dt className="text-xs text-subtle-foreground">{item.label}</dt>
              <dd className="text-lg font-semibold tabular">{item.value}</dd>
              {item.note && <dd className="text-xs text-subtle-foreground tabular">{item.note}</dd>}
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

/** Platform stats from the hourly batch (lag ≤ 1 h, contract [CFG-1]). */
export function CineSmartStats({
  stats,
  showHint,
}: {
  stats: MovieDetails['platformStats'];
  showHint: boolean;
}) {
  return (
    <Panel
      title="CineSmart"
      action={
        <InfoTooltip label="About CineSmart stats">CineSmart stats update every hour.</InfoTooltip>
      }
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="flex flex-col">
          {stats.averageRating != null ? (
            <p className="flex items-center gap-1 text-lg font-semibold tabular">
              <Star className="size-4 fill-primary text-primary" aria-hidden />
              {formatAverage(stats.averageRating)}
              <span className="sr-only">average</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No ratings yet</p>
          )}
          <p className="text-xs text-subtle-foreground tabular">
            {formatCountOf(stats.ratingCount, 'rating')}
          </p>
        </div>
        <p className="flex items-center gap-3 text-sm tabular">
          <span className="flex items-center gap-1">
            <ThumbsUp className="size-4 text-like" aria-hidden />
            {formatCount(stats.likeCount)}
            <span className="sr-only">likes</span>
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDown className="size-4 text-dislike" aria-hidden />
            {formatCount(stats.dislikeCount)}
            <span className="sr-only">dislikes</span>
          </span>
        </p>
      </div>
      {showHint && (
        <InlineAlert variant="info">
          Your rating counts toward the CineSmart average within the hour.
        </InlineAlert>
      )}
    </Panel>
  );
}

function People({ label, people }: { label: string; people: PersonRef[] }) {
  if (people.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-subtle-foreground">{label}</dt>
      <dd>
        <ul className="flex flex-wrap gap-x-1 text-sm">
          {people.map((person, index) => (
            <li key={person.personId}>
              <Link
                to={`/search?q=${encodeURIComponent(person.name)}`}
                className="rounded-sm underline-offset-4 hover:text-primary hover:underline"
              >
                {person.name}
              </Link>
              {index < people.length - 1 && <span aria-hidden>,</span>}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

/** Directors, Writers, Cast; names search for that person. */
export function Credits({ movie }: { movie: MovieDetails }) {
  const { directors, writers, cast } = movie;
  if (directors.length + writers.length + cast.length === 0) return <div />;
  return (
    <Section title="Credits">
      <dl className="flex flex-col gap-4">
        <People label={directors.length === 1 ? 'Director' : 'Directors'} people={directors} />
        <People label={writers.length === 1 ? 'Writer' : 'Writers'} people={writers} />
        <People label="Cast" people={cast} />
      </dl>
    </Section>
  );
}

export function DetailsList({ movie }: { movie: MovieDetails }) {
  const rows = [
    movie.released && { label: 'Released', value: formatLongDate(movie.released) },
    movie.studio && { label: 'Studio', value: movie.studio },
  ].filter((row) => !!row);
  if (rows.length === 0) return null;
  return (
    <Section title="Details">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-subtle-foreground">{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

const GROUPS: { type: AvailabilityType | null; label: string }[] = [
  { type: 'sub', label: 'Stream' },
  { type: 'free', label: 'Free' },
  { type: 'rent', label: 'Rent' },
  { type: 'buy', label: 'Buy' },
  { type: null, label: 'Other' },
];

const chip =
  'inline-flex items-center gap-1.5 rounded-md border bg-surface px-3 py-1.5 text-sm font-medium';

/** Availability in Canada grouped by type; each platform links out when it has a URL. */
export function WhereToWatch({ availability }: { availability: Availability[] }) {
  return (
    <Section title="Where to watch in Canada">
      {availability.length === 0 ? (
        <p className="text-sm text-muted-foreground">No streaming information for Canada yet.</p>
      ) : (
        <dl className="flex flex-col gap-4">
          {GROUPS.map(({ type, label }) => {
            const items = availability.filter((item) => item.type === type);
            if (items.length === 0) return null;
            return (
              <div key={label} className="flex flex-col gap-2">
                <dt className="text-sm text-subtle-foreground">{label}</dt>
                <dd>
                  <ul className="flex flex-wrap gap-2">
                    {items.map((item) => (
                      <li key={`${item.platform}-${item.url}`}>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${chip} transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
                          >
                            {item.platform}
                            <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        ) : (
                          <span className={chip}>{item.platform}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </Section>
  );
}
