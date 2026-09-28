package it.teamlab.visitwise.planning.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

/** US-29: one sheet per agent, one row per visit, in plan order. */
class PlanWorkbookTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 11, 2);

    private static ExportVisit visit(String agent, LocalDate date, int slot, String pointName) {
        return new ExportVisit(agent, date, slot, "CUSTOMER OF " + pointName, pointName, "VIA DEL CORSO 1", "ROMA",
                new BigDecimal("1250.50"), new BigDecimal("2.10"));
    }

    private static Workbook read(byte[] content) throws IOException {
        return new XSSFWorkbook(new ByteArrayInputStream(content));
    }

    private static List<String> sheetNames(Workbook workbook) {
        List<String> names = new ArrayList<>();
        workbook.forEach(sheet -> names.add(sheet.getSheetName()));
        return names;
    }

    @Test
    void writesOneSheetPerAgentInTheOrderOfTheirFirstVisit() throws IOException {
        byte[] content = PlanWorkbook.write(List.of(
                visit("AGENT SOUTH", MONDAY, 1, "BAR BETA"),
                visit("AGENT NORTH", MONDAY, 1, "RISTORANTE ACME"),
                visit("AGENT SOUTH", MONDAY, 2, "CAFFE GAMMA")), "No agent");

        try (Workbook workbook = read(content)) {
            assertThat(sheetNames(workbook)).containsExactly("AGENT SOUTH", "AGENT NORTH");
            assertThat(workbook.getSheet("AGENT SOUTH").getLastRowNum()).isEqualTo(2);
            assertThat(workbook.getSheet("AGENT NORTH").getLastRowNum()).isEqualTo(1);
        }
    }

    @Test
    void eachRowHoldsTheDateTheOrderAndWhereToGo() throws IOException {
        byte[] content = PlanWorkbook.write(List.of(visit("AGENT NORTH", MONDAY, 2, "RISTORANTE ACME")), "No agent");

        try (Workbook workbook = read(content)) {
            Sheet sheet = workbook.getSheetAt(0);
            List<String> headers = new ArrayList<>();
            sheet.getRow(0).forEach(cell -> headers.add(cell.getStringCellValue()));
            assertThat(headers).containsExactly("Date", "Order", "Customer", "Delivery point", "Address", "City",
                    "Expected revenue (EUR)", "Km from previous stop");

            Row row = sheet.getRow(1);
            assertThat(DateUtil.isCellDateFormatted(row.getCell(0))).isTrue();
            assertThat(row.getCell(0).getLocalDateTimeCellValue().toLocalDate()).isEqualTo(MONDAY);
            assertThat(row.getCell(1).getNumericCellValue()).isEqualTo(2);
            assertThat(row.getCell(2).getStringCellValue()).isEqualTo("CUSTOMER OF RISTORANTE ACME");
            assertThat(row.getCell(3).getStringCellValue()).isEqualTo("RISTORANTE ACME");
            assertThat(row.getCell(4).getStringCellValue()).isEqualTo("VIA DEL CORSO 1");
            assertThat(row.getCell(5).getStringCellValue()).isEqualTo("ROMA");
            assertThat(row.getCell(6).getCellType()).isEqualTo(CellType.NUMERIC);
            assertThat(row.getCell(6).getNumericCellValue()).isEqualTo(1250.50);
            assertThat(row.getCell(7).getNumericCellValue()).isEqualTo(2.10);
        }
    }

    @Test
    void visitsWithoutAgentGoToTheSheetNamedByTheLabel() throws IOException {
        byte[] content = PlanWorkbook.write(List.of(visit(null, MONDAY, 1, "BAR BETA")), "Single visitor");

        try (Workbook workbook = read(content)) {
            assertThat(sheetNames(workbook)).containsExactly("Single visitor");
        }
    }

    @Test
    void sheetNamesAreValidForExcelAndUnique() throws IOException {
        byte[] content = PlanWorkbook.write(List.of(
                visit("NORTH/ROME", MONDAY, 1, "BAR BETA"),
                visit("NORTH?ROME", MONDAY, 1, "RISTORANTE ACME"),
                visit("AN AGENT WITH A VERY LONG NAME AND SURNAME", MONDAY, 1, "CAFFE GAMMA")), "No agent");

        try (Workbook workbook = read(content)) {
            // Excel forbids : \ / ? * [ ] and names longer than 31 characters.
            assertThat(sheetNames(workbook))
                    .containsExactly("NORTH ROME", "NORTH ROME (2)", "AN AGENT WITH A VERY LONG NAME");
        }
    }

    @Test
    void aPlanWithoutVisitsGivesOneSheetWithTheHeadersOnly() throws IOException {
        byte[] content = PlanWorkbook.write(List.of(), "No agent");

        try (Workbook workbook = read(content)) {
            assertThat(workbook.getNumberOfSheets()).isEqualTo(1);
            assertThat(workbook.getSheetAt(0).getLastRowNum()).isZero();
        }
    }
}
