package it.teamlab.visitwise.imports;

public enum GeocodeStatus {
    PENDING,
    /** Coordinates found by the geocoding provider (or its cache). */
    OK,
    NOT_FOUND,
    /** Coordinates were present in the imported file. */
    FROM_FILE,
    /** Coordinates set by hand by the analyst. */
    MANUAL
}
