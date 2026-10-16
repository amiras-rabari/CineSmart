package ca.cinesmart.recommendation.application;

import ca.cinesmart.activity.application.MyListsService;
import ca.cinesmart.activity.domain.ActivitySignals;
import ca.cinesmart.catalog.application.CatalogService;
import ca.cinesmart.catalog.application.MovieCardService;
import ca.cinesmart.catalog.domain.MovieDetails;
import ca.cinesmart.catalog.domain.MovieFeatures;
import ca.cinesmart.catalog.domain.NamedRef;
import ca.cinesmart.catalog.domain.PersonRef;
import ca.cinesmart.discovery.application.DiscoveryService;
import ca.cinesmart.discovery.application.ForYouSource;
import ca.cinesmart.discovery.domain.RankedList;
import ca.cinesmart.recommendation.application.CandidateScorer.Scored;
import ca.cinesmart.recommendation.domain.RecommendationCard;
import ca.cinesmart.recommendation.domain.TasteProfile;
import ca.cinesmart.recommendation.persistence.RecommendationRepository;
import ca.cinesmart.recommendation.persistence.RecommendationRepository.Candidate;
import ca.cinesmart.shared.api.PageParams;
import ca.cinesmart.shared.api.PageResponse;
import ca.cinesmart.shared.movie.MovieCard;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * "For You" (change.md Q22): positive signals → weighted taste profile → ~300 candidates → scored, with a reason
 * per item. Fewer than {@code cold-start-min-signals} signal movies → Top Rated by Users, then IMDb Top 250.
 * Also provides the home For You row (same order as page 0 of GET /recommendations).
 */
@Service
@EnableConfigurationProperties(RecommendationProperties.class)
public class RecommendationService implements ForYouSource {

    static final String COLD_START_REASON = "Popular on CineSmart";
    private static final BigDecimal RATING_HIGH = BigDecimal.valueOf(8);
    private static final BigDecimal RATING_MID = BigDecimal.valueOf(7);
    /** "Because you liked X" needs at least this many shared genres with X. */
    private static final int LIKED_MOVIE_MIN_SHARED_GENRES = 2;

    private final RecommendationRepository repository;
    private final CatalogService catalog;
    private final MovieCardService cards;
    private final MyListsService myLists;
    private final DiscoveryService discovery;
    private final RecommendationProperties props;

    public RecommendationService(RecommendationRepository repository, CatalogService catalog,
                                 MovieCardService cards, MyListsService myLists,
                                 DiscoveryService discovery, RecommendationProperties props) {
        this.repository = repository;
        this.catalog = catalog;
        this.cards = cards;
        this.myLists = myLists;
        this.discovery = discovery;
        this.props = props;
    }

    /** One page of the user's ranked list (at most candidate-limit items in total). */
    public PageResponse<RecommendationCard> recommend(Long userId, PageParams page) {
        List<Ranked> ranking = rank(userId);
        List<Ranked> slice = ranking.stream().skip(page.offset()).limit(page.size()).toList();
        Map<Long, String> reasons = slice.stream().collect(Collectors.toMap(Ranked::movieId, Ranked::reason));
        List<RecommendationCard> results = cards.getCards(slice.stream().map(Ranked::movieId).toList(), userId)
                .stream()
                .map(card -> new RecommendationCard(card, reasons.get(card.movieId())))
                .toList();
        return PageResponse.of(results, page, ranking.size());
    }

    /** Home row: the same items as {@link #recommend}, as plain cards. */
    @Override
    public PageResponse<MovieCard> forYou(Long userId, PageParams page) {
        return recommend(userId, page).map(items -> items.stream().map(RecommendationCard::card).toList());
    }

    private record Ranked(Long movieId, String reason) {
    }

    private List<Ranked> rank(Long userId) {
        ActivitySignals signals = myLists.signals(userId);
        Signals s = weigh(signals);
        if (s.movieWeights().size() < props.coldStartMinSignals()) {
            return coldStart(s.excluded());
        }

        // Signal movies are loaded in full (not just getFeatures) because the reasons need titles and names.
        List<MovieDetails> signalMovies = catalog.getMoviesByIds(new ArrayList<>(s.movieWeights().keySet()));
        Names names = new Names();
        TasteProfile profile = buildProfile(signalMovies, s.movieWeights(), names);

        List<Candidate> candidates = repository.findCandidates(profile.genres().keySet(), profile.actors().keySet(),
                profile.directors().keySet(), s.excluded(), props.candidateLimit());
        if (candidates.isEmpty()) {
            return coldStart(s.excluded());
        }
        Map<Long, MovieFeatures> features = catalog.getFeatures(
                candidates.stream().map(Candidate::movieId).collect(Collectors.toCollection(LinkedHashSet::new)));
        List<Scored> scored = CandidateScorer.score(profile, candidates, features, props.score());

        List<MovieDetails> likedMovies = signalMovies.stream()
                .filter(m -> s.positive().contains(m.movieId()))
                .sorted(Comparator.comparingDouble((MovieDetails m) -> s.movieWeights().getOrDefault(m.movieId(), 0.0))
                        .reversed()
                        .thenComparing(MovieDetails::movieId))
                .toList();
        return scored.stream()
                .map(item -> new Ranked(item.candidate().movieId(), reason(item, profile, likedMovies, names)))
                .toList();
    }

    /**
     * @param movieWeights signal movie → summed weight
     * @param positive     liked or rated ≥ 7 (candidates for "Because you liked X")
     * @param excluded     watched, watchlist, rated, liked, disliked (change.md Q22 + Phase 8 clarification)
     */
    private record Signals(Map<Long, Double> movieWeights, Set<Long> positive, Set<Long> excluded) {
    }

