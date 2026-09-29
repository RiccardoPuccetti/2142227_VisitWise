package it.teamlab.visitwise.geocoding;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/** In-memory geocoder for tests: no test ever calls Nominatim. Configure with the static helpers, then reset. */
@Component
@Primary
public class FakeGeocoder implements Geocoder {

    private static final Map<String, GeocodedLocation> KNOWN = new ConcurrentHashMap<>();
    private static final AtomicBoolean UNAVAILABLE = new AtomicBoolean(false);
    private static final AtomicInteger CALLS = new AtomicInteger();
    private static final AtomicReference<Runnable> BEFORE_NEXT_ANSWER = new AtomicReference<>();

    public static void knows(String address, String city, double latitude, double longitude) {
        KNOWN.put(key(address, city), new GeocodedLocation(latitude, longitude));
    }

    public static void unavailable(boolean value) {
        UNAVAILABLE.set(value);
    }

    /** Runs once, during the next lookup: e.g. the analyst changes a point while the job waits for the answer. */
    public static void beforeNextAnswer(Runnable action) {
        BEFORE_NEXT_ANSWER.set(action);
    }

    public static int calls() {
        return CALLS.get();
    }

    public static void reset() {
        KNOWN.clear();
        UNAVAILABLE.set(false);
        CALLS.set(0);
        BEFORE_NEXT_ANSWER.set(null);
    }

    private static String key(String address, String city) {
        return (address + "|" + city).strip().toUpperCase(Locale.ROOT);
    }

    @Override
    public Optional<GeocodedLocation> geocode(String address, String city) {
        CALLS.incrementAndGet();
        Runnable action = BEFORE_NEXT_ANSWER.getAndSet(null);
        if (action != null) {
            action.run();
        }
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
