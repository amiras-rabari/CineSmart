package ca.cinesmart.discovery.persistence;

import ca.cinesmart.discovery.domain.RankedList;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * JDBC reads for Discovery. Every query returns ranked movie IDs plus the full list size;
 * the cards are built by Catalog's MovieCardService.
 */
@Repository
public class DiscoveryRepository {

    /** IMDb Top 250 never holds more than this many movies. */
    public static final int IMDB_TOP_LIMIT = 250;

    /** Fixed browse order (change.md Q19). */
    private static final String BROWSE_ORDER = "m.imdb_rating DESC NULLS LAST, m.imdb_votes DESC NULLS LAST, m.movie_id";

    /**
     * Movies whose title or any person's name matches q (trigram word similarity, threshold set per
     * transaction). Score = best match; a title match gets a small boost.
     */
    private static final String SEARCH_HITS = """
            WITH hits AS (
                SELECT m.movie_id, word_similarity(:q, LOWER(m.title)) + :titleBoost AS score
                FROM movie m
                WHERE :q <% LOWER(m.title)
                UNION ALL
                SELECT mp.movie_id, word_similarity(:q, LOWER(p.name)) AS score
                FROM person p
                JOIN movie_person mp ON mp.person_id = p.person_id
                WHERE :q <% LOWER(p.name)
            ),
            best AS (
                SELECT movie_id, MAX(score) AS score
                FROM hits
                GROUP BY movie_id
            )
            """;

    /** One page of IDs in list order, and the size of the whole list. */
    public record IdPage(List<Long> movieIds, long totalResults) {
    }

    private record ListSql(String from, String order) {
    }

    private final NamedParameterJdbcTemplate jdbc;
    private final int analyticsMinVotes;
    private final long imdbTopMinVotes;

    public DiscoveryRepository(NamedParameterJdbcTemplate jdbc,
                               @Value("${analytics.min-votes}") int analyticsMinVotes,
                               @Value("${home.imdb-top-250.min-votes}") long imdbTopMinVotes) {
        this.jdbc = jdbc;
        this.analyticsMinVotes = analyticsMinVotes;
        this.imdbTopMinVotes = imdbTopMinVotes;
    }

