package it.teamlab.visitwise.planning.export;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.WorkbookUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Writes a plan as an .xlsx file with one sheet per agent (US-29). Pure POI: no Spring, no JPA. */
final class PlanWorkbook {

    static final List<String> HEADERS = List.of("Date", "Order", "Customer", "Delivery point", "Address", "City",
            "Expected revenue (EUR)", "Km from previous stop");
    /** Column widths in characters, same order as {@link #HEADERS}. Fixed: auto-size needs fonts on the server. */
    private static final int[] WIDTHS = {16, 7, 34, 34, 34, 18, 22, 22};
    private static final int MAX_SHEET_NAME = 31;
    private static final String EMPTY_SHEET = "Visits";

    private PlanWorkbook() {
    }

    /**
     * @param visits       in plan order (agent, day, slot): sheets follow the order of each agent's first visit
     * @param noAgentLabel name of the sheet of the visits without agent
     */
    static byte[] write(List<ExportVisit> visits, String noAgentLabel) {
        Map<String, List<ExportVisit>> byAgent = new LinkedHashMap<>();
        for (ExportVisit visit : visits) {
            String agent = visit.agent() == null || visit.agent().isBlank() ? noAgentLabel : visit.agent();
            byAgent.computeIfAbsent(agent, key -> new ArrayList<>()).add(visit);
        }
        if (byAgent.isEmpty()) {
            byAgent.put(EMPTY_SHEET, List.of());
        }

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Styles styles = new Styles(workbook);
            Set<String> usedNames = new HashSet<>();
            byAgent.forEach((agent, agentVisits) ->
                    writeSheet(workbook.createSheet(uniqueSheetName(agent, usedNames)), agentVisits, styles));
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot write the plan workbook", e);
        }
    }

    private static void writeSheet(Sheet sheet, List<ExportVisit> visits, Styles styles) {
        Row header = sheet.createRow(0);
        for (int column = 0; column < HEADERS.size(); column++) {
            var cell = header.createCell(column);
            cell.setCellValue(HEADERS.get(column));
            cell.setCellStyle(styles.header);
            sheet.setColumnWidth(column, WIDTHS[column] * 256);
        }
        int rowIndex = 1;
        for (ExportVisit visit : visits) {
            Row row = sheet.createRow(rowIndex++);
            var date = row.createCell(0);
            date.setCellValue(visit.date());
            date.setCellStyle(styles.date);
            row.createCell(1).setCellValue(visit.slot());
            row.createCell(2).setCellValue(visit.customerName());
            row.createCell(3).setCellValue(visit.pointName());
            row.createCell(4).setCellValue(visit.address());
            row.createCell(5).setCellValue(visit.city());
            var revenue = row.createCell(6);
            revenue.setCellValue(visit.expectedRevenue().doubleValue());
            revenue.setCellStyle(styles.amount);
            var km = row.createCell(7);
            km.setCellValue(visit.travelKm().doubleValue());
            km.setCellStyle(styles.amount);
        }
        sheet.createFreezePane(0, 1);
        sheet.setAutoFilter(new CellRangeAddress(0, Math.max(0, rowIndex - 1), 0, HEADERS.size() - 1));
    }

    /** Excel sheet names: at most 31 characters, none of : \ / ? * [ ], unique regardless of case. */
    private static String uniqueSheetName(String proposal, Set<String> used) {
        String base = WorkbookUtil.createSafeSheetName(proposal).strip();
        String name = base;
        for (int copy = 2; !used.add(name.toLowerCase(Locale.ROOT)); copy++) {
            String suffix = " (" + copy + ")";
            name = base.substring(0, Math.min(base.length(), MAX_SHEET_NAME - suffix.length())).strip() + suffix;
        }
        return name;
    }

    private static final class Styles {
        private final CellStyle header;
        private final CellStyle date;
        private final CellStyle amount;

        private Styles(XSSFWorkbook workbook) {
            Font bold = workbook.createFont();
            bold.setBold(true);
            header = workbook.createCellStyle();
            header.setFont(bold);
            var format = workbook.createDataFormat();
            date = workbook.createCellStyle();
            date.setDataFormat(format.getFormat("ddd dd/mm/yyyy"));
            amount = workbook.createCellStyle();
            amount.setDataFormat(format.getFormat("#,##0.00"));
        }
    }
}
