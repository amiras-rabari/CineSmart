package ca.cinesmart.recommendation.application;

import ca.cinesmart.activity.application.MyListsService;
import ca.cinesmart.activity.domain.ActivitySignals;
import ca.cinesmart.catalog.application.CatalogService;
import ca.cinesmart.catalog.application.MovieCardService;
import ca.cinesmart.catalog.domain.MovieFeatures;
import ca.cinesmart.recommendation.domain.TasteProfile;
import ca.cinesmart.recommendation.persistence.RecommendationRepository;
import ca.cinesmart.recommendation.persistence.RecommendationRepository.Candidate;
import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.MovieNotFoundException;
import ca.cinesmart.shared.movie.MovieCard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * GET /movies/{id}/similar (change.md Q23): candidates sharing a genre, actor or director with the movie,
 * scored like For You with every feature of the movie weighing 1. A movie with genres but no people therefore
 * gets same-genre movies ranked mostly by IMDb rating; one with neither gets an empty list.
 */
@Service
public class SimilarService {

    private final RecommendationRepository repository;
    private final CatalogService catalog;
    private final MovieCardService cards;
    private final MyListsService myLists;
    private final RecommendationProperties props;
    private final int defaultSize;
    private final int maxSize;

    public SimilarService(RecommendationRepository repository, CatalogService catalog, MovieCardService cards,
                          MyListsService myLists, RecommendationProperties props,
                          @Value("${similar.default-size}") int defaultSize,
                          @Value("${similar.max-size}") int maxSize) {
        this.repository = repository;
        this.catalog = catalog;
        this.cards = cards;
        this.myLists = myLists;
        this.props = props;
        this.defaultSize = defaultSize;
        this.maxSize = maxSize;
    }

    /** @param userId null when anonymous; logged-in users also don't see their watched or disliked movies. */
    public List<MovieCard> similar(Long movieId, Integer size, Long userId) {
        int limit = size == null ? defaultSize : size;
        if (limit < 1 || limit > maxSize) {
            throw ApiException.invalidField("size", "must be between 1 and " + maxSize);
        }
        if (!catalog.movieExists(movieId)) {
            throw new MovieNotFoundException(movieId);
        }
        MovieFeatures movie = catalog.getFeatures(Set.of(movieId)).getOrDefault(movieId, MovieFeatures.empty());

        Set<Long> excluded = new HashSet<>();
        excluded.add(movieId);
        if (userId != null) {
            ActivitySignals signals = myLists.signals(userId);
            signals.watched().forEach(entry -> excluded.add(entry.movieId()));
            excluded.addAll(signals.dislikedIds());
        }

        List<Candidate> candidates = repository.findCandidates(movie.genreIds(), movie.actorIds(),
                movie.directorIds(), excluded, props.candidateLimit());
        if (candidates.isEmpty()) {
            return List.of();
        }
        Map<Long, MovieFeatures> features = catalog.getFeatures(
                candidates.stream().map(Candidate::movieId).collect(Collectors.toCollection(LinkedHashSet::new)));
        TasteProfile profile = new TasteProfile(ones(movie.genreIds()), ones(movie.languageIds()),
                ones(movie.actorIds()), ones(movie.directorIds()));
        List<Long> ids = CandidateScorer.score(profile, candidates, features, props.score()).stream()
                .limit(limit)
                .map(scored -> scored.candidate().movieId())
                .toList();
        return cards.getCards(ids, userId);
    }

    private static Map<Long, Double> ones(Set<Long> ids) {
        return ids.stream().collect(Collectors.toMap(Function.identity(), id -> 1.0));
    }
}
