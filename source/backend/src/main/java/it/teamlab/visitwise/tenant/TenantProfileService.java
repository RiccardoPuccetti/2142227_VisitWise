package it.teamlab.visitwise.tenant;

import it.teamlab.visitwise.common.NotFoundException;
import it.teamlab.visitwise.geocoding.AddressNotFoundException;
import it.teamlab.visitwise.geocoding.GeocodedLocation;
import it.teamlab.visitwise.geocoding.GeocodingService;
import java.time.OffsetDateTime;
import java.util.Optional;
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
    private final GeocodingService geocoding;

    public TenantProfileService(TenantRepository tenants, PasswordPolicy passwordPolicy,
            PasswordEncoder passwordEncoder, GeocodingService geocoding) {
        this.tenants = tenants;
        this.passwordPolicy = passwordPolicy;
        this.passwordEncoder = passwordEncoder;
        this.geocoding = geocoding;
    }

    @Transactional(readOnly = true)
    public Optional<StartingBase> startingBase(Long tenantId) {
        return find(tenantId).getStartingBase();
    }

    /**
     * Endpoint 27 (US-35): geocodes address + city and replaces the saved base. On a miss the saved base is unchanged.
     *
     * @throws AddressNotFoundException when the geocoder knows no location (422)
     * @throws it.teamlab.visitwise.geocoding.GeocoderUnavailableException when the geocoder fails (503)
     */
    @Transactional
    public StartingBase saveStartingBase(Long tenantId, SaveStartingBaseRequest request) {
        Tenant tenant = find(tenantId);
        String address = request.address().strip();
        String city = request.city().strip();
        GeocodedLocation location = geocoding.locate(address, city, false)
                .orElseThrow(() -> new AddressNotFoundException(address, city));
        tenant.setStartingBase(address, city, location.latitude(), location.longitude());
        log.info("Starting base saved: tenantId={}", tenant.getId());
        return tenant.getStartingBase().orElseThrow();
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
