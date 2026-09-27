package it.teamlab.visitwise.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Limits login, registration and password-change attempts per client IP (AUTHENTICATION.md A9): at most
 * {@code perMinute} requests in a fixed one-minute window shared by the three endpoints, then 429 with Retry-After.
 * In memory, like the sessions (single backend instance). Created by {@link SecurityConfig}, not a bean, so it runs
 * only inside the security filter chain.
 */
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AuthRateLimitFilter.class);
    private static final Set<String> LIMITED = Set.of(
            "POST /api/auth/login", "POST /api/auth/register", "PUT /api/profile/password");
    private static final long WINDOW_MILLIS = 60_000;
    private static final int MAX_TRACKED_IPS = 10_000;

    private final int perMinute;
    private final ProblemDetailsSecurityHandler problems;
    private final Clock clock;
    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    public AuthRateLimitFilter(int perMinute, ProblemDetailsSecurityHandler problems, Clock clock) {
        this.perMinute = perMinute;
        this.problems = problems;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !LIMITED.contains(request.getMethod() + " " + request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long now = clock.millis();
        if (windows.size() > MAX_TRACKED_IPS) {
            windows.values().removeIf(window -> window.isOver(now));
        }
        String ip = request.getRemoteAddr();
        Window window = windows.compute(ip, (key, current) ->
                current == null || current.isOver(now) ? new Window(now, 1) : new Window(current.start(), current.count() + 1));
        if (window.count() > perMinute) {
            long retryAfterSeconds = Math.max(1, (window.start() + WINDOW_MILLIS - now + 999) / 1000);
            log.warn("Rate limit hit: ip={}, path={}", ip, request.getRequestURI());
            response.setHeader(HttpHeaders.RETRY_AFTER, Long.toString(retryAfterSeconds));
            problems.write(request, response, HttpStatus.TOO_MANY_REQUESTS, "Too many attempts, try again later");
            return;
        }
        chain.doFilter(request, response);
    }

    private record Window(long start, int count) {

        boolean isOver(long now) {
            return now - start >= WINDOW_MILLIS;
        }
    }
}
