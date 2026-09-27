package it.teamlab.visitwise.imports;

import static it.teamlab.visitwise.imports.XlsxTestFiles.row;
import static it.teamlab.visitwise.imports.XlsxTestFiles.sheet;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.jupiter.api.Test;

/** First sheet of an .xlsx -> headers + data rows as text (API_CONTRACT.md, parsing rules; US-02). */
class ExcelSheetReaderTest {

    private final ExcelSheetReader reader = new ExcelSheetReader(20_000, 200);

    private ParsedSheet read(byte[] file) {
        return reader.read(new ByteArrayInputStream(file));
    }

    @Test
    void firstNonEmptyRowIsTheHeaderAndRowsKeepTheirExcelNumber() {
        byte[] file = XlsxTestFiles.workbook(wb -> XlsxTestFiles.fill(wb.createSheet("Export"), 2,
                row("Customer", "City"),
                row("ACME SRL", "ROMA"),
                row("BETA SNC", "TIVOLI")));

        ParsedSheet sheet = read(file);

        assertThat(sheet.sheetName()).isEqualTo("Export");
        assertThat(sheet.headers()).containsExactly("Customer", "City");
        assertThat(sheet.rows()).extracting(SheetRow::sourceRow).containsExactly(4, 5);
        assertThat(sheet.rows().get(0).cells()).containsExactly("ACME SRL", "ROMA");
    }

    @Test
    void onlyTheFirstSheetIsRead() {
        byte[] file = XlsxTestFiles.workbook(wb -> {
            XlsxTestFiles.fill(wb.createSheet("First"), 0, row("A"), row("first"));
            XlsxTestFiles.fill(wb.createSheet("Second"), 0, row("B"), row("second"));
        });

        ParsedSheet sheet = read(file);

        assertThat(sheet.sheetName()).isEqualTo("First");
        assertThat(sheet.rows()).singleElement()
                .extracting(SheetRow::cells, InstanceOfAssertFactories.list(String.class)).containsExactly("first");
    }

    @Test
    void headersAreTrimmedMadeUniqueAndBlankOnesGetTheColumnLetter() {
        ParsedSheet sheet = read(sheet(
                row("  Totale ", "Totale", null, "Punto\n  Vendita", "Totale", "Totale (2)"),
                row("1", "2", "3", "4", "5", "6")));

        assertThat(sheet.headers())
                .containsExactly("Totale", "Totale (2)", "Column C", "Punto Vendita", "Totale (3)", "Totale (2) (2)");
    }

    @Test
    void numbersAreWrittenPlainWhateverTheirExcelFormat() {
        byte[] file = XlsxTestFiles.workbook(wb -> {
            Sheet sheet = wb.createSheet("Sheet1");
            XlsxTestFiles.fill(sheet, 0, row("A", "B", "C", "D", "E"), row(830, 1250.5, -120, 1250.5, null));
            CellStyle thousands = wb.createCellStyle();
            thousands.setDataFormat(wb.createDataFormat().getFormat("#,##0.00"));
            sheet.getRow(1).getCell(3).setCellStyle(thousands);
            Cell formula = sheet.getRow(1).createCell(4);
            formula.setCellFormula("A2+B2");
            wb.getCreationHelper().createFormulaEvaluator().evaluateAll();
        });

        assertThat(read(file).rows().get(0).cells()).containsExactly("830", "1250.5", "-120", "1250.5", "2080.5");
    }

    @Test
    void datesTextAndBooleansKeepTheirMeaning() {
        byte[] file = XlsxTestFiles.workbook(wb -> {
            Sheet sheet = wb.createSheet("Sheet1");
            XlsxTestFiles.fill(sheet, 0, row("Date", "Text", "Flag"), row(null, "  -  ", null));
            Row data = sheet.getRow(1);
            CellStyle date = wb.createCellStyle();
            date.setDataFormat(wb.createDataFormat().getFormat("yyyy-mm-dd"));
            data.createCell(0).setCellValue(LocalDate.of(2025, 1, 31));
            data.getCell(0).setCellStyle(date);
            data.createCell(2).setCellValue(true);
        });

        assertThat(read(file).rows().get(0).cells()).containsExactly("2025-01-31", "-", "TRUE");
    }

    @Test
    void blankRowsAreIgnoredShortRowsArePaddedAndCellsBeyondTheHeadersDropped() {
        ParsedSheet sheet = read(sheet(
                row("Customer", "City", "Agent"),
                row("ACME SRL"),
                row(null, "   ", null),
                row(),
                row("BETA SNC", "TIVOLI", "AGENT NORTH", "extra", "more")));

        assertThat(sheet.rows()).extracting(SheetRow::sourceRow).containsExactly(2, 5);
        assertThat(sheet.rows().get(0).cells()).containsExactly("ACME SRL", "", "");
        assertThat(sheet.rows().get(1).cells()).containsExactly("BETA SNC", "TIVOLI", "AGENT NORTH");
    }

    @Test
    void aHeaderOnlySheetHasNoRows() {
        assertThat(read(sheet(row("Customer", "City"))).rows()).isEmpty();
    }

    @Test
    void tooManyDataRowsAreRejected() {
        ExcelSheetReader small = new ExcelSheetReader(2, 200);
        byte[] twoRows = sheet(row("A"), row("1"), row("2"));
        byte[] threeRows = sheet(row("A"), row("1"), row("2"), row("3"));

        assertThat(small.read(new ByteArrayInputStream(twoRows)).rows()).hasSize(2);
        assertThatThrownBy(() -> small.read(new ByteArrayInputStream(threeRows)))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessage("The file has more than 2 data rows");
    }

    @Test
    void tooManyColumnsAreRejected() {
        ExcelSheetReader small = new ExcelSheetReader(20_000, 3);

        assertThat(small.read(new ByteArrayInputStream(sheet(row("A", "B", "C")))).headers()).hasSize(3);
        assertThatThrownBy(() -> small.read(new ByteArrayInputStream(sheet(row("A", "B", "C", "D")))))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessage("The file has more than 3 columns");
    }

    @Test
    void aWorkbookWithAnEmptyFirstSheetIsRejected() {
        byte[] file = XlsxTestFiles.workbook(wb -> {
            wb.createSheet("Empty");
            XlsxTestFiles.fill(wb.createSheet("Data"), 0, row("A"), row("1"));
        });

        assertThatThrownBy(() -> read(file))
                .isInstanceOf(InvalidImportFileException.class)
                .hasMessage("The first sheet of the file is empty");
    }

    @Test
    void filesThatAreNotXlsxAreRejected() throws IOException {
        byte[] text = "Customer;City\nACME;ROMA\n".getBytes(StandardCharsets.UTF_8);
        byte[] legacyXls;
        try (HSSFWorkbook wb = new HSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.createSheet("Sheet1").createRow(0).createCell(0).setCellValue("A");
            wb.write(out);
            legacyXls = out.toByteArray();
        }

        for (byte[] file : new byte[][] {text, legacyXls, new byte[0]}) {
            assertThatThrownBy(() -> read(file))
                    .isInstanceOf(InvalidImportFileException.class)
                    .hasMessage("The file is not a valid Excel workbook (.xlsx)");
        }
    }
}
