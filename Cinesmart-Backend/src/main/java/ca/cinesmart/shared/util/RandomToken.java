package ca.cinesmart.shared.util;

import java.security.SecureRandom;
import java.util.Base64;

/** URL-safe random tokens for email links and refresh tokens (256 bits). */
public final class RandomToken {

    private static final SecureRandom RANDOM = new SecureRandom();

    private RandomToken() {
    }

    public static String generate() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
