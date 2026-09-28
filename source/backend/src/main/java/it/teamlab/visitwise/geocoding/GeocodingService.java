package it.teamlab.visitwise.geocoding;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Geocoding with the global {@code geocode_cache}: an address is asked to the provider once, ever (misses too), so
 * re-importing next year's file costs no provider call for known addresses (US-08).
 */
@Service
public class GeocodingService {

    private final GeocodeCacheRepository cache;
    private final Geocoder geocoder;

    public GeocodingService(GeocodeCacheRepository cache, Geocoder geocoder) {
        this.cache = cache;
        this.geocoder = geocoder;
    }

    /**
     * @param retryMisses when true a cached miss is asked to the provider again (US-09 retry)
     * @return the location, or empty when the address is unknown
     * @throws GeocoderUnavailableException when the provider is needed and fails
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Optional<GeocodedLocation> locate(String address, String city, boolean retryMisses) {
        String key = queryKey(address, city);
        Optional<GeocodeCacheEntry> cached = cache.findByQueryKey(key);
        if (cached.isPresent() && (cached.get().isFound() || !retryMisses)) {
            return toLocation(cached.get());
        }
        Optional<GeocodedLocation> located = geocoder.geocode(address.strip(), city.strip());
        Double latitude = located.map(GeocodedLocation::latitude).orElse(null);
        Double longitude = located.map(GeocodedLocation::longitude).orElse(null);
        if (cached.isPresent()) {
            cached.get().update(latitude, longitude, located.isPresent(), geocoder.name());
        } else {
            cache.save(new GeocodeCacheEntry(key, latitude, longitude, located.isPresent(), geocoder.name()));
        }
        return located;
    }

    public Optional<GeocodedLocation> locate(String address, String city) {
        return locate(address, city, false);
    }

    /** Cache key: "ADDRESS, CITY" without accents, upper case, single spaces (column {@code query_key}, 400 chars). */
    public static String queryKey(String address, String city) {
        String key = normalize(address) + ", " + normalize(city);
        return key.length() > 400 ? key.substring(0, 400) : key;
    }

    private static String normalize(String value) {
        String stripped = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return stripped.strip().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }

    private static Optional<GeocodedLocation> toLocation(GeocodeCacheEntry entry) {
        if (!entry.isFound() || entry.getLatitude() == null || entry.getLongitude() == null) {
            return Optional.empty();
        }
        return Optional.of(new GeocodedLocation(entry.getLatitude(), entry.getLongitude()));
    }
}
