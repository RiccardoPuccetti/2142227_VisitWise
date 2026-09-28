package it.teamlab.visitwise.tenant;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Profile of the logged-in tenant (API_CONTRACT.md section 4, endpoints 24-25). */
@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final TenantProfileService profile;
    private final SessionRegistry sessionRegistry;
    private final TenantRememberMeServices rememberMe;

    public ProfileController(TenantProfileService profile, SessionRegistry sessionRegistry,
            TenantRememberMeServices rememberMe) {
        this.profile = profile;
        this.sessionRegistry = sessionRegistry;
        this.rememberMe = rememberMe;
    }

    /** Endpoint 24: rename the tenant. */
    @PatchMapping
    public CurrentTenant update(@AuthenticationPrincipal TenantPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        return profile.rename(principal.tenantId(), request.name());
    }

    /** Endpoint 26 (US-35): 200 with the saved base, 204 when none was saved yet. */
    @GetMapping("/base")
    public ResponseEntity<StartingBase> startingBase(@AuthenticationPrincipal TenantPrincipal principal) {
        return profile.startingBase(principal.tenantId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    /** Endpoint 27 (US-35): geocodes and saves the base. 422 when the address is unknown, 503 geocoder down. */
    @PutMapping("/base")
    public StartingBase saveStartingBase(@AuthenticationPrincipal TenantPrincipal principal,
            @Valid @RequestBody SaveStartingBaseRequest request) {
        return profile.saveStartingBase(principal.tenantId(), request);
    }

    /**
     * Endpoint 25 (AUTHENTICATION.md A10, A13): after the change every other session of the tenant is logged out, every
     * remembered device forgotten and the current session gets a new id.
     */
    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal TenantPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest request, HttpServletRequest httpRequest) {
        profile.changePassword(principal.tenantId(), request.currentPassword(), request.newPassword());
        String currentSessionId = httpRequest.getSession().getId();
        sessionRegistry.getAllSessions(principal, false).stream()
                .filter(session -> !session.getSessionId().equals(currentSessionId))
                .forEach(SessionInformation::expireNow);
        rememberMe.forgetTenant(principal.getUsername());
        httpRequest.changeSessionId();
        return ResponseEntity.noContent().build();
    }
}
