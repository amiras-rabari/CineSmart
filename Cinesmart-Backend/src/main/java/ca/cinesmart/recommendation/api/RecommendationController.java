package ca.cinesmart.recommendation.api;

import ca.cinesmart.recommendation.application.RecommendationService;
import ca.cinesmart.recommendation.application.SimilarService;
import ca.cinesmart.recommendation.domain.RecommendationCard;
import ca.cinesmart.shared.api.PageParams;
import ca.cinesmart.shared.api.PageResponse;
import ca.cinesmart.shared.movie.MovieCard;
import ca.cinesmart.shared.security.CurrentUser;
import jakarta.validation.constraints.Positive;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** GET /recommendations (login required) and GET /movies/{id}/similar (public, JWT optional); change.md Q22, Q23. */
@RestController
@RequestMapping("/api/v1")
@Validated
public class RecommendationController {

    private final RecommendationService recommendations;
    private final SimilarService similar;

    public RecommendationController(RecommendationService recommendations, SimilarService similar) {
        this.recommendations = recommendations;
        this.similar = similar;
    }

    @GetMapping("/recommendations")
    public PageResponse<RecommendationCard> recommendations(@AuthenticationPrincipal Jwt jwt,
                                                            @RequestParam(required = false) Integer page,
                                                            @RequestParam(required = false) Integer size) {
        return recommendations.recommend(CurrentUser.id(jwt), PageParams.of(page, size));
    }

    @GetMapping("/movies/{id}/similar")
    public List<MovieCard> similar(@PathVariable @Positive Long id,
                                   @AuthenticationPrincipal(errorOnInvalidType = false) Jwt jwt,
                                   @RequestParam(required = false) Integer size) {
        return similar.similar(id, size, CurrentUser.idOrNull(jwt));
    }
}
