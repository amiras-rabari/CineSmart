package ca.cinesmart.discovery.api;

import ca.cinesmart.discovery.application.HomeService;
import ca.cinesmart.discovery.domain.HomeResponse;
import ca.cinesmart.shared.security.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /api/v1/home; public, JWT optional (change.md Q21). */
@RestController
public class HomeController {

    private final HomeService homeService;

    public HomeController(HomeService homeService) {
        this.homeService = homeService;
    }

    @GetMapping("/api/v1/home")
    public HomeResponse home(@AuthenticationPrincipal(errorOnInvalidType = false) Jwt jwt) {
        return homeService.getHome(CurrentUser.idOrNull(jwt));
    }
}
