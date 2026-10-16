package ca.cinesmart.discovery;

import ca.cinesmart.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /movies (browse) and /movies/search (change.md Q17, Q18, Q19). */
class BrowseAndSearchIntegrationTest extends IntegrationTest {

    @Test
    void browseListsEveryMovieByImdbRatingThenVotes() throws Exception {
        mvc.perform(get("/api/v1/movies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalResults").value(20))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.results[*].movieId",
                        contains(11, 6, 15, 4, 1, 5, 9, 10, 17, 18, 8, 14, 7, 13, 12, 3, 2, 19, 20, 16)));
    }

    @Test
    void movieCardHasTheDocumentedFields() throws Exception {
        mvc.perform(get("/api/v1/movies").param("size", "1"))
                .andExpect(jsonPath("$.results[0].movieId").value(11))
                .andExpect(jsonPath("$.results[0].title").value("The Shawshank Redemption"))
                .andExpect(jsonPath("$.results[0].year").value(1994))
                .andExpect(jsonPath("$.results[0].poster").value("https://img.test/11.jpg"))
                .andExpect(jsonPath("$.results[0].imdbRating").value(9.3))
                .andExpect(jsonPath("$.results[0].likeCount").value(0))
                .andExpect(jsonPath("$.results[0].dislikeCount").value(0))
                .andExpect(jsonPath("$.results[0].inWatchlist").doesNotExist())
                .andExpect(jsonPath("$.results[0].watched").doesNotExist());
    }

    @Test
    void pagination() throws Exception {
        mvc.perform(get("/api/v1/movies").param("page", "3").param("size", "5"))
                .andExpect(jsonPath("$.results[*].movieId", contains(3, 2, 19, 20, 16)))
                .andExpect(jsonPath("$.page").value(3))
                .andExpect(jsonPath("$.totalPages").value(4))
                .andExpect(jsonPath("$.totalResults").value(20));
        mvc.perform(get("/api/v1/movies").param("page", "10").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(20));
    }

    @Test
    void invalidPagingIs400() throws Exception {
        mvc.perform(get("/api/v1/movies").param("size", "31"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        mvc.perform(get("/api/v1/movies").param("size", "0")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/movies").param("page", "-1")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/movies").param("size", "abc"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    void filtersCombineWithAnd() throws Exception {
        mvc.perform(get("/api/v1/movies").param("genreId", "4").param("languageId", "1"))
                .andExpect(jsonPath("$.results[*].movieId", contains(18, 14, 12)))
                .andExpect(jsonPath("$.totalResults").value(3));
        mvc.perform(get("/api/v1/movies").param("year", "2001"))
                .andExpect(jsonPath("$.results[*].movieId", contains(9, 8)));
        mvc.perform(get("/api/v1/movies").param("genreId", "1").param("year", "2003"))
                .andExpect(jsonPath("$.results[*].movieId", contains(17, 2)));
    }

    @Test
    void knownGenreWithoutMoviesIsAnEmptyPage() throws Exception {
        mvc.perform(get("/api/v1/movies").param("genreId", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(0))
                .andExpect(jsonPath("$.totalPages").value(0));
    }

    @Test
    void unknownFiltersAndParamsAre400() throws Exception {
        mvc.perform(get("/api/v1/movies").param("genreId", "999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fields.genreId").value("Unknown genre"));
        mvc.perform(get("/api/v1/movies").param("languageId", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.languageId").exists());
        mvc.perform(get("/api/v1/movies").param("year", "1800"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.year").exists());
        mvc.perform(get("/api/v1/movies").param("sort", "title"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Unknown query parameter: sort"));
        mvc.perform(get("/api/v1/movies/search").param("q", "matrix").param("genreId", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Unknown query parameter: genreId"));
    }

    /**
     * The three exact title matches come first (ties by IMDb votes). With the configured threshold of 0.3,
     * weaker fuzzy matches follow, e.g. "matrix" also matches "Matthew McConaughey" (Interstellar).
     */
    @Test
    void searchMatchesTitlesBestFirstThenByVotes() throws Exception {
        mvc.perform(get("/api/v1/movies/search").param("q", "matrix"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0:3].movieId", contains(1, 2, 20)))
                .andExpect(jsonPath("$.results[*].movieId", hasItems(5)));
    }

    @Test
    void searchMatchesPeopleNames() throws Exception {
        mvc.perform(get("/api/v1/movies/search").param("q", "keanu"))
                .andExpect(jsonPath("$.results[0:4].movieId", contains(1, 3, 2, 20)));
        mvc.perform(get("/api/v1/movies/search").param("q", "  Nolan  "))
                .andExpect(jsonPath("$.results[0:3].movieId", contains(6, 4, 5)));
    }

    @Test
    void searchToleratesTypos() throws Exception {
        mvc.perform(get("/api/v1/movies/search").param("q", "matrx"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].movieId", hasItems(1, 2, 20)));
    }

    @Test
    void titleMatchBeatsAnEquallyGoodPersonMatch() throws Exception {
        // "John Wick" (title) vs "John Lasseter" (Toy Story's director, more votes): the title boost decides.
        mvc.perform(get("/api/v1/movies/search").param("q", "john"))
                .andExpect(jsonPath("$.results[0].movieId").value(3))
                .andExpect(jsonPath("$.results[1].movieId").value(18));
    }

    @Test
    void searchWithoutMatchesIsAnEmptyPage() throws Exception {
        mvc.perform(get("/api/v1/movies/search").param("q", "qqqzzzxxx"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(0));
    }

    @Test
    void searchQueryLengthIsValidated() throws Exception {
        mvc.perform(get("/api/v1/movies/search").param("q", " ab "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.q").exists());
        mvc.perform(get("/api/v1/movies/search").param("q", "x".repeat(101)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.q").exists());
        mvc.perform(get("/api/v1/movies/search"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    void searchPagination() throws Exception {
        String all = mvc.perform(get("/api/v1/movies/search").param("q", "keanu").param("size", "30"))
                .andReturn().getResponse().getContentAsString();
        java.util.List<Integer> ids = com.jayway.jsonpath.JsonPath.read(all, "$.results[*].movieId");
        mvc.perform(get("/api/v1/movies/search").param("q", "keanu").param("size", "3").param("page", "1"))
                .andExpect(jsonPath("$.results[0].movieId").value(ids.get(3)))
                .andExpect(jsonPath("$.totalResults").value(ids.size()))
                .andExpect(jsonPath("$.totalPages").value((ids.size() + 2) / 3));
    }

    @Test
    void loggedInCardsCarryWatchlistAndWatchedFlags() throws Exception {
        Session session = loginAs("alice");
        mvc.perform(put("/api/v1/movies/2/watchlist").with(bearer(session))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/20/watched").with(bearer(session))).andExpect(status().isOk());

        mvc.perform(get("/api/v1/movies/search").param("q", "matrix").with(bearer(session)))
                .andExpect(jsonPath("$.results[0:3].inWatchlist", contains(false, true, false)))
                .andExpect(jsonPath("$.results[0:3].watched", contains(false, false, true)));
    }

    @Test
    void anInvalidTokenOnAPublicEndpointIsTreatedAsAnonymous() throws Exception {
        mvc.perform(get("/api/v1/movies").param("size", "1").with(bearer("not.a.jwt")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].inWatchlist").doesNotExist());
    }
}
