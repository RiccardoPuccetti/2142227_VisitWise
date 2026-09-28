package it.teamlab.visitwise.imports;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Suggested column mapping from IT/EN header synonyms and numeric columns (API_CONTRACT.md; US-04, US-05). */
class MappingSuggesterTest {

    private final MappingSuggester suggester = new MappingSuggester();

    /** Headers + rows given as arrays of cells, one array per row. */
    private static ParsedSheet sheet(List<String> headers, String[]... rows) {
        List<SheetRow> sheetRows = new ArrayList<>();
        for (int i = 0; i < rows.length; i++) {
            sheetRows.add(new SheetRow(i + 2, Arrays.asList(rows[i])));
        }
        return new ParsedSheet("Sheet1", headers, sheetRows);
    }

    @Test
    void italianErpLayout() {
        ParsedSheet erp = sheet(
                List.of("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", "Agente", "Totale",
                        "ENTERPRISE A", "ENTERPRISE B", "ENTERPRISE C"),
                new String[] {"ACME SRL (10001)", "RISTORANTE ACME", "VIA DEL CORSO 300", "ROMA", "AGENT NORTH",
                        "2080.5", "1250.5", "-", "830"},
                new String[] {"ACME SRL (10001) Totale", "", "", "", "", "2080.5", "1250.5", "0", "830"});

        ColumnMapping mapping = suggester.suggest(erp);

        assertThat(mapping.customer()).isEqualTo("Ragione Sociale");
        assertThat(mapping.deliveryPoint()).isEqualTo("Punto Vendita");
        assertThat(mapping.address()).isEqualTo("Indirizzo");
        assertThat(mapping.city()).isEqualTo("Comune");
        assertThat(mapping.agent()).isEqualTo("Agente");
        assertThat(mapping.latitude()).isNull();
        assertThat(mapping.longitude()).isNull();
        assertThat(mapping.enterprises()).containsExactly(
                new EnterpriseMapping("ENTERPRISE A", "ENTERPRISE A", MappingSuggester.PALETTE.get(0)),
                new EnterpriseMapping("ENTERPRISE B", "ENTERPRISE B", MappingSuggester.PALETTE.get(1)),
                new EnterpriseMapping("ENTERPRISE C", "ENTERPRISE C", MappingSuggester.PALETTE.get(2)));
    }

    @Test
    void englishHeadersInAnotherOrder() {
        ParsedSheet shuffled = sheet(
                List.of("ENTERPRISE C", "City", "Sales Agent", "Customer", "Delivery Address", "ENTERPRISE A",
                        "Point of Sale", "ENTERPRISE B"),
                new String[] {"-", "ROMA", "AGENT SOUTH", "ACME SRL", "VIA DEL CORSO 300", "-104.66", "BAR ACME", "-"},
                new String[] {"1209.93", "ROMA", "AGENT EAST", "BETA SNC", "VIA NAZIONALE 75", "-", "BAR BETA",
                        "17316.81"});

        ColumnMapping mapping = suggester.suggest(shuffled);

        assertThat(mapping.customer()).isEqualTo("Customer");
        assertThat(mapping.deliveryPoint()).isEqualTo("Point of Sale");
        assertThat(mapping.address()).isEqualTo("Delivery Address");
        assertThat(mapping.city()).isEqualTo("City");
        assertThat(mapping.agent()).isEqualTo("Sales Agent");
        assertThat(mapping.enterprises()).extracting(EnterpriseMapping::sourceColumn)
                .containsExactly("ENTERPRISE C", "ENTERPRISE A", "ENTERPRISE B");
    }

    @Test
    void synonymsIgnoreCaseAccentsAndPunctuation() {
        ColumnMapping mapping = suggester.suggest(sheet(List.of("RAG. SOC.", "CITTÀ", "INDIRIZZO", "Località")));

        assertThat(mapping.customer()).isEqualTo("RAG. SOC.");
        assertThat(mapping.city()).isEqualTo("CITTÀ");
        assertThat(mapping.address()).isEqualTo("INDIRIZZO");
    }

