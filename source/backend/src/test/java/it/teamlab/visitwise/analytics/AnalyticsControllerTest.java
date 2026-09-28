package it.teamlab.visitwise.analytics;

import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.DeliveryPointRepository;
import it.teamlab.visitwise.imports.Enterprise;
import it.teamlab.visitwise.imports.EnterpriseRepository;
import it.teamlab.visitwise.imports.GeocodeStatus;
import it.teamlab.visitwise.imports.ImportBatch;
import it.teamlab.visitwise.imports.ImportBatchRepository;
import it.teamlab.visitwise.tenant.Tenant;
import it.teamlab.visitwise.tenant.TenantRepository;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Endpoints 7 (points list, US-9/11/13) and 10 (analytics summary, US-18) of API_CONTRACT.md. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AnalyticsControllerTest {

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

    private Long tenantId;
    private ImportBatch batch;
    private Enterprise a;
    private Enterprise b;

    @BeforeEach
    void createAnImportWithThreePoints() {
        tenantId = tenants.saveAndFlush(new Tenant("Analytics federation", "analytics@visitwise.test", "{argon2}hash"))
                .getId();
        batch = imports.saveAndFlush(new ImportBatch(tenantId, "Sample 2026", "sample.xlsx"));
        a = enterprises.saveAndFlush(new Enterprise(batch, "ENTERPRISE A", "Enterprise A", "#2563eb", 0));
        b = enterprises.saveAndFlush(new Enterprise(batch, "ENTERPRISE B", "Enterprise B", "#dc2626", 1));

        DeliveryPoint third = new DeliveryPoint(batch, 9, "BETA SRL", "ENOTECA DEL SOLE", "VIA NAZIONALE 75", "ROMA",
                "AGENT SOUTH");
        third.addRevenue(b, new BigDecimal("300.00"));
        third.setCoordinates(null, null, GeocodeStatus.NOT_FOUND);

        DeliveryPoint first = new DeliveryPoint(batch, 2, "ACME SRL", "RISTORANTE ACME", "VIA DEL CORSO 300", "ROMA",
                "AGENT NORTH");
        first.addRevenue(a, new BigDecimal("1250.50"));
        first.addRevenue(b, new BigDecimal("830.00"));
        first.setCoordinates(41.9009, 12.4800, GeocodeStatus.OK);

        DeliveryPoint second = new DeliveryPoint(batch, 5, "ACME SRL", "BAR ACME", "PIAZZA GARIBALDI 10", "TIVOLI",
                "AGENT NORTH");
        second.addRevenue(a, new BigDecimal("400.00"));
        second.setCoordinates(41.9630, 12.7980, GeocodeStatus.MANUAL);

        points.saveAllAndFlush(List.of(third, first, second));
    }

    private String url(String suffix) {
        return "/api/imports/" + batch.getId() + suffix;
    }

    @Test
    void pointsAreListedInFileOrderWithCoordinatesAndRevenuePerEnterprise() throws Exception {
        mvc.perform(get(url("/points")).with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].sourceRow", contains(2, 5, 9)))
                .andExpect(jsonPath("$[0].customerName").value("ACME SRL"))
                .andExpect(jsonPath("$[0].pointName").value("RISTORANTE ACME"))
                .andExpect(jsonPath("$[0].address").value("VIA DEL CORSO 300"))
                .andExpect(jsonPath("$[0].city").value("ROMA"))
                .andExpect(jsonPath("$[0].agent").value("AGENT NORTH"))
                .andExpect(jsonPath("$[0].latitude").value(41.9009))
                .andExpect(jsonPath("$[0].longitude").value(12.4800))
                .andExpect(jsonPath("$[0].geocodeStatus").value("OK"))
                .andExpect(jsonPath("$[0].totalRevenue").value(2080.50))
                .andExpect(jsonPath("$[0].revenues[*].enterpriseId", contains(a.getId().intValue(), b.getId().intValue())))
                .andExpect(jsonPath("$[0].revenues[*].amount", contains(1250.50, 830.00)))
                .andExpect(jsonPath("$[2].latitude").isEmpty());
    }

    @Test
    void pointsCanBeFilteredByGeocodingStatus() throws Exception {
        mvc.perform(get(url("/points")).param("geocodeStatus", "NOT_FOUND").with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].pointName", contains("ENOTECA DEL SOLE")));
    }

    @Test
    void anUnknownGeocodingStatusIsABadRequest() throws Exception {
        mvc.perform(get(url("/points")).param("geocodeStatus", "LOST").with(asTenant(tenantId)))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void summaryCoversTheWholeImport() throws Exception {
        mvc.perform(get(url("/analytics/summary")).with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRevenue").value(2780.50))
                .andExpect(jsonPath("$.pointCount").value(3))
                .andExpect(jsonPath("$.customerCount").value(2))
                .andExpect(jsonPath("$.byEnterprise[*].name", contains("Enterprise A", "Enterprise B")))
                .andExpect(jsonPath("$.byEnterprise[0].color").value("#2563eb"))
                .andExpect(jsonPath("$.byEnterprise[0].revenue").value(1650.50))
                .andExpect(jsonPath("$.byAgent[*].key", contains("AGENT NORTH", "AGENT SOUTH")))
                .andExpect(jsonPath("$.byCity[*].key", contains("ROMA", "TIVOLI")))
                .andExpect(jsonPath("$.topPoints[*].pointName", contains("RISTORANTE ACME", "BAR ACME", "ENOTECA DEL SOLE")))
                .andExpect(jsonPath("$.pareto", hasSize(3)))
                .andExpect(jsonPath("$.pareto[2].revenueShare").value(1.0));
    }

    @Test
    void summaryAppliesCommaSeparatedEnterpriseAndAgentFilters() throws Exception {
        mvc.perform(get(url("/analytics/summary"))
                        .param("enterpriseIds", b.getId().toString())
                        .param("agents", "AGENT NORTH,AGENT SOUTH")
                        .with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRevenue").value(1130.00))
                .andExpect(jsonPath("$.pointCount").value(2))
                .andExpect(jsonPath("$.byEnterprise[*].name", contains("Enterprise B")));

        mvc.perform(get(url("/analytics/summary")).param("agents", "AGENT SOUTH").with(asTenant(tenantId)))
                .andExpect(jsonPath("$.totalRevenue").value(300.00));
    }

    @Test
    void summaryRejectsAnEnterpriseOfAnotherImport() throws Exception {
        long foreign = b.getId() + 1_000;
        mvc.perform(get(url("/analytics/summary")).param("enterpriseIds", Long.toString(foreign)).with(asTenant(tenantId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Enterprise " + foreign + " is not part of this import"));
    }
}
