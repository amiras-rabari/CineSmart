package ca.cinesmart.catalog.api;

import ca.cinesmart.catalog.application.CatalogService;
import ca.cinesmart.catalog.domain.MovieDetails;
import ca.cinesmart.catalog.domain.NamedRef;
import ca.cinesmart.shared.security.CurrentUser;
import jakarta.validation.constraints.Positive;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;

/** Public, JWT optional (change.md Q7, Q10, Q20). */
@RestController
@RequestMapping("/api/v1")
@Validated
public class CatalogController {

    private static final CacheControl ONE_HOUR = CacheControl.maxAge(Duration.ofHours(1));

    private final CatalogService catalogService;

    public CatalogController(CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/movies/{id}")
    public MovieDetails getMovie(@PathVariable @Positive Long id,
                                 @AuthenticationPrincipal(errorOnInvalidType = false) Jwt jwt) {
        return catalogService.getMovieDetails(id, CurrentUser.idOrNull(jwt));
    }

    @GetMapping("/genres")
    public ResponseEntity<List<NamedRef>> getGenres() {
        return ResponseEntity.ok().cacheControl(ONE_HOUR).body(catalogService.listGenres());
    }

    @GetMapping("/languages")
    public ResponseEntity<List<NamedRef>> getLanguages() {
        return ResponseEntity.ok().cacheControl(ONE_HOUR).body(catalogService.listLanguages());
    }
}
