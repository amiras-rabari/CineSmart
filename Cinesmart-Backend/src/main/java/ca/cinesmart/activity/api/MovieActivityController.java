package ca.cinesmart.activity.api;

import ca.cinesmart.activity.api.dto.RatingRequestDto;
import ca.cinesmart.activity.api.dto.UserReactionRequestDto;
import ca.cinesmart.activity.application.ActivityService;
import ca.cinesmart.shared.movie.UserMovieState;
import ca.cinesmart.shared.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** PUT sets a state, DELETE removes it; both are idempotent and return 200 with the updated userState (Q7, Q25). */
@RestController
@RequestMapping("/api/v1/movies/{id}")
@Validated
public class MovieActivityController {

    private final ActivityService activity;

    public MovieActivityController(ActivityService activity) {
        this.activity = activity;
    }

    @PutMapping("/watchlist")
    public UserMovieState addToWatchlist(@AuthenticationPrincipal Jwt jwt, @PathVariable @Positive Long id) {
        return activity.setWatchlist(CurrentUser.id(jwt), id);
    }

    @DeleteMapping("/watchlist")
    public UserMovieState removeFromWatchlist(@AuthenticationPrincipal Jwt jwt, @PathVariable @Positive Long id) {
        return activity.removeWatchlist(CurrentUser.id(jwt), id);
    }

    @PutMapping("/watched")
    public UserMovieState markWatched(@AuthenticationPrincipal Jwt jwt, @PathVariable @Positive Long id) {
        return activity.setWatched(CurrentUser.id(jwt), id);
    }

    @DeleteMapping("/watched")
    public UserMovieState unmarkWatched(@AuthenticationPrincipal Jwt jwt, @PathVariable @Positive Long id) {
        return activity.removeWatched(CurrentUser.id(jwt), id);
    }

    @PutMapping("/rating")
    public UserMovieState rate(@AuthenticationPrincipal Jwt jwt, @PathVariable @Positive Long id,
                               @Valid @RequestBody RatingRequestDto request) {
        return activity.setRating(CurrentUser.id(jwt), id, request.rating());
    }

    @DeleteMapping("/rating")
    public UserMovieState removeRating(@AuthenticationPrincipal Jwt jwt, @PathVariable @Positive Long id) {
        return activity.removeRating(CurrentUser.id(jwt), id);
    }

    @PutMapping("/reaction")
    public UserMovieState react(@AuthenticationPrincipal Jwt jwt, @PathVariable @Positive Long id,
                                @Valid @RequestBody UserReactionRequestDto request) {
        return activity.setReaction(CurrentUser.id(jwt), id, request.reaction());
    }

    @DeleteMapping("/reaction")
    public UserMovieState removeReaction(@AuthenticationPrincipal Jwt jwt, @PathVariable @Positive Long id) {
        return activity.removeReaction(CurrentUser.id(jwt), id);
    }
}
