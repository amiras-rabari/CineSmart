package ca.cinesmart.identity.application;

import ca.cinesmart.activity.application.ActivityCounts;
import ca.cinesmart.activity.application.MyListsService;
import ca.cinesmart.identity.api.dto.ProfileResponse;
import ca.cinesmart.identity.application.exceptions.EmailDeliveryException;
import ca.cinesmart.identity.application.exceptions.InvalidTokenException;
import ca.cinesmart.identity.application.exceptions.UserAlreadyExistsException;
import ca.cinesmart.identity.domain.AppUser;
import ca.cinesmart.identity.domain.IssuedSession;
import ca.cinesmart.identity.persistence.AppUserRepository;
import ca.cinesmart.shared.api.ApiException;
import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.redis.RedisFailClosed;
import ca.cinesmart.shared.util.RandomToken;
import ca.cinesmart.shared.util.TokenHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * Profile, change password and change email (change.md Q8).
 * A wrong current password counts toward the login lockout, and a locked account can't use these either.
 * Change email: email-change:token:&lt;sha256(token)&gt; = "userId|newEmail", 24 h; the link goes to the new
 * address and the old one gets a notice once the switch happens.
 */
@Service
public class AccountService {

    private static final Logger log = LoggerFactory.getLogger(AccountService.class);
    private static final String EMAIL_CHANGE_PREFIX = "email-change:token:";

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttempts;
    private final TokenService tokenService;
    private final EmailService emailService;
    private final EmailLinkService links;
    private final StringRedisTemplate redis;
    private final MyListsService activity;
    private final Duration emailChangeTtl;

    public AccountService(AppUserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          LoginAttemptService loginAttempts,
                          TokenService tokenService,
                          EmailService emailService,
                          EmailLinkService links,
                          StringRedisTemplate redis,
                          MyListsService activity,
                          @Value("${auth.token.email-change-ttl}") Duration emailChangeTtl) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginAttempts = loginAttempts;
        this.tokenService = tokenService;
        this.emailService = emailService;
        this.links = links;
        this.redis = redis;
        this.activity = activity;
        this.emailChangeTtl = emailChangeTtl;
    }

    public ProfileResponse profile(Long userId) {
        AppUser user = currentUser(userId);
        ActivityCounts counts = activity.counts(userId);
        return new ProfileResponse(user.getUserId(), user.getUsername(), user.getEmail(), user.getCreatedAt(),
                counts.watchlistCount(), counts.watchedCount(), counts.ratingCount());
    }

    /** Logs out every other session and returns a fresh one for the caller. */
    public IssuedSession changePassword(Long userId, String currentPassword, String newPassword, String clientIp) {
        AppUser user = currentUser(userId);
        checkCurrentPassword(user, currentPassword, clientIp);
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw fieldError("newPassword", "must be different from the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenService.revokeAll(userId);
        return tokenService.issue(userId, user.getUsername(), Instant.now());
    }

    public void requestEmailChange(Long userId, String currentPassword, String newEmail, String clientIp) {
        AppUser user = currentUser(userId);
        checkCurrentPassword(user, currentPassword, clientIp);

        String email = AppUser.normalizeEmail(newEmail);
        if (email.equals(user.getEmail())) {
            throw fieldError("newEmail", "must be different from the current email");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new UserAlreadyExistsException(ErrorCode.EMAIL_TAKEN, "Email is already registered");
        }

        String token = RandomToken.generate();
        RedisFailClosed.run(() -> redis.opsForValue().set(EMAIL_CHANGE_PREFIX + TokenHasher.sha256(token),
                userId + "|" + email, emailChangeTtl));

        String body = "Please open the link below to confirm your new CineSmart email address. The link expires in "
                + emailChangeTtl.toHours() + " hours.\n" + links.confirmEmail(token);
        emailService.sendEmail(email, "Confirm your new CineSmart email", body);
    }

    public void confirmEmailChange(String token) {
        String value = RedisFailClosed.call(() -> redis.opsForValue().getAndDelete(EMAIL_CHANGE_PREFIX + TokenHasher.sha256(token)));
        if (value == null) {
            throw new InvalidTokenException("Invalid or expired confirmation link");
        }
        String[] parts = value.split("\\|", 2);
        AppUser user = userRepository.findById(Long.parseLong(parts[0]))
                .orElseThrow(() -> new InvalidTokenException("Invalid or expired confirmation link"));
        String newEmail = parts[1];
        String oldEmail = user.getEmail();
        if (newEmail.equals(oldEmail)) {
            return;
        }

        user.setEmail(newEmail);
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new UserAlreadyExistsException(ErrorCode.EMAIL_TAKEN, "Email is already registered");
        }

        try {
            emailService.sendEmail(oldEmail, "Your CineSmart email was changed",
                    "The email address of your CineSmart account was changed to " + newEmail
                            + ". If you didn't do this, reset your password and contact support.");
        } catch (EmailDeliveryException ex) {
            log.warn("Email-changed notice not sent for user {}", user.getUserId());
        }
    }

    private AppUser currentUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, "Missing, invalid or expired access token"));
    }

    /**
     * 400 (not 401) for a wrong current password: the access token is fine, and a 401 would make the
     * frontend refresh and retry.
     */
    private void checkCurrentPassword(AppUser user, String currentPassword, String clientIp) {
        if (loginAttempts.isUserLocked(user.getUsername())) {
            throw new ApiException(ErrorCode.ACCOUNT_LOCKED, "Too many failed attempts. Try again later.");
        }
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            loginAttempts.recordFailure(user.getUsername(), clientIp);
            throw fieldError("currentPassword", "is incorrect");
        }
    }

    private static ApiException fieldError(String field, String message) {
        return ApiException.invalidField(field, message);
    }
}
