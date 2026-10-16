package ca.cinesmart.catalog.domain;

import java.util.Set;

/** The IDs Recommendation scores on. Actors = every Actor link (no billing order in the DB). */
public record MovieFeatures(
        Set<Long> genreIds,
        Set<Long> languageIds,
        Set<Long> actorIds,
        Set<Long> directorIds
) {
    public static MovieFeatures empty() {
        return new MovieFeatures(Set.of(), Set.of(), Set.of(), Set.of());
    }
}
