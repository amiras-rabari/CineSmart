package ca.cinesmart.catalog.domain;

import ca.cinesmart.shared.movie.UserMovieState;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * GET /movies/{id} response (change.md Q10). userState is null when anonymous.
 * otherCrew (role name -> people) holds any role other than Actor/Director/Writer and is omitted when empty.
 */
public record MovieDetails(
        Long movieId,
        String imdbId,
        String title,
        Short year,
        LocalDate released,
        Short runtime,
        String plot,
        String poster,
        String contentType,
        String studio,
        Ratings ratings,
        List<NamedRef> genres,
        List<NamedRef> languages,
        List<PersonRef> directors,
        List<PersonRef> writers,
        List<PersonRef> cast,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) Map<String, List<PersonRef>> otherCrew,
        PlatformStats platformStats,
        List<Availability> availability,
        UserMovieState userState
) {
    public MovieDetails withUserState(UserMovieState state) {
        return new MovieDetails(movieId, imdbId, title, year, released, runtime, plot, poster, contentType, studio,
                ratings, genres, languages, directors, writers, cast, otherCrew, platformStats, availability, state);
    }
}
