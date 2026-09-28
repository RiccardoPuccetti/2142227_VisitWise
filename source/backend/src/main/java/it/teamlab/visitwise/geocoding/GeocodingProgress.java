package it.teamlab.visitwise.geocoding;

import it.teamlab.visitwise.imports.ImportStatus;

/**
 * Geocoding progress of an import ({@code GET /api/imports/{id}/geocoding}): the planner and the import detail poll it
 * while {@code status = GEOCODING}. {@code located} counts every point with coordinates (OK, FROM_FILE, MANUAL).
 */
public record GeocodingProgress(
        ImportStatus status,
        long total,
        long located,
        long pending,
        long notFound,
        String errorMessage) {
}
