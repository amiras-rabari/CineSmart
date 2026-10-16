package ca.cinesmart.catalog.persistence;

import ca.cinesmart.shared.movie.MovieCard;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@Repository
public class MovieCardRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public MovieCardRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Cards without user flags, in no particular order. */
    public List<MovieCard> findCards(Collection<Long> movieIds) {
        if (movieIds.isEmpty()) {
            return List.of();
        }
        String sql = """
                SELECT m.movie_id, m.title, m.year, m.poster, m.imdb_rating,
                       a.average_rating,
                       COALESCE(a.like_count, 0)    AS like_count,
                       COALESCE(a.dislike_count, 0) AS dislike_count
                FROM movie m
                LEFT JOIN movie_analytics a ON a.movie_id = m.movie_id
                WHERE m.movie_id IN (:ids)
                """;
        return jdbc.query(sql, Map.of("ids", movieIds), (rs, rowNum) -> new MovieCard(
                rs.getLong("movie_id"),
                rs.getString("title"),
                rs.getObject("year", Short.class),
                rs.getString("poster"),
                rs.getBigDecimal("imdb_rating"),
                rs.getBigDecimal("average_rating"),
                rs.getInt("like_count"),
                rs.getInt("dislike_count"),
                null,
                null
        ));
    }
}
