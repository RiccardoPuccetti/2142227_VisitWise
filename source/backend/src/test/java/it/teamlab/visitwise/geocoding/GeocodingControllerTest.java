package it.teamlab.visitwise.geocoding;

import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static it.teamlab.visitwise.tenant.TenantTestSupport.xsrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.DeliveryPointRepository;
import it.teamlab.visitwise.imports.GeocodeStatus;
import it.teamlab.visitwise.imports.ImportBatch;
import it.teamlab.visitwise.imports.ImportBatchRepository;
import it.teamlab.visitwise.imports.ImportStatus;
import it.teamlab.visitwise.tenant.Tenant;
import it.teamlab.visitwise.tenant.TenantRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Endpoints 8, 9 and 9b of API_CONTRACT.md (US-08, US-09). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GeocodingControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private ImportBatchRepository imports;

    @Autowired
    private DeliveryPointRepository points;

    private Long tenantId;
    private ImportBatch batch;
    private DeliveryPoint located;
    private DeliveryPoint missing;

    @BeforeEach
    void createImport() {
        tenantId = tenants.saveAndFlush(new Tenant("Geo federation", "geo-api@visitwise.test", "{argon2}hash"))
                .getId();
        batch = new ImportBatch(tenantId, "Geo 2026", "geo.xlsx");
        batch.setStatus(ImportStatus.GEOCODING);
        batch = imports.saveAndFlush(batch);
        located = new DeliveryPoint(batch, 2, "ACME", "ACME", "VIA DEL CORSO 300", "ROMA", null);
        located.setCoordinates(41.9, 12.48, GeocodeStatus.OK);
        missing = new DeliveryPoint(batch, 3, "BETA", "BETA", "VIA SCONOSCIUTA 1", "ROMA", null);
        missing.setCoordinates(null, null, GeocodeStatus.NOT_FOUND);
        DeliveryPoint pending = new DeliveryPoint(batch, 4, "GAMMA", "GAMMA", "VIA IN CODA 2", "ROMA", null);
        points.saveAllAndFlush(List.of(located, missing, pending));
    }

    private String url(String suffix) {
        return "/api/imports/" + batch.getId() + suffix;
    }

    @Test
    void progressCountsLocatedPendingAndNotFound() throws Exception {
        mvc.perform(get(url("/geocoding")).with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("GEOCODING"))
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.located").value(1))
                .andExpect(jsonPath("$.pending").value(1))
                .andExpect(jsonPath("$.notFound").value(1));
    }

    @Test
    void retryIsAcceptedForAnExistingImport() throws Exception {
        mvc.perform(post(url("/geocoding/retry")).with(asTenant(tenantId)).with(xsrf()))
                .andExpect(status().isAccepted());
    }

    @Test
    void manualLocationMarksThePointManualAndCountsIt() throws Exception {
        mvc.perform(patch(url("/points/" + missing.getId() + "/location"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"latitude\":41.91,\"longitude\":12.49}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.geocodeStatus").value("MANUAL"))
                .andExpect(jsonPath("$.latitude").value(41.91));

        mvc.perform(get(url("/geocoding")).with(asTenant(tenantId)))
                .andExpect(jsonPath("$.located").value(2))
                .andExpect(jsonPath("$.notFound").value(0));
    }

    @Test
    void manualLocationRejectsCoordinatesOutOfRange() throws Exception {
        mvc.perform(patch(url("/points/" + missing.getId() + "/location"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"latitude\":95,\"longitude\":12.49}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void anotherTenantCannotSeeTheProgress() throws Exception {
        Long other = tenants.saveAndFlush(new Tenant("Other", "other-geo@visitwise.test", "{argon2}hash")).getId();
        mvc.perform(get(url("/geocoding")).with(asTenant(other)))
                .andExpect(status().isNotFound());
    }
}
