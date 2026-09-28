package it.teamlab.visitwise.geocoding;

/** Coordinates returned by the geocoder for one address. */
public record GeocodedLocation(double latitude, double longitude) {

    public GeocodedLocation {
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Coordinates out of range: " + latitude + ", " + longitude);
        }
    }
}
