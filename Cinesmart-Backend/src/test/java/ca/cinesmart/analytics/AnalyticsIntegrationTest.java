package ca.cinesmart.analytics;

import ca.cinesmart.analytics.application.AnalyticsJob;
import ca.cinesmart.support.IntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

/**
 * The movie_analytics batch (change.md Q12, Q13): weighted_rating = (v/(v+m))·R + (m/(v+m))·C with m = 5 and
 * C = the platform-wide average rating; NEUTRAL reactions don't count; removed activity resets the numbers.
 */
class AnalyticsIntegrationTest extends IntegrationTest {

    @Autowired
    AnalyticsJob job;

    @Test
    void computesCountsAveragesAndTheWeightedRating() {
        seedActivity();

        job.refresh();

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM movie_analytics", Integer.class)).isEqualTo(20);
        // C = (5·10 + 2) / 6 = 8.667; movie 8: 5/10·10 + 5/10·8.667 = 9.33; movie 12: 1/6·2 + 5/6·8.667 = 7.56
        assertThat(row(8)).containsEntry("rating_count", 5)
                .containsEntry("average_rating", new BigDecimal("10.00"))
                .containsEntry("weighted_rating", new BigDecimal("9.33"))
                .containsEntry("like_count", 2)
                .containsEntry("dislike_count", 1);
        assertThat(row(12)).containsEntry("rating_count", 1)
                .containsEntry("average_rating", new BigDecimal("2.00"))
                .containsEntry("weighted_rating", new BigDecimal("7.56"))
                .containsEntry("like_count", 1);
        assertThat(row(1)).containsEntry("rating_count", 0)
                .containsEntry("average_rating", null)
                .containsEntry("weighted_rating", null)
                .containsEntry("like_count", 0);
    }

    @Test
    void resultsShowUpInTheApi() throws Exception {
        seedActivity();
        job.refresh();

        mvc.perform(get("/api/v1/movies/8"))
                .andExpect(jsonPath("$.platformStats.averageRating").value(10.0))
                .andExpect(jsonPath("$.platformStats.ratingCount").value(5))
                .andExpect(jsonPath("$.platformStats.likeCount").value(2))
                .andExpect(jsonPath("$.platformStats.dislikeCount").value(1));
        mvc.perform(get("/api/v1/movies/top-rated"))
                .andExpect(jsonPath("$.results[*].movieId", contains(8)));
        mvc.perform(get("/api/v1/movies/most-liked"))
                .andExpect(jsonPath("$.results[*].movieId", contains(8, 12)))
                .andExpect(jsonPath("$.results[0].averageRating").value(10.0));
    }

    @Test
    void removedActivityResetsTheNumbers() {
        seedActivity();
        job.refresh();

        jdbc.update("DELETE FROM user_rating");
        jdbc.update("DELETE FROM user_reaction");
        job.refresh();

        assertThat(row(8)).containsEntry("rating_count", 0)
                .containsEntry("average_rating", null)
                .containsEntry("weighted_rating", null)
                .containsEntry("like_count", 0)
                .containsEntry("dislike_count", 0);
    }

    @Test
    void refreshWithNoActivityAtAllWorks() {
        job.refresh();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM movie_analytics WHERE rating_count = 0", Integer.class))
                .isEqualTo(20);
    }

    /** Five users rate movie 8 a 10 and one rates movie 12 a 2; reactions on 8 include a NEUTRAL. */
    private void seedActivity() {
        long[] users = new long[6];
        for (int i = 0; i < 6; i++) {
            users[i] = createUser("user" + i, true);
        }
        for (int i = 0; i < 5; i++) {
            jdbc.update("INSERT INTO user_rating (user_id, movie_id, rating) VALUES (?, 8, 10)", users[i]);
        }
        jdbc.update("INSERT INTO user_rating (user_id, movie_id, rating) VALUES (?, 12, 2)", users[5]);
        reaction(users[0], 8, "LIKE");
        reaction(users[1], 8, "LIKE");
        reaction(users[2], 8, "DISLIKE");
        reaction(users[3], 8, "NEUTRAL");
        reaction(users[0], 12, "LIKE");
    }

    private void reaction(long userId, long movieId, String reaction) {
        jdbc.update("INSERT INTO user_reaction (user_id, movie_id, reaction) VALUES (?, ?, ?)", userId, movieId, reaction);
    }

    private Map<String, Object> row(long movieId) {
        return jdbc.queryForMap("SELECT rating_count, average_rating, weighted_rating, like_count, dislike_count "
                + "FROM movie_analytics WHERE movie_id = ?", movieId);
    }
}
