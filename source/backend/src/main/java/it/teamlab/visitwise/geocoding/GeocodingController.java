package it.teamlab.visitwise.geocoding;

import it.teamlab.visitwise.analytics.DeliveryPointResponse;
import it.teamlab.visitwise.common.NotFoundException;
import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.DeliveryPointRepository;
import it.teamlab.visitwise.imports.GeocodeStatus;
import it.teamlab.visitwise.imports.ImportBatch;
import it.teamlab.visitwise.imports.ImportBatchRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Geocoding endpoints of an import (API_CONTRACT.md endpoints 8, 9 and 9b). Ownership is checked by the tenant guard. */
@RestController
@RequestMapping("/api/imports/{importId}")
public class GeocodingController {

    private final ImportBatchRepository imports;
    private final DeliveryPointRepository points;
    private final ImportGeocodingJob job;

    public GeocodingController(ImportBatchRepository imports, DeliveryPointRepository points, ImportGeocodingJob job) {
        this.imports = imports;
        this.points = points;
        this.job = job;
    }

    /** Endpoint 9b: how many addresses are located, still pending or not found (US-08, US-09). */
    @GetMapping("/geocoding")
    @Transactional(readOnly = true)
    public GeocodingProgress progress(@PathVariable Long importId) {
        ImportBatch batch = imports.findById(importId).orElseThrow(() -> new NotFoundException("Import", importId));
        long total = points.countByImportBatchId(importId);
        long pending = points.countByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.PENDING);
        long notFound = points.countByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.NOT_FOUND);
        return new GeocodingProgress(batch.getStatus(), total, total - pending - notFound, pending, notFound,
                batch.getErrorMessage());
    }

    /** Endpoint 9: re-queues PENDING and NOT_FOUND points (US-09). */
    @PostMapping("/geocoding/retry")
    public ResponseEntity<Void> retry(@PathVariable Long importId) {
        if (!imports.existsById(importId)) {
            throw new NotFoundException("Import", importId);
        }
        job.retry(importId);
        return ResponseEntity.accepted().build();
    }

    /** Endpoint 8: manual position for an address the geocoder did not find (US-09). */
    @PatchMapping("/points/{pointId}/location")
    @Transactional
    public DeliveryPointResponse locate(@PathVariable Long importId, @PathVariable Long pointId,
            @Valid @RequestBody LocationRequest request) {
        DeliveryPoint point = points.findByIdAndImportBatchId(pointId, importId)
                .orElseThrow(() -> new NotFoundException("Delivery point", pointId));
        boolean hadCoordinates = point.getLatitude() != null;
        point.setCoordinates(request.latitude(), request.longitude(), GeocodeStatus.MANUAL);
        if (!hadCoordinates) {
            ImportBatch batch = point.getImportBatch();
            batch.setGeocodedRows(batch.getGeocodedRows() + 1);
        }
        return DeliveryPointResponse.of(point);
    }
}
