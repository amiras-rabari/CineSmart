package ca.cinesmart.identity.api;

import ca.cinesmart.identity.api.dto.ChangeEmailRequest;
import ca.cinesmart.identity.api.dto.ForgotPasswordRequest;
import ca.cinesmart.identity.api.dto.TokenRequest;
import ca.cinesmart.identity.application.AccountService;
import ca.cinesmart.identity.application.VerificationService;
import ca.cinesmart.shared.api.MessageResponse;
import ca.cinesmart.shared.security.ClientIpResolver;
import ca.cinesmart.shared.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/email")
public class EmailController {

    private final VerificationService verificationService;
    private final AccountService accountService;
    private final ClientIpResolver ipResolver;

    public EmailController(VerificationService verificationService, AccountService accountService,
                           ClientIpResolver ipResolver) {
        this.verificationService = verificationService;
        this.accountService = accountService;
        this.ipResolver = ipResolver;
    }

    @PostMapping("/verify")
    public MessageResponse verify(@Valid @RequestBody TokenRequest request) {
        verificationService.verify(request.token());
        return new MessageResponse("Email verified. You can now sign in.");
    }

    @PostMapping("/resend")
    public MessageResponse resend(@Valid @RequestBody ForgotPasswordRequest request) {
        verificationService.resend(request.email());
        return new MessageResponse("If an unverified account exists for this email, we've sent a new verification link.");
    }

    /** Login required. */
    @PostMapping("/change")
    public MessageResponse change(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChangeEmailRequest request,
                                  HttpServletRequest http) {
        accountService.requestEmailChange(CurrentUser.id(jwt), request.currentPassword(), request.newEmail(),
                ipResolver.resolve(http));
        return new MessageResponse("We've sent a confirmation link to the new email address.");
    }

    @PostMapping("/change/confirm")
    public MessageResponse confirmChange(@Valid @RequestBody TokenRequest request) {
        accountService.confirmEmailChange(request.token());
        return new MessageResponse("Your email address has been changed.");
    }
}
