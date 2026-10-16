package ca.cinesmart.recommendation;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /movies/{id}/similar (change.md Q23): public, JWT optional, size 1–30 (default 10). */
class SimilarIntegrationTest extends IntegrationTest {

    @Test
    void similarTitlesShareGenresAndPeopleBestFirst() throws Exception {
        mvc.perform(get("/api/v1/movies/1/similar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].movieId", contains(2, 20, 4, 3, 6, 5, 17)))
                .andExpect(jsonPath("$[0].title").value("The Matrix Reloaded"))
                .andExpect(jsonPath("$[0].inWatchlist").doesNotExist());
    }

    @Test
    void sizeLimitsTheList() throws Exception {
        mvc.perform(get("/api/v1/movies/1/similar").param("size", "3"))
                .andExpect(jsonPath("$[*].movieId", contains(2, 20, 4)));
        mvc.perform(get("/api/v1/movies/1/similar").param("size", "0"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.size").exists());
        mvc.perform(get("/api/v1/movies/1/similar").param("size", "31"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.size").exists());
        mvc.perform(get("/api/v1/movies/1/similar").param("size", "30")).andExpect(status().isOk());
    }

    @Test
    void movieWithNoGenresOrPeopleHasNoSimilarTitles() throws Exception {
        mvc.perform(get("/api/v1/movies/19/similar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void unknownMovieIs404() throws Exception {
        mvc.perform(get("/api/v1/movies/999/similar"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MOVIE_NOT_FOUND"));
        mvc.perform(get("/api/v1/movies/0/similar")).andExpect(status().isBadRequest());
    }

    @Test
    void loggedInUsersDoNotSeeWatchedOrDislikedMovies() throws Exception {
        Session s = loginAs("alice");
        mvc.perform(put("/api/v1/movies/2/watched").with(bearer(s))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/4/reaction").with(bearer(s)).contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("reaction", "DISLIKE"))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/3/watchlist").with(bearer(s))).andExpect(status().isOk());

        mvc.perform(get("/api/v1/movies/1/similar").with(bearer(s)))
                .andExpect(jsonPath("$[*].movieId", contains(20, 3, 6, 5, 17)))
                .andExpect(jsonPath("$[1].inWatchlist").value(true));
    }
}
