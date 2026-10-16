package ca.cinesmart.identity.api.dto;

import ca.cinesmart.identity.domain.IssuedSession;

/** Login, refresh and password-change body; the refresh token only travels in the cookie (change.md Q28). */
public record LoginResponse(String accessToken, long expiresIn, UserSummary user) {

    public record UserSummary(Long userId, String username) {
    }

    public static LoginResponse from(IssuedSession session) {
        return new LoginResponse(session.accessToken(), session.expiresInSeconds(),
                new UserSummary(session.userId(), session.username()));
    }
}
