package ca.cinesmart.shared.security;

import org.springframework.security.oauth2.jwt.Jwt;

/** Reads the authenticated user's id from the JWT; never from client input. */
public final class CurrentUser {

    private CurrentUser() {
    }

    /** For endpoints that require login. */
    public static Long id(Jwt jwt) {
        return jwt.getClaim("userId");
    }

    /** For public endpoints where the JWT is optional; null when anonymous. */
    public static Long idOrNull(Jwt jwt) {
        return jwt == null ? null : jwt.getClaim("userId");
    }
}
