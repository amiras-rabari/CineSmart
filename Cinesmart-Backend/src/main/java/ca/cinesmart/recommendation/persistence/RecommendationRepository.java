package ca.cinesmart.recommendation.persistence;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

@Repository
public class RecommendationRepository {

    /** A movie that shares at least one profile genre, actor or director. */
    public record Candidate(Long movieId, BigDecimal imdbRating, Long imdbVotes) {
    }

    private final NamedParameterJdbcTemplate jdbc;

    public RecommendationRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Movies sharing a genre, an actor (as actor) or a director (as director), most matched features first,
     * then IMDb votes (implementation-plan B.6 #6). {@code excludedIds} never appear.
     */
    public List<Candidate> findCandidates(Collection<Long> genreIds, Collection<Long> actorIds,
                                          Collection<Long> directorIds, Collection<Long> excludedIds, int limit) {
        if (genreIds.isEmpty() && actorIds.isEmpty() && directorIds.isEmpty()) {
            return List.of();
        }
        String sql = """
                WITH matches AS (
                    SELECT mg.movie_id
                    FROM movie_genre mg
                    WHERE mg.genre_id IN (:genreIds)
                    UNION ALL
                    SELECT mp.movie_id
                    FROM movie_person mp
                    JOIN movie_role r ON r.role_id = mp.role_id
                    WHERE (r.role_name = 'Actor' AND mp.person_id IN (:actorIds))
                       OR (r.role_name = 'Director' AND mp.person_id IN (:directorIds))
                ),
                counted AS (
                    SELECT movie_id, COUNT(*) AS matched
                    FROM matches
                    GROUP BY movie_id
                )
                SELECT m.movie_id, m.imdb_rating, m.imdb_votes
                FROM counted c
                JOIN movie m ON m.movie_id = c.movie_id
                WHERE m.movie_id NOT IN (:excludedIds)
                ORDER BY c.matched DESC, m.imdb_votes DESC NULLS LAST, m.movie_id
                LIMIT :limit
                """;
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("genreIds", orNone(genreIds))
                .addValue("actorIds", orNone(actorIds))
                .addValue("directorIds", orNone(directorIds))
                .addValue("excludedIds", orNone(excludedIds))
                .addValue("limit", limit);
        return jdbc.query(sql, params, (rs, rowNum) -> new Candidate(
                rs.getLong("movie_id"),
                rs.getBigDecimal("imdb_rating"),
                rs.getObject("imdb_votes", Long.class)));
    }

    /** IN () is invalid SQL, so an empty list becomes an ID that never exists. */
    private static Collection<Long> orNone(Collection<Long> ids) {
        return ids.isEmpty() ? List.of(-1L) : ids;
    }
}
