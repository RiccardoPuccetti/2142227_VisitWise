package it.teamlab.visitwise.imports;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Rows of the file -> delivery points, or skipped (API_CONTRACT.md parsing rules; US-04, US-07). */
class ImportRowParserTest {

    private static final List<String> HEADERS = List.of("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune",
            "Agente", "Totale", "ENTERPRISE A", "ENTERPRISE B", "Lat", "Lon");

    private static final ColumnMapping MAPPING = new ColumnMapping("Ragione Sociale", "Punto Vendita", "Indirizzo",
            "Comune", "Agente", null, null, List.of(
                    new EnterpriseMapping("ENTERPRISE A", "Wine", "#0072B2"),
                    new EnterpriseMapping("ENTERPRISE B", "Beer", "#D55E00")));

    private static ParsedSheet sheet(String[]... rows) {
        List<SheetRow> sheetRows = new ArrayList<>();
        for (int i = 0; i < rows.length; i++) {
            sheetRows.add(new SheetRow(i + 2, Arrays.asList(rows[i])));
        }
        return new ParsedSheet("Sheet1", HEADERS, sheetRows);
    }

    private static String[] point(String name, String a, String b) {
        return new String[] {"ACME SRL", name, "VIA DEL CORSO 1", "ROMA", "AGENT NORTH", "", a, b, "", ""};
    }

    private static ColumnMapping withCoordinates(String latitude, String longitude) {
        return new ColumnMapping(MAPPING.customer(), MAPPING.deliveryPoint(), MAPPING.address(), MAPPING.city(),
                MAPPING.agent(), latitude, longitude, MAPPING.enterprises());
    }

    private static BigDecimal eur(String amount) {
        return new BigDecimal(amount);
    }

    // ---------- rows

    @Test
    void readsTheMappedColumnsWhateverTheirPosition() {
        ParsedRows parsed = ImportRowParser.parse(sheet(point("BAR ACME", "1.250,50", "-")), MAPPING);

        assertThat(parsed.skipped()).isZero();
        assertThat(parsed.rows()).singleElement().satisfies(row -> {
            assertThat(row.sourceRow()).isEqualTo(2);
            assertThat(row.customer()).isEqualTo("ACME SRL");
            assertThat(row.deliveryPoint()).isEqualTo("BAR ACME");
            assertThat(row.address()).isEqualTo("VIA DEL CORSO 1");
            assertThat(row.city()).isEqualTo("ROMA");
            assertThat(row.agent()).isEqualTo("AGENT NORTH");
            assertThat(row.latitude()).isNull();
            assertThat(row.longitude()).isNull();
            assertThat(row.amounts()).containsExactly(eur("1250.50"), eur("0.00"));
        });
    }

    @Test
    void subtotalAndGrandTotalRowsAreSkippedBecauseARequiredFieldIsEmpty() {
        ParsedRows parsed = ImportRowParser.parse(sheet(
                point("BAR ACME", "100", "-20.5"),
                new String[] {"ACME SRL Totale", "", "", "", "", "79.5", "100", "-20.5", "", ""},
                new String[] {"Totale complessivo", "", "", "", "", "79.5", "100", "-20.5", "", ""}), MAPPING);

        assertThat(parsed.rows()).extracting(ImportRow::sourceRow).containsExactly(2);
        assertThat(parsed.rows().get(0).amounts()).containsExactly(eur("100.00"), eur("-20.50"));
        assertThat(parsed.skipped()).isEqualTo(2);
    }

    @Test
    void rowsWithAnInvalidAmountOrATooLongValueAreSkipped() {
        String[] tooLongCity = point("BAR 3", "1", "1");
        tooLongCity[3] = "R".repeat(121);
        String[] tooLongAgent = point("BAR 4", "1", "1");
        tooLongAgent[4] = "A".repeat(121);

        ParsedRows parsed = ImportRowParser.parse(sheet(
                point("BAR 1", "n.d.", "1"), point("BAR 2", "1", "1"), tooLongCity, tooLongAgent), MAPPING);

        assertThat(parsed.rows()).extracting(ImportRow::deliveryPoint).containsExactly("BAR 2");
        assertThat(parsed.skipped()).isEqualTo(3);
    }

    @Test
    void aBlankAgentIsNoAgent() {
        String[] row = point("BAR ACME", "1", "1");
        row[4] = "";

        assertThat(ImportRowParser.parse(sheet(row), MAPPING).rows().get(0).agent()).isNull();
    }

