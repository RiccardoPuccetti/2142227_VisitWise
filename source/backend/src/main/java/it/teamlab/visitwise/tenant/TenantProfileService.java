package it.teamlab.visitwise.tenant;

import it.teamlab.visitwise.common.NotFoundException;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Profile changes of the logged-in tenant (US-34). */
@Service
public class TenantProfileService {

    private static final Logger log = LoggerFactory.getLogger(TenantProfileService.class);

    private final TenantRepository tenants;
    private final PasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;

    public TenantProfileService(TenantRepository tenants, PasswordPolicy passwordPolicy,
            PasswordEncoder passwordEncoder) {
        this.tenants = tenants;
        this.passwordPolicy = passwordPolicy;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public CurrentTenant rename(Long tenantId, String name) {
        Tenant tenant = find(tenantId);
        tenant.rename(name);
        return CurrentTenant.from(tenant);
    }

    /** @throws IllegalArgumentException if the current password is wrong or the new one breaks the policy */
    @Transactional
    public void changePassword(Long tenantId, String currentPassword, String newPassword) {
        Tenant tenant = find(tenantId);
        if (!passwordEncoder.matches(currentPassword, tenant.getPasswordHash())) {
            log.info("Password change refused (wrong current password): tenantId={}, email={}",
                    tenant.getId(), tenant.getEmail());
            throw new IllegalArgumentException("Current password is incorrect");
        }
        passwordPolicy.check(newPassword);
        tenant.changePassword(passwordEncoder.encode(newPassword), OffsetDateTime.now());
        log.info("Password changed: tenantId={}, email={}", tenant.getId(), tenant.getEmail());
    }

    private Tenant find(Long tenantId) {
        return tenants.findById(tenantId).orElseThrow(() -> new NotFoundException("Tenant", tenantId));
    }
}
