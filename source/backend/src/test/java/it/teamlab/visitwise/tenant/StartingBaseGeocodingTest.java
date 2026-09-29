package it.teamlab.visitwise.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import it.teamlab.visitwise.geocoding.AddressNotFoundException;
import it.teamlab.visitwise.geocoding.FakeGeocoder;
import it.teamlab.visitwise.geocoding.GeocodeCacheRepository;
import it.teamlab.visitwise.geocoding.GeocodingService;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Endpoint 27 (US-35): the geocoder lookup of the starting base runs in its own transaction, so its cache row is kept
 * when saving the base fails. Outside a test transaction on purpose: the rows are cleaned up by hand.
 */
@SpringBootTest
class StartingBaseGeocodingTest {

    @Autowired
    private TenantProfileService profiles;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private GeocodeCacheRepository cache;

    private Long tenantId;
    private String address;

    @BeforeEach
    void createTenant() {
        FakeGeocoder.reset();
        String suffix = UUID.randomUUID().toString();
        address = "Via Sconosciuta " + suffix;
        tenantId = tenants.saveAndFlush(new Tenant("Base geocoding", "base-" + suffix + "@visitwise.test",
                "{argon2}hash")).getId();
    }

    @AfterEach
    void cleanUp() {
        cache.findByQueryKey(GeocodingService.queryKey(address, "Roma")).ifPresent(cache::delete);
        tenants.deleteById(tenantId);
        FakeGeocoder.reset();
    }

    @Test
    void anUnknownAddressIsRememberedAndNotAskedAgain() {
        SaveStartingBaseRequest request = new SaveStartingBaseRequest(address, "Roma");

        for (int attempt = 0; attempt < 2; attempt++) {
            assertThatThrownBy(() -> profiles.saveStartingBase(tenantId, request))
                    .isInstanceOf(AddressNotFoundException.class);
        }

        assertThat(cache.findByQueryKey(GeocodingService.queryKey(address, "Roma"))).isPresent();
        assertThat(FakeGeocoder.calls()).isEqualTo(1);
    }
}