    @Test
    void validCoordinatesFromTheFileAreKeptAndInvalidOnesLeftForGeocoding() {
        String[] valid = point("VALID", "1", "1");
        valid[8] = "41,9031";
        valid[9] = "12.4794";
        String[] outOfRange = point("OUT OF RANGE", "1", "1");
        outOfRange[8] = "95";
        outOfRange[9] = "12";
        String[] zero = point("ZERO", "1", "1");
        zero[8] = "0";
        zero[9] = "0";
        String[] onlyOne = point("ONLY ONE", "1", "1");
        onlyOne[8] = "41.9";
        String[] text = point("TEXT", "1", "1");
        text[8] = "north";
        text[9] = "east";

        List<ImportRow> rows = ImportRowParser.parse(sheet(valid, outOfRange, zero, onlyOne, text),
                withCoordinates("Lat", "Lon")).rows();

        assertThat(rows.get(0).latitude()).isEqualTo(41.9031);
        assertThat(rows.get(0).longitude()).isEqualTo(12.4794);
        assertThat(rows.subList(1, rows.size())).allSatisfy(row -> {
            assertThat(row.latitude()).isNull();
            assertThat(row.longitude()).isNull();
        });
    }

    // ---------- mapping against the file

    @Test
    void theSuggestedMappingOfTheFileIsAccepted() {
        ImportRowParser.checkMapping(HEADERS, MAPPING);
        ImportRowParser.checkMapping(HEADERS, withCoordinates("Lat", "Lon"));
    }

    @Test
    void everyMappedColumnMustBeInTheFile() {
        ColumnMapping missingCity = new ColumnMapping("Ragione Sociale", "Punto Vendita", "Indirizzo", "Città",
                null, null, null, MAPPING.enterprises());
        ColumnMapping missingEnterprise = new ColumnMapping("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune",
                null, null, null, List.of(MAPPING.enterprises().get(0), new EnterpriseMapping("ENTERPRISE Z", "Z", "#0072B2")));

        assertThatThrownBy(() -> ImportRowParser.checkMapping(HEADERS, missingCity))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("mapping.city: column 'Città' is not in the file");
        assertThatThrownBy(() -> ImportRowParser.checkMapping(HEADERS, missingEnterprise))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("mapping.enterprises[1].sourceColumn: column 'ENTERPRISE Z' is not in the file");
    }

    @Test
    void anEnterpriseColumnCannotBeAFieldOrAnotherEnterprise() {
        ColumnMapping fieldAsEnterprise = new ColumnMapping("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune",
                "Agente", null, null, List.of(new EnterpriseMapping("Agente", "Agents", "#0072B2")));
        ColumnMapping twice = new ColumnMapping("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", null, null,
                null, List.of(MAPPING.enterprises().get(0), new EnterpriseMapping("ENTERPRISE A", "Again", "#D55E00")));

        assertThatThrownBy(() -> ImportRowParser.checkMapping(HEADERS, fieldAsEnterprise))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("mapping.enterprises[0].sourceColumn: column 'Agente' is already used");
        assertThatThrownBy(() -> ImportRowParser.checkMapping(HEADERS, twice))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("mapping.enterprises[1].sourceColumn: column 'ENTERPRISE A' is already used");
    }

    @Test
    void enterpriseNamesMustBeUniqueIgnoringCase() {
        ColumnMapping sameName = new ColumnMapping("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", null,
                null, null, List.of(new EnterpriseMapping("ENTERPRISE A", "Wine", "#0072B2"),
                        new EnterpriseMapping("ENTERPRISE B", "WINE", "#D55E00")));

        assertThatThrownBy(() -> ImportRowParser.checkMapping(HEADERS, sameName))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("mapping.enterprises[1].name: 'WINE' is already the name of another enterprise");
    }

    @Test
    void latitudeAndLongitudeGoTogether() {
        assertThatThrownBy(() -> ImportRowParser.checkMapping(HEADERS, withCoordinates("Lat", null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("mapping.longitude: map both latitude and longitude, or neither");
    }

    /** US-05: the analyst can pick any color, but markers must stay visible on the map. */
    @Test
    void enterpriseColorsNeedAtLeast3To1ContrastOnWhite() {
        ColumnMapping yellow = new ColumnMapping("Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", null,
                null, null, List.of(new EnterpriseMapping("ENTERPRISE A", "Wine", "#FFFF00")));

        assertThatThrownBy(() -> ImportRowParser.checkMapping(HEADERS, yellow))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("mapping.enterprises[0].color: #FFFF00 is too light to be seen on the map "
                        + "(it needs at least 3:1 contrast on white)");
    }
}
