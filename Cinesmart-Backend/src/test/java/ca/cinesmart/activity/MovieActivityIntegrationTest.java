package ca.cinesmart.activity;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** PUT/DELETE /movies/{id}/watchlist|watched|rating|reaction (change.md Q7, Q14, Q25, B-9). */
class MovieActivityIntegrationTest extends IntegrationTest {

    @Test
    void watchlistIsIdempotentAndReturnsTheNewState() throws Exception {
        Session s = loginAs("alice");
        for (int i = 0; i < 2; i++) {
            mvc.perform(put("/api/v1/movies/5/watchlist").with(bearer(s)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.inWatchlist").value(true))
                    .andExpect(jsonPath("$.watched").value(false))
                    .andExpect(jsonPath("$.reaction").value("NEUTRAL"));
        }
        assertThat(count("watchlist", s.userId())).isEqualTo(1);
        for (int i = 0; i < 2; i++) {
            mvc.perform(delete("/api/v1/movies/5/watchlist").with(bearer(s)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.inWatchlist").value(false));
        }
        assertThat(count("watchlist", s.userId())).isZero();
    }

    @Test
    void secondPutKeepsTheOriginalAddedAt() throws Exception {
        Session s = loginAs("alice");
        mvc.perform(put("/api/v1/movies/5/watchlist").with(bearer(s))).andExpect(status().isOk());
        Timestamp old = Timestamp.from(Instant.parse("2020-01-01T00:00:00Z"));
        jdbc.update("UPDATE watchlist SET added_at = ? WHERE user_id = ?", old, s.userId());

        mvc.perform(put("/api/v1/movies/5/watchlist").with(bearer(s))).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT added_at FROM watchlist WHERE user_id = ?", Timestamp.class, s.userId()))
                .isEqualTo(old);
    }

    @Test
    void watchedWorksTheSameWay() throws Exception {
        Session s = loginAs("alice");
        mvc.perform(put("/api/v1/movies/5/watched").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.watched").value(true));
        mvc.perform(put("/api/v1/movies/5/watched").with(bearer(s))).andExpect(status().isOk());
        assertThat(count("already_watched", s.userId())).isEqualTo(1);
        mvc.perform(delete("/api/v1/movies/5/watched").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.watched").value(false));
    }

    @Test
    void ratingIsSetReplacedAndRemoved() throws Exception {
        Session s = loginAs("alice");
        rate(s, 5, 7.5).andExpect(status().isOk()).andExpect(jsonPath("$.rating").value(7.5));
        Timestamp old = Timestamp.from(Instant.parse("2020-01-01T00:00:00Z"));
        jdbc.update("UPDATE user_rating SET rated_at = ? WHERE user_id = ?", old, s.userId());

        rate(s, 5, 9).andExpect(status().isOk()).andExpect(jsonPath("$.rating").value(9.0));

        assertThat(count("user_rating", s.userId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT rated_at FROM user_rating WHERE user_id = ?", Timestamp.class, s.userId()))
                .isAfter(old);
        mvc.perform(delete("/api/v1/movies/5/rating").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").doesNotExist());
        mvc.perform(delete("/api/v1/movies/5/rating").with(bearer(s))).andExpect(status().isOk());
    }

    @Test
    void ratingMustBeBetween1And10WithOneDecimal() throws Exception {
        Session s = loginAs("alice");
        rate(s, 5, 1.0).andExpect(status().isOk());
        rate(s, 5, 10.0).andExpect(status().isOk());
        for (Object bad : new Object[]{0.9, 10.1, 7.25, -3, 100}) {
            rate(s, 5, bad)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                    .andExpect(jsonPath("$.fields.rating").exists());
        }
        mvc.perform(put("/api/v1/movies/5/rating").with(bearer(s)).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.rating").value("Rating cannot be null"));
        mvc.perform(put("/api/v1/movies/5/rating").with(bearer(s)).contentType(MediaType.APPLICATION_JSON).content("{oops"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Request body is missing or malformed"));
    }

    @Test
    void reactionCanBeLikeDislikeOrNeutral() throws Exception {
        Session s = loginAs("alice");
        react(s, 5, "LIKE").andExpect(status().isOk()).andExpect(jsonPath("$.reaction").value("LIKE"));
        react(s, 5, "DISLIKE").andExpect(status().isOk()).andExpect(jsonPath("$.reaction").value("DISLIKE"));
        react(s, 5, "NEUTRAL").andExpect(status().isOk()).andExpect(jsonPath("$.reaction").value("NEUTRAL"));
        assertThat(count("user_reaction", s.userId())).isEqualTo(1);
        mvc.perform(delete("/api/v1/movies/5/reaction").with(bearer(s)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reaction").value("NEUTRAL"));
        assertThat(count("user_reaction", s.userId())).isZero();

        react(s, 5, "LOVE").andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.reaction").exists());
        react(s, 5, "like").andExpect(status().isBadRequest());
    }

    @Test
    void changingAReactionUpdatesReactedAt() throws Exception {
        Session s = loginAs("alice");
        react(s, 5, "LIKE").andExpect(status().isOk());
        Timestamp old = Timestamp.from(Instant.parse("2020-01-01T00:00:00Z"));
        jdbc.update("UPDATE user_reaction SET reacted_at = ? WHERE user_id = ?", old, s.userId());
        react(s, 5, "DISLIKE").andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT reacted_at FROM user_reaction WHERE user_id = ?", Timestamp.class,
                s.userId())).isAfter(old);
    }

    @Test
    void unknownMovieIs404ForEveryActivity() throws Exception {
        Session s = loginAs("alice");
        mvc.perform(put("/api/v1/movies/999/watchlist").with(bearer(s)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("MOVIE_NOT_FOUND"));
        mvc.perform(delete("/api/v1/movies/999/watched").with(bearer(s))).andExpect(status().isNotFound());
        rate(s, 999, 8).andExpect(status().isNotFound());
        react(s, 999, "LIKE").andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/movies/0/watchlist").with(bearer(s)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void activityNeedsLogin() throws Exception {
        mvc.perform(put("/api/v1/movies/5/watchlist")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/movies/5/watched")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/movies/5/rating").contentType(MediaType.APPLICATION_JSON).content(Json.of("rating", 8)))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/movies/5/reaction").contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("reaction", "LIKE"))).andExpect(status().isUnauthorized());
    }

    @Test
    void usersOnlyChangeTheirOwnActivity() throws Exception {
        Session alice = loginAs("alice");
        Session bob = loginAs("bob");
        mvc.perform(put("/api/v1/movies/5/watchlist").with(bearer(alice))).andExpect(status().isOk());

        mvc.perform(delete("/api/v1/movies/5/watchlist").with(bearer(bob)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inWatchlist").value(false));
        assertThat(count("watchlist", alice.userId())).isEqualTo(1);
    }

    private ResultActions rate(Session s, long movieId, Object rating) throws Exception {
        return mvc.perform(put("/api/v1/movies/" + movieId + "/rating").with(bearer(s))
                .contentType(MediaType.APPLICATION_JSON).content(Json.of("rating", rating)));
    }

    private ResultActions react(Session s, long movieId, String reaction) throws Exception {
        return mvc.perform(put("/api/v1/movies/" + movieId + "/reaction").with(bearer(s))
                .contentType(MediaType.APPLICATION_JSON).content(Json.of("reaction", reaction)));
    }

    private int count(String table, long userId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE user_id = ?", Integer.class, userId);
    }
}
