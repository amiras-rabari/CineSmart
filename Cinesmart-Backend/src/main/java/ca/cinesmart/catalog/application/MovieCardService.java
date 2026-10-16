package ca.cinesmart.catalog.application;

import ca.cinesmart.catalog.persistence.MovieCardRepository;
import ca.cinesmart.shared.movie.MovieCard;
import ca.cinesmart.shared.movie.UserMovieStateLookup;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Builds MovieCards for any list of movie IDs, keeping the requested order (change.md Q18). */
@Service
public class MovieCardService {

    private final MovieCardRepository repository;
    private final UserMovieStateLookup userStates;

    public MovieCardService(MovieCardRepository repository, UserMovieStateLookup userStates) {
        this.repository = repository;
        this.userStates = userStates;
    }

    /**
     * @param userId null for anonymous users; then inWatchlist / watched stay null.
     *               Unknown IDs are skipped.
     */
    public List<MovieCard> getCards(List<Long> movieIds, Long userId) {
        if (movieIds.isEmpty()) {
            return List.of();
        }
        Map<Long, MovieCard> byId = repository.findCards(movieIds).stream()
                .collect(Collectors.toMap(MovieCard::movieId, Function.identity()));

        Set<Long> inWatchlist = userId == null ? Set.of() : userStates.inWatchlist(userId, byId.keySet());
        Set<Long> watched = userId == null ? Set.of() : userStates.watched(userId, byId.keySet());

        List<MovieCard> cards = new ArrayList<>(byId.size());
        for (Long id : movieIds) {
            MovieCard card = byId.get(id);
            if (card == null) {
                continue;
            }
            cards.add(userId == null ? card : new MovieCard(
                    card.movieId(), card.title(), card.year(), card.poster(), card.imdbRating(),
                    card.averageRating(), card.likeCount(), card.dislikeCount(),
                    inWatchlist.contains(id), watched.contains(id)));
        }
        return cards;
    }
}
