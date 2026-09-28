package it.teamlab.visitwise.geocoding;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/** In-memory geocoder for tests: no test ever calls Nominatim. Configure with the static helpers, then reset. */
@Component
@Primary
public class FakeGeocoder implements Geocoder {

    private static final Map<String, GeocodedLocation> KNOWN = new ConcurrentHashMap<>();
    private static final AtomicBoolean UNAVAILABLE = new AtomicBoolean(false);
    private static final AtomicInteger CALLS = new AtomicInteger();

    public static void knows(String address, String city, double latitude, double longitude) {
        KNOWN.put(key(address, city), new GeocodedLocation(latitude, longitude));
    }

    public static void unavailable(boolean value) {
        UNAVAILABLE.set(value);
    }

    public static int calls() {
        return CALLS.get();
    }

    public static void reset() {
        KNOWN.clear();
        UNAVAILABLE.set(false);
        CALLS.set(0);
    }

    private static String key(String address, String city) {
        return (address + "|" + city).strip().toUpperCase(Locale.ROOT);
    }

    @Override
    public Optional<GeocodedLocation> geocode(String address, String city) {
        CALLS.incrementAndGet();
        if (UNAVAILABLE.get()) {
            throw new GeocoderUnavailableException("fake geocoder is down");
        }
        return Optional.ofNullable(KNOWN.get(key(address, city)));
    }

    @Override
    public String name() {
        return "FAKE";
    }
}
