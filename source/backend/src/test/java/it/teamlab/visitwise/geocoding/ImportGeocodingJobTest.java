package it.teamlab.visitwise.geocoding;

import static org.assertj.core.api.Assertions.assertThat;

import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.DeliveryPointRepository;
import it.teamlab.visitwise.imports.GeocodeStatus;
import it.teamlab.visitwise.imports.ImportBatch;
import it.teamlab.visitwise.imports.ImportBatchRepository;
import it.teamlab.visitwise.imports.ImportStatus;
import it.teamlab.visitwise.tenant.Tenant;
import it.teamlab.visitwise.tenant.TenantRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * PUC-4 background job (US-08): runs the synchronous body against a real database, outside a test transaction
 * because the job manages its own, so the rows are cleaned up by hand.
 */
@SpringBootTest
class ImportGeocodingJobTest {

    @Autowired
    private ImportGeocodingJob job;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private ImportBatchRepository imports;

    @Autowired
    private DeliveryPointRepository points;

    @Autowired
    private GeocodeCacheRepository cache;

    private Long tenantId;
    private Long importId;
    private String suffix;

    @BeforeEach
    void createPendingImport() {
        FakeGeocoder.reset();
        suffix = UUID.randomUUID().toString();
        tenantId = tenants.saveAndFlush(new Tenant("Geocoding federation", "geo-" + suffix + "@visitwise.test",
                "{argon2}hash")).getId();
        ImportBatch batch = new ImportBatch(tenantId, "Geocoding " + suffix, "geo.xlsx");
        batch.setStatus(ImportStatus.GEOCODING);
        importId = imports.saveAndFlush(batch).getId();
        points.saveAllAndFlush(List.of(
                new DeliveryPoint(batch, 2, "ACME", "ACME", "Via Nota " + suffix, "Roma", null),
                new DeliveryPoint(batch, 3, "BETA", "BETA", "Via Ignota " + suffix, "Roma", null)));
    }

    @AfterEach
    void cleanUp() {
        points.deleteAll(points.findByImportBatchId(importId));
        imports.deleteById(importId);
        tenants.deleteById(tenantId);
        for (String street : List.of("Via Nota ", "Via Ignota ")) {
            cache.findByQueryKey(GeocodingService.queryKey(street + suffix, "Roma")).ifPresent(cache::delete);
        }
        FakeGeocoder.reset();
    }

    @Test
    void locatesPendingPointsAndMarksTheRestNotFound() {
        FakeGeocoder.knows("Via Nota " + suffix, "Roma", 41.9, 12.5);

        job.run(importId, false);

        List<DeliveryPoint> saved = points.findByImportBatchId(importId);
        assertThat(saved).extracting(DeliveryPoint::getGeocodeStatus)
                .containsExactlyInAnyOrder(GeocodeStatus.OK, GeocodeStatus.NOT_FOUND);
        assertThat(saved).filteredOn(p -> p.getGeocodeStatus() == GeocodeStatus.OK)
                .singleElement().satisfies(p -> {
                    assertThat(p.getLatitude()).isEqualTo(41.9);
                    assertThat(p.getLongitude()).isEqualTo(12.5);
                });
        ImportBatch batch = imports.findById(importId).orElseThrow();
        assertThat(batch.getStatus()).isEqualTo(ImportStatus.READY);
        assertThat(batch.getGeocodedRows()).isEqualTo(1);
        assertThat(batch.getErrorMessage()).isNull();
    }

    @Test
    void retryAsksAgainForNotFoundPoints() {
        job.run(importId, false);
        assertThat(points.findByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.NOT_FOUND)).hasSize(2);

        FakeGeocoder.knows("Via Ignota " + suffix, "Roma", 41.8, 12.4);
        job.run(importId, true);

        assertThat(points.findByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.OK)).hasSize(1);
        assertThat(imports.findById(importId).orElseThrow().getGeocodedRows()).isEqualTo(1);
    }

    @Test
    void providerOutageLeavesTheImportUsableWithAnExplanation() {
        FakeGeocoder.unavailable(true);

        job.run(importId, false);

        ImportBatch batch = imports.findById(importId).orElseThrow();
        assertThat(batch.getStatus()).isEqualTo(ImportStatus.READY);
        assertThat(batch.getErrorMessage()).contains("unavailable");
        assertThat(points.findByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.PENDING)).hasSize(2);
    }
}
