package ca.cinesmart.support;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.Mockito;
import org.mockito.invocation.Invocation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base for every integration test: the full app against the throwaway containers, called through MockMvc.
 * Before each test, all users (and with them all activity), movie_analytics and every Redis key are wiped,
 * so tests never depend on each other. The seeded catalog stays.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
public abstract class IntegrationTest {

    public static final String PASSWORD = "Password123!";
    private static final Pattern TOKEN_IN_LINK = Pattern.compile("token=([A-Za-z0-9_-]+)");

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected StringRedisTemplate redis;

    @Autowired
    protected PasswordEncoder passwordEncoder;

    /** No email ever leaves the tests; sent messages are read back with {@link #sentMails()}. */
    @MockitoBean
    protected JavaMailSender mailSender;

    @BeforeEach
    void resetState() {
        jdbc.execute("TRUNCATE app_user, movie_analytics RESTART IDENTITY CASCADE");
        flushRedis();
    }

    protected void flushRedis() {
        redis.execute((RedisCallback<Object>) connection -> {
            connection.serverCommands().flushAll();
            return null;
        });
    }

    // --- users and sessions ---

    public record Session(long userId, String accessToken, String refreshToken) {
    }

    /** Inserts a user directly (fast, no email). Email is "&lt;username&gt;@test.local" lowercased. */
    protected long createUser(String username, boolean verified) {
        return createUser(username, username.toLowerCase() + "@test.local", PASSWORD, verified);
    }

    protected long createUser(String username, String email, String password, boolean verified) {
        Long id = jdbc.queryForObject(
                "INSERT INTO app_user (username, email, password_hash, is_verified) VALUES (?, ?, ?, ?) RETURNING user_id",
                Long.class, username, email, passwordEncoder.encode(password), verified);
        return id;
    }

    /** Creates a verified user and logs in through the API. */
    protected Session loginAs(String username) throws Exception {
        createUser(username, true);
        return login(username, PASSWORD);
    }

    protected Session login(String username, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(Json.of("username", username, "password", password)))
                .andExpect(status().isOk())
                .andReturn();
        return sessionFrom(result);
    }

    protected static Session sessionFrom(MvcResult result) throws Exception {
        String body = result.getResponse().getContentAsString();
        Number userId = JsonPath.read(body, "$.user.userId");
        return new Session(userId.longValue(), JsonPath.read(body, "$.accessToken"), refreshTokenFrom(result));
    }

    /** The refresh_token value from Set-Cookie, or null when there is none. */
    protected static String refreshTokenFrom(MvcResult result) {
        String header = refreshSetCookie(result);
        if (header == null) {
            return null;
        }
        String value = header.substring("refresh_token=".length(), header.indexOf(';'));
        return value.isEmpty() ? null : value;
    }

    protected static String refreshSetCookie(MvcResult result) {
        return result.getResponse().getHeaders("Set-Cookie").stream()
                .filter(h -> h.startsWith("refresh_token="))
                .findFirst()
                .orElse(null);
    }

    protected static Cookie refreshCookie(String token) {
        return new Cookie("refresh_token", token);
    }

    protected static RequestPostProcessor bearer(String accessToken) {
        return request -> {
            request.addHeader("Authorization", "Bearer " + accessToken);
            return request;
        };
    }

    protected static RequestPostProcessor bearer(Session session) {
        return bearer(session.accessToken());
    }

    protected static RequestPostProcessor fromIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    // --- captured email ---

    protected List<SimpleMailMessage> sentMails() {
        List<SimpleMailMessage> mails = new ArrayList<>();
        for (Invocation invocation : Mockito.mockingDetails(mailSender).getInvocations()) {
            if (invocation.getMethod().getName().equals("send")
                    && invocation.getArguments().length == 1
                    && invocation.getArguments()[0] instanceof SimpleMailMessage message) {
                mails.add(message);
            }
        }
        return mails;
    }

    protected List<SimpleMailMessage> mailsTo(String address) {
        return sentMails().stream()
                .filter(m -> m.getTo() != null && List.of(m.getTo()).contains(address))
                .toList();
    }

    /** The token from the link in the last email sent to address. */
    protected String tokenFromLastMailTo(String address) {
        List<SimpleMailMessage> mails = mailsTo(address);
        if (mails.isEmpty()) {
            throw new AssertionError("No email was sent to " + address);
        }
        String text = mails.getLast().getText();
        Matcher matcher = TOKEN_IN_LINK.matcher(text == null ? "" : text);
        if (!matcher.find()) {
            throw new AssertionError("No token link in email: " + text);
        }
        return matcher.group(1);
    }

    protected static String bodyOf(MvcResult result) throws Exception {
        return result.getResponse().getContentAsString();
    }
}
