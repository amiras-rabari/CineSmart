package ca.cinesmart.identity.application;

import ca.cinesmart.identity.application.exceptions.EmailDeliveryException;
import ca.cinesmart.identity.application.exceptions.InvalidTokenException;
import ca.cinesmart.identity.domain.AppUser;
import ca.cinesmart.identity.persistence.AppUserRepository;
import ca.cinesmart.shared.redis.RedisFailClosed;
import ca.cinesmart.shared.util.RandomToken;
import ca.cinesmart.shared.util.TokenHasher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Email verification (change.md Q3, Q4): verification:token:&lt;sha256(token)&gt; = userId, 24 h, single use.
 * Redis-backed steps fail closed (Q24).
 */
@Service
public class VerificationService {

    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);
    private static final String TOKEN_PREFIX = "verification:token:";

    private final AppUserRepository userRepository;
    private final StringRedisTemplate redis;
    private final EmailService emailService;
    private final EmailLinkService links;
    private final Duration tokenTtl;

    public VerificationService(AppUserRepository userRepository,
                               StringRedisTemplate redis,
                               EmailService emailService,
                               EmailLinkService links,
                               @Value("${auth.token.verification-ttl}") Duration tokenTtl) {
        this.userRepository = userRepository;
        this.redis = redis;
        this.emailService = emailService;
        this.links = links;
        this.tokenTtl = tokenTtl;
    }

    /** Stores a new token and emails the link. Throws 503 if Redis or SMTP fails. */
    public void sendVerification(AppUser user) {
        String token = RandomToken.generate();
        RedisFailClosed.run(() -> redis.opsForValue().set(TOKEN_PREFIX + TokenHasher.sha256(token),
                user.getUserId().toString(), tokenTtl));

        String body = "Please open the link below to verify your email. The link expires in "
                + tokenTtl.toHours() + " hours.\n" + links.verifyEmail(token);
        emailService.sendEmail(user.getEmail(), "Welcome to CineSmart", body);
    }

    /** Same response whether or not the account exists (no enumeration). */
    public void resend(String email) {
        RedisFailClosed.ensureAvailable(redis);
        userRepository.findByEmailIgnoreCase(AppUser.normalizeEmail(email))
                .filter(user -> !Boolean.TRUE.equals(user.getVerified()))
                .ifPresent(this::sendQuietly);
    }

    public void verify(String token) {
        String userId = RedisFailClosed.call(() -> redis.opsForValue().getAndDelete(TOKEN_PREFIX + TokenHasher.sha256(token)));
        if (userId == null) {
            throw new InvalidTokenException("Invalid or expired verification link");
        }
        AppUser user = userRepository.findById(Long.parseLong(userId))
                .orElseThrow(() -> new InvalidTokenException("Invalid or expired verification link"));
        if (!Boolean.TRUE.equals(user.getVerified())) {
            user.setVerified(true);
            userRepository.save(user);
        }
    }

    /** For flows that must answer the same way whether or not mail went out. */
    void sendQuietly(AppUser user) {
        try {
            sendVerification(user);
        } catch (EmailDeliveryException ex) {
            log.warn("Verification email not sent for user {}", user.getUserId());
        }
    }
}
