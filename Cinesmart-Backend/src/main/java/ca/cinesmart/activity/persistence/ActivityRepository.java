package ca.cinesmart.activity.persistence;

import ca.cinesmart.activity.domain.ActivitySignals;
import ca.cinesmart.activity.domain.ReactionItem;
import ca.cinesmart.activity.domain.WatchedItem;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** JDBC writes and list reads for watchlist, already_watched, user_rating and user_reaction. */
@Repository
public class ActivityRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ActivityRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** A page of movie IDs with the time they were added / rated, newest first. */
    public record TimedId(Long movieId, Instant at) {
    }

    public record RatedId(Long movieId, BigDecimal rating, Instant at) {
    }

    // --- writes (PUT keeps an existing row's timestamp for watchlist/watched; rating and reaction update it) ---

    public void addToWatchlist(Long userId, Long movieId) {
        jdbc.update("""
                INSERT INTO watchlist (user_id, movie_id) VALUES (:userId, :movieId)
                ON CONFLICT (user_id, movie_id) DO NOTHING
                """, params(userId, movieId));
    }

    public void removeFromWatchlist(Long userId, Long movieId) {
        jdbc.update("DELETE FROM watchlist WHERE user_id = :userId AND movie_id = :movieId", params(userId, movieId));
    }

    public void addToWatched(Long userId, Long movieId) {
        jdbc.update("""
                INSERT INTO already_watched (user_id, movie_id) VALUES (:userId, :movieId)
                ON CONFLICT (user_id, movie_id) DO NOTHING
                """, params(userId, movieId));
    }

    public void removeFromWatched(Long userId, Long movieId) {
        jdbc.update("DELETE FROM already_watched WHERE user_id = :userId AND movie_id = :movieId",
                params(userId, movieId));
    }

    public void upsertRating(Long userId, Long movieId, BigDecimal rating) {
        jdbc.update("""
                INSERT INTO user_rating (user_id, movie_id, rating) VALUES (:userId, :movieId, :rating)
                ON CONFLICT (user_id, movie_id) DO UPDATE SET rating = EXCLUDED.rating, rated_at = now()
                """, Map.of("userId", userId, "movieId", movieId, "rating", rating));
    }

    public void deleteRating(Long userId, Long movieId) {
        jdbc.update("DELETE FROM user_rating WHERE user_id = :userId AND movie_id = :movieId", params(userId, movieId));
    }

    public void upsertReaction(Long userId, Long movieId, String reaction) {
        jdbc.update("""
                INSERT INTO user_reaction (user_id, movie_id, reaction) VALUES (:userId, :movieId, :reaction)
                ON CONFLICT (user_id, movie_id) DO UPDATE SET reaction = EXCLUDED.reaction, reacted_at = now()
                """, Map.of("userId", userId, "movieId", movieId, "reaction", reaction));
    }

    public void deleteReaction(Long userId, Long movieId) {
        jdbc.update("DELETE FROM user_reaction WHERE user_id = :userId AND movie_id = :movieId",
                params(userId, movieId));
    }

    // --- lists ---

    public List<TimedId> findWatchlistPage(Long userId, int limit, long offset) {
        return jdbc.query("""
                SELECT movie_id, added_at FROM watchlist
                WHERE user_id = :userId
                ORDER BY added_at DESC, movie_id
                LIMIT :limit OFFSET :offset
                """, Map.of("userId", userId, "limit", limit, "offset", offset),
                (rs, rowNum) -> new TimedId(rs.getLong("movie_id"), instant(rs, "added_at")));
    }

    public long countWatchlist(Long userId) {
        return count("SELECT COUNT(*) FROM watchlist WHERE user_id = :userId", userId);
    }

    public List<RatedId> findRatingsPage(Long userId, int limit, long offset) {
        return jdbc.query("""
                SELECT movie_id, rating, rated_at FROM user_rating
                WHERE user_id = :userId
                ORDER BY rated_at DESC, movie_id
                LIMIT :limit OFFSET :offset
                """, Map.of("userId", userId, "limit", limit, "offset", offset),
                (rs, rowNum) -> new RatedId(rs.getLong("movie_id"), rs.getBigDecimal("rating"),
                        instant(rs, "rated_at")));
    }

    public long countRatings(Long userId) {
        return count("SELECT COUNT(*) FROM user_rating WHERE user_id = :userId", userId);
    }

    public List<WatchedItem> findWatched(Long userId) {
        return jdbc.query("""
                SELECT movie_id, watched_at FROM already_watched
                WHERE user_id = :userId
                ORDER BY watched_at DESC, movie_id
                """, Map.of("userId", userId),
                (rs, rowNum) -> new WatchedItem(rs.getLong("movie_id"), instant(rs, "watched_at")));
    }

    public List<ReactionItem> findReactions(Long userId) {
        return jdbc.query("""
                SELECT movie_id, reaction, reacted_at FROM user_reaction
                WHERE user_id = :userId AND reaction IN ('LIKE', 'DISLIKE')
                ORDER BY reacted_at DESC, movie_id
                """, Map.of("userId", userId),
                (rs, rowNum) -> new ReactionItem(rs.getLong("movie_id"), rs.getString("reaction"),
                        instant(rs, "reacted_at")));
    }

    /** All of a user's signals in one round trip. */
    public ActivitySignals findSignals(Long userId) {
        String sql = """
                SELECT 'W' AS kind, movie_id, NULL::NUMERIC AS rating, added_at AS at FROM watchlist WHERE user_id = :userId
                UNION ALL
                SELECT 'S', movie_id, NULL, watched_at FROM already_watched WHERE user_id = :userId
                UNION ALL
                SELECT 'R', movie_id, rating, rated_at FROM user_rating WHERE user_id = :userId
                UNION ALL
                SELECT CASE reaction WHEN 'LIKE' THEN 'L' ELSE 'D' END, movie_id, NULL, reacted_at
                FROM user_reaction WHERE user_id = :userId AND reaction IN ('LIKE', 'DISLIKE')
                """;
        List<ActivitySignals.Entry> watchlist = new ArrayList<>();
        List<ActivitySignals.Entry> watched = new ArrayList<>();
        List<ActivitySignals.Rated> ratings = new ArrayList<>();
        List<ActivitySignals.Entry> likes = new ArrayList<>();
        Set<Long> disliked = new HashSet<>();
        jdbc.query(sql, Map.of("userId", userId), rs -> {
            Long movieId = rs.getLong("movie_id");
            Instant at = instant(rs, "at");
            switch (rs.getString("kind")) {
                case "W" -> watchlist.add(new ActivitySignals.Entry(movieId, at));
                case "S" -> watched.add(new ActivitySignals.Entry(movieId, at));
                case "R" -> ratings.add(new ActivitySignals.Rated(movieId, rs.getBigDecimal("rating"), at));
                case "L" -> likes.add(new ActivitySignals.Entry(movieId, at));
                default -> disliked.add(movieId);
            }
        });
        return new ActivitySignals(watchlist, watched, ratings, likes, disliked);
    }

    private long count(String sql, Long userId) {
        Long count = jdbc.queryForObject(sql, Map.of("userId", userId), Long.class);
        return count == null ? 0 : count;
    }

    private static Map<String, Object> params(Long userId, Long movieId) {
        return Map.of("userId", userId, "movieId", movieId);
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }
}
