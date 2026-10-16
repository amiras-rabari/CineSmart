package ca.cinesmart.activity.application;

import ca.cinesmart.activity.domain.ActivitySignals;
import ca.cinesmart.activity.domain.RatedItem;
import ca.cinesmart.activity.domain.ReactionItem;
import ca.cinesmart.activity.domain.WatchedItem;
import ca.cinesmart.activity.domain.WatchlistItem;
import ca.cinesmart.activity.persistence.ActivityRepository;
import ca.cinesmart.activity.persistence.ActivityRepository.RatedId;
import ca.cinesmart.activity.persistence.ActivityRepository.TimedId;
import ca.cinesmart.activity.persistence.UserMovieStateRepository;
import ca.cinesmart.catalog.application.MovieCardService;
import ca.cinesmart.shared.api.PageParams;
import ca.cinesmart.shared.api.PageResponse;
import ca.cinesmart.shared.movie.MovieCard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** The /me lists, profile counts and recommendation signals (change.md Q8, Q15, Q22). Empty → 200, never 204. */
@Service
public class MyListsService {

    private final ActivityRepository repository;
    private final UserMovieStateRepository stateRepository;
    private final MovieCardService cards;

    public MyListsService(ActivityRepository repository, UserMovieStateRepository stateRepository,
                          MovieCardService cards) {
        this.repository = repository;
        this.stateRepository = stateRepository;
        this.cards = cards;
    }

    /** Newest first. */
    @Transactional(readOnly = true)
    public PageResponse<WatchlistItem> watchlist(Long userId, PageParams page) {
        List<TimedId> rows = repository.findWatchlistPage(userId, page.size(), page.offset());
        long total = repository.countWatchlist(userId);
        Map<Long, MovieCard> byId = cardsById(rows.stream().map(TimedId::movieId).toList(), userId);
        List<WatchlistItem> items = rows.stream()
                .filter(row -> byId.containsKey(row.movieId()))
                .map(row -> new WatchlistItem(byId.get(row.movieId()), row.at()))
                .toList();
        return PageResponse.of(items, page, total);
    }

    /** Newest first. */
    @Transactional(readOnly = true)
    public PageResponse<RatedItem> ratings(Long userId, PageParams page) {
        List<RatedId> rows = repository.findRatingsPage(userId, page.size(), page.offset());
        long total = repository.countRatings(userId);
        Map<Long, MovieCard> byId = cardsById(rows.stream().map(RatedId::movieId).toList(), userId);
        List<RatedItem> items = rows.stream()
                .filter(row -> byId.containsKey(row.movieId()))
                .map(row -> new RatedItem(byId.get(row.movieId()), row.rating(), row.at()))
                .toList();
        return PageResponse.of(items, page, total);
    }

    /** Not paginated; lightweight, for marking watched items in the UI. */
    public List<WatchedItem> watched(Long userId) {
        return repository.findWatched(userId);
    }

    /** LIKE / DISLIKE only. */
    public List<ReactionItem> reactions(Long userId) {
        return repository.findReactions(userId);
    }

    /** Profile counts for Identity's GET /me. */
    public ActivityCounts counts(Long userId) {
        Map<String, Object> row = stateRepository.findCounts(userId);
        return new ActivityCounts(
                ((Number) row.get("watchlist_count")).longValue(),
                ((Number) row.get("watched_count")).longValue(),
                ((Number) row.get("rating_count")).longValue()
        );
    }

    /** For Recommendation. */
    public ActivitySignals signals(Long userId) {
        return repository.findSignals(userId);
    }

    private Map<Long, MovieCard> cardsById(List<Long> ids, Long userId) {
        return cards.getCards(ids, userId).stream()
                .collect(Collectors.toMap(MovieCard::movieId, Function.identity()));
    }
}
