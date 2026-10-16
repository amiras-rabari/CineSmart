package ca.cinesmart.discovery.application;

import ca.cinesmart.catalog.application.MovieCardService;
import ca.cinesmart.discovery.domain.HomeResponse;
import ca.cinesmart.discovery.domain.HomeSection;
import ca.cinesmart.discovery.domain.RankedList;
import ca.cinesmart.discovery.persistence.DiscoveryRepository;
import ca.cinesmart.discovery.persistence.DiscoveryRepository.IdPage;
import ca.cinesmart.shared.api.PageParams;
import ca.cinesmart.shared.api.PageResponse;
import ca.cinesmart.shared.movie.MovieCard;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * GET /home (change.md Q21): for-you (logged in only), trending, top-rated, most-liked, imdb-top-250.
 * A movie shown in an earlier row is skipped in later rows; each row fetches {@code rowSize + shown}
 * candidates so it can still show rowSize movies. Empty rows are left out.
 */
@Service
public class HomeService {

    private static final String FOR_YOU_KEY = "for-you";
    private static final String FOR_YOU_TITLE = "For You";
    private static final String FOR_YOU_ENDPOINT = "/api/v1/recommendations";

    private final DiscoveryRepository repository;
    private final MovieCardService cards;
    private final ForYouSource forYouSource;
    private final int rowSize;

    public HomeService(DiscoveryRepository repository,
                       MovieCardService cards,
                       ForYouSource forYouSource,
                       @Value("${home.row-size}") int rowSize) {
        this.repository = repository;
        this.cards = cards;
        this.forYouSource = forYouSource;
        this.rowSize = rowSize;
    }

    /** @param userId null when anonymous (no For You row, no card flags). */
    public HomeResponse getHome(Long userId) {
        List<HomeSection> sections = new ArrayList<>();
        Set<Long> shown = new HashSet<>();

        if (userId != null) {
            PageResponse<MovieCard> forYou = forYouSource.forYou(userId, PageParams.of(0, rowSize));
            if (!forYou.results().isEmpty()) {
                forYou.results().forEach(card -> shown.add(card.movieId()));
                sections.add(new HomeSection(FOR_YOU_KEY, FOR_YOU_TITLE, FOR_YOU_ENDPOINT,
                        forYou.totalResults(), forYou.results()));
            }
        }

        // Pick each row's IDs first, then build every card with one batched call.
        List<RankedList> lists = List.of(RankedList.values());
        List<List<Long>> rowIds = new ArrayList<>();
        List<Long> totals = new ArrayList<>();
        Set<Long> allIds = new LinkedHashSet<>();
        for (RankedList list : lists) {
            IdPage candidates = repository.ranked(list, rowSize + shown.size(), 0);
            List<Long> ids = candidates.movieIds().stream()
                    .filter(id -> !shown.contains(id))
                    .limit(rowSize)
                    .toList();
            shown.addAll(ids);
            allIds.addAll(ids);
            rowIds.add(ids);
            totals.add(candidates.totalResults());
        }

        Map<Long, MovieCard> byId = cards.getCards(List.copyOf(allIds), userId).stream()
                .collect(Collectors.toMap(MovieCard::movieId, Function.identity()));
        for (int i = 0; i < lists.size(); i++) {
            List<MovieCard> rowCards = rowIds.get(i).stream().map(byId::get).filter(c -> c != null).toList();
            if (!rowCards.isEmpty()) {
                RankedList list = lists.get(i);
                sections.add(new HomeSection(list.key(), list.title(), list.endpoint(), totals.get(i), rowCards));
            }
        }
        return new HomeResponse(sections);
    }
}
