package ca.cinesmart.discovery;

import ca.cinesmart.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** /movies/trending, /top-rated, /most-liked, /imdb-top-250 and GET /home (change.md Q21). */
class RankedListsAndHomeIntegrationTest extends IntegrationTest {

    @Test
    void trendingIsTheTop10TableByImdbRating() throws Exception {
        mvc.perform(get("/api/v1/movies/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].movieId", contains(4, 1, 10, 12, 20)))
                .andExpect(jsonPath("$.totalResults").value(5));
    }

    @Test
    void imdbTop250NeedsEnoughVotesAndARating() throws Exception {
        mvc.perform(get("/api/v1/movies/imdb-top-250"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalResults").value(18))
                .andExpect(jsonPath("$.results[*].movieId",
                        contains(11, 6, 4, 1, 5, 9, 10, 17, 18, 8, 14, 7, 13, 12, 3, 2, 19, 20)));
    }

    @Test
    void imdbTop250StopsAt250() throws Exception {
        mvc.perform(get("/api/v1/movies/imdb-top-250").param("page", "13").param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(18));
    }

    @Test
    void topRatedNeedsFiveRatingsAndUsesTheWeightedRating() throws Exception {
        analytics(8, 5, "9.40", "9.33", 0, 0);
        analytics(14, 5, "9.40", "9.33", 0, 0);
        analytics(12, 6, "7.20", "7.00", 0, 0);
        analytics(3, 4, "10.00", "9.90", 0, 0); // too few ratings

        mvc.perform(get("/api/v1/movies/top-rated"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].movieId", contains(8, 14, 12)))
                .andExpect(jsonPath("$.results[0].averageRating").value(9.4))
                .andExpect(jsonPath("$.totalResults").value(3));
    }

    @Test
    void mostLikedCountsLikesOnly() throws Exception {
        analytics(3, 0, null, null, 5, 0);
        analytics(7, 0, null, null, 2, 9);
        analytics(9, 0, null, null, 2, 0);
        analytics(12, 0, null, null, 0, 7);

        mvc.perform(get("/api/v1/movies/most-liked"))
                .andExpect(jsonPath("$.results[*].movieId", contains(3, 7, 9)))
                .andExpect(jsonPath("$.results[1].likeCount").value(2))
                .andExpect(jsonPath("$.results[1].dislikeCount").value(9));
    }

    @Test
    void listsBasedOnUserActivityAreEmptyWithoutIt() throws Exception {
        mvc.perform(get("/api/v1/movies/top-rated"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(0));
        mvc.perform(get("/api/v1/movies/most-liked"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(0)));
    }

    @Test
    void anonymousHomeSkipsEmptyRowsAndNeverRepeatsAMovie() throws Exception {
        mvc.perform(get("/api/v1/home"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[*].key", contains("trending", "imdb-top-250")))
                .andExpect(jsonPath("$.sections[0].title").value("Trending Now"))
                .andExpect(jsonPath("$.sections[0].endpoint").value("/api/v1/movies/trending"))
                .andExpect(jsonPath("$.sections[0].totalResults").value(5))
                .andExpect(jsonPath("$.sections[0].results[*].movieId", contains(4, 1, 10, 12, 20)))
                .andExpect(jsonPath("$.sections[1].endpoint").value("/api/v1/movies/imdb-top-250"))
                .andExpect(jsonPath("$.sections[1].totalResults").value(18))
                .andExpect(jsonPath("$.sections[1].results[*].movieId", contains(11, 6, 5, 9, 17, 18, 8, 14, 7, 13)))
                .andExpect(jsonPath("$.sections[1].results[0].inWatchlist").doesNotExist());
    }

    @Test
    void loggedInHomeStartsWithForYouAndDedupesTheRest() throws Exception {
        Session session = loginAs("alice");
        // No activity yet: For You is the cold start list (Top Rated is empty, so IMDb Top 250).
        mvc.perform(get("/api/v1/home").with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[*].key", contains("for-you", "trending", "imdb-top-250")))
                .andExpect(jsonPath("$.sections[0].title").value("For You"))
                .andExpect(jsonPath("$.sections[0].endpoint").value("/api/v1/recommendations"))
                .andExpect(jsonPath("$.sections[0].totalResults").value(18))
                .andExpect(jsonPath("$.sections[0].results[*].movieId", contains(11, 6, 4, 1, 5, 9, 10, 17, 18, 8)))
                .andExpect(jsonPath("$.sections[1].results[*].movieId", contains(12, 20)))
                .andExpect(jsonPath("$.sections[2].results[*].movieId", contains(14, 7, 13, 3, 2, 19)))
                .andExpect(jsonPath("$.sections[0].results[0].inWatchlist").value(false));
    }

    private void analytics(long movieId, int ratingCount, String average, String weighted, int likes, int dislikes) {
        jdbc.update("""
                INSERT INTO movie_analytics (movie_id, rating_count, average_rating, weighted_rating, like_count, dislike_count)
                VALUES (?, ?, CAST(? AS NUMERIC), CAST(? AS NUMERIC), ?, ?)
                ON CONFLICT (movie_id) DO UPDATE SET rating_count = EXCLUDED.rating_count,
                    average_rating = EXCLUDED.average_rating, weighted_rating = EXCLUDED.weighted_rating,
                    like_count = EXCLUDED.like_count, dislike_count = EXCLUDED.dislike_count
                """, movieId, ratingCount, average, weighted, likes, dislikes);
    }
}
