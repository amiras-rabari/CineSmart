package ca.cinesmart.recommendation;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /recommendations (change.md Q22) on the seeded catalog. Expected orders are worked out by hand from
 * score = 0.4·genre + 0.3·people + 0.1·language + 0.2·imdb/10 (see test-seed.sql for the data).
 */
class RecommendationIntegrationTest extends IntegrationTest {

    /** Rated The Matrix 9, liked Reloaded, watched John Wick: an Action / Sci-Fi / Keanu Reeves fan. */
    private Session matrixFan() throws Exception {
        Session s = loginAs("neo");
        rate(s, 1, 9.0);
        react(s, 2, "LIKE");
        mvc.perform(put("/api/v1/movies/3/watched").with(bearer(s))).andExpect(status().isOk());
        return s;
    }

    @Test
    void rankedByTasteWithAReasonForEachPick() throws Exception {
        Session s = matrixFan();

        mvc.perform(get("/api/v1/recommendations").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].movieId", contains(20, 4, 6, 5, 17, 10)))
                .andExpect(jsonPath("$.totalResults").value(6))
                .andExpect(jsonPath("$.results[0].reason").value("Because you liked The Matrix"))
                .andExpect(jsonPath("$.results[1].reason").value("Because you liked The Matrix"))
                .andExpect(jsonPath("$.results[2].reason").value("Matches your taste in Action"))
                .andExpect(jsonPath("$.results[3].reason").value("Matches your taste in Sci-Fi"))
                .andExpect(jsonPath("$.results[5].reason").value("Matches your taste in Crime"))
                .andExpect(jsonPath("$.results[0].title").value("The Matrix Resurrections"))
                .andExpect(jsonPath("$.results[0].inWatchlist").value(false));
    }

    @Test
    void peopleReasonWhenThePeopleMatchOutweighsTheGenreMatch() throws Exception {
        Session s = loginAs("cinephile");
        rate(s, 11, 9.0);
        rate(s, 6, 9.0);
        rate(s, 5, 9.0);

        mvc.perform(get("/api/v1/recommendations").with(bearer(s)))
                .andExpect(jsonPath("$.results[0].movieId").value(4))
                .andExpect(jsonPath("$.results[0].reason").value("More with Christopher Nolan"));
    }

    @Test
    void moviesTheUserAlreadyActedOnAreNeverRecommended() throws Exception {
        Session s = matrixFan();
        mvc.perform(put("/api/v1/movies/20/watchlist").with(bearer(s))).andExpect(status().isOk());
        react(s, 4, "DISLIKE");

        mvc.perform(get("/api/v1/recommendations").with(bearer(s)))
                .andExpect(jsonPath("$.results[*].movieId", contains(6, 5, 17, 10)));
    }

    @Test
    void pagination() throws Exception {
        Session s = matrixFan();
        mvc.perform(get("/api/v1/recommendations").param("size", "2").param("page", "1").with(bearer(s)))
                .andExpect(jsonPath("$.results[*].movieId", contains(6, 5)))
                .andExpect(jsonPath("$.totalResults").value(6))
                .andExpect(jsonPath("$.totalPages").value(3));
        mvc.perform(get("/api/v1/recommendations").param("size", "31").with(bearer(s)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void coldStartUsesPopularMoviesWithoutTheUsersOwn() throws Exception {
        Session s = loginAs("newbie");
        mvc.perform(put("/api/v1/movies/11/watched").with(bearer(s))).andExpect(status().isOk());
        rate(s, 6, 5.0); // below 7: excluded, but not a taste signal

        mvc.perform(get("/api/v1/recommendations").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalResults").value(16))
                .andExpect(jsonPath("$.results[*].movieId",
                        contains(4, 1, 5, 9, 10, 17, 18, 8, 14, 7, 13, 12, 3, 2, 19, 20)))
                .andExpect(jsonPath("$.results[*].reason", everyItem(is("Popular on CineSmart"))));
    }

    @Test
    void homeForYouRowMatchesTheFirstRecommendationsPage() throws Exception {
        Session s = matrixFan();
        mvc.perform(get("/api/v1/home").with(bearer(s)))
                .andExpect(jsonPath("$.sections[0].key").value("for-you"))
                .andExpect(jsonPath("$.sections[0].totalResults").value(6))
                .andExpect(jsonPath("$.sections[0].results[*].movieId", contains(20, 4, 6, 5, 17, 10)))
                .andExpect(jsonPath("$.sections[0].results[0].reason").doesNotExist());
    }

    @Test
    void recommendationsNeedLogin() throws Exception {
        mvc.perform(get("/api/v1/recommendations")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/recommendations").with(bearer("garbage"))).andExpect(status().isUnauthorized());
    }

    @Test
    void signalMoviesWithFewFeaturesStillGiveResults() throws Exception {
        Session s = loginAs("orphanfan");
        // Movie 19 has no genres, languages or people; only 15 and 16 (Drama) feed the taste profile.
        rate(s, 19, 9.0);
        react(s, 16, "LIKE");
        mvc.perform(put("/api/v1/movies/15/watchlist").with(bearer(s))).andExpect(status().isOk());

        mvc.perform(get("/api/v1/recommendations").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(org.hamcrest.Matchers.greaterThan(0))));
    }

    private void rate(Session s, long movieId, double rating) throws Exception {
        mvc.perform(put("/api/v1/movies/" + movieId + "/rating").with(bearer(s))
                .contentType(MediaType.APPLICATION_JSON).content(Json.of("rating", rating))).andExpect(status().isOk());
    }

    private void react(Session s, long movieId, String reaction) throws Exception {
        mvc.perform(put("/api/v1/movies/" + movieId + "/reaction").with(bearer(s))
                .contentType(MediaType.APPLICATION_JSON).content(Json.of("reaction", reaction))).andExpect(status().isOk());
    }
}
