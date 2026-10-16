package ca.cinesmart.identity.api;

import ca.cinesmart.identity.api.dto.LoginRequest;
import ca.cinesmart.identity.api.dto.LoginResponse;
import ca.cinesmart.identity.api.dto.NewUser;
import ca.cinesmart.identity.api.dto.SignupResponse;
import ca.cinesmart.identity.application.AuthService;
import ca.cinesmart.identity.domain.IssuedSession;
import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.security.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshCookies refreshCookies;
    private final ClientIpResolver ipResolver;

    public AuthController(AuthService authService, RefreshCookies refreshCookies, ClientIpResolver ipResolver) {
        this.authService = authService;
        this.refreshCookies = refreshCookies;
        this.ipResolver = ipResolver;
    }

    @PostMapping("/signup")
    public ResponseEntity<SignupResponse> signUp(@Valid @RequestBody NewUser user) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.signUp(user));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        return withSession(authService.login(request, ipResolver.resolve(http)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @CookieValue(name = RefreshCookies.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        try {
            return withSession(authService.refresh(refreshToken));
        } catch (ApiException ex) {
            // A dead refresh token is removed from the browser along with the error.
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookies.clear());
            throw ex;
        }
    }

    /** Login required. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal Jwt jwt,
                                       @CookieValue(name = RefreshCookies.NAME, required = false) String refreshToken) {
        authService.logout(jwt, refreshToken);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, refreshCookies.clear()).build();
    }

    private ResponseEntity<LoginResponse> withSession(IssuedSession session) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.create(session))
                .body(LoginResponse.from(session));
    }
}
