package it.teamlab.visitwise.imports;

import static it.teamlab.visitwise.tenant.TenantTestSupport.asTenant;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Endpoint 1, GET /api/imports/template (US-01). */
@SpringBootTest
@AutoConfigureMockMvc
class ImportTemplateTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void downloadsTheTemplateAsAnXlsxAttachment() throws Exception {
        byte[] file = mvc.perform(get("/api/imports/template").with(asTenant(1L)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(ImportPreviewTest.XLSX))
                .andExpect(header().string("Content-Disposition",
                        "attachment; filename=\"visitwise-import-template.xlsx\""))
                .andReturn().getResponse().getContentAsByteArray();

        // The wizard must recognize its own template: every field is suggested from the template headers.
        ColumnMapping mapping = new MappingSuggester()
                .suggest(new ExcelSheetReader(20_000, 200).read(new ByteArrayInputStream(file)));
        assertThat(mapping.customer()).isEqualTo("Customer");
        assertThat(mapping.deliveryPoint()).isEqualTo("Delivery Point");
        assertThat(mapping.address()).isEqualTo("Address");
        assertThat(mapping.city()).isEqualTo("City");
        assertThat(mapping.agent()).isEqualTo("Agent");
        assertThat(mapping.latitude()).isEqualTo("Latitude");
        assertThat(mapping.longitude()).isEqualTo("Longitude");
        assertThat(mapping.enterprises()).extracting(EnterpriseMapping::sourceColumn)
                .containsExactly("Enterprise A", "Enterprise B", "Enterprise C");
    }

    @Test
    void needsALogin() throws Exception {
        mvc.perform(get("/api/imports/template")).andExpect(status().isUnauthorized());
    }
}
