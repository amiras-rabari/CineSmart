package ca.cinesmart.discovery.application;

import ca.cinesmart.catalog.application.MovieCardService;
import ca.cinesmart.discovery.domain.RankedList;
import ca.cinesmart.discovery.persistence.DiscoveryRepository;
import ca.cinesmart.discovery.persistence.DiscoveryRepository.IdPage;
import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.PageParams;
import ca.cinesmart.shared.api.PageResponse;
import ca.cinesmart.shared.movie.MovieCard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

/**
 * Browse, search and the ranked lists (change.md Q17, Q18, Q19, Q21). Every method returns a page of
 * MovieCards; {@code userId} is null for anonymous users (then the card flags are null).
 */
@Service
public class DiscoveryService {

    public static final int MIN_QUERY_LENGTH = 3;
    public static final int MAX_QUERY_LENGTH = 100;
    public static final int MIN_YEAR = 1888;
    public static final int MAX_YEAR = 2100;

    private final DiscoveryRepository repository;
    private final MovieCardService cards;
    private final double similarityThreshold;
    private final double titleBoost;

    public DiscoveryService(DiscoveryRepository repository,
                            MovieCardService cards,
                            @Value("${search.similarity-threshold}") double similarityThreshold,
                            @Value("${search.title-boost}") double titleBoost) {
        this.repository = repository;
        this.cards = cards;
        this.similarityThreshold = similarityThreshold;
        this.titleBoost = titleBoost;
    }

    /** All movies, filters optional and combined with AND. Unknown or invalid IDs / year → 400. */
    public PageResponse<MovieCard> browse(Long genreId, Long languageId, Integer year, PageParams page, Long userId) {
        if (genreId != null && (genreId < 1 || !repository.genreExists(genreId))) {
            throw ApiException.invalidField("genreId", "Unknown genre");
        }
        if (languageId != null && (languageId < 1 || !repository.languageExists(languageId))) {
            throw ApiException.invalidField("languageId", "Unknown language");
        }
        if (year != null && (year < MIN_YEAR || year > MAX_YEAR)) {
            throw ApiException.invalidField("year", "must be between " + MIN_YEAR + " and " + MAX_YEAR);
        }
        return toCards(repository.browse(genreId, languageId, year, page.size(), page.offset()), page, userId);
    }

    /** Title or person-name search; q must be 3–100 characters after trimming. */
    public PageResponse<MovieCard> search(String q, PageParams page, Long userId) {
        String query = q == null ? "" : q.trim();
        if (query.length() < MIN_QUERY_LENGTH || query.length() > MAX_QUERY_LENGTH) {
            throw ApiException.invalidField("q",
                    "must be between " + MIN_QUERY_LENGTH + " and " + MAX_QUERY_LENGTH + " characters");
        }
        IdPage ids = repository.search(query.toLowerCase(Locale.ROOT), similarityThreshold, titleBoost,
                page.size(), page.offset());
        return toCards(ids, page, userId);
    }

    public PageResponse<MovieCard> trending(PageParams page, Long userId) {
        return ranked(RankedList.TRENDING, page, userId);
    }

    public PageResponse<MovieCard> topRated(PageParams page, Long userId) {
        return ranked(RankedList.TOP_RATED, page, userId);
    }

    public PageResponse<MovieCard> mostLiked(PageParams page, Long userId) {
        return ranked(RankedList.MOST_LIKED, page, userId);
    }

    /** At most 250 results in total. */
    public PageResponse<MovieCard> imdbTop250(PageParams page, Long userId) {
        return ranked(RankedList.IMDB_TOP_250, page, userId);
    }

    /** The first {@code limit} IDs of a ranked list, in list order (used by Recommendation's cold start). */
    public List<Long> rankedIds(RankedList list, int limit) {
        return repository.ranked(list, limit, 0).movieIds();
    }

    private PageResponse<MovieCard> ranked(RankedList list, PageParams page, Long userId) {
        return toCards(repository.ranked(list, page.size(), page.offset()), page, userId);
    }

    private PageResponse<MovieCard> toCards(IdPage ids, PageParams page, Long userId) {
        return PageResponse.of(cards.getCards(ids.movieIds(), userId), page, ids.totalResults());
    }
}
