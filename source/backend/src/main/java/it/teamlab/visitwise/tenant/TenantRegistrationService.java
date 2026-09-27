package it.teamlab.visitwise.tenant;

import it.teamlab.visitwise.common.ConflictException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates a tenant with its login (US-31). Does not log in: the SPA calls the login endpoint next. */
@Service
public class TenantRegistrationService {

    private static final Logger log = LoggerFactory.getLogger(TenantRegistrationService.class);

    private final TenantRepository tenants;
    private final PasswordPolicy passwordPolicy;
    private final PasswordEncoder passwordEncoder;

    public TenantRegistrationService(TenantRepository tenants, PasswordPolicy passwordPolicy,
            PasswordEncoder passwordEncoder) {
        this.tenants = tenants;
        this.passwordPolicy = passwordPolicy;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public CurrentTenant register(RegisterRequest request) {
        passwordPolicy.check(request.password());
        String email = Tenant.normalizeEmail(request.email());
        if (tenants.existsByEmail(email)) {
            throw new ConflictException("Email already registered");
        }
        Tenant tenant;
        try {
            tenant = tenants.saveAndFlush(
                    new Tenant(request.tenantName(), email, passwordEncoder.encode(request.password())));
        } catch (DataIntegrityViolationException ex) {
            // Two registrations with the same email at the same time: the unique constraint decides.
            throw new ConflictException("Email already registered");
        }
        log.info("Tenant registered: id={}, email={}", tenant.getId(), tenant.getEmail());
        return CurrentTenant.from(tenant);
    }
}
