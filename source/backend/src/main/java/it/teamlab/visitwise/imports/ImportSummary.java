package it.teamlab.visitwise.imports;

import java.time.OffsetDateTime;
import java.util.List;

/** Response of endpoint 3 and items of endpoint 4 (API_CONTRACT.md, section 1). */
public record ImportSummary(Long id, String name, String sourceFileName, OffsetDateTime createdAt, ImportStatus status,
        int totalRows, int importedRows, int skippedRows, int geocodedRows, List<EnterpriseSummary> enterprises) {

    static ImportSummary of(ImportBatch batch, List<Enterprise> enterprises) {
        return new ImportSummary(batch.getId(), batch.getName(), batch.getSourceFileName(), batch.getCreatedAt(),
                batch.getStatus(), batch.getTotalRows(), batch.getImportedRows(), batch.getSkippedRows(),
                batch.getGeocodedRows(), enterprises.stream().map(EnterpriseSummary::of).toList());
    }
}