    /** All movies, optionally filtered by genre, language and year (AND). */
    public IdPage browse(Long genreId, Long languageId, Integer year, int limit, long offset) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("limit", limit)
                .addValue("offset", offset);
        List<String> conditions = new ArrayList<>();
        if (genreId != null) {
            conditions.add("EXISTS (SELECT 1 FROM movie_genre mg WHERE mg.movie_id = m.movie_id AND mg.genre_id = :genreId)");
            params.addValue("genreId", genreId);
        }
        if (languageId != null) {
            conditions.add("EXISTS (SELECT 1 FROM movie_language ml WHERE ml.movie_id = m.movie_id AND ml.language_id = :languageId)");
            params.addValue("languageId", languageId);
        }
        if (year != null) {
            conditions.add("m.year = :year");
            params.addValue("year", year);
        }
        String from = "FROM movie m" + (conditions.isEmpty() ? "" : " WHERE " + String.join(" AND ", conditions));
        return page(new ListSql(from, BROWSE_ORDER), params);
    }

    /**
     * Search by title or person name, best match first, then IMDb votes. Runs in one read-only
     * transaction: the threshold is set transaction-locally (set_config(..., true), the bindable form of
     * SET LOCAL), so the {@code <%} operator can use the GIN trigram indexes in both queries.
     */
    @Transactional(readOnly = true)
    public IdPage search(String q, double similarityThreshold, double titleBoost, int limit, long offset) {
        jdbc.queryForObject("SELECT set_config('pg_trgm.word_similarity_threshold', :t, true)",
                new MapSqlParameterSource("t", Double.toString(similarityThreshold)), String.class);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("q", q)
                .addValue("titleBoost", titleBoost)
                .addValue("limit", limit)
                .addValue("offset", offset);
        Long total = jdbc.queryForObject(SEARCH_HITS + "SELECT COUNT(*) FROM best", params, Long.class);
        if (total == null || total == 0 || offset >= total) {
            return new IdPage(List.of(), total == null ? 0 : total);
        }
        List<Long> ids = jdbc.queryForList(SEARCH_HITS + """
                SELECT b.movie_id
                FROM best b
                JOIN movie m ON m.movie_id = b.movie_id
                ORDER BY b.score DESC, m.imdb_votes DESC NULLS LAST, m.movie_id
                LIMIT :limit OFFSET :offset
                """, params, Long.class);
        return new IdPage(ids, total);
    }

    /** One page of a home/"see more" list. IMDb Top 250 is capped at {@link #IMDB_TOP_LIMIT}. */
    public IdPage ranked(RankedList list, int limit, long offset) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("minVotes", analyticsMinVotes)
                .addValue("imdbMinVotes", imdbTopMinVotes);
        ListSql sql = switch (list) {
            // Any order is fine for trending (change.md Q21); IMDb rating keeps it predictable.
            case TRENDING -> new ListSql(
                    "FROM top10 t JOIN movie m ON m.movie_id = t.movie_id",
                    BROWSE_ORDER);
            case TOP_RATED -> new ListSql(
                    "FROM movie_analytics a JOIN movie m ON m.movie_id = a.movie_id "
                            + "WHERE a.rating_count >= :minVotes AND a.weighted_rating IS NOT NULL",
                    "a.weighted_rating DESC, a.rating_count DESC, m.imdb_votes DESC NULLS LAST, m.movie_id");
            case MOST_LIKED -> new ListSql(
                    "FROM movie_analytics a JOIN movie m ON m.movie_id = a.movie_id WHERE a.like_count > 0",
                    "a.like_count DESC, m.imdb_votes DESC NULLS LAST, m.movie_id");
            case IMDB_TOP_250 -> new ListSql(
                    "FROM movie m WHERE m.imdb_votes >= :imdbMinVotes AND m.imdb_rating IS NOT NULL",
                    "m.imdb_rating DESC, m.imdb_votes DESC, m.movie_id");
        };
        if (list != RankedList.IMDB_TOP_250) {
            return page(sql, params.addValue("limit", limit).addValue("offset", offset));
        }
        if (offset >= IMDB_TOP_LIMIT) {
            return new IdPage(List.of(), Math.min(count(sql, params), IMDB_TOP_LIMIT));
        }
        int capped = (int) Math.min(limit, IMDB_TOP_LIMIT - offset);
        IdPage page = page(sql, params.addValue("limit", capped).addValue("offset", offset));
        return new IdPage(page.movieIds(), Math.min(page.totalResults(), IMDB_TOP_LIMIT));
    }

    public boolean genreExists(long genreId) {
        return exists("SELECT EXISTS (SELECT 1 FROM genre WHERE genre_id = :id)", genreId);
    }

    public boolean languageExists(long languageId) {
        return exists("SELECT EXISTS (SELECT 1 FROM language WHERE language_id = :id)", languageId);
    }

    private IdPage page(ListSql sql, MapSqlParameterSource params) {
        List<Long> ids = jdbc.queryForList(
                "SELECT m.movie_id " + sql.from() + " ORDER BY " + sql.order() + " LIMIT :limit OFFSET :offset",
                params, Long.class);
        long offset = ((Number) params.getValue("offset")).longValue();
        int limit = ((Number) params.getValue("limit")).intValue();
        // The count is only needed when the page doesn't already tell us where the list ends.
        long total = !ids.isEmpty() && ids.size() < limit ? offset + ids.size() : count(sql, params);
        return new IdPage(ids, total);
    }

    private long count(ListSql sql, MapSqlParameterSource params) {
        Long total = jdbc.queryForObject("SELECT COUNT(*) " + sql.from(), params, Long.class);
        return total == null ? 0 : total;
    }

    private boolean exists(String sql, long id) {
        return Boolean.TRUE.equals(jdbc.queryForObject(sql, new MapSqlParameterSource("id", id), Boolean.class));
    }
}
