package ca.cinesmart.activity;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.sql.Timestamp;
import java.time.Instant;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /me/watchlist, /me/watched, /me/ratings, /me/reactions (change.md Q15). */
class MyListsIntegrationTest extends IntegrationTest {

    @Test
    void emptyListsAre200NotErrors() throws Exception {
        Session s = loginAs("alice");
        mvc.perform(get("/api/v1/me/watchlist").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(0));
        mvc.perform(get("/api/v1/me/watched").with(bearer(s))).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/v1/me/ratings").with(bearer(s))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me/reactions").with(bearer(s))).andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void watchlistIsNewestFirstWithFlattenedCards() throws Exception {
        Session s = loginAs("alice");
        add(s, 1, "2024-01-01T00:00:00Z");
        add(s, 4, "2024-03-01T00:00:00Z");
        add(s, 9, "2024-02-01T00:00:00Z");

        mvc.perform(get("/api/v1/me/watchlist").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].movieId", contains(4, 9, 1)))
                .andExpect(jsonPath("$.results[0].title").value("Inception"))
                .andExpect(jsonPath("$.results[0].addedAt").value("2024-03-01T00:00:00Z"))
                .andExpect(jsonPath("$.results[0].inWatchlist").value(true))
                .andExpect(jsonPath("$.results[0].card").doesNotExist())
                .andExpect(jsonPath("$.totalResults").value(3));

        mvc.perform(get("/api/v1/me/watchlist").param("size", "2").param("page", "1").with(bearer(s)))
                .andExpect(jsonPath("$.results[*].movieId", contains(1)))
                .andExpect(jsonPath("$.totalPages").value(2));
        mvc.perform(get("/api/v1/me/watchlist").param("size", "31").with(bearer(s))).andExpect(status().isBadRequest());
    }

    @Test
    void ratingsListShowsTheRating() throws Exception {
        Session s = loginAs("alice");
        mvc.perform(put("/api/v1/movies/6/rating").with(bearer(s)).contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("rating", 9.5))).andExpect(status().isOk());

        mvc.perform(get("/api/v1/me/ratings").with(bearer(s)))
                .andExpect(jsonPath("$.results[0].movieId").value(6))
                .andExpect(jsonPath("$.results[0].title").value("The Dark Knight"))
                .andExpect(jsonPath("$.results[0].rating").value(9.5))
                .andExpect(jsonPath("$.results[0].ratedAt").isNotEmpty())
                .andExpect(jsonPath("$.totalResults").value(1));
    }

    @Test
    void watchedIsALightweightNewestFirstList() throws Exception {
        Session s = loginAs("alice");
        mvc.perform(put("/api/v1/movies/2/watched").with(bearer(s))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/3/watched").with(bearer(s))).andExpect(status().isOk());
        jdbc.update("UPDATE already_watched SET watched_at = ? WHERE movie_id = 2",
                Timestamp.from(Instant.parse("2020-01-01T00:00:00Z")));

        mvc.perform(get("/api/v1/me/watched").with(bearer(s)))
                .andExpect(jsonPath("$[*].movieId", contains(3, 2)))
                .andExpect(jsonPath("$[1].watchedAt").value("2020-01-01T00:00:00Z"))
                .andExpect(jsonPath("$[0].title").doesNotExist());
    }

    @Test
    void reactionsListOnlyLikesAndDislikes() throws Exception {
        Session s = loginAs("alice");
        react(s, 1, "LIKE");
        react(s, 2, "DISLIKE");
        react(s, 3, "NEUTRAL");

        mvc.perform(get("/api/v1/me/reactions").with(bearer(s)))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[?(@.movieId == 1)].reaction").value("LIKE"))
                .andExpect(jsonPath("$[?(@.movieId == 2)].reaction").value("DISLIKE"));
    }

    @Test
    void listsAreAlwaysTheCallersOwn() throws Exception {
        Session alice = loginAs("alice");
        Session bob = loginAs("bob");
        mvc.perform(put("/api/v1/movies/1/watchlist").with(bearer(alice))).andExpect(status().isOk());
        react(alice, 1, "LIKE");

        mvc.perform(get("/api/v1/me/watchlist").with(bearer(bob))).andExpect(jsonPath("$.totalResults").value(0));
        mvc.perform(get("/api/v1/me/reactions").with(bearer(bob))).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/v1/me/watchlist").param("userId", String.valueOf(alice.userId())).with(bearer(bob)))
                .andExpect(jsonPath("$.totalResults").value(0));
    }

    @Test
    void listsNeedLogin() throws Exception {
        for (String path : new String[]{"/watchlist", "/watched", "/ratings", "/reactions"}) {
            mvc.perform(get("/api/v1/me" + path)).andExpect(status().isUnauthorized());
        }
    }

    private void add(Session s, long movieId, String at) throws Exception {
        mvc.perform(put("/api/v1/movies/" + movieId + "/watchlist").with(bearer(s))).andExpect(status().isOk());
        jdbc.update("UPDATE watchlist SET added_at = ? WHERE user_id = ? AND movie_id = ?",
                Timestamp.from(Instant.parse(at)), s.userId(), movieId);
    }

    private void react(Session s, long movieId, String reaction) throws Exception {
        mvc.perform(put("/api/v1/movies/" + movieId + "/reaction").with(bearer(s))
                .contentType(MediaType.APPLICATION_JSON).content(Json.of("reaction", reaction))).andExpect(status().isOk());
    }
}
