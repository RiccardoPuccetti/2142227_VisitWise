package it.teamlab.visitwise.geocoding;

import java.util.Optional;

/** A geocoding provider: turns "address + city" into coordinates. Only these two fields ever leave the system (NDA). */
public interface Geocoder {

    /**
     * @return the location, or empty when the provider does not know the address
     * @throws GeocoderUnavailableException when the provider cannot be reached or answers with an error
     */
    Optional<GeocodedLocation> geocode(String address, String city);

    /** Short provider name stored in the cache, e.g. {@code nominatim}. */
    String name();
}
