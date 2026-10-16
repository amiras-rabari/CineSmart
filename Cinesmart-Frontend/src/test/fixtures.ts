// Shared API fixtures in the contract shapes ([CONV-6], [CAT-1]).
import type { MovieDetails } from '@/api/catalog';
import type { MovieCard, Page, UserMovieState } from '@/api/types';

export function card(movieId: number, extra: Partial<MovieCard> = {}): MovieCard {
  return {
    movieId,
    title: `Film ${movieId}`,
    year: 2014,
    poster: null,
    imdbRating: 8.1,
    averageRating: null,
    likeCount: 0,
    dislikeCount: 0,
    inWatchlist: null,
    watched: null,
    ...extra,
  };
}

export function pageOf<T>(
  results: T[],
  { page = 0, size = 20, totalResults = results.length } = {},
): Page<T> {
  return { results, page, size, totalResults, totalPages: Math.ceil(totalResults / size) };
}

export const neutralState: UserMovieState = {
  inWatchlist: false,
  watched: false,
  rating: null,
  reaction: 'NEUTRAL',
};

export function movieDetails(extra: Partial<MovieDetails> = {}): MovieDetails {
  return {
    movieId: 118,
    imdbId: 'tt0816692',
    title: 'Interstellar',
    year: 2014,
    released: '2014-11-07',
    runtime: 169,
    plot: 'A team of explorers travel through a wormhole in space.',
    poster: null,
    contentType: 'movie',
    studio: 'Paramount Pictures',
    ratings: { imdb: 8.7, imdbVotes: 2154321, rottenTomatoes: 73, metascore: 74 },
    genres: [{ id: 15, name: 'Sci-Fi' }],
    languages: [{ id: 3, name: 'English' }],
    directors: [{ personId: 9, name: 'Christopher Nolan' }],
    writers: [{ personId: 10, name: 'Jonathan Nolan' }],
    cast: [{ personId: 20, name: 'Matthew McConaughey' }],
    platformStats: { averageRating: 8.4, ratingCount: 12, likeCount: 9, dislikeCount: 1 },
    availability: [
      { platform: 'Netflix', type: 'sub', url: 'https://www.netflix.com/title/70305903' },
      { platform: 'Apple TV', type: 'rent', url: null },
    ],
    userState: null,
    ...extra,
  };
}
