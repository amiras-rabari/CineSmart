package ca.cinesmart.recommendation.application;

import ca.cinesmart.activity.application.MyListsService;
import ca.cinesmart.activity.domain.ActivitySignals;
import ca.cinesmart.catalog.application.CatalogService;
import ca.cinesmart.catalog.application.MovieCardService;
import ca.cinesmart.catalog.domain.MovieDetails;
import ca.cinesmart.catalog.domain.MovieFeatures;
import ca.cinesmart.catalog.domain.NamedRef;
import ca.cinesmart.discovery.application.DiscoveryService;
import ca.cinesmart.discovery.domain.RankedList;
import ca.cinesmart.recommendation.domain.RecommendationCard;
import ca.cinesmart.recommendation.persistence.RecommendationRepository;
import ca.cinesmart.recommendation.persistence.RecommendationRepository.Candidate;
import ca.cinesmart.shared.api.PageParams;
import ca.cinesmart.shared.api.PageResponse;
import ca.cinesmart.shared.movie.MovieCard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Signal weighting (change.md Q22): ratings ≥ 8 → 3, 7–7.9 → 2, like → 2, watched → 1, watchlist → 1,
 * ×1.5 within the last 90 days; fewer than 3 signal movies → cold start.
 * Collaborators are mocked so the time-based recency rule can be tested without touching src/main.
 */
class RecommendationServiceTest {

    private static final long USER = 1L;
    private static final Instant RECENT = Instant.now().minus(Duration.ofDays(1));
    private static final Instant OLD = Instant.now().minus(Duration.ofDays(200));

    private RecommendationRepository repository;
    private CatalogService catalog;
    private MovieCardService cards;
    private MyListsService myLists;
    private DiscoveryService discovery;
    private RecommendationService service;

    @BeforeEach
    void setUp() {
        repository = mock(RecommendationRepository.class);
        catalog = mock(CatalogService.class);
        cards = mock(MovieCardService.class);
        myLists = mock(MyListsService.class);
        discovery = mock(DiscoveryService.class);
        RecommendationProperties props = new RecommendationProperties(
                new RecommendationProperties.Weight(3, 2, 2, 1, 1), 90, 1.5, 300, 3,
                new RecommendationProperties.Score(0.4, 0.3, 0.1, 0.2));
        service = new RecommendationService(repository, catalog, cards, myLists, discovery, props);

        when(cards.getCards(anyList(), eq(USER))).thenAnswer(inv -> {
            List<Long> ids = inv.getArgument(0);
            return ids.stream().map(RecommendationServiceTest::card).toList();
        });
    }

    @Test
    void recentActivityWeighsMoreThanOldActivity() {
        // Three watched movies, one genre each; only movie 2 (genre 20) was watched recently.
        givenWatched(new ActivitySignals.Entry(1L, OLD), new ActivitySignals.Entry(2L, RECENT),
                new ActivitySignals.Entry(3L, OLD));
        // Candidate 100 matches genre 10 (old), candidate 200 matches genre 20 (recent); otherwise equal,
        // and 100 would win the tie-break on votes.
        givenCandidates(Map.of(100L, 10L, 200L, 20L), Map.of(100L, 500L, 200L, 1L));

        List<RecommendationCard> results = service.recommend(USER, PageParams.of(0, 10)).results();

        assertThat(results).extracting(r -> r.card().movieId()).containsExactly(200L, 100L);
        assertThat(results.get(0).reason()).isEqualTo("Matches your taste in Genre20");
    }

    @Test
    void withoutRecencyTheOrderFlips() {
        givenWatched(new ActivitySignals.Entry(1L, OLD), new ActivitySignals.Entry(2L, OLD),
                new ActivitySignals.Entry(3L, OLD));
        givenCandidates(Map.of(100L, 10L, 200L, 20L), Map.of(100L, 500L, 200L, 1L));

        assertThat(service.recommend(USER, PageParams.of(0, 10)).results())
                .extracting(r -> r.card().movieId()).containsExactly(100L, 200L);
    }

