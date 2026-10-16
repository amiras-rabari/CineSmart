package ca.cinesmart.recommendation.application;

import ca.cinesmart.catalog.domain.MovieFeatures;
import ca.cinesmart.recommendation.domain.TasteProfile;
import ca.cinesmart.recommendation.persistence.RecommendationRepository.Candidate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Score = genre·g + people·p + language·l + (imdbRating/10)·i (change.md Q22, Q23). Each match component is the
 * sum of the profile weights of the candidate's matching features, normalized 0–1 by dividing by that
 * component's maximum across the candidates (implementation-plan B.6 #6). Ties go to IMDb votes, then movie ID.
 */
final class CandidateScorer {

    /** genre / people / language are the normalized (0–1) components. */
    record Scored(Candidate candidate, MovieFeatures features, double score,
                  double genre, double people, double language) {
    }

    private CandidateScorer() {
    }

    static List<Scored> score(TasteProfile profile, List<Candidate> candidates,
                              Map<Long, MovieFeatures> features, RecommendationProperties.Score weights) {
        int n = candidates.size();
        double[] genre = new double[n];
        double[] people = new double[n];
        double[] language = new double[n];
        double maxGenre = 0;
        double maxPeople = 0;
        double maxLanguage = 0;
        for (int i = 0; i < n; i++) {
            MovieFeatures f = features.getOrDefault(candidates.get(i).movieId(), MovieFeatures.empty());
            genre[i] = sum(profile.genres(), f.genreIds());
            people[i] = sum(profile.actors(), f.actorIds()) + sum(profile.directors(), f.directorIds());
            language[i] = sum(profile.languages(), f.languageIds());
            maxGenre = Math.max(maxGenre, genre[i]);
            maxPeople = Math.max(maxPeople, people[i]);
            maxLanguage = Math.max(maxLanguage, language[i]);
        }

        List<Scored> scored = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            Candidate c = candidates.get(i);
            double g = normalize(genre[i], maxGenre);
            double p = normalize(people[i], maxPeople);
            double l = normalize(language[i], maxLanguage);
            double imdb = c.imdbRating() == null ? 0 : c.imdbRating().doubleValue() / 10;
            double score = weights.genre() * g + weights.people() * p + weights.language() * l + weights.imdb() * imdb;
            scored.add(new Scored(c, features.getOrDefault(c.movieId(), MovieFeatures.empty()), score, g, p, l));
        }
        scored.sort(Comparator.comparingDouble(Scored::score).reversed()
                .thenComparing(s -> s.candidate().imdbVotes(), Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(s -> s.candidate().movieId()));
        return scored;
    }

    private static double sum(Map<Long, Double> weights, Set<Long> ids) {
        double total = 0;
        for (Long id : ids) {
            total += weights.getOrDefault(id, 0.0);
        }
        return total;
    }

    private static double normalize(double value, double max) {
        return max > 0 ? value / max : 0;
    }
}
