package it.teamlab.visitwise.imports;

import static it.teamlab.visitwise.imports.XlsxTestFiles.row;
import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static it.teamlab.visitwise.tenant.TenantTestSupport.xsrf;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;

/** Endpoint 2, POST /api/imports/preview (US-02, US-03, US-04, US-05): headers, sample rows, suggested mapping. */
@SpringBootTest
@AutoConfigureMockMvc
class ImportPreviewTest {

    static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ImportBatchRepository imports;

    /** ERP layout with 12 delivery points and a subtotal row: 13 data rows. */
    private static byte[] erpFile() {
        List<Object[]> rows = new ArrayList<>();
        rows.add(row("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", "Agente", "Totale", "ENTERPRISE A",
                "ENTERPRISE B"));
        for (int i = 1; i <= 12; i++) {
            rows.add(row("ACME SRL", "BAR " + i, "VIA DEL CORSO " + i, "ROMA", "AGENT NORTH", 100 + i, 100 + i, "-"));
        }
        rows.add(row("ACME SRL Totale", null, null, null, null, 1278, 1278, 0));
        return XlsxTestFiles.sheet(rows.toArray(Object[][]::new));
    }

    private static MockMultipartHttpServletRequestBuilder preview(MockMultipartFile file) {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/imports/preview");
        request.file(file);
        return request;
    }

    @Test
    void returnsHeadersTenSampleRowsTheRowCountAndTheSuggestedMapping() throws Exception {
        long importsBefore = imports.count();

        mvc.perform(preview(new MockMultipartFile("file", "erp-2025.xlsx", XLSX, erpFile()))
                        .with(asTenant(1L)).with(xsrf()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.fileName").value("erp-2025.xlsx"))
                .andExpect(jsonPath("$.sheetName").value("Sheet1"))
                .andExpect(jsonPath("$.headers", hasSize(8)))
                .andExpect(jsonPath("$.headers[0]").value("Ragione Sociale"))
                .andExpect(jsonPath("$.sampleRows", hasSize(10)))
                .andExpect(jsonPath("$.sampleRows[0]", contains("ACME SRL", "BAR 1", "VIA DEL CORSO 1", "ROMA",
                        "AGENT NORTH", "101", "101", "-")))
                .andExpect(jsonPath("$.totalRows").value(13))
                .andExpect(jsonPath("$.suggestedMapping.customer").value("Ragione Sociale"))
                .andExpect(jsonPath("$.suggestedMapping.deliveryPoint").value("Punto Vendita"))
                .andExpect(jsonPath("$.suggestedMapping.address").value("Indirizzo"))
                .andExpect(jsonPath("$.suggestedMapping.city").value("Comune"))
                .andExpect(jsonPath("$.suggestedMapping.agent").value("Agente"))
                .andExpect(jsonPath("$.suggestedMapping.latitude").value(nullValue()))
                .andExpect(jsonPath("$.suggestedMapping.enterprises[*].sourceColumn",
                        contains("ENTERPRISE A", "ENTERPRISE B")))
                .andExpect(jsonPath("$.suggestedMapping.enterprises[0].name").value("ENTERPRISE A"))
                .andExpect(jsonPath("$.suggestedMapping.enterprises[0].color").value(MappingSuggester.PALETTE.get(0)));

        assertThat(imports.count()).as("the preview saves nothing").isEqualTo(importsBefore);
    }

    @Test
    void onlyTheFileNameIsEchoedNotTheClientPath() throws Exception {
        mvc.perform(preview(new MockMultipartFile("file", "C:\\fakepath\\Sales\\erp 2025.xlsx", XLSX, erpFile()))
                        .with(asTenant(1L)).with(xsrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("erp 2025.xlsx"));
    }

    @Test
    void aFileThatIsNotAnXlsxIsUnprocessable() throws Exception {
        byte[] csv = "Customer;City\nACME;ROMA\n".getBytes(StandardCharsets.UTF_8);

        mvc.perform(preview(new MockMultipartFile("file", "data.xlsx", XLSX, csv)).with(asTenant(1L)).with(xsrf()))
                .andExpect(status().isUnprocessableContent())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("The file is not a valid Excel workbook (.xlsx)"));
    }

    @Test
    void anEmptyFileIsUnprocessable() throws Exception {
        mvc.perform(preview(new MockMultipartFile("file", "empty.xlsx", XLSX, new byte[0]))
                        .with(asTenant(1L)).with(xsrf()))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.detail").value("The file is empty"));
    }

    @Test
    void theFilePartIsRequired() throws Exception {
        mvc.perform(multipart("/api/imports/preview").with(asTenant(1L)).with(xsrf()))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void needsALoginAndTheCsrfToken() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "erp.xlsx", XLSX, erpFile());

        mvc.perform(preview(file).with(xsrf())).andExpect(status().isUnauthorized());
        mvc.perform(preview(file).with(asTenant(1L))).andExpect(status().isForbidden());
    }
}
