package it.teamlab.visitwise.planning;

import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static it.teamlab.visitwise.tenant.TenantTestSupport.xsrf;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.DeliveryPointRepository;
import it.teamlab.visitwise.imports.Enterprise;
import it.teamlab.visitwise.imports.EnterpriseRepository;
import it.teamlab.visitwise.imports.GeocodeStatus;
import it.teamlab.visitwise.imports.ImportBatch;
import it.teamlab.visitwise.imports.ImportBatchRepository;
import it.teamlab.visitwise.planning.engine.GeoPoint;
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

/** MAR-3 endpoints 11-17 from API_CONTRACT.md. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlanningControllerTest {

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
    private Enterprise enterprise;

    @BeforeEach
    void createPlanningData() {
        tenantId = tenants.saveAndFlush(new Tenant("Planning federation", "planning@visitwise.test", "{argon2}hash"))
                .getId();
        batch = imports.saveAndFlush(new ImportBatch(tenantId, "Sample 2026", "sample.xlsx"));
        enterprise = enterprises.saveAndFlush(
                new Enterprise(batch, "ENTERPRISE A", "Enterprise A", "#2563eb", 0));

        DeliveryPoint first = point(2, "ACME SRL", "RISTORANTE ACME", "VIA DEL CORSO 300", 41.9009, 12.4800,
                "1250.50");
        DeliveryPoint second = point(3, "BETA SRL", "BAR BETA", "VIA NAZIONALE 75", 41.9020, 12.4900,
                "600.00");
        points.saveAllAndFlush(java.util.List.of(first, second));
    }

    private DeliveryPoint point(int row, String customer, String name, String address, double latitude,
                                double longitude, String revenue) {
        DeliveryPoint point = new DeliveryPoint(batch, row, customer, name, address, "ROMA", "AGENT NORTH");
        point.addRevenue(enterprise, new BigDecimal(revenue));
        point.setCoordinates(latitude, longitude, GeocodeStatus.OK);
        return point;
    }

    private String parameters(int workingDays) {
        return """
                {
                  "campaign":"CHRISTMAS",
                  "startDate":"2026-11-02",
                  "deadline":"2026-12-19",
                  "workingDays":%d,
                  "enterpriseWeights":[{"enterpriseId":%d,"weight":1.0}],
                  "agents":[],
                  "planningMode":"PER_AGENT",
                  "visitDurationMinutes":210,
                  "workdayMinutes":480,
                  "averageSpeedKmh":25,
                  "roadFactor":1.3,
                  "maxDistanceKm":80,
                  "base":{"latitude":41.8960,"longitude":12.4823},
                  "travelCostPerKm":2.0,
                  "minRevenue":0
                }
                """.formatted(workingDays, enterprise.getId());
    }

    private String importUrl(String suffix) {
        return "/api/imports/" + batch.getId() + suffix;
    }

    @Test
    void campaignsAreComputedForTheRequestedYear() throws Exception {
        mvc.perform(get("/api/planning/campaigns").param("year", "2026").with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", contains("CHRISTMAS", "EASTER", "END_OF_SUMMER")))
                .andExpect(jsonPath("$[0].startDate").value("2026-11-01"))
                .andExpect(jsonPath("$[0].workingDays").isNumber());
    }

    @Test
    void simulationReturnsAnUnsavedPlanWithRoutesAndKpis() throws Exception {
        mvc.perform(post(importUrl("/plans/simulate"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(parameters(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isEmpty())
                .andExpect(jsonPath("$.name").isEmpty())
                .andExpect(jsonPath("$.kpis.plannedVisits").value(2))
                .andExpect(jsonPath("$.kpis.coveredRevenue").value(1850.50))
                .andExpect(jsonPath("$.days", hasSize(1)))
                .andExpect(jsonPath("$.days[0].visits[*].pointName", contains("RISTORANTE ACME", "BAR BETA")))
                .andExpect(jsonPath("$.kpis.travelSource").value("ESTIMATE"))
                .andExpect(jsonPath("$.warnings", hasSize(0)));
    }

    @Test
    void theRangeWarningWritesTheDistanceLikeTheInterface() throws Exception {
        // Both points are about 0.75 and 1.2 km from the base by the road estimate.
        mvc.perform(post(importUrl("/plans/simulate"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(parameters(1).replace("\"maxDistanceKm\":80", "\"maxDistanceKm\":0.5")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.warnings[0]")
                        .value("2 delivery points are farther than 0,5 km from the base and were excluded"));

        mvc.perform(post(importUrl("/plans/simulate"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(parameters(1).replace("\"maxDistanceKm\":80", "\"maxDistanceKm\":1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.warnings[0]")
                        .value("1 delivery points are farther than 1 km from the base and were excluded"));
    }

    @Test
    void simulationUsesRoadDistancesAndTimesWhenTheRoadNetworkAnswers() throws Exception {
        FakeRoadMatrixProvider.answerEveryPair(10, 15);
        try {
            mvc.perform(post(importUrl("/plans/simulate"))
                            .with(asTenant(tenantId)).with(xsrf())
                            .contentType(MediaType.APPLICATION_JSON).content(parameters(1)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.kpis.travelSource").value("OSRM"))
                    .andExpect(jsonPath("$.kpis.plannedVisits").value(2))
                    .andExpect(jsonPath("$.kpis.totalKm").value(30.0))
                    .andExpect(jsonPath("$.kpis.travelHours").value(0.75))
                    .andExpect(jsonPath("$.days[0].km").value(30.0))
                    .andExpect(jsonPath("$.days[0].visits[*].travelKm", contains(10.0, 10.0)));
            // One table for the base and the located points of the import, base first.
            org.assertj.core.api.Assertions.assertThat(FakeRoadMatrixProvider.lastPoints()).containsExactly(
                    new GeoPoint(41.8960, 12.4823), new GeoPoint(41.9009, 12.4800), new GeoPoint(41.9020, 12.4900));
        } finally {
            FakeRoadMatrixProvider.reset();
        }
    }

    private static final String ROUTE_REQUEST = """
            {"base":{"latitude":41.8960,"longitude":12.4823},
             "stops":[{"latitude":41.9009,"longitude":12.4800},{"latitude":41.9020,"longitude":12.4900}],
             "averageSpeedKmh":25,"roadFactor":1.3}
            """;

    @Test
    void dayRouteUsesTheRoadProviderWhenItAnswers() throws Exception {
        FakeRouteProvider.answer(new RoutedPath(3.2, 9.5,
                List.of(new RoutedPath.Leg(1, 3), new RoutedPath.Leg(1.2, 3.5), new RoutedPath.Leg(1, 3)),
                List.of(new GeoPoint(41.896, 12.4823), new GeoPoint(41.9, 12.485), new GeoPoint(41.896, 12.4823))));
        try {
            mvc.perform(post(importUrl("/plans/route"))
                            .with(asTenant(tenantId)).with(xsrf())
                            .contentType(MediaType.APPLICATION_JSON).content(ROUTE_REQUEST))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.source").value("OSRM"))
                    .andExpect(jsonPath("$.km").value(3.2))
                    .andExpect(jsonPath("$.minutes").value(9.5))
                    .andExpect(jsonPath("$.legs", hasSize(3)))
                    .andExpect(jsonPath("$.geometry", hasSize(3)));
            // The provider is asked for the round trip: base, stops, base.
            org.assertj.core.api.Assertions.assertThat(FakeRouteProvider.lastStops()).hasSize(4);
        } finally {
            FakeRouteProvider.reset();
        }
    }

    @Test
    void dayRouteFallsBackToTheStraightLineEstimate() throws Exception {
        FakeRouteProvider.reset();
        mvc.perform(post(importUrl("/plans/route"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(ROUTE_REQUEST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("ESTIMATE"))
                .andExpect(jsonPath("$.legs", hasSize(3)))
                .andExpect(jsonPath("$.geometry", hasSize(4)))
                .andExpect(jsonPath("$.geometry[0].latitude").value(41.8960))
                .andExpect(jsonPath("$.geometry[3].latitude").value(41.8960));
    }

    @Test
    void dayRouteWithoutStopsIsABadRequest() throws Exception {
        mvc.perform(post(importUrl("/plans/route"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"base\":{\"latitude\":41.9,\"longitude\":12.5},\"stops\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void whatIfSortsHorizonsAndReportsMarginalRevenue() throws Exception {
        String request = "{\"base\":" + parameters(1) + ",\"horizons\":[2,1]}";

        mvc.perform(post(importUrl("/plans/what-if"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[*].workingDays", contains(1, 2)))
                .andExpect(jsonPath("$.rows[0].marginalRevenue").value(1850.50))
                .andExpect(jsonPath("$.rows[1].marginalRevenue").value(0.0));
    }

    @Test
    void whatIfRejectsAMissingHorizon() throws Exception {
        String request = "{\"base\":" + parameters(1) + ",\"horizons\":[2,null]}";

        mvc.perform(post(importUrl("/plans/what-if"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isBadRequest());
    }

    @Test
    void aScenarioCanBeSavedListedReadAndDeleted() throws Exception {
        String request = "{\"name\":\"Christmas priority\",\"parameters\":" + parameters(1) + "}";

        String saved = mvc.perform(post(importUrl("/plans"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Christmas priority"))
                .andReturn().getResponse().getContentAsString();
        long planId = new tools.jackson.databind.ObjectMapper().readTree(saved).get("id").asLong();

        mvc.perform(get(importUrl("/plans")).with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(planId))
                .andExpect(jsonPath("$[0].parameters.workingDays").value(1));

        mvc.perform(get("/api/plans/" + planId).with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(planId))
                .andExpect(jsonPath("$.days[0].visits", hasSize(2)));

        mvc.perform(delete("/api/plans/" + planId).with(asTenant(tenantId)).with(xsrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/plans/" + planId).with(asTenant(tenantId)))
                .andExpect(status().isNotFound());
    }

    @Test
    void invalidParametersAndForeignEnterpriseIdsAreRejected() throws Exception {
        mvc.perform(post(importUrl("/plans/simulate"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(parameters(0)))
                .andExpect(status().isBadRequest());

        String foreignEnterprise = parameters(1).replace(enterprise.getId().toString(), "999999");
        mvc.perform(post(importUrl("/plans/simulate"))
                        .with(asTenant(tenantId)).with(xsrf())
                        .contentType(MediaType.APPLICATION_JSON).content(foreignEnterprise))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Enterprise 999999 is not part of this import"));
    }
}
