package ca.cinesmart.catalog;

import ca.cinesmart.support.IntegrationTest;
import ca.cinesmart.support.Json;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** GET /movies/{id}, /genres, /languages (change.md Q7, Q10, Q20). */
class CatalogIntegrationTest extends IntegrationTest {

    @Test
    void movieDetailsForAnonymousUsers() throws Exception {
        mvc.perform(get("/api/v1/movies/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.movieId").value(1))
                .andExpect(jsonPath("$.imdbId").value("tt0133093"))
                .andExpect(jsonPath("$.title").value("The Matrix"))
                .andExpect(jsonPath("$.year").value(1999))
                .andExpect(jsonPath("$.released").value("1999-03-31"))
                .andExpect(jsonPath("$.runtime").value(136))
                .andExpect(jsonPath("$.ratings.imdb").value(8.7))
                .andExpect(jsonPath("$.ratings.imdbVotes").value(2000000))
                .andExpect(jsonPath("$.ratings.rottenTomatoes").value(83))
                .andExpect(jsonPath("$.ratings.metascore").value(73))
                .andExpect(jsonPath("$.genres[*].name", contains("Action", "Sci-Fi")))
                .andExpect(jsonPath("$.languages[*].name", contains("English")))
                .andExpect(jsonPath("$.directors[*].name", contains("Lana Wachowski")))
                .andExpect(jsonPath("$.writers[*].name", contains("Lana Wachowski")))
                .andExpect(jsonPath("$.cast[*].name", contains("Carrie-Anne Moss", "Keanu Reeves")))
                .andExpect(jsonPath("$.otherCrew").doesNotExist())
                .andExpect(jsonPath("$.availability[*].platform", contains("Apple TV", "Netflix")))
                .andExpect(jsonPath("$.availability[1].type").value("sub"))
                .andExpect(jsonPath("$.availability[1].url").value("https://netflix.test/matrix"))
                .andExpect(jsonPath("$.platformStats.ratingCount").value(0))
                .andExpect(jsonPath("$.platformStats.likeCount").value(0))
                .andExpect(jsonPath("$.platformStats.averageRating").doesNotExist())
                .andExpect(jsonPath("$.userState").doesNotExist());
    }

    @Test
    void rolesOtherThanActorDirectorWriterGoToOtherCrew() throws Exception {
        mvc.perform(get("/api/v1/movies/4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otherCrew.Producer[*].name", contains("Emma Thomas")))
                .andExpect(jsonPath("$.languages[*].name", contains("English", "Japanese")));
    }

    @Test
    void movieWithoutLinksHasEmptyLists() throws Exception {
        mvc.perform(get("/api/v1/movies/19"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.genres", hasSize(0)))
                .andExpect(jsonPath("$.cast", hasSize(0)))
                .andExpect(jsonPath("$.availability", hasSize(0)));
    }

    @Test
    void loggedInUsersAlsoGetTheirStateForTheMovie() throws Exception {
        Session session = loginAs("alice");
        mvc.perform(get("/api/v1/movies/1").with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userState.inWatchlist").value(false))
                .andExpect(jsonPath("$.userState.watched").value(false))
                .andExpect(jsonPath("$.userState.rating").doesNotExist())
                .andExpect(jsonPath("$.userState.reaction").value("NEUTRAL"));

        mvc.perform(put("/api/v1/movies/1/watchlist").with(bearer(session))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/1/rating").with(bearer(session)).contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("rating", 9.5))).andExpect(status().isOk());
        mvc.perform(put("/api/v1/movies/1/reaction").with(bearer(session)).contentType(MediaType.APPLICATION_JSON)
                .content(Json.of("reaction", "LIKE"))).andExpect(status().isOk());

        mvc.perform(get("/api/v1/movies/1").with(bearer(session)))
                .andExpect(jsonPath("$.userState.inWatchlist").value(true))
                .andExpect(jsonPath("$.userState.rating").value(9.5))
                .andExpect(jsonPath("$.userState.reaction").value("LIKE"));
    }

    @Test
    void unknownMovieIs404AndBadIdsAre400() throws Exception {
        mvc.perform(get("/api/v1/movies/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MOVIE_NOT_FOUND"))
                .andExpect(jsonPath("$.path").value("/api/v1/movies/999"));
        mvc.perform(get("/api/v1/movies/0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        mvc.perform(get("/api/v1/movies/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    void genresInUseByNameWithOneHourCache() throws Exception {
        mvc.perform(get("/api/v1/genres"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("max-age=3600")))
                .andExpect(jsonPath("$[*].name",
                        contains("Action", "Animation", "Comedy", "Crime", "Drama", "Romance", "Sci-Fi")))
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void languagesInUseMostMoviesFirst() throws Exception {
        mvc.perform(get("/api/v1/languages"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("max-age=3600")))
                .andExpect(jsonPath("$[*].name", contains("English", "French", "Japanese", "Korean")));
    }
}
