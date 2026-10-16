package ca.cinesmart.identity.api;

import ca.cinesmart.identity.api.dto.ChangePasswordRequest;
import ca.cinesmart.identity.api.dto.ForgotPasswordRequest;
import ca.cinesmart.identity.api.dto.LoginResponse;
import ca.cinesmart.identity.api.dto.ResetPasswordRequest;
import ca.cinesmart.identity.application.AccountService;
import ca.cinesmart.identity.application.PasswordResetService;
import ca.cinesmart.identity.domain.IssuedSession;
import ca.cinesmart.shared.api.MessageResponse;
import ca.cinesmart.shared.security.ClientIpResolver;
import ca.cinesmart.shared.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/password")
public class PasswordController {

    private final PasswordResetService passwordResetService;
    private final AccountService accountService;
    private final RefreshCookies refreshCookies;
    private final ClientIpResolver ipResolver;

    public PasswordController(PasswordResetService passwordResetService, AccountService accountService,
                              RefreshCookies refreshCookies, ClientIpResolver ipResolver) {
        this.passwordResetService = passwordResetService;
        this.accountService = accountService;
        this.refreshCookies = refreshCookies;
        this.ipResolver = ipResolver;
    }

    @PostMapping("/forgot")
    public MessageResponse forgot(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.forgotPassword(request.email());
        return new MessageResponse("If an account exists for this email, we've sent instructions.");
    }

    @PostMapping("/reset")
    public MessageResponse reset(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return new MessageResponse("Your password has been reset. Please sign in.");
    }

    /** Login required. Other sessions are logged out; the caller gets a new token and cookie. */
    @PostMapping("/change")
    public ResponseEntity<LoginResponse> change(@AuthenticationPrincipal Jwt jwt,
                                                @Valid @RequestBody ChangePasswordRequest request,
                                                HttpServletRequest http) {
        IssuedSession session = accountService.changePassword(CurrentUser.id(jwt), request.currentPassword(),
                request.newPassword(), ipResolver.resolve(http));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.create(session))
                .body(LoginResponse.from(session));
    }
}
