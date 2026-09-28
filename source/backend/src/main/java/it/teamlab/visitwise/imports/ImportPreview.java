package it.teamlab.visitwise.imports;

import java.util.List;

/**
 * Response of endpoint 2 (API_CONTRACT.md, section 1). {@code sampleRows} holds the first
 * {@value ImportPreviewService#SAMPLE_ROWS} data rows, {@code totalRows} counts every non-blank data row (subtotal
 * rows included: they are skipped only by the import).
 */
public record ImportPreview(String fileName, String sheetName, List<String> headers, List<List<String>> sampleRows,
        int totalRows, ColumnMapping suggestedMapping) {
}
