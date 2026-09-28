package it.teamlab.visitwise.geocoding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/** PUC-4 geocoding cache rules (OPTIMIZATION_STRATEGY.md section 3.1, US-08/US-09). */
@SpringBootTest
class GeocodingServiceTest {

    @Autowired
    private GeocodingService service;

    @Autowired
    private GeocodeCacheRepository cache;

    private String address;

    @BeforeEach
    void freshAddress() {
        FakeGeocoder.reset();
        address = "Via Test " + UUID.randomUUID();
    }

    @AfterEach
    void cleanCache() {
        cache.findByQueryKey(GeocodingService.queryKey(address, "Roma")).ifPresent(cache::delete);
        FakeGeocoder.reset();
    }

    @Test
    void queryKeyIsAccentFreeUpperCaseWithSingleSpaces() {
        assertThat(GeocodingService.queryKey("  via   Città  1 ", "Forlì"))
                .isEqualTo("VIA CITTA 1, FORLI");
    }

    @Test
    void hitsAreServedFromTheCacheWithoutCallingTheProvider() {
        FakeGeocoder.knows(address, "Roma", 41.9, 12.5);

        Optional<GeocodedLocation> first = service.locate(address, "Roma");
        Optional<GeocodedLocation> second = service.locate(address, "Roma");

        assertThat(first).contains(new GeocodedLocation(41.9, 12.5));
        assertThat(second).isEqualTo(first);
        assertThat(FakeGeocoder.calls()).isEqualTo(1);
        assertThat(cache.findByQueryKey(GeocodingService.queryKey(address, "Roma")))
                .get().satisfies(entry -> assertThat(entry.isFound()).isTrue());
    }

    @Test
    void missesAreCachedAndOnlyRetriedOnRequest() {
        assertThat(service.locate(address, "Roma")).isEmpty();
        assertThat(service.locate(address, "Roma")).isEmpty();
        assertThat(FakeGeocoder.calls()).isEqualTo(1);

        FakeGeocoder.knows(address, "Roma", 41.9, 12.5);
        assertThat(service.locate(address, "Roma", true)).contains(new GeocodedLocation(41.9, 12.5));
        assertThat(FakeGeocoder.calls()).isEqualTo(2);
        assertThat(service.locate(address, "Roma")).contains(new GeocodedLocation(41.9, 12.5));
        assertThat(FakeGeocoder.calls()).isEqualTo(2);
    }

    @Test
    void providerFailuresPropagateAndAreNotCached() {
        FakeGeocoder.unavailable(true);

        assertThatThrownBy(() -> service.locate(address, "Roma")).isInstanceOf(GeocoderUnavailableException.class);
        assertThat(cache.findByQueryKey(GeocodingService.queryKey(address, "Roma"))).isEmpty();
    }
}
