package it.teamlab.visitwise.tenant;

import it.teamlab.visitwise.common.NotFoundException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Authentication endpoints (API_CONTRACT.md section 4). */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final TenantRegistrationService registration;
    private final TenantRepository tenants;

    public AuthController(TenantRegistrationService registration, TenantRepository tenants) {
        this.registration = registration;
        this.tenants = tenants;
    }

    /** Endpoint 19: the SPA calls it once at startup to receive the {@code XSRF-TOKEN} cookie. */
    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken csrfToken) {
        // Reading the (deferred) token makes the repository write the cookie.
        csrfToken.getToken();
        return ResponseEntity.noContent().build();
    }

    /** Endpoint 20: creates the tenant and its login; the SPA logs in with endpoint 21 afterwards. */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public CurrentTenant register(@Valid @RequestBody RegisterRequest request) {
        return registration.register(request);
    }

    // Endpoints 21 (login) and 22 (logout) are handled by Spring Security: see SecurityConfig and LoginHandlers.

    /** Endpoint 23: the logged-in tenant, read fresh from the database (the name can change). */
    @GetMapping("/me")
    public CurrentTenant me(@AuthenticationPrincipal TenantPrincipal principal) {
        return tenants.findById(principal.tenantId())
                .map(CurrentTenant::from)
                .orElseThrow(() -> new NotFoundException("Tenant", principal.tenantId()));
    }
}
