package ca.cinesmart.analytics.persistence;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.OptionalInt;

@Repository
public class AnalyticsRepository {

    /** Advisory lock key for the analytics refresh; only one instance runs it at a time (change.md Q13). */
    private static final long REFRESH_LOCK_KEY = 7_310_001L;

    private final NamedParameterJdbcTemplate jdbc;

    public AnalyticsRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Full recompute of movie_analytics in one transaction (change.md Q12): every movie gets a row,
     * removed activity resets to 0 / NULL, NEUTRAL reactions are not counted.
     * weighted_rating = (v/(v+m))·R + (m/(v+m))·C, where C is the platform-wide average rating.
     *
     * @return the number of movies written, or empty when another instance holds the lock
     */
    @Transactional
    public OptionalInt refresh(int minVotes) {
        Boolean locked = jdbc.queryForObject("SELECT pg_try_advisory_xact_lock(:key)",
                Map.of("key", REFRESH_LOCK_KEY), Boolean.class);
        if (!Boolean.TRUE.equals(locked)) {
            return OptionalInt.empty();
        }
        String sql = """
                WITH platform AS (
                    SELECT AVG(rating) AS c FROM user_rating
                ),
                ratings AS (
                    SELECT movie_id, COUNT(*) AS v, AVG(rating) AS r
                    FROM user_rating
                    GROUP BY movie_id
                ),
                reactions AS (
                    SELECT movie_id,
                           COUNT(*) FILTER (WHERE reaction = 'LIKE')    AS likes,
                           COUNT(*) FILTER (WHERE reaction = 'DISLIKE') AS dislikes
                    FROM user_reaction
                    GROUP BY movie_id
                )
                INSERT INTO movie_analytics
                    (movie_id, rating_count, average_rating, weighted_rating, like_count, dislike_count, updated_at)
                SELECT m.movie_id,
                       COALESCE(ra.v, 0),
                       ROUND(ra.r, 2),
                       CASE WHEN ra.v IS NULL THEN NULL
                            ELSE ROUND((ra.v / (ra.v + CAST(:m AS NUMERIC))) * ra.r
                                     + (CAST(:m AS NUMERIC) / (ra.v + CAST(:m AS NUMERIC))) * p.c, 2)
                       END,
                       COALESCE(re.likes, 0),
                       COALESCE(re.dislikes, 0),
                       now()
                FROM movie m
                CROSS JOIN platform p
                LEFT JOIN ratings ra ON ra.movie_id = m.movie_id
                LEFT JOIN reactions re ON re.movie_id = m.movie_id
                ON CONFLICT (movie_id) DO UPDATE SET
                    rating_count    = EXCLUDED.rating_count,
                    average_rating  = EXCLUDED.average_rating,
                    weighted_rating = EXCLUDED.weighted_rating,
                    like_count      = EXCLUDED.like_count,
                    dislike_count   = EXCLUDED.dislike_count,
                    updated_at      = EXCLUDED.updated_at
                """;
        return OptionalInt.of(jdbc.update(sql, Map.of("m", minVotes)));
    }
}
