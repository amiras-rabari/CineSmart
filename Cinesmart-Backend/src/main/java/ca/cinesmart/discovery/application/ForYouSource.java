package ca.cinesmart.discovery.application;

import ca.cinesmart.shared.api.PageParams;
import ca.cinesmart.shared.api.PageResponse;
import ca.cinesmart.shared.movie.MovieCard;

/**
 * The home "For You" row. Implemented by Recommendation, so Discovery doesn't depend on it and
 * Recommendation can still call DiscoveryService (e.g. for its cold start) without a cycle.
 */
public interface ForYouSource {

    /** A page of the user's recommendations as cards; totalResults is the full list size. */
    PageResponse<MovieCard> forYou(Long userId, PageParams page);
}
