package ca.cinesmart.identity.api;

import ca.cinesmart.identity.api.dto.ProfileResponse;
import ca.cinesmart.identity.application.AccountService;
import ca.cinesmart.shared.security.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** GET /me (profile). The /me lists are in activity's MyActivityController. */
@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    private final AccountService accountService;

    public MeController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public ProfileResponse profile(@AuthenticationPrincipal Jwt jwt) {
        return accountService.profile(CurrentUser.id(jwt));
    }
}