    private Signals weigh(ActivitySignals signals) {
        RecommendationProperties.Weight w = props.weight();
        Instant recentAfter = Instant.now().minus(Duration.ofDays(props.recentDays()));
        Map<Long, Double> weights = new LinkedHashMap<>();
        Set<Long> positive = new HashSet<>();
        Set<Long> excluded = new HashSet<>(signals.dislikedIds());

        for (ActivitySignals.Rated rated : signals.ratings()) {
            excluded.add(rated.movieId());
            if (rated.rating() == null) {
                continue;
            }
            if (rated.rating().compareTo(RATING_HIGH) >= 0) {
                add(weights, rated.movieId(), w.ratingHigh(), rated.at(), recentAfter);
                positive.add(rated.movieId());
            } else if (rated.rating().compareTo(RATING_MID) >= 0) {
                add(weights, rated.movieId(), w.ratingMid(), rated.at(), recentAfter);
                positive.add(rated.movieId());
            }
        }
        for (ActivitySignals.Entry like : signals.likes()) {
            add(weights, like.movieId(), w.like(), like.at(), recentAfter);
            positive.add(like.movieId());
            excluded.add(like.movieId());
        }
        for (ActivitySignals.Entry watched : signals.watched()) {
            add(weights, watched.movieId(), w.watched(), watched.at(), recentAfter);
            excluded.add(watched.movieId());
        }
        for (ActivitySignals.Entry entry : signals.watchlist()) {
            add(weights, entry.movieId(), w.watchlist(), entry.at(), recentAfter);
            excluded.add(entry.movieId());
        }
        return new Signals(weights, positive, excluded);
    }

    private void add(Map<Long, Double> weights, Long movieId, double weight, Instant at, Instant recentAfter) {
        if (weight <= 0) {
            return;
        }
        double value = at != null && at.isAfter(recentAfter) ? weight * props.recentMultiplier() : weight;
        weights.merge(movieId, value, Double::sum);
    }

    /** Each signal movie passes its weight on to its genres, languages, actors (all) and directors. */
    private static TasteProfile buildProfile(List<MovieDetails> movies, Map<Long, Double> movieWeights, Names names) {
        Map<Long, Double> genres = new HashMap<>();
        Map<Long, Double> languages = new HashMap<>();
        Map<Long, Double> actors = new HashMap<>();
        Map<Long, Double> directors = new HashMap<>();
        for (MovieDetails movie : movies) {
            double weight = movieWeights.get(movie.movieId());
            for (NamedRef genre : movie.genres()) {
                genres.merge(genre.id(), weight, Double::sum);
                names.genres.put(genre.id(), genre.name());
            }
            movie.languages().forEach(language -> languages.merge(language.id(), weight, Double::sum));
            for (PersonRef actor : movie.cast()) {
                actors.merge(actor.personId(), weight, Double::sum);
                names.people.put(actor.personId(), actor.name());
            }
            for (PersonRef director : movie.directors()) {
                directors.merge(director.personId(), weight, Double::sum);
                names.people.put(director.personId(), director.name());
            }
        }
        return new TasteProfile(genres, languages, actors, directors);
    }

    private static final class Names {
        private final Map<Long, String> genres = new HashMap<>();
        private final Map<Long, String> people = new HashMap<>();
    }

    /** Phase 8 clarification in change.md Q22: people, then a liked movie, then genre. */
    private String reason(Scored item, TasteProfile profile, List<MovieDetails> likedMovies, Names names) {
        RecommendationProperties.Score weights = props.score();
        MovieFeatures f = item.features();

        if (item.people() > 0 && weights.people() * item.people() >= weights.genre() * item.genre()) {
            Map<Long, Double> people = new HashMap<>();
            f.actorIds().forEach(id -> people.merge(id, profile.actors().getOrDefault(id, 0.0), Double::sum));
            f.directorIds().forEach(id -> people.merge(id, profile.directors().getOrDefault(id, 0.0), Double::sum));
            Long person = strongest(people);
            if (person != null) {
                return "More with " + names.people.get(person);
            }
        }
        for (MovieDetails liked : likedMovies) {
            long shared = liked.genres().stream().filter(g -> f.genreIds().contains(g.id())).count();
            if (shared >= LIKED_MOVIE_MIN_SHARED_GENRES) {
                return "Because you liked " + liked.title();
            }
        }
        Map<Long, Double> genres = new HashMap<>();
        f.genreIds().forEach(id -> genres.put(id, profile.genres().getOrDefault(id, 0.0)));
        Long genre = strongest(genres);
        return genre != null ? "Matches your taste in " + names.genres.get(genre) : COLD_START_REASON;
    }

    /** The ID with the highest positive weight (lowest ID on ties), or null. */
    private static Long strongest(Map<Long, Double> weights) {
        return weights.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .max(Map.Entry.<Long, Double>comparingByValue()
                        .thenComparing(Map.Entry.comparingByKey(Comparator.reverseOrder())))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    /** Top Rated by Users, then IMDb Top 250, without the user's excluded movies. */
    private List<Ranked> coldStart(Set<Long> excluded) {
        int limit = props.candidateLimit();
        Set<Long> ids = new LinkedHashSet<>(discovery.rankedIds(RankedList.TOP_RATED, limit));
        ids.addAll(discovery.rankedIds(RankedList.IMDB_TOP_250, limit));
        return ids.stream()
                .filter(id -> !excluded.contains(id))
                .limit(limit)
                .map(id -> new Ranked(id, COLD_START_REASON))
                .toList();
    }
}
