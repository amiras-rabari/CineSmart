package ca.cinesmart.catalog.application;

import ca.cinesmart.catalog.domain.Availability;
import ca.cinesmart.catalog.domain.MovieDetails;
import ca.cinesmart.catalog.domain.MovieFeatures;
import ca.cinesmart.catalog.domain.NamedRef;
import ca.cinesmart.catalog.domain.PersonRef;
import ca.cinesmart.catalog.persistence.CatalogRepository;
import ca.cinesmart.catalog.persistence.CatalogRepository.CoreRow;
import ca.cinesmart.shared.api.MovieNotFoundException;
import ca.cinesmart.shared.movie.UserMovieStateLookup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Movie details, batched movie reads and the browse-menu lists (change.md Q10, Q20, C-1). */
@Service
public class CatalogService {

    private static final String ACTOR = "Actor";
    private static final String DIRECTOR = "Director";
    private static final String WRITER = "Writer";

    private final CatalogRepository repository;
    private final UserMovieStateLookup userStates;

    public CatalogService(CatalogRepository repository, UserMovieStateLookup userStates) {
        this.repository = repository;
        this.userStates = userStates;
    }

    /** @param userId null when anonymous; then userState is null. */
    public MovieDetails getMovieDetails(Long movieId, Long userId) {
        List<MovieDetails> found = getMoviesByIds(List.of(movieId));
        if (found.isEmpty()) {
            throw new MovieNotFoundException(movieId);
        }
        MovieDetails movie = found.getFirst();
        return userId == null ? movie : movie.withUserState(userStates.getState(userId, movieId));
    }

    /**
     * Full movies (without userState) in the order of {@code movieIds}; unknown IDs are skipped.
     * Five queries for any number of movies.
     */
    @Transactional(readOnly = true)
    public List<MovieDetails> getMoviesByIds(List<Long> movieIds) {
        Set<Long> ids = new LinkedHashSet<>(movieIds);
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, CoreRow> cores = repository.findCores(ids).stream()
                .collect(Collectors.toMap(CoreRow::movieId, Function.identity()));
        if (cores.isEmpty()) {
            return List.of();
        }
        Set<Long> found = cores.keySet();

        Map<Long, List<NamedRef>> genres = new LinkedHashMap<>();
        repository.findGenres(found).forEach(row -> add(genres, row.movieId(), row.ref()));
        Map<Long, List<NamedRef>> languages = new LinkedHashMap<>();
        repository.findLanguages(found).forEach(row -> add(languages, row.movieId(), row.ref()));
        Map<Long, List<Availability>> availability = new LinkedHashMap<>();
        repository.findAvailability(found).forEach(row -> add(availability, row.movieId(), row.availability()));
        Map<Long, Crew> crews = new LinkedHashMap<>();
        repository.findPeople(found).forEach(row ->
                crews.computeIfAbsent(row.movieId(), id -> new Crew()).add(row.role(), row.person()));

        List<MovieDetails> result = new ArrayList<>(cores.size());
        for (Long id : ids) {
            CoreRow core = cores.get(id);
            if (core == null) {
                continue;
            }
            Crew crew = crews.getOrDefault(id, new Crew());
            result.add(new MovieDetails(
                    core.movieId(), core.imdbId(), core.title(), core.year(), core.released(), core.runtime(),
                    core.plot(), core.poster(), core.contentType(), core.studio(), core.ratings(),
                    genres.getOrDefault(id, List.of()),
                    languages.getOrDefault(id, List.of()),
                    crew.directors, crew.writers, crew.cast, crew.other,
                    core.platformStats(),
                    availability.getOrDefault(id, List.of()),
                    null));
        }
        return result;
    }

    /** Genre, language, actor and director IDs per movie, for Recommendation. Movies with no links map to empty sets. */
    @Transactional(readOnly = true)
    public Map<Long, MovieFeatures> getFeatures(Set<Long> movieIds) {
        if (movieIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Set<Long>> genres = new LinkedHashMap<>();
        repository.findFeatureIds(movieIds, false).forEach(row -> addToSet(genres, row.movieId(), row.ref().id()));
        Map<Long, Set<Long>> languages = new LinkedHashMap<>();
        repository.findFeatureIds(movieIds, true).forEach(row -> addToSet(languages, row.movieId(), row.ref().id()));
        Map<Long, Set<Long>> actors = new LinkedHashMap<>();
        Map<Long, Set<Long>> directors = new LinkedHashMap<>();
        repository.findPersonIds(movieIds).forEach(row -> {
            if (ACTOR.equals(row.role())) {
                addToSet(actors, row.movieId(), row.personId());
            } else if (DIRECTOR.equals(row.role())) {
                addToSet(directors, row.movieId(), row.personId());
            }
        });

        Map<Long, MovieFeatures> result = new LinkedHashMap<>();
        for (Long id : movieIds) {
            result.put(id, new MovieFeatures(
                    genres.getOrDefault(id, Set.of()),
                    languages.getOrDefault(id, Set.of()),
                    actors.getOrDefault(id, Set.of()),
                    directors.getOrDefault(id, Set.of())));
        }
        return result;
    }

    public boolean movieExists(Long movieId) {
        return repository.exists(movieId);
    }

    public List<NamedRef> listGenres() {
        return repository.findGenresInUse();
    }

    public List<NamedRef> listLanguages() {
        return repository.findLanguagesInUse();
    }

    private static <T> void add(Map<Long, List<T>> map, Long movieId, T value) {
        map.computeIfAbsent(movieId, id -> new ArrayList<>()).add(value);
    }

    private static void addToSet(Map<Long, Set<Long>> map, Long movieId, Long value) {
        map.computeIfAbsent(movieId, id -> new HashSet<>()).add(value);
    }

    /** Splits a movie's people by role name (change.md Q10 clarification); unknown roles go to otherCrew. */
    private static final class Crew {
        private final List<PersonRef> directors = new ArrayList<>();
        private final List<PersonRef> writers = new ArrayList<>();
        private final List<PersonRef> cast = new ArrayList<>();
        private final Map<String, List<PersonRef>> other = new LinkedHashMap<>();

        private void add(String role, PersonRef person) {
            switch (role) {
                case DIRECTOR -> directors.add(person);
                case WRITER -> writers.add(person);
                case ACTOR -> cast.add(person);
                default -> other.computeIfAbsent(role, r -> new ArrayList<>()).add(person);
            }
        }
    }
}
