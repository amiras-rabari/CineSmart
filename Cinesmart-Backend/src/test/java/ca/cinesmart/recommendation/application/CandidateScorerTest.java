package ca.cinesmart.recommendation.application;

import ca.cinesmart.catalog.domain.MovieFeatures;
import ca.cinesmart.recommendation.application.CandidateScorer.Scored;
import ca.cinesmart.recommendation.domain.TasteProfile;
import ca.cinesmart.recommendation.persistence.RecommendationRepository.Candidate;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** Score = 0.4·genre + 0.3·people + 0.1·language + 0.2·imdb/10, each match part normalized 0–1 (change.md Q22, Q23). */
class CandidateScorerTest {

    private static final RecommendationProperties.Score WEIGHTS = new RecommendationProperties.Score(0.4, 0.3, 0.1, 0.2);

    @Test
    void componentsAreNormalizedByTheirMaximumAndWeighted() {
        TasteProfile profile = new TasteProfile(
                Map.of(1L, 4.0, 2L, 2.0),   // genres
                Map.of(10L, 1.0),            // languages
                Map.of(100L, 3.0),           // actors
                Map.of(200L, 1.0));          // directors
        Candidate a = new Candidate(1L, new BigDecimal("8.0"), 100L);
        Candidate b = new Candidate(2L, new BigDecimal("6.0"), 100L);
        Map<Long, MovieFeatures> features = Map.of(
                1L, new MovieFeatures(Set.of(1L, 2L), Set.of(10L), Set.of(100L), Set.of(200L)),
                2L, new MovieFeatures(Set.of(2L), Set.of(), Set.of(), Set.of(200L)));

        List<Scored> scored = CandidateScorer.score(profile, List.of(b, a), features, WEIGHTS);

        Scored first = scored.get(0);
        Scored second = scored.get(1);
        assertThat(first.candidate()).isEqualTo(a);
        assertThat(first.genre()).isEqualTo(1.0);
        assertThat(first.people()).isEqualTo(1.0);
        assertThat(first.language()).isEqualTo(1.0);
        assertThat(first.score()).isCloseTo(0.4 + 0.3 + 0.1 + 0.2 * 0.8, within(1e-9));

        assertThat(second.genre()).isCloseTo(2.0 / 6.0, within(1e-9));
        assertThat(second.people()).isCloseTo(1.0 / 4.0, within(1e-9));
        assertThat(second.language()).isZero();
        assertThat(second.score()).isCloseTo(0.4 * 2 / 6 + 0.3 * 0.25 + 0.2 * 0.6, within(1e-9));
    }

    @Test
    void tiesGoToMoreImdbVotesThenLowerMovieId() {
        TasteProfile profile = new TasteProfile(Map.of(1L, 1.0), Map.of(), Map.of(), Map.of());
        MovieFeatures sameGenre = new MovieFeatures(Set.of(1L), Set.of(), Set.of(), Set.of());
        Candidate fewVotes = new Candidate(1L, new BigDecimal("7.0"), 10L);
        Candidate manyVotes = new Candidate(2L, new BigDecimal("7.0"), 999L);
        Candidate noVotesHighId = new Candidate(4L, new BigDecimal("7.0"), null);
        Candidate noVotesLowId = new Candidate(3L, new BigDecimal("7.0"), null);

        List<Long> order = CandidateScorer.score(profile, List.of(fewVotes, noVotesHighId, manyVotes, noVotesLowId),
                        Map.of(1L, sameGenre, 2L, sameGenre, 3L, sameGenre, 4L, sameGenre), WEIGHTS)
                .stream().map(s -> s.candidate().movieId()).toList();

        assertThat(order).containsExactly(2L, 1L, 3L, 4L);
    }

    @Test
    void missingFeaturesAndRatingScoreZero() {
        TasteProfile profile = new TasteProfile(Map.of(1L, 1.0), Map.of(), Map.of(), Map.of());
        List<Scored> scored = CandidateScorer.score(profile, List.of(new Candidate(9L, null, null)), Map.of(), WEIGHTS);
        assertThat(scored).singleElement().satisfies(s -> {
            assertThat(s.score()).isZero();
            assertThat(s.features()).isEqualTo(MovieFeatures.empty());
        });
    }
}
