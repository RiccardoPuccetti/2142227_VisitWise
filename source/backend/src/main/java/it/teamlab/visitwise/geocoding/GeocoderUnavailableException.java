package it.teamlab.visitwise.geocoding;

/** The geocoding provider could not be reached or refused the request (mapped to 503 by the API). */
public class GeocoderUnavailableException extends RuntimeException {

    public GeocoderUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }

    public GeocoderUnavailableException(String message) {
        super(message);
    }
}
