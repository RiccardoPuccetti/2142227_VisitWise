package it.teamlab.visitwise.planning.export;

import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.DeliveryPointRepository;
import it.teamlab.visitwise.imports.Enterprise;
import it.teamlab.visitwise.imports.EnterpriseRepository;
import it.teamlab.visitwise.imports.GeocodeStatus;
import it.teamlab.visitwise.imports.ImportBatch;
import it.teamlab.visitwise.imports.ImportBatchRepository;
import it.teamlab.visitwise.planning.PlanningDtos.CreatePlanRequest;
import it.teamlab.visitwise.planning.PlanningDtos.EnterpriseWeight;
import it.teamlab.visitwise.planning.PlanningDtos.GeoPoint;
import it.teamlab.visitwise.planning.PlanningDtos.PlanParameters;
import it.teamlab.visitwise.planning.PlanningDtos.CampaignCode;
import it.teamlab.visitwise.planning.PlanningService;
import it.teamlab.visitwise.planning.engine.PlanningMode;
import it.teamlab.visitwise.tenant.Tenant;
import it.teamlab.visitwise.tenant.TenantRepository;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** Endpoint 18 of API_CONTRACT.md (US-29): Excel export of a saved plan. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PlanExportControllerTest {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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
    private PlanningService planning;

    private Long tenantId;
    private ImportBatch batch;
    private Enterprise enterprise;
    private Long planId;

    @BeforeEach
    void saveAPlanWithTwoAgents() {
        tenantId = tenants.saveAndFlush(new Tenant("Export federation", "export@visitwise.test", "{argon2}hash"))
                .getId();
        batch = imports.saveAndFlush(new ImportBatch(tenantId, "Sample 2026", "sample.xlsx"));
        enterprise = enterprises.saveAndFlush(new Enterprise(batch, "ENTERPRISE A", "Enterprise A", "#2563eb", 0));
        points.saveAllAndFlush(List.of(
                point(2, "RISTORANTE ACME", "VIA DEL CORSO 300", "AGENT NORTH", 41.9009, 12.4800, "1250.50"),
                point(3, "BAR BETA", "VIA NAZIONALE 75", "AGENT NORTH", 41.9020, 12.4900, "600.00"),
                point(4, "CAFFE GAMMA", "VIA APPIA NUOVA 10", "AGENT SOUTH", 41.8800, 12.5100, "900.00")));
        planId = planning.save(batch.getId(), new CreatePlanRequest("Christmas", parameters())).id();
    }

    private DeliveryPoint point(int row, String name, String address, String agent, double latitude,
                                double longitude, String revenue) {
        DeliveryPoint point = new DeliveryPoint(batch, row, "CUSTOMER " + row, name, address, "ROMA", agent);
        point.addRevenue(enterprise, new BigDecimal(revenue));
        point.setCoordinates(latitude, longitude, GeocodeStatus.OK);
        return point;
    }

    private PlanParameters parameters() {
        return new PlanParameters(CampaignCode.CHRISTMAS, LocalDate.of(2026, 11, 2), LocalDate.of(2026, 12, 19), 1,
                List.of(new EnterpriseWeight(enterprise.getId(), 1.0)), List.of(), PlanningMode.PER_AGENT, 210, 480,
                25, 1.3, 80, new GeoPoint(41.8960, 12.4823), 2.0, 0);
    }

    private static Workbook workbook(byte[] content) throws Exception {
        return new XSSFWorkbook(new ByteArrayInputStream(content));
    }

    private static List<String> column(Sheet sheet, int column) {
        List<String> values = new ArrayList<>();
        for (int row = 1; row <= sheet.getLastRowNum(); row++) {
            values.add(sheet.getRow(row).getCell(column).getStringCellValue());
        }
        return values;
    }

    @Test
    void exportsTheSavedPlanWithOneSheetPerAgent() throws Exception {
        byte[] body = mvc.perform(get("/api/plans/" + planId + "/export").with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(XLSX))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"visitwise-plan-" + planId + ".xlsx\""))
                .andReturn().getResponse().getContentAsByteArray();

        try (Workbook workbook = workbook(body)) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(2);
            assertThat(workbook.getSheetName(0)).isEqualTo("AGENT NORTH");
            assertThat(column(workbook.getSheet("AGENT NORTH"), 3)).containsExactly("RISTORANTE ACME", "BAR BETA");
            assertThat(column(workbook.getSheet("AGENT SOUTH"), 3)).containsExactly("CAFFE GAMMA");
        }
    }

    @Test
    void theAgentFilterKeepsOnlyThatAgent() throws Exception {
        byte[] body = mvc.perform(get("/api/plans/" + planId + "/export").param("agent", "AGENT SOUTH")
                        .with(asTenant(tenantId)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"visitwise-plan-" + planId + "-agent-south.xlsx\""))
                .andReturn().getResponse().getContentAsByteArray();

        try (Workbook workbook = workbook(body)) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(1);
            assertThat(workbook.getSheetName(0)).isEqualTo("AGENT SOUTH");
        }
    }

    @Test
    void anAgentWithoutVisitsInThePlanIsNotFound() throws Exception {
        mvc.perform(get("/api/plans/" + planId + "/export").param("agent", "AGENT WEST").with(asTenant(tenantId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Agent AGENT WEST in plan " + planId + " not found"));
    }

    @Test
    void aMissingPlanIsNotFound() throws Exception {
        mvc.perform(get("/api/plans/" + (planId + 1000) + "/export").with(asTenant(tenantId)))
                .andExpect(status().isNotFound());
    }

    @Test
    void anotherTenantCannotExportThePlan() throws Exception {
        Long otherTenant = tenants.saveAndFlush(new Tenant("Other federation", "other@visitwise.test", "{argon2}hash"))
                .getId();

        mvc.perform(get("/api/plans/" + planId + "/export").with(asTenant(otherTenant)))
                .andExpect(status().isNotFound());
    }
}
