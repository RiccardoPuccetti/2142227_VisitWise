package it.teamlab.visitwise.tenant;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

import jakarta.servlet.http.Cookie;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * For every team member's controller tests (AGENTS.md "Testing as a tenant"): run a MockMvc request as a logged-in
 * tenant, e.g. {@code mvc.perform(get("/api/imports/" + id).with(asTenant(tenant.getId())))}.
 * State-changing requests also need {@code .with(xsrf())}. The tenant guard still checks ownership: create the import
 * with that tenant's id.
 */
public final class TenantTestSupport {

    private TenantTestSupport() {
    }

    public static RequestPostProcessor asTenant(Long tenantId) {
        TenantPrincipal principal = new TenantPrincipal(tenantId, "tenant-" + tenantId + "@visitwise.test", null, false);
        return authentication(UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()));
    }

    /**
     * Sends a CSRF token the way the Angular app does: the same value in the {@code XSRF-TOKEN} cookie and in the
     * {@code X-XSRF-TOKEN} header, checked by the real CSRF filter. Use it instead of Spring Security's
     * {@code csrf()}, which replaces the token repository of the shared test context and breaks later test classes.
     */
    public static RequestPostProcessor xsrf() {
        return request -> {
            String token = UUID.randomUUID().toString();
            List<Cookie> cookies = new ArrayList<>(request.getCookies() == null ? List.of() : List.of(request.getCookies()));
            cookies.add(new Cookie("XSRF-TOKEN", token));
            request.setCookies(cookies.toArray(Cookie[]::new));
            request.addHeader("X-XSRF-TOKEN", token);
            return request;
        };
    }
}
