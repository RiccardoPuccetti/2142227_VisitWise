package it.teamlab.visitwise.tenant;

import java.time.OffsetDateTime;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Loads the tenant that is trying to log in; the login form's "username" is the email. */
@Service
public class TenantUserDetailsService implements UserDetailsService {

    private final TenantRepository tenants;

    public TenantUserDetailsService(TenantRepository tenants) {
        this.tenants = tenants;
    }

    @Override
    @Transactional(readOnly = true)
    public TenantPrincipal loadUserByUsername(String username) {
        return tenants.findByEmail(Tenant.normalizeEmail(username))
                .map(tenant -> new TenantPrincipal(tenant.getId(), tenant.getEmail(), tenant.getPasswordHash(),
                        tenant.isLocked(OffsetDateTime.now())))
                .orElseThrow(() -> new UsernameNotFoundException("Unknown email"));
    }
}
