package ca.cinesmart.discovery.api;

import ca.cinesmart.discovery.application.DiscoveryService;
import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.api.PageParams;
import ca.cinesmart.shared.api.PageResponse;
import ca.cinesmart.shared.movie.MovieCard;
import ca.cinesmart.shared.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

/** Browse, search and the ranked lists; public, JWT optional (change.md Q7, Q19, Q21). */
@RestController
@RequestMapping("/api/v1/movies")
public class DiscoveryController {

    private static final Set<String> BROWSE_PARAMS = Set.of("genreId", "languageId", "year", "page", "size");
    private static final Set<String> SEARCH_PARAMS = Set.of("q", "page", "size");

    private final DiscoveryService discovery;

    public DiscoveryController(DiscoveryService discovery) {
        this.discovery = discovery;
    }

    @GetMapping
    public PageResponse<MovieCard> browse(HttpServletRequest request,
                                          @AuthenticationPrincipal(errorOnInvalidType = false) Jwt jwt,
                                          @RequestParam(required = false) Long genreId,
                                          @RequestParam(required = false) Long languageId,
                                          @RequestParam(required = false) Integer year,
                                          @RequestParam(required = false) Integer page,
                                          @RequestParam(required = false) Integer size) {
        rejectUnknownParams(request, BROWSE_PARAMS);
        return discovery.browse(genreId, languageId, year, PageParams.of(page, size), CurrentUser.idOrNull(jwt));
    }

    @GetMapping("/search")
    public PageResponse<MovieCard> search(HttpServletRequest request,
                                          @AuthenticationPrincipal(errorOnInvalidType = false) Jwt jwt,
                                          @RequestParam String q,
                                          @RequestParam(required = false) Integer page,
                                          @RequestParam(required = false) Integer size) {
        rejectUnknownParams(request, SEARCH_PARAMS);
        return discovery.search(q, PageParams.of(page, size), CurrentUser.idOrNull(jwt));
    }

    @GetMapping("/trending")
    public PageResponse<MovieCard> trending(@AuthenticationPrincipal(errorOnInvalidType = false) Jwt jwt,
                                            @RequestParam(required = false) Integer page,
                                            @RequestParam(required = false) Integer size) {
        return discovery.trending(PageParams.of(page, size), CurrentUser.idOrNull(jwt));
    }

    @GetMapping("/top-rated")
    public PageResponse<MovieCard> topRated(@AuthenticationPrincipal(errorOnInvalidType = false) Jwt jwt,
                                            @RequestParam(required = false) Integer page,
                                            @RequestParam(required = false) Integer size) {
        return discovery.topRated(PageParams.of(page, size), CurrentUser.idOrNull(jwt));
    }

    @GetMapping("/most-liked")
    public PageResponse<MovieCard> mostLiked(@AuthenticationPrincipal(errorOnInvalidType = false) Jwt jwt,
                                             @RequestParam(required = false) Integer page,
                                             @RequestParam(required = false) Integer size) {
        return discovery.mostLiked(PageParams.of(page, size), CurrentUser.idOrNull(jwt));
    }

    @GetMapping("/imdb-top-250")
    public PageResponse<MovieCard> imdbTop250(@AuthenticationPrincipal(errorOnInvalidType = false) Jwt jwt,
                                              @RequestParam(required = false) Integer page,
                                              @RequestParam(required = false) Integer size) {
        return discovery.imdbTop250(PageParams.of(page, size), CurrentUser.idOrNull(jwt));
    }

    /** change.md Q19: unknown query parameters on /movies and /movies/search → 400. */
    private static void rejectUnknownParams(HttpServletRequest request, Set<String> allowed) {
        request.getParameterMap().keySet().stream()
                .filter(name -> !allowed.contains(name))
                .sorted()
                .findFirst()
                .ifPresent(name -> {
                    throw new ApiException(ErrorCode.BAD_REQUEST, "Unknown query parameter: " + name);
                });
    }
}
