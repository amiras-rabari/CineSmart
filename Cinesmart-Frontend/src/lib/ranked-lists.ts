// Display copy for the ranked lists and For You ([ROUTES-2], [ROUTES-3]); titles match the home rows.
import type { HomeSectionKey } from '@/api/discovery';

export interface ListMeta {
  title: string;
  subtitle: string;
  /** Empty-state title on the list page. */
  empty: string;
  /** Where "See all" goes. */
  href: string;
}

export const LIST_META: Record<HomeSectionKey, ListMeta> = {
  'for-you': {
    title: 'For You',
    subtitle: 'Picked for you',
    empty: 'No recommendations right now.',
    href: '/for-you',
  },
  trending: {
    title: 'Trending Now',
    subtitle: 'Updated daily',
    empty: 'Nothing here yet.',
    href: '/lists/trending',
  },
  'top-rated': {
    title: 'Top Rated by CineSmart Users',
    subtitle: 'Weighted by CineSmart ratings (5+ ratings)',
    empty: 'No movie has 5 ratings yet. Rate movies to help build this list.',
    href: '/lists/top-rated',
  },
  'most-liked': {
    title: 'Most Liked',
    subtitle: 'Most likes from CineSmart members',
    empty: 'Nobody has liked a movie yet.',
    href: '/lists/most-liked',
  },
  'imdb-top-250': {
    title: 'IMDb Top 250',
    subtitle: 'IMDb rating, 25,000+ votes',
    empty: 'Nothing here yet.',
    href: '/lists/imdb-top-250',
  },
};

/** Grid page size for list pages (contract [CONV-4] default). */
export const LIST_PAGE_SIZE = 20;
/** Row page size for lazy row paging ([ROUTES-2]). */
export const ROW_PAGE_SIZE = 10;
