package it.teamlab.visitwise.imports;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.function.Consumer;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

/** Builds small .xlsx files in memory for tests (synthetic data only, NDA). */
final class XlsxTestFiles {

    private XlsxTestFiles() {
    }

    /** One sheet named "Sheet1": each array is a row from row 1; String -> text cell, Number -> numeric, null -> no cell. */
    static byte[] sheet(Object[]... rows) {
        return workbook(wb -> fill(wb.createSheet("Sheet1"), 0, rows));
    }

    static byte[] workbook(Consumer<Workbook> content) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            content.accept(wb);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Writes the rows starting at the 0-based row index {@code firstRow}. */
    static void fill(Sheet sheet, int firstRow, Object[]... rows) {
        for (int r = 0; r < rows.length; r++) {
            Row row = sheet.createRow(firstRow + r);
            for (int c = 0; c < rows[r].length; c++) {
                Object value = rows[r][c];
                if (value instanceof Number number) {
                    row.createCell(c).setCellValue(number.doubleValue());
                } else if (value != null) {
                    row.createCell(c).setCellValue(value.toString());
                }
            }
        }
    }

    static Object[] row(Object... cells) {
        return cells;
    }
}
