package it.teamlab.visitwise.tenant;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/** The logged-in tenant as seen by Spring Security. {@link #tenantId()} scopes every data access (D-09). */
public final class TenantPrincipal implements UserDetails, CredentialsContainer {

    private final Long tenantId;
    private final String email;
    private final boolean locked;
    private String passwordHash;

    TenantPrincipal(Long tenantId, String email, String passwordHash, boolean locked) {
        this.tenantId = tenantId;
        this.email = email;
        this.passwordHash = passwordHash;
        this.locked = locked;
    }

    public Long tenantId() {
        return tenantId;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !locked;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    /** Called by Spring Security after login so the hash does not stay in the session. */
    @Override
    public void eraseCredentials() {
        passwordHash = null;
    }
}
