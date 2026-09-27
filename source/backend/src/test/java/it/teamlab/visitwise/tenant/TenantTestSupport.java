package it.teamlab.visitwise.tenant;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * For every team member's controller tests (AGENTS.md "Testing as a tenant"): run a MockMvc request as a logged-in
 * tenant, e.g. {@code mvc.perform(get("/api/imports/" + id).with(asTenant(tenant.getId())))}.
 * State-changing requests also need {@code .with(csrf())} (the parameter form, not {@code csrf().asHeader()}).
 * The tenant guard still checks ownership: create the import with that tenant's id.
 */
public final class TenantTestSupport {

    private TenantTestSupport() {
    }

    public static RequestPostProcessor asTenant(Long tenantId) {
        TenantPrincipal principal = new TenantPrincipal(tenantId, "tenant-" + tenantId + "@visitwise.test", null, false);
        return authentication(UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()));
    }
}
