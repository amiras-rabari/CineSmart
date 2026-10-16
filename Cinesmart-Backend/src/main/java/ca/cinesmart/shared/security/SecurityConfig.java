package ca.cinesmart.shared.security;

import ca.cinesmart.identity.application.AccessTokenRevocationService;
import ca.cinesmart.shared.api.ErrorCode;
import ca.cinesmart.shared.ratelimit.IpRateLimitFilter;
import ca.cinesmart.shared.ratelimit.RateLimitProperties;
import ca.cinesmart.shared.ratelimit.RateLimiter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.List;

/**
 * Security matrix (implementation-plan B.5, change.md Q7):
 * <ul>
 *   <li>Public: the auth POSTs listed in PUBLIC_AUTH_POSTS</li>
 *   <li>Public, JWT optional: GET /movies/**, /home, /genres, /languages</li>
 *   <li>Everything else needs a valid access token (/me/**, activity writes, /recommendations,
 *       auth/logout, password/change, email/change)</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(RateLimitProperties.class)
public class SecurityConfig {

    private static final String[] PUBLIC_AUTH_POSTS = {
            "/api/v1/auth/signup",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/email/verify",
            "/api/v1/auth/email/resend",
            "/api/v1/auth/email/change/confirm",
            "/api/v1/auth/password/forgot",
            "/api/v1/auth/password/reset"
    };

    private static final String[] OPTIONAL_JWT_GETS = {
            "/api/v1/movies",
            "/api/v1/movies/**",
            "/api/v1/home",
            "/api/v1/genres",
            "/api/v1/languages"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   BearerTokenResolver bearerTokenResolver,
                                                   RateLimiter rateLimiter,
                                                   RateLimitProperties rateLimitProperties,
                                                   ClientIpResolver ipResolver) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, PUBLIC_AUTH_POSTS).permitAll()
                        .requestMatchers(HttpMethod.GET, OPTIONAL_JWT_GETS).permitAll()
                        .anyRequest().authenticated())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(new IpRateLimitFilter(rateLimiter, rateLimitProperties, ipResolver),
                        BearerTokenAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler((request, response, denied) ->
                                ErrorResponseWriter.write(request, response, ErrorCode.FORBIDDEN, "Access denied")))
                .oauth2ResourceServer(oauth2 -> oauth2
                        .bearerTokenResolver(bearerTokenResolver)
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint((request, response, authException) ->
                                ErrorResponseWriter.write(request, response, ErrorCode.UNAUTHORIZED,
                                        "Missing, invalid or expired access token")));

        return http.build();
    }

    /**
     * "JWT optional": on the public GETs an invalid, expired or revoked token is ignored, so the
     * request continues as anonymous instead of failing with 401.
     */
    @Bean
    public BearerTokenResolver bearerTokenResolver(JwtDecoder jwtDecoder) {
        DefaultBearerTokenResolver delegate = new DefaultBearerTokenResolver();
        PathPatternRequestMatcher.Builder paths = PathPatternRequestMatcher.withDefaults();
        List<RequestMatcher> matchers = java.util.Arrays.stream(OPTIONAL_JWT_GETS)
                .map(p -> (RequestMatcher) paths.matcher(HttpMethod.GET, p))
                .toList();
        RequestMatcher optionalJwt = new OrRequestMatcher(matchers);

        return request -> {
            if (!optionalJwt.matches(request)) {
                return delegate.resolve(request);
            }
            try {
                String token = delegate.resolve(request);
                if (token != null) {
                    jwtDecoder.decode(token);
                }
                return token;
            } catch (JwtException | OAuth2AuthenticationException ex) {
                return null;
            }
        };
    }

    /** CORS for the frontend, with credentials so the refresh cookie works (change.md Q28). */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") List<String> allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins.stream().map(String::trim).filter(o -> !o.isEmpty()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setExposedHeaders(List.of("Retry-After"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecretKey jwtSecretKey(@Value("${jwt.secret}") String secret) {
        return new SecretKeySpec(Base64.getDecoder().decode(secret), "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey secretKey) {
        return NimbusJwtEncoder.withSecretKey(secretKey).algorithm(MacAlgorithm.HS256).build();
    }

    /** Signature, expiry and issuer, then the blacklist and tokens-valid-after checks (fail open). */
    @Bean
    public JwtDecoder jwtDecoder(SecretKey secretKey,
                                 AccessTokenRevocationService revocation,
                                 @Value("${jwt.issuer}") String issuer) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();

        OAuth2TokenValidator<Jwt> standard = JwtValidators.createDefaultWithIssuer(issuer);
        decoder.setJwtValidator(jwt -> {
            OAuth2TokenValidatorResult result = standard.validate(jwt);
            if (result.hasErrors()) {
                return result;
            }
            if (revocation.isRevoked(jwt)) {
                return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "JWT has been revoked", null));
            }
            return OAuth2TokenValidatorResult.success();
        });
        return decoder;
    }
}
