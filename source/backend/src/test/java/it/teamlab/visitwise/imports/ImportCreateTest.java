package it.teamlab.visitwise.imports;

import static it.teamlab.visitwise.imports.XlsxTestFiles.row;
import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static it.teamlab.visitwise.tenant.TenantTestSupport.xsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.isA;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import it.teamlab.visitwise.tenant.Tenant;
import it.teamlab.visitwise.tenant.TenantRepository;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

/** Endpoint 3, POST /api/imports (US-02, US-04..US-07): parse with the analyst's mapping and save for the tenant. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ImportCreateTest {

    private static final String REQUEST = """
            {"name": "%s", "mapping": {
              "customer": "Ragione Sociale", "deliveryPoint": "Punto Vendita", "address": "Indirizzo",
              "city": "%s", "agent": "Agente", "latitude": null, "longitude": null,
              "enterprises": %s}}""";
    private static final String ENTERPRISES = """
            [{"sourceColumn": "ENTERPRISE A", "name": " Wine ", "color": "#0072B2"},
             {"sourceColumn": "ENTERPRISE B", "name": "Beer", "color": "#D55E00"},
             {"sourceColumn": "ENTERPRISE C", "name": "Spirits", "color": "#009E73"}]""";

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
        tenant = tenants.saveAndFlush(new Tenant("Import test", UUID.randomUUID() + "@visitwise.test", "{noop}x"));
    }

    /** Two delivery points (one a credit note), a subtotal, an invalid row and the grand total: 5 data rows. */
    private static byte[] erpFile() {
        return XlsxTestFiles.sheet(
                row("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", "Agente", "Totale",
                        "ENTERPRISE A", "ENTERPRISE B", "ENTERPRISE C"),
                row("ACME SRL", "BAR ACME", "VIA DEL CORSO 300", "ROMA", "AGENT NORTH", 1330.5, 1250.5, "-", 80),
                row("ACME SRL", "BAR ACME 2", "VIA NAZIONALE 75", "ROMA", null, -50, -50, "-", "-"),
                row("ACME SRL Totale", null, null, null, null, 1280.5, 1200.5, 0, 80),
                row("BETA SNC", "OSTERIA BETA", "VIA APPIA 10", "TIVOLI", "AGENT SOUTH", 400, "-", 400, "n.d."),
                row("Totale complessivo", null, null, null, null, 1680.5, 1200.5, 400, 80));
    }

    private static String request(String name, String city, String enterprises) {
        return REQUEST.formatted(name, city, enterprises);
    }

    private static MockMultipartHttpServletRequestBuilder create(byte[] file, String requestJson) {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/imports");
        request.file(new MockMultipartFile("file", "erp-2025.xlsx", ImportPreviewTest.XLSX, file));
        request.file(new MockMultipartFile("request", "", MediaType.APPLICATION_JSON_VALUE,
                requestJson.getBytes(StandardCharsets.UTF_8)));
        return request;
    }

    private void flushAndClear() {
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void savesTheImportForTheTenantAndReportsImportedAndSkippedRows() throws Exception {
        String body = mvc.perform(create(erpFile(), request("  Sample 2025 - full year ", "Comune", ENTERPRISES))
                        .with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.matchesPattern("/api/imports/\\d+")))
                .andExpect(jsonPath("$.id", isA(Number.class)))
                .andExpect(jsonPath("$.name").value("Sample 2025 - full year"))
                .andExpect(jsonPath("$.sourceFileName").value("erp-2025.xlsx"))
                .andExpect(jsonPath("$.createdAt", notNullValue()))
                .andExpect(jsonPath("$.status").value("GEOCODING"))
                .andExpect(jsonPath("$.totalRows").value(5))
                .andExpect(jsonPath("$.importedRows").value(2))
                .andExpect(jsonPath("$.skippedRows").value(3))
                .andExpect(jsonPath("$.geocodedRows").value(0))
                .andExpect(jsonPath("$.enterprises[*].name", contains("Wine", "Beer", "Spirits")))
                .andExpect(jsonPath("$.enterprises[*].sourceColumn",
                        contains("ENTERPRISE A", "ENTERPRISE B", "ENTERPRISE C")))
                .andExpect(jsonPath("$.enterprises[*].color", contains("#0072B2", "#D55E00", "#009E73")))
                .andExpect(jsonPath("$.enterprises[*].id", everyItem(isA(Number.class))))
                .andReturn().getResponse().getContentAsString();
        long importId = ((Number) JsonPath.read(body, "$.id")).longValue();
        flushAndClear();

        ImportBatch batch = imports.findById(importId).orElseThrow();
        assertThat(batch.getTenantId()).isEqualTo(tenant.getId());
        assertThat(batch.getColumnMapping()).contains("\"customer\":\"Ragione Sociale\"");
        assertThat(enterprises.findByImportBatchIdOrderByPosition(importId))
                .extracting(Enterprise::getName, Enterprise::getPosition)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("Wine", 0),
                        org.assertj.core.groups.Tuple.tuple("Beer", 1),
                        org.assertj.core.groups.Tuple.tuple("Spirits", 2));

        List<DeliveryPoint> saved = new ArrayList<>(points.findByImportBatchId(importId));
        saved.sort(Comparator.comparingInt(DeliveryPoint::getSourceRow));
        assertThat(saved).extracting(DeliveryPoint::getSourceRow).containsExactly(2, 3);

        DeliveryPoint bar = saved.get(0);
        assertThat(bar.getCustomerName()).isEqualTo("ACME SRL");
        assertThat(bar.getPointName()).isEqualTo("BAR ACME");
        assertThat(bar.getAddress()).isEqualTo("VIA DEL CORSO 300");
        assertThat(bar.getCity()).isEqualTo("ROMA");
        assertThat(bar.getAgent()).isEqualTo("AGENT NORTH");
        assertThat(bar.getGeocodeStatus()).isEqualTo(GeocodeStatus.PENDING);
        assertThat(bar.getTotalRevenue()).isEqualByComparingTo("1330.50");
        assertThat(revenues(bar)).as("only non-zero amounts are stored")
                .containsOnly(Map.entry("Wine", new BigDecimal("1250.50")), Map.entry("Spirits", new BigDecimal("80.00")));

        DeliveryPoint creditNote = saved.get(1);
        assertThat(creditNote.getAgent()).isNull();
        assertThat(creditNote.getTotalRevenue()).isEqualByComparingTo("-50.00");
        assertThat(revenues(creditNote)).containsOnly(Map.entry("Wine", new BigDecimal("-50.00")));
    }

    private static Map<String, BigDecimal> revenues(DeliveryPoint point) {
        return point.getRevenues().stream()
                .collect(Collectors.toMap(revenue -> revenue.getEnterprise().getName(), Revenue::getAmount));
    }

    @Test
    void coordinatesInTheFileAreKeptAndCountAsGeocoded() throws Exception {
        byte[] file = XlsxTestFiles.sheet(
                row("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", "Lat", "Lon", "ENTERPRISE A"),
                row("ACME SRL", "BAR ACME", "VIA DEL CORSO 300", "ROMA", 41.9031, 12.4794, 100),
                row("ACME SRL", "BAR ACME 2", "VIA NAZIONALE 75", "ROMA", null, null, 100));
        String json = """
                {"name": "With coordinates", "mapping": {"customer": "Ragione Sociale", "deliveryPoint": "Punto Vendita",
                 "address": "Indirizzo", "city": "Comune", "agent": null, "latitude": "Lat", "longitude": "Lon",
                 "enterprises": [{"sourceColumn": "ENTERPRISE A", "name": "Wine", "color": "#0072B2"}]}}""";

        String body = mvc.perform(create(file, json).with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.importedRows").value(2))
                .andExpect(jsonPath("$.geocodedRows").value(1))
                .andReturn().getResponse().getContentAsString();
        long importId = ((Number) JsonPath.read(body, "$.id")).longValue();
        flushAndClear();

        assertThat(points.findByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.FROM_FILE))
                .singleElement().satisfies(point -> {
                    assertThat(point.getLatitude()).isEqualTo(41.9031);
                    assertThat(point.getLongitude()).isEqualTo(12.4794);
                });
        assertThat(points.findByImportBatchIdAndGeocodeStatus(importId, GeocodeStatus.PENDING)).hasSize(1);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "''|Comune|name: must not be blank",
            "Comune|''|mapping.city: must not be blank",
            "Sample|Città|mapping.city: column 'Città' is not in the file",
    })
    void invalidRequestsAreRejectedAndNothingIsSaved(String name, String city, String detail) throws Exception {
        long before = imports.count();

        mvc.perform(create(erpFile(), request(name, city, ENTERPRISES)).with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value(detail));

        assertThat(imports.count()).isEqualTo(before);
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "[]|mapping.enterprises: must not be empty",
            "[{\"sourceColumn\": \"ENTERPRISE A\", \"name\": \"Wine\", \"color\": \"blue\"}]"
                    + "|mapping.enterprises[0].color: must be a color like #0072B2",
            "[{\"sourceColumn\": \"ENTERPRISE A\", \"name\": \"  \", \"color\": \"#0072B2\"}]"
                    + "|mapping.enterprises[0].name: must not be blank",
            "[{\"sourceColumn\": \"ENTERPRISE A\", \"name\": \"Wine\", \"color\": \"#FFFF00\"}]"
                    + "|mapping.enterprises[0].color: #FFFF00 is too light to be seen on the map "
                    + "(it needs at least 3:1 contrast on white)",
    })
    void invalidEnterprisesAreRejected(String enterprisesJson, String detail) throws Exception {
        mvc.perform(create(erpFile(), request("Sample", "Comune", enterprisesJson))
                        .with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(detail));
    }

    @Test
    void theNameIsAtMost150Characters() throws Exception {
        mvc.perform(create(erpFile(), request("N".repeat(151), "Comune", ENTERPRISES))
                        .with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("name: size must be between 0 and 150"));
    }

    @Test
    void aFileWithNoImportableRowIsUnprocessableAndNothingIsSaved() throws Exception {
        byte[] onlyTotals = XlsxTestFiles.sheet(
                row("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", "Agente", "ENTERPRISE A",
                        "ENTERPRISE B", "ENTERPRISE C"),
                row("Totale complessivo", null, null, null, null, 100, 200, 300));
        long before = imports.count();

        mvc.perform(create(onlyTotals, request("Sample", "Comune", ENTERPRISES))
                        .with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value(
                        "No row of the file can be imported: check that the columns are mapped to the right fields"));

        assertThat(imports.count()).isEqualTo(before);
    }

    @Test
    void aFileThatIsNotAnXlsxIsUnprocessable() throws Exception {
        mvc.perform(create("not a workbook".getBytes(StandardCharsets.UTF_8), request("Sample", "Comune", ENTERPRISES))
                        .with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isUnprocessableContent());
    }

    @Test
    void theRequestPartIsRequired() throws Exception {
        MockMultipartHttpServletRequestBuilder onlyFile = multipart("/api/imports");
        onlyFile.file(new MockMultipartFile("file", "erp.xlsx", ImportPreviewTest.XLSX, erpFile()));

        mvc.perform(onlyFile.with(asTenant(tenant.getId())).with(xsrf())).andExpect(status().isBadRequest());
    }

    @Test
    void needsALoginAndTheCsrfToken() throws Exception {
        String json = request("Sample", "Comune", ENTERPRISES);

        mvc.perform(create(erpFile(), json).with(xsrf())).andExpect(status().isUnauthorized());
        mvc.perform(create(erpFile(), json).with(asTenant(tenant.getId()))).andExpect(status().isForbidden());
    }

    /** US-02: 5,000 rows parsed (and saved) in less than 5 seconds. */
    @Test
    void fiveThousandRowsTakeLessThanFiveSeconds() throws Exception {
        List<Object[]> rows = new ArrayList<>();
        rows.add(row("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", "Agente", "ENTERPRISE A",
                "ENTERPRISE B", "ENTERPRISE C"));
        for (int i = 1; i <= 5_000; i++) {
            rows.add(row("CUSTOMER " + i, "POINT " + i, "VIA ROMA " + i, "ROMA", "AGENT " + (i % 4),
                    100.5 + i, i % 2 == 0 ? "-" : 20, i % 3 == 0 ? -10 : 30));
        }
        byte[] file = XlsxTestFiles.sheet(rows.toArray(Object[][]::new));

        long start = System.nanoTime();
        mvc.perform(create(file, request("Big", "Comune", ENTERPRISES)).with(asTenant(tenant.getId())).with(xsrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.importedRows").value(5_000));
        flushAndClear();
        long millis = (System.nanoTime() - start) / 1_000_000;

        assertThat(millis).as("import of 5,000 rows, in ms").isLessThan(5_000);
    }
}
