package it.teamlab.visitwise.imports;

import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static it.teamlab.visitwise.tenant.TenantTestSupport.xsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import it.teamlab.visitwise.tenant.Tenant;
import it.teamlab.visitwise.tenant.TenantRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Endpoints 4, 5 and 6: list (US-10), detail (US-11) and delete (US-12) of the tenant's imports. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ImportReadDeleteTest {

    private static final String MAPPING = """
            {"customer":"Ragione Sociale","deliveryPoint":"Punto Vendita","address":"Indirizzo","city":"Comune",\
            "agent":"Agente","latitude":null,"longitude":null,\
            "enterprises":[{"sourceColumn":"ENTERPRISE A","name":"Wine","color":"#0072B2"}]}""";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private ImportBatchRepository imports;

    @Autowired
    private EnterpriseRepository enterprises;

    @Autowired
    private DeliveryPointRepository points;

    @Autowired
    private EntityManager entityManager;

    private Tenant tenant;

    @BeforeEach
    void createTenant() {
        tenant = newTenant();
    }

    private Tenant newTenant() {
        return tenants.saveAndFlush(new Tenant("Read test", UUID.randomUUID() + "@visitwise.test", "{noop}x"));
    }

    /** An import with two enterprises and three points: ROMA (OK), ROMA (NOT_FOUND), TIVOLI (PENDING, no agent). */
    private ImportBatch newImport(Tenant owner, String name) {
        ImportBatch batch = new ImportBatch(owner.getId(), name, name + ".xlsx");
        batch.setStatus(ImportStatus.GEOCODING);
        batch.setColumnMapping(MAPPING);
        batch.setTotalRows(5);
        batch.setImportedRows(3);
        batch.setSkippedRows(2);
        batch.setGeocodedRows(1);
        batch.setErrorMessage("Geocoding interrupted: the geocoding service was unavailable. Retry later.");
        imports.save(batch);
        Enterprise wine = enterprises.save(new Enterprise(batch, "ENTERPRISE A", "Wine", "#0072B2", 0));
        enterprises.save(new Enterprise(batch, "ENTERPRISE B", "Beer", "#D55E00", 1));

        DeliveryPoint located = new DeliveryPoint(batch, 2, "ACME SRL", "BAR ACME", "VIA DEL CORSO 300", "ROMA",
                "AGENT SOUTH");
        located.setCoordinates(41.9, 12.48, GeocodeStatus.OK);
        located.addRevenue(wine, new BigDecimal("1250.50"));
        DeliveryPoint notFound = new DeliveryPoint(batch, 3, "ACME SRL", "BAR ACME 2", "VIA NOWHERE 1", "ROMA",
                "AGENT NORTH");
        notFound.setCoordinates(null, null, GeocodeStatus.NOT_FOUND);
        DeliveryPoint pending = new DeliveryPoint(batch, 4, "BETA SNC", "OSTERIA BETA", "VIA APPIA 10", "TIVOLI",
                null);
        points.save(located);
        points.save(notFound);
        points.save(pending);
        entityManager.flush();
        return batch;
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void listsOnlyTheTenantImportsNewestFirst() throws Exception {
        ImportBatch older = newImport(tenant, "Sample 2024");
        ImportBatch newer = newImport(tenant, "Sample 2025");
        newImport(newTenant(), "Other tenant");

        mvc.perform(get("/api/imports").with(asTenant(tenant.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].id").value(contains(newer.getId().intValue(), older.getId().intValue())))
                .andExpect(jsonPath("$[0].name").value("Sample 2025"))
                .andExpect(jsonPath("$[0].sourceFileName").value("Sample 2025.xlsx"))
                .andExpect(jsonPath("$[0].status").value("GEOCODING"))
                .andExpect(jsonPath("$[0].totalRows").value(5))
                .andExpect(jsonPath("$[0].importedRows").value(3))
                .andExpect(jsonPath("$[0].skippedRows").value(2))
                .andExpect(jsonPath("$[0].geocodedRows").value(1))
                .andExpect(jsonPath("$[0].createdAt").isString())
                .andExpect(jsonPath("$[0].enterprises[*].name").value(contains("Wine", "Beer")))
                .andExpect(jsonPath("$[0].enterprises[0].color").value("#0072B2"))
                .andExpect(jsonPath("$[0].enterprises[0].sourceColumn").value("ENTERPRISE A"))
                .andExpect(jsonPath("$[0].mapping").doesNotExist());
    }

    @Test
    void listIsEmptyForANewTenant() throws Exception {
        mvc.perform(get("/api/imports").with(asTenant(tenant.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listLoadsWithinOneSecondWithOneHundredImports() throws Exception {
        for (int i = 0; i < 100; i++) {
            ImportBatch batch = new ImportBatch(tenant.getId(), "Import " + i, "file.xlsx");
            batch.setStatus(ImportStatus.READY);
            imports.save(batch);
            enterprises.save(new Enterprise(batch, "ENTERPRISE A", "Wine", "#0072B2", 0));
        }
        flushAndClear();

        long start = System.nanoTime();
        mvc.perform(get("/api/imports").with(asTenant(tenant.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(100)));
        assertThat((System.nanoTime() - start) / 1_000_000).isLessThan(1000);
    }

    @Test
    void detailAddsMappingAgentsCitiesAndGeocodingOutcome() throws Exception {
        ImportBatch batch = newImport(tenant, "Sample 2025");
        flushAndClear();

        mvc.perform(get("/api/imports/{id}", batch.getId()).with(asTenant(tenant.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(batch.getId()))
                .andExpect(jsonPath("$.name").value("Sample 2025"))
                .andExpect(jsonPath("$.status").value("GEOCODING"))
                .andExpect(jsonPath("$.importedRows").value(3))
                .andExpect(jsonPath("$.enterprises[*].name").value(contains("Wine", "Beer")))
                .andExpect(jsonPath("$.mapping.customer").value("Ragione Sociale"))
                .andExpect(jsonPath("$.mapping.latitude").doesNotExist())
                .andExpect(jsonPath("$.mapping.enterprises[0].sourceColumn").value("ENTERPRISE A"))
                .andExpect(jsonPath("$.agents").value(contains("AGENT NORTH", "AGENT SOUTH")))
                .andExpect(jsonPath("$.cities").value(contains("ROMA", "TIVOLI")))
                .andExpect(jsonPath("$.notFoundCount").value(1))
                .andExpect(jsonPath("$.errorMessage")
                        .value("Geocoding interrupted: the geocoding service was unavailable. Retry later."));
    }

    @Test
    void detailOfAnotherTenantImportIsNotFound() throws Exception {
        ImportBatch other = newImport(newTenant(), "Other tenant");

        mvc.perform(get("/api/imports/{id}", other.getId()).with(asTenant(tenant.getId())))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteRemovesTheImportWithItsPointsRevenuesAndPlans() throws Exception {
        ImportBatch batch = newImport(tenant, "Sample 2025");
        ImportBatch kept = newImport(tenant, "Sample 2024");
        Long pointId = points.findByImportBatchId(batch.getId()).getFirst().getId();
        Long planId = ((Number) entityManager.createNativeQuery("""
                INSERT INTO visit_plan (import_id, name, parameters) VALUES (:importId, 'Christmas', '{}')
                RETURNING id""")
                .setParameter("importId", batch.getId())
                .getSingleResult()).longValue();
        entityManager.createNativeQuery("""
                INSERT INTO planned_visit (plan_id, delivery_point_id, visit_date, day_index, slot, expected_revenue)
                VALUES (:planId, :pointId, DATE '2026-12-01', 0, 0, 1250.50)""")
                .setParameter("planId", planId)
                .setParameter("pointId", pointId)
                .executeUpdate();
        flushAndClear();

        mvc.perform(delete("/api/imports/{id}", batch.getId()).with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isNoContent());
        flushAndClear();

        assertThat(imports.existsById(batch.getId())).isFalse();
        assertThat(points.countByImportBatchId(batch.getId())).isZero();
        assertThat(enterprises.findByImportBatchIdOrderByPosition(batch.getId())).isEmpty();
        assertThat(count("SELECT count(*) FROM revenue WHERE delivery_point_id = " + pointId)).isZero();
        assertThat(count("SELECT count(*) FROM visit_plan WHERE id = " + planId)).isZero();
        assertThat(count("SELECT count(*) FROM planned_visit WHERE plan_id = " + planId)).isZero();
        assertThat(imports.existsById(kept.getId())).isTrue();
        assertThat(points.countByImportBatchId(kept.getId())).isEqualTo(3);
    }

    @Test
    void deletedImportIsNotFoundAfterwards() throws Exception {
        ImportBatch batch = newImport(tenant, "Sample 2025");
        flushAndClear();

        mvc.perform(delete("/api/imports/{id}", batch.getId()).with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isNoContent());
        flushAndClear();

        mvc.perform(get("/api/imports/{id}", batch.getId()).with(asTenant(tenant.getId())))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/imports/{id}", batch.getId()).with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteOfAnotherTenantImportIsNotFoundAndKeepsIt() throws Exception {
        ImportBatch other = newImport(newTenant(), "Other tenant");
        flushAndClear();

        mvc.perform(delete("/api/imports/{id}", other.getId()).with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isNotFound());

        assertThat(imports.existsById(other.getId())).isTrue();
    }

    @Test
    void deleteWithoutTheCsrfTokenIsForbidden() throws Exception {
        ImportBatch batch = newImport(tenant, "Sample 2025");
        flushAndClear();

        mvc.perform(delete("/api/imports/{id}", batch.getId()).with(asTenant(tenant.getId())))
                .andExpect(status().isForbidden());

        assertThat(imports.existsById(batch.getId())).isTrue();
    }

    private long count(String sql) {
        return ((Number) entityManager.createNativeQuery(sql).getSingleResult()).longValue();
    }
}
