package it.teamlab.visitwise.imports;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.openxml4j.opc.PackageAccess;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.util.XMLHelper;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler.SheetContentsHandler;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;

/**
 * Reads the first sheet of an .xlsx upload (API_CONTRACT.md, parsing rules; US-02). The sheet is streamed (SAX), not
 * loaded as a whole workbook, and reading stops as soon as a limit is exceeded, so a big or hostile file cannot fill
 * the memory. The upload goes to a temporary file (the zip format needs random access) that is deleted before
 * returning: the file is not kept after parsing.
 */
@Component
class ExcelSheetReader {

    static final String NOT_XLSX = "The file is not a valid Excel workbook (.xlsx)";

    private final int maxRows;
    private final int maxColumns;

    ExcelSheetReader(@Value("${visitwise.imports.max-rows:20000}") int maxRows,
            @Value("${visitwise.imports.max-columns:200}") int maxColumns) {
        this.maxRows = maxRows;
        this.maxColumns = maxColumns;
    }

    ParsedSheet read(InputStream file) {
        Path copy = null;
        try {
            copy = Files.createTempFile("visitwise-import-", ".xlsx");
            Files.copy(file, copy, StandardCopyOption.REPLACE_EXISTING);
            return readFirstSheet(copy);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            deleteQuietly(copy);
        }
    }

    private ParsedSheet readFirstSheet(Path path) {
        OPCPackage pkg = null;
        try {
            pkg = OPCPackage.open(path.toFile(), PackageAccess.READ);
            XSSFReader xlsx = new XSSFReader(pkg);
            XSSFReader.SheetIterator sheets = (XSSFReader.SheetIterator) xlsx.getSheetsData();
            if (!sheets.hasNext()) {
                throw new InvalidImportFileException("The file has no sheets");
            }
            try (InputStream sheet = sheets.next()) {
                RowCollector rows = new RowCollector();
                XMLReader parser = XMLHelper.newXMLReader();
                parser.setContentHandler(new XSSFSheetXMLHandler(xlsx.getStylesTable(),
                        new ReadOnlySharedStringsTable(pkg), rows, new PlainNumberFormatter(), false));
                parser.parse(new InputSource(sheet));
                return rows.result(sheets.getSheetName());
            }
        } catch (InvalidImportFileException e) {
            throw e;
        } catch (Exception e) {
            // Not a zip, not OOXML (e.g. a legacy .xls or a CSV renamed), corrupted XML, zip bomb detected by POI.
            throw new InvalidImportFileException(NOT_XLSX, e);
        } finally {
            if (pkg != null) {
                pkg.revert();
            }
        }
    }

    private static void deleteQuietly(Path path) {
        if (path != null) {
            try {
                Files.deleteIfExists(path);
            } catch (IOException ignored) {
                // Only a temp file: the OS cleans it up.
            }
        }
    }

    /** Builds headers from the first non-blank row and collects the non-blank rows below them. */
    private final class RowCollector implements SheetContentsHandler {

        private List<String> headers;
        private final List<SheetRow> rows = new ArrayList<>();
        private final List<String> current = new ArrayList<>();
        private int nextColumn;

        @Override
        public void startRow(int rowNum) {
            current.clear();
            nextColumn = 0;
        }

        @Override
        public void cell(String reference, String formattedValue, XSSFComment comment) {
            int column = reference == null ? nextColumn : new CellReference(reference).getCol();
            nextColumn = column + 1;
            String value = formattedValue == null ? "" : formattedValue.strip();
            if (value.isEmpty()) {
                return;
            }
            int width = headers == null ? maxColumns : headers.size();
            if (column >= width) {
                if (headers == null) {
                    throw new InvalidImportFileException("The file has more than " + maxColumns + " columns");
                }
                return;
            }
            while (current.size() <= column) {
                current.add("");
            }
            current.set(column, value);
        }

        @Override
        public void endRow(int rowNum) {
            if (current.isEmpty()) {
                return;
            }
            if (headers == null) {
                headers = uniqueHeaders(current);
                return;
            }
            if (rows.size() == maxRows) {
                throw new InvalidImportFileException("The file has more than " + maxRows + " data rows");
            }
            List<String> cells = new ArrayList<>(current);
            while (cells.size() < headers.size()) {
                cells.add("");
            }
            rows.add(new SheetRow(rowNum + 1, Collections.unmodifiableList(cells)));
        }

        ParsedSheet result(String sheetName) {
            if (headers == null) {
                throw new InvalidImportFileException("The first sheet of the file is empty");
            }
            return new ParsedSheet(sheetName, headers, Collections.unmodifiableList(rows));
        }
    }

    /** Whitespace collapsed, blank -> "Column C", duplicates -> "Name (2)", "Name (3)" (left to right). */
    private static List<String> uniqueHeaders(List<String> cells) {
        List<String> headers = new ArrayList<>(cells.size());
        Set<String> seen = new HashSet<>();
        for (int column = 0; column < cells.size(); column++) {
            String name = cells.get(column).replaceAll("\\s+", " ");
            if (name.isEmpty()) {
                name = "Column " + CellReference.convertNumToColString(column);
            }
            String unique = name;
            for (int n = 2; seen.contains(unique); n++) {
                unique = name + " (" + n + ")";
            }
            seen.add(unique);
            headers.add(unique);
        }
        return List.copyOf(headers);
    }

    /**
     * Numbers as plain text ({@code 1250.5}), whatever the display format of the cell ({@code 1.250,50 €}): the amount
     * parser and the preview then see the same value. Dates keep their display format.
     */
    private static final class PlainNumberFormatter extends DataFormatter {

        PlainNumberFormatter() {
            super(Locale.ROOT);
        }

        @Override
        public String formatRawCellContents(double value, int formatIndex, String formatString,
                boolean use1904Windowing) {
            if (DateUtil.isADateFormat(formatIndex, formatString) && DateUtil.isValidExcelDate(value)) {
                return super.formatRawCellContents(value, formatIndex, formatString, use1904Windowing);
            }
            return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
        }
    }
}