    @Test
    void theMostSpecificHeaderWinsWhateverTheColumnOrder() {
        ColumnMapping mapping = suggester.suggest(
                sheet(List.of("Codice Cliente", "Cliente di consegna", "Cliente", "Indirizzo di consegna")));

        assertThat(mapping.deliveryPoint()).isEqualTo("Cliente di consegna");
        assertThat(mapping.customer()).isEqualTo("Cliente");
        assertThat(mapping.address()).isEqualTo("Indirizzo di consegna");
    }

    @Test
    void aHeaderIsUsedForOneFieldOnly() {
        ColumnMapping mapping = suggester.suggest(sheet(List.of("Cliente")));

        assertThat(mapping.customer()).isEqualTo("Cliente");
        assertThat(mapping.deliveryPoint()).isNull();
    }

    @Test
    void missingFieldsStayEmpty() {
        ColumnMapping mapping = suggester.suggest(sheet(List.of("Foo", "Bar")));

        assertThat(mapping.customer()).isNull();
        assertThat(mapping.deliveryPoint()).isNull();
        assertThat(mapping.address()).isNull();
        assertThat(mapping.city()).isNull();
        assertThat(mapping.agent()).isNull();
        assertThat(mapping.enterprises()).isEmpty();
    }

    @Test
    void coordinatesAreMappedAndNotTakenForEnterprises() {
        ColumnMapping mapping = suggester.suggest(sheet(List.of("Lat", "Lng", "Revenue"),
                new String[] {"41.9", "12.5", "100"}));

        assertThat(mapping.latitude()).isEqualTo("Lat");
        assertThat(mapping.longitude()).isEqualTo("Lng");
        assertThat(mapping.enterprises()).extracting(EnterpriseMapping::sourceColumn).containsExactly("Revenue");
    }

    @Test
    void enterprisesAreTheNumericColumnsWithAtLeastOneAmountAndNoTotals() {
        ParsedSheet sheet = sheet(
                List.of("Text", "Mixed", "Only dashes", "Totale", "TOTALI", "Total revenue", "Sales 2025", "Credit"),
                new String[] {"abc", "10", "-", "10", "10", "10", "1.250,50", ""},
                new String[] {"def", "n.d.", "", "20", "20", "20", "-", "-50"});

        assertThat(suggester.suggest(sheet).enterprises()).extracting(EnterpriseMapping::sourceColumn)
                .containsExactly("Sales 2025", "Credit");
    }

    @Test
    void enterpriseNamesFitTheColumnAndColorsCycleThroughThePalette() {
        List<String> headers = new ArrayList<>();
        String[] row = new String[MappingSuggester.PALETTE.size() + 1];
        for (int i = 0; i < row.length; i++) {
            headers.add(i == 0 ? "E".repeat(120) : "E" + i);
            row[i] = "1";
        }

        List<EnterpriseMapping> enterprises = suggester.suggest(sheet(headers, row)).enterprises();

        assertThat(enterprises.get(0).sourceColumn()).hasSize(120);
        assertThat(enterprises.get(0).name()).hasSize(100);
        assertThat(enterprises).extracting(EnterpriseMapping::color).startsWith(MappingSuggester.PALETTE.toArray(String[]::new));
        assertThat(enterprises.get(row.length - 1).color()).isEqualTo(MappingSuggester.PALETTE.get(0));
    }

    /** US-05: markers must stay visible on the (mostly white) map: WCAG 1.4.11 asks 3:1 for graphics. */
    @Test
    void paletteColorsAreDistinctAndHaveAtLeast3To1ContrastOnWhite() {
        assertThat(MappingSuggester.PALETTE).doesNotHaveDuplicates().allSatisfy(color -> {
            assertThat(color).matches("#[0-9A-F]{6}");
            assertThat(contrastOnWhite(color)).isGreaterThanOrEqualTo(3.0);
        });
    }

    private static double contrastOnWhite(String hex) {
        double[] channels = new double[3];
        for (int i = 0; i < 3; i++) {
            double c = Integer.parseInt(hex.substring(1 + 2 * i, 3 + 2 * i), 16) / 255.0;
            channels[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        }
        double luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
        return 1.05 / (luminance + 0.05);
    }
}
