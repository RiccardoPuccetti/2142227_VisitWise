package it.teamlab.visitwise.imports;

public enum ImportStatus {
    /** Rows are being parsed and saved. */
    PROCESSING,
    /** Rows saved; addresses are being geocoded in background. Map shows partial data. */
    GEOCODING,
    /** All rows saved and geocoding finished (some points may be NOT_FOUND). */
    READY,
    FAILED
}
