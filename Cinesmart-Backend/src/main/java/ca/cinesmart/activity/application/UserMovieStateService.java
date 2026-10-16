package ca.cinesmart.activity.application;

import ca.cinesmart.activity.persistence.UserMovieStateRepository;
import ca.cinesmart.shared.movie.UserMovieState;
import ca.cinesmart.shared.movie.UserMovieStateLookup;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Map;
import java.util.Set;

@Service
public class UserMovieStateService implements UserMovieStateLookup {

    private static final String NEUTRAL = "NEUTRAL";

    private final UserMovieStateRepository repository;

    public UserMovieStateService(UserMovieStateRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserMovieState getState(Long userId, Long movieId) {
        Map<String, Object> row = repository.findState(userId, movieId);
        Object rating = row.get("rating");
        Object reaction = row.get("reaction");
        return new UserMovieState(
                Boolean.TRUE.equals(row.get("in_watchlist")),
                Boolean.TRUE.equals(row.get("watched")),
                rating == null ? null : (BigDecimal) rating,
                reaction == null ? NEUTRAL : reaction.toString()
        );
    }

    @Override
    public Set<Long> inWatchlist(Long userId, Collection<Long> movieIds) {
        return repository.findWatchlistMovieIds(userId, movieIds);
    }

    @Override
    public Set<Long> watched(Long userId, Collection<Long> movieIds) {
        return repository.findWatchedMovieIds(userId, movieIds);
    }
}
