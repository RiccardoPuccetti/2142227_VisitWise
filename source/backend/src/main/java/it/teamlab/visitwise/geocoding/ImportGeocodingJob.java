package it.teamlab.visitwise.geocoding;

import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.DeliveryPointRepository;
import it.teamlab.visitwise.imports.GeocodeStatus;
import it.teamlab.visitwise.imports.ImportBatch;
import it.teamlab.visitwise.imports.ImportBatchRepository;
import it.teamlab.visitwise.imports.ImportCreatedEvent;
import it.teamlab.visitwise.imports.ImportStatus;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Background geocoding of an import (US-08): every PENDING point is resolved through the cache or Nominatim and saved
 * one by one, so the progress endpoint and the map show partial data while the job runs. The import stays
 * {@code GEOCODING} until the last point is done, then becomes {@code READY} (some points may be NOT_FOUND).
 */
@Component
public class ImportGeocodingJob {

    private static final Logger log = LoggerFactory.getLogger(ImportGeocodingJob.class);

    private final DeliveryPointRepository points;
    private final ImportBatchRepository imports;
    private final GeocodingService geocoding;
    private final TransactionTemplate transactions;
    private final Set<Long> running = ConcurrentHashMap.newKeySet();
    /** Retries asked while the import was running: each one runs once the current run ends. */
    private final Set<Long> retryRequested = ConcurrentHashMap.newKeySet();

    public ImportGeocodingJob(DeliveryPointRepository points, ImportBatchRepository imports,
            GeocodingService geocoding, TransactionTemplate transactions) {
        this.points = points;
        this.imports = imports;
        this.geocoding = geocoding;
        this.transactions = transactions;
    }

    /** New import committed: geocode its points without coordinates. */
    @Async(GeocodingConfig.EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onImportCreated(ImportCreatedEvent event) {
        run(event.importId(), false);
    }

    /** Imports left in GEOCODING by a restart are resumed. */
    @Async(GeocodingConfig.EXECUTOR)
    @EventListener(ApplicationReadyEvent.class)
    public void resumeUnfinished() {
        imports.findByStatus(ImportStatus.GEOCODING).forEach(batch -> run(batch.getId(), false));
    }

    /** Endpoint 9 (US-09): PENDING and NOT_FOUND points are asked to the provider again, ignoring cached misses. */
    @Async(GeocodingConfig.EXECUTOR)
    public void retry(Long importId) {
        run(importId, true);
    }

    /** Synchronous body, package-private for tests. */
    void run(Long importId, boolean retryMisses) {
        if (!running.add(importId)) {
            if (retryMisses) {
                retryRequested.add(importId);
            }
            return;
        }
        try {
            List<DeliveryPoint> pending = pendingPoints(importId, retryMisses);
            log.info("Geocoding import {}: {} addresses to resolve", importId, pending.size());
            int failed = 0;
            for (DeliveryPoint point : pending) {
                try {
                    Optional<GeocodedLocation> location =
                            geocoding.locate(point.getAddress(), point.getCity(), retryMisses);
                    transactions.executeWithoutResult(status -> apply(point.getId(), location));
                } catch (GeocoderUnavailableException ex) {
                    failed++;
                    log.warn("Geocoding of import {} stopped: {}", importId, ex.getMessage());
                    break;
                }
            }
            int stillPending = failed;
            transactions.executeWithoutResult(status -> finish(importId, stillPending > 0));
        } finally {
            running.remove(importId);
        }
        if (retryRequested.remove(importId)) {
            run(importId, true);
        }
    }

    private List<DeliveryPoint> pendingPoints(Long importId, boolean includeNotFound) {
        return transactions.execute(status -> {
            ImportBatch batch = imports.findById(importId).orElse(null);
            if (batch == null) {
                return List.<DeliveryPoint>of();
            }
            batch.setStatus(ImportStatus.GEOCODING);
            batch.setErrorMessage(null);
            List<DeliveryPoint> pending = points.findByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.PENDING);
            if (includeNotFound) {
                pending = new java.util.ArrayList<>(pending);
                pending.addAll(points.findByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.NOT_FOUND));
            }
            pending.sort(java.util.Comparator.comparing(DeliveryPoint::getId));
            return pending;
        });
    }

    /** Skips a point that got a position meanwhile, e.g. placed by hand (endpoint 8) while the job waited. */
    private void apply(Long pointId, Optional<GeocodedLocation> location) {
        points.findById(pointId).filter(ImportGeocodingJob::stillMissing).ifPresent(point -> {
            if (location.isPresent()) {
                point.setCoordinates(location.get().latitude(), location.get().longitude(), GeocodeStatus.OK);
                ImportBatch batch = point.getImportBatch();
                batch.setGeocodedRows(batch.getGeocodedRows() + 1);
            } else {
                point.setCoordinates(null, null, GeocodeStatus.NOT_FOUND);
            }
        });
    }

    private static boolean stillMissing(DeliveryPoint point) {
        return point.getGeocodeStatus() == GeocodeStatus.PENDING || point.getGeocodeStatus() == GeocodeStatus.NOT_FOUND;
    }

    private void finish(Long importId, boolean interrupted) {
        imports.findById(importId).ifPresent(batch -> {
            batch.setStatus(ImportStatus.READY);
            batch.setErrorMessage(interrupted
                    ? "Geocoding interrupted: the geocoding service was unavailable. Retry later." : null);
        });
    }
}