    @Test
    void fewerThanThreeSignalMoviesFallsBackToColdStart() {
        // Rated 6.0 (no weight), disliked 5: neither counts as a signal; both are excluded.
        when(myLists.signals(USER)).thenReturn(new ActivitySignals(
                List.of(new ActivitySignals.Entry(1L, RECENT)),
                List.of(new ActivitySignals.Entry(2L, RECENT)),
                List.of(new ActivitySignals.Rated(4L, new BigDecimal("6.0"), RECENT)),
                List.of(),
                Set.of(5L)));
        when(discovery.rankedIds(RankedList.TOP_RATED, 300)).thenReturn(List.of(9L, 1L, 8L));
        when(discovery.rankedIds(RankedList.IMDB_TOP_250, 300)).thenReturn(List.of(8L, 4L, 5L, 7L, 2L));

        PageResponse<RecommendationCard> page = service.recommend(USER, PageParams.of(0, 10));

        assertThat(page.results()).extracting(r -> r.card().movieId()).containsExactly(9L, 8L, 7L);
        assertThat(page.results()).allSatisfy(r -> assertThat(r.reason()).isEqualTo("Popular on CineSmart"));
        assertThat(page.totalResults()).isEqualTo(3);
        verify(repository, never()).findCandidates(any(), any(), any(), any(), anyInt());
    }

    @Test
    void everySignalMovieIsExcludedFromCandidates() {
        when(myLists.signals(USER)).thenReturn(new ActivitySignals(
                List.of(new ActivitySignals.Entry(1L, RECENT)),
                List.of(new ActivitySignals.Entry(2L, RECENT)),
                List.of(new ActivitySignals.Rated(3L, new BigDecimal("9.0"), RECENT)),
                List.of(new ActivitySignals.Entry(4L, RECENT)),
                Set.of(5L)));
        when(catalog.getMoviesByIds(anyList())).thenAnswer(inv -> {
            List<Long> ids = inv.getArgument(0);
            return ids.stream().map(id -> movie(id, 10L)).toList();
        });
        when(repository.findCandidates(any(), any(), any(), any(), anyInt())).thenReturn(List.of());
        when(discovery.rankedIds(any(), anyInt())).thenReturn(List.of());

        service.recommend(USER, PageParams.of(0, 10));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<Long>> excluded = ArgumentCaptor.forClass(Collection.class);
        verify(repository).findCandidates(any(), any(), any(), excluded.capture(), eq(300));
        assertThat(excluded.getValue()).containsExactlyInAnyOrder(1L, 2L, 3L, 4L, 5L);
    }

    private void givenWatched(ActivitySignals.Entry... watched) {
        when(myLists.signals(USER)).thenReturn(new ActivitySignals(List.of(), List.of(watched), List.of(), List.of(),
                Set.of()));
        // Signal movie n has genre n*10.
        when(catalog.getMoviesByIds(anyList())).thenAnswer(inv -> {
            List<Long> ids = inv.getArgument(0);
            return ids.stream().map(id -> movie(id, id * 10)).toList();
        });
    }

    private void givenCandidates(Map<Long, Long> genreByCandidate, Map<Long, Long> votesByCandidate) {
        List<Candidate> candidates = genreByCandidate.keySet().stream().sorted()
                .map(id -> new Candidate(id, new BigDecimal("8.0"), votesByCandidate.get(id)))
                .toList();
        when(repository.findCandidates(any(), any(), any(), any(), anyInt())).thenReturn(candidates);
        when(catalog.getFeatures(any())).thenAnswer(inv -> {
            Set<Long> ids = inv.getArgument(0);
            return ids.stream().collect(java.util.stream.Collectors.toMap(id -> id,
                    id -> new MovieFeatures(Set.of(genreByCandidate.get(id)), Set.of(), Set.of(), Set.of())));
        });
    }

    private static MovieDetails movie(Long id, Long genreId) {
        return new MovieDetails(id, null, "Movie " + id, null, null, null, null, null, null, null, null,
                List.of(new NamedRef(genreId, "Genre" + genreId)), List.of(), List.of(), List.of(), List.of(),
                Map.of(), null, List.of(), null);
    }

    private static MovieCard card(Long id) {
        return new MovieCard(id, "Movie " + id, null, null, null, null, 0, 0, false, false);
    }
}
