package it.teamlab.visitwise.geocoding;

/** The geocoder answered but knows no location for the address (mapped to 422 by the API). */
public class AddressNotFoundException extends RuntimeException {

    public AddressNotFoundException(String address, String city) {
        super("Address not found: " + address + ", " + city);
    }
}
