package ca.cinesmart.identity.application;

import ca.cinesmart.identity.api.dto.LoginRequest;
import ca.cinesmart.identity.api.dto.NewUser;
import ca.cinesmart.identity.api.dto.SignupResponse;
import ca.cinesmart.identity.application.exceptions.UserAlreadyExistsException;
import ca.cinesmart.identity.domain.AppUser;
import ca.cinesmart.identity.domain.IssuedSession;
import ca.cinesmart.identity.persistence.AppUserRepository;
import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.redis.RedisFailClosed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Signup, login, refresh and logout (change.md Q1, Q6, Q9, B-1).
 * Login is checked by hand, in this order:
 * <ol>
 *   <li>IP block and username lock (429, password not checked)</li>
 *   <li>unknown username: dummy BCrypt check so timing matches, then 401 (counted)</li>
 *   <li>wrong password: 401 (counted, verified or not)</li>
 *   <li>unverified: 403 (not counted, the password was right)</li>
 *   <li>counters cleared, tokens issued</li>
 * </ol>
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String INVALID_CREDENTIALS = "Invalid username or password";

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttempts;
    private final TokenService tokenService;
    private final AccessTokenRevocationService revocation;
    private final VerificationService verificationService;
    private final StringRedisTemplate redis;
    private final String dummyHash;

    public AuthService(AppUserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       LoginAttemptService loginAttempts,
                       TokenService tokenService,
                       AccessTokenRevocationService revocation,
                       VerificationService verificationService,
                       StringRedisTemplate redis) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginAttempts = loginAttempts;
        this.tokenService = tokenService;
        this.revocation = revocation;
        this.verificationService = verificationService;
        this.redis = redis;
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    /**
     * Not transactional on purpose: saveAndFlush commits the user before the email is sent (change.md §8).
     * If the email fails, signup still succeeds and the user can ask for a new link.
     */
    public SignupResponse signUp(NewUser newUser) {
        RedisFailClosed.ensureAvailable(redis);

        if (userRepository.existsByUsernameIgnoreCase(newUser.username())) {
            throw new UserAlreadyExistsException(ErrorCode.USERNAME_TAKEN, "Username is already taken");
        }
        if (userRepository.existsByEmailIgnoreCase(AppUser.normalizeEmail(newUser.email()))) {
            throw new UserAlreadyExistsException(ErrorCode.EMAIL_TAKEN, "Email is already registered");
        }

        AppUser user = new AppUser();
        user.setUsername(newUser.username());
        user.setEmail(newUser.email());
        user.setPasswordHash(passwordEncoder.encode(newUser.password()));
        try {
            // The exists checks above race with concurrent signups; the unique indexes are the final guard.
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new UserAlreadyExistsException(ErrorCode.USERNAME_TAKEN, "Username or email is already registered");
        }

        try {
            verificationService.sendVerification(user);
        } catch (ApiException ex) {
            log.warn("Verification email not sent after signup for user {}: {}", user.getUserId(), ex.getMessage());
        }

        return new SignupResponse(user.getUsername(),
                "Successfully registered. Please verify your email to use the account.");
    }

    public IssuedSession login(LoginRequest request, String clientIp) {
        String username = request.username().trim();

        if (loginAttempts.isIpBlocked(clientIp)) {
            throw new ApiException(ErrorCode.RATE_LIMITED, "Too many failed login attempts from this address. Try again later.");
        }
        if (loginAttempts.isUserLocked(username)) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED, "Too many failed attempts. Try again later.");
        }

        Optional<AppUser> found = userRepository.findByUsernameIgnoreCase(username);
        if (found.isEmpty()) {
            passwordEncoder.matches(request.password(), dummyHash);
            loginAttempts.recordFailure(username, clientIp);
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, INVALID_CREDENTIALS);
        }

        AppUser user = found.get();
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAttempts.recordFailure(username, clientIp);
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS, INVALID_CREDENTIALS);
        }
        if (!Boolean.TRUE.equals(user.getVerified())) {
            throw new ApiException(ErrorCode.ACCOUNT_NOT_VERIFIED, "Account not verified");
        }

        loginAttempts.reset(username, clientIp);
        return tokenService.issue(user.getUserId(), user.getUsername(), Instant.now());
    }

    /** Rotates the refresh token; the session keeps its original start for the 7-day cap. */
    public IssuedSession refresh(String refreshToken) {
        TokenService.RefreshGrant grant = tokenService.consumeRefreshToken(refreshToken);
        AppUser user = userRepository.findById(grant.userId())
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, "Session expired. Please sign in again."));
        return tokenService.issue(user.getUserId(), user.getUsername(), grant.sessionStart());
    }

    public void logout(Jwt accessToken, String refreshToken) {
        if (accessToken.getExpiresAt() != null) {
            revocation.blacklist(accessToken.getTokenValue(), accessToken.getExpiresAt());
        }
        tokenService.revokeSession(refreshToken);
    }
}
