package ca.cinesmart.catalog.persistence;

import ca.cinesmart.catalog.domain.Availability;
import ca.cinesmart.catalog.domain.NamedRef;
import ca.cinesmart.catalog.domain.PersonRef;
import ca.cinesmart.catalog.domain.PlatformStats;
import ca.cinesmart.catalog.domain.Ratings;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/** JDBC reads for the catalog. Every batched method takes a set of movie IDs and returns rows in no particular order. */
@Repository
public class CatalogRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public CatalogRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record CoreRow(Long movieId, String imdbId, String title, Short year, LocalDate released, Short runtime,
                          String plot, String poster, String contentType, String studio,
                          Ratings ratings, PlatformStats platformStats) {
    }

    /** A movie's genre or language link. */
    public record LinkRow(Long movieId, NamedRef ref) {
    }

    public record PersonRow(Long movieId, String role, PersonRef person) {
    }

    public record AvailabilityRow(Long movieId, Availability availability) {
    }

    /** A person link by ID only, for feature extraction. */
    public record PersonIdRow(Long movieId, Long personId, String role) {
    }

    /** Movie columns + analytics in one query (analytics columns are 0 / NULL without a row). */
    public List<CoreRow> findCores(Collection<Long> ids) {
        String sql = """
                SELECT m.movie_id, m.imdb_id, m.title, m.year, m.released, m.runtime, m.plot, m.poster,
                       m.content_type, m.studio, m.imdb_rating, m.imdb_votes, m.rotten_tomatoes, m.metascore,
                       a.average_rating,
                       COALESCE(a.rating_count, 0)  AS rating_count,
                       COALESCE(a.like_count, 0)    AS like_count,
                       COALESCE(a.dislike_count, 0) AS dislike_count
                FROM movie m
                LEFT JOIN movie_analytics a ON a.movie_id = m.movie_id
                WHERE m.movie_id IN (:ids)
                """;
        return jdbc.query(sql, Map.of("ids", ids), (rs, rowNum) -> new CoreRow(
                rs.getLong("movie_id"),
                rs.getString("imdb_id"),
                rs.getString("title"),
                rs.getObject("year", Short.class),
                rs.getObject("released", LocalDate.class),
                rs.getObject("runtime", Short.class),
                rs.getString("plot"),
                rs.getString("poster"),
                rs.getString("content_type"),
                rs.getString("studio"),
                new Ratings(
                        rs.getBigDecimal("imdb_rating"),
                        rs.getObject("imdb_votes", Long.class),
                        rs.getObject("rotten_tomatoes", Short.class),
                        rs.getObject("metascore", Short.class)),
                new PlatformStats(
                        rs.getBigDecimal("average_rating"),
                        rs.getInt("rating_count"),
                        rs.getInt("like_count"),
                        rs.getInt("dislike_count"))
        ));
    }

    public List<LinkRow> findGenres(Collection<Long> ids) {
        String sql = """
                SELECT mg.movie_id, g.genre_id AS id, g.genre_name AS name
                FROM movie_genre mg
                JOIN genre g ON g.genre_id = mg.genre_id
                WHERE mg.movie_id IN (:ids)
                ORDER BY g.genre_name
                """;
        return queryLinks(sql, ids);
    }

    public List<LinkRow> findLanguages(Collection<Long> ids) {
        String sql = """
                SELECT ml.movie_id, l.language_id AS id, l.language_name AS name
                FROM movie_language ml
                JOIN language l ON l.language_id = ml.language_id
                WHERE ml.movie_id IN (:ids)
                ORDER BY l.language_name
                """;
        return queryLinks(sql, ids);
    }

    public List<PersonRow> findPeople(Collection<Long> ids) {
        String sql = """
                SELECT mp.movie_id, r.role_name, p.person_id, p.name
                FROM movie_person mp
                JOIN person p ON p.person_id = mp.person_id
                JOIN movie_role r ON r.role_id = mp.role_id
                WHERE mp.movie_id IN (:ids)
                ORDER BY p.name
                """;
        return jdbc.query(sql, Map.of("ids", ids), (rs, rowNum) -> new PersonRow(
                rs.getLong("movie_id"),
                rs.getString("role_name"),
                new PersonRef(rs.getLong("person_id"), rs.getString("name"))));
    }

    public List<AvailabilityRow> findAvailability(Collection<Long> ids) {
        String sql = """
                SELECT movie_id, platform, availability_type, platform_url
                FROM availability
                WHERE movie_id IN (:ids)
                ORDER BY platform
                """;
        return jdbc.query(sql, Map.of("ids", ids), (rs, rowNum) -> new AvailabilityRow(
                rs.getLong("movie_id"),
                new Availability(rs.getString("platform"), rs.getString("availability_type"),
                        rs.getString("platform_url"))));
    }

    /** Genre IDs, or language IDs when {@code languages} is true, per movie. */
    public List<LinkRow> findFeatureIds(Collection<Long> ids, boolean languages) {
        String sql = languages
                ? "SELECT movie_id, language_id AS id, NULL AS name FROM movie_language WHERE movie_id IN (:ids)"
                : "SELECT movie_id, genre_id AS id, NULL AS name FROM movie_genre WHERE movie_id IN (:ids)";
        return queryLinks(sql, ids);
    }

    public List<PersonIdRow> findPersonIds(Collection<Long> ids) {
        String sql = """
                SELECT mp.movie_id, mp.person_id, r.role_name
                FROM movie_person mp
                JOIN movie_role r ON r.role_id = mp.role_id
                WHERE mp.movie_id IN (:ids)
                """;
        return jdbc.query(sql, Map.of("ids", ids), (rs, rowNum) -> new PersonIdRow(
                rs.getLong("movie_id"), rs.getLong("person_id"), rs.getString("role_name")));
    }

    public boolean exists(Long movieId) {
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM movie WHERE movie_id = :id)",
                Map.of("id", movieId), Boolean.class);
        return Boolean.TRUE.equals(exists);
    }

    /** Genres that have at least one movie, by name. */
    public List<NamedRef> findGenresInUse() {
        String sql = """
                SELECT g.genre_id AS id, g.genre_name AS name
                FROM genre g
                WHERE EXISTS (SELECT 1 FROM movie_genre mg WHERE mg.genre_id = g.genre_id)
                ORDER BY g.genre_name
                """;
        return jdbc.query(sql, (rs, rowNum) -> new NamedRef(rs.getLong("id"), rs.getString("name")));
    }

    /** Languages that have at least one movie, most movies first. */
    public List<NamedRef> findLanguagesInUse() {
        String sql = """
                SELECT l.language_id AS id, l.language_name AS name
                FROM language l
                JOIN movie_language ml ON ml.language_id = l.language_id
                GROUP BY l.language_id, l.language_name
                ORDER BY COUNT(*) DESC, l.language_name
                """;
        return jdbc.query(sql, (rs, rowNum) -> new NamedRef(rs.getLong("id"), rs.getString("name")));
    }

    private List<LinkRow> queryLinks(String sql, Collection<Long> ids) {
        return jdbc.query(sql, Map.of("ids", ids), (rs, rowNum) -> new LinkRow(
                rs.getLong("movie_id"), new NamedRef(rs.getLong("id"), rs.getString("name"))));
    }
}
