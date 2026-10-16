package ca.cinesmart.activity.persistence;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Repository
public class UserMovieStateRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public UserMovieStateRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** One row: inWatchlist, watched, rating, reaction (reaction/rating null when absent). */
    public Map<String, Object> findState(Long userId, Long movieId) {
        String sql = """
                SELECT EXISTS (SELECT 1 FROM watchlist w WHERE w.user_id = :userId AND w.movie_id = :movieId) AS in_watchlist,
                       EXISTS (SELECT 1 FROM already_watched a WHERE a.user_id = :userId AND a.movie_id = :movieId) AS watched,
                       (SELECT r.rating FROM user_rating r WHERE r.user_id = :userId AND r.movie_id = :movieId) AS rating,
                       (SELECT x.reaction FROM user_reaction x WHERE x.user_id = :userId AND x.movie_id = :movieId) AS reaction
                """;
        return jdbc.queryForMap(sql, Map.of("userId", userId, "movieId", movieId));
    }

    public Map<String, Object> findCounts(Long userId) {
        String sql = """
                SELECT (SELECT COUNT(*) FROM watchlist w WHERE w.user_id = :userId) AS watchlist_count,
                       (SELECT COUNT(*) FROM already_watched a WHERE a.user_id = :userId) AS watched_count,
                       (SELECT COUNT(*) FROM user_rating r WHERE r.user_id = :userId) AS rating_count
                """;
        return jdbc.queryForMap(sql, Map.of("userId", userId));
    }

    public Set<Long> findWatchlistMovieIds(Long userId, Collection<Long> movieIds) {
        return findIds("watchlist", userId, movieIds);
    }

    public Set<Long> findWatchedMovieIds(Long userId, Collection<Long> movieIds) {
        return findIds("already_watched", userId, movieIds);
    }

    private Set<Long> findIds(String table, Long userId, Collection<Long> movieIds) {
        if (movieIds.isEmpty()) {
            return Set.of();
        }
        // table is one of two fixed names above, never user input
        String sql = "SELECT movie_id FROM " + table + " WHERE user_id = :userId AND movie_id IN (:movieIds)";
        List<Long> ids = jdbc.queryForList(sql, Map.of("userId", userId, "movieIds", movieIds), Long.class);
        return new HashSet<>(ids);
    }
}
