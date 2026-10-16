package ca.cinesmart.recommendation.domain;

import java.util.Map;

/**
 * Feature ID → weight. For a user it's built from their signal movies (change.md Q22);
 * for "similar titles" every feature of the one movie weighs 1 (Q23).
 */
public record TasteProfile(
        Map<Long, Double> genres,
        Map<Long, Double> languages,
        Map<Long, Double> actors,
        Map<Long, Double> directors
) {
}
