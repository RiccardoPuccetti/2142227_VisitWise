package it.teamlab.visitwise.tenant;

import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Keeps the per-account failure counter and lock (AUTHENTICATION.md A9) up to date. */
@Service
public class LoginAttemptService {

    private static final Logger log = LoggerFactory.getLogger(LoginAttemptService.class);

    private final TenantRepository tenants;

    public LoginAttemptService(TenantRepository tenants) {
        this.tenants = tenants;
    }

    @Transactional
    public Tenant recordSuccess(Long tenantId) {
        Tenant tenant = tenants.findById(tenantId).orElseThrow();
        tenant.recordSuccessfulLogin(OffsetDateTime.now());
        return tenant;
    }

    /** Unknown emails are ignored: there is no account to lock. */
    @Transactional
    public void recordFailure(String email) {
        tenants.findByEmail(Tenant.normalizeEmail(email)).ifPresent(tenant -> {
            OffsetDateTime now = OffsetDateTime.now();
            tenant.recordFailedLogin(now);
            if (tenant.isLocked(now)) {
                log.warn("Account locked: tenantId={}, email={}, failures={}, until={}",
                        tenant.getId(), tenant.getEmail(), tenant.getFailedLoginCount(), tenant.getLockedUntil());
            }
        });
    }
}
