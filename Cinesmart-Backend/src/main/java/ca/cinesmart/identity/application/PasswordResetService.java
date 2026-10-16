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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Forgot / reset password (change.md Q2, Q3, Q4, B-7, B-8).
 * reset:token:&lt;sha256(token)&gt; = userId, 10 min, single use. A successful reset logs out every session.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final String TOKEN_PREFIX = "reset:token:";

    private final AppUserRepository userRepository;
    private final StringRedisTemplate redis;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final EmailLinkService links;
    private final VerificationService verificationService;
    private final TokenService tokenService;
    private final Duration tokenTtl;

    public PasswordResetService(AppUserRepository userRepository,
                                StringRedisTemplate redis,
                                PasswordEncoder passwordEncoder,
                                EmailService emailService,
                                EmailLinkService links,
                                VerificationService verificationService,
                                TokenService tokenService,
                                @Value("${auth.token.reset-ttl}") Duration tokenTtl) {
        this.userRepository = userRepository;
        this.redis = redis;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.links = links;
        this.verificationService = verificationService;
        this.tokenService = tokenService;
        this.tokenTtl = tokenTtl;
    }

    /**
     * No account → nothing; unverified → verification email; verified → reset link.
     * The caller always answers with the same message.
     */
    public void forgotPassword(String email) {
        RedisFailClosed.ensureAvailable(redis);
        userRepository.findByEmailIgnoreCase(AppUser.normalizeEmail(email)).ifPresent(user -> {
            if (Boolean.TRUE.equals(user.getVerified())) {
                sendResetEmail(user);
            } else {
                verificationService.sendQuietly(user);
            }
        });
    }

    public void resetPassword(String token, String newPassword) {
        String userId = RedisFailClosed.call(() -> redis.opsForValue().getAndDelete(TOKEN_PREFIX + TokenHasher.sha256(token)));
        if (userId == null) {
            throw new InvalidTokenException("Invalid or expired reset link. Request a new one.");
        }
        AppUser user = userRepository.findById(Long.parseLong(userId))
                .orElseThrow(() -> new InvalidTokenException("Invalid or expired reset link. Request a new one."));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenService.revokeAll(user.getUserId());
    }

    private void sendResetEmail(AppUser user) {
        String token = RandomToken.generate();
        RedisFailClosed.run(() -> redis.opsForValue().set(TOKEN_PREFIX + TokenHasher.sha256(token),
                user.getUserId().toString(), tokenTtl));

        String body = "Please open the link below to reset your password. The link expires in "
                + tokenTtl.toMinutes() + " minutes.\n" + links.resetPassword(token);
        try {
            emailService.sendEmail(user.getEmail(), "Reset your CineSmart password", body);
        } catch (EmailDeliveryException ex) {
            log.warn("Password reset email not sent for user {}", user.getUserId());
        }
    }
}
