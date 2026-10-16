package ca.cinesmart.activity.application;

import ca.cinesmart.activity.persistence.ActivityRepository;
import ca.cinesmart.catalog.application.CatalogService;
import ca.cinesmart.shared.api.MovieNotFoundException;
import ca.cinesmart.shared.movie.UserMovieState;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Activity writes (change.md Q7, Q14, Q25, B-9). Every method is idempotent, checks the movie exists
 * (404 MOVIE_NOT_FOUND) and returns the user's updated state for that movie.
 */
@Service
public class ActivityService {

    private final ActivityRepository repository;
    private final CatalogService catalog;
    private final UserMovieStateService states;

    public ActivityService(ActivityRepository repository, CatalogService catalog, UserMovieStateService states) {
        this.repository = repository;
        this.catalog = catalog;
        this.states = states;
    }

    @Transactional
    public UserMovieState setWatchlist(Long userId, Long movieId) {
        requireMovie(movieId);
        repository.addToWatchlist(userId, movieId);
        return states.getState(userId, movieId);
    }

    @Transactional
    public UserMovieState removeWatchlist(Long userId, Long movieId) {
        requireMovie(movieId);
        repository.removeFromWatchlist(userId, movieId);
        return states.getState(userId, movieId);
    }

    @Transactional
    public UserMovieState setWatched(Long userId, Long movieId) {
        requireMovie(movieId);
        repository.addToWatched(userId, movieId);
        return states.getState(userId, movieId);
    }

    @Transactional
    public UserMovieState removeWatched(Long userId, Long movieId) {
        requireMovie(movieId);
        repository.removeFromWatched(userId, movieId);
        return states.getState(userId, movieId);
    }

    @Transactional
    public UserMovieState setRating(Long userId, Long movieId, BigDecimal rating) {
        requireMovie(movieId);
        repository.upsertRating(userId, movieId, rating);
        return states.getState(userId, movieId);
    }

    @Transactional
    public UserMovieState removeRating(Long userId, Long movieId) {
        requireMovie(movieId);
        repository.deleteRating(userId, movieId);
        return states.getState(userId, movieId);
    }

    /** NEUTRAL is stored as a row; it reads the same as no row (change.md Q14). */
    @Transactional
    public UserMovieState setReaction(Long userId, Long movieId, String reaction) {
        requireMovie(movieId);
        repository.upsertReaction(userId, movieId, reaction);
        return states.getState(userId, movieId);
    }

    @Transactional
    public UserMovieState removeReaction(Long userId, Long movieId) {
        requireMovie(movieId);
        repository.deleteReaction(userId, movieId);
        return states.getState(userId, movieId);
    }

    private void requireMovie(Long movieId) {
        if (!catalog.movieExists(movieId)) {
            throw new MovieNotFoundException(movieId);
        }
    }
}
