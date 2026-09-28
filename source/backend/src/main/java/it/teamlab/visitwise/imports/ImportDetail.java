package it.teamlab.visitwise.imports;

import java.time.OffsetDateTime;
import java.util.List;

/** Response of endpoint 5: ImportSummary + mapping, agents, cities and geocoding outcome (API_CONTRACT.md, section 1). */
public record ImportDetail(Long id, String name, String sourceFileName, OffsetDateTime createdAt, ImportStatus status,
        int totalRows, int importedRows, int skippedRows, int geocodedRows, List<EnterpriseSummary> enterprises,
        ColumnMapping mapping, List<String> agents, List<String> cities, long notFoundCount, String errorMessage) {

    static ImportDetail of(ImportSummary summary, ColumnMapping mapping, List<String> agents, List<String> cities,
            long notFoundCount, String errorMessage) {
        return new ImportDetail(summary.id(), summary.name(), summary.sourceFileName(), summary.createdAt(),
                summary.status(), summary.totalRows(), summary.importedRows(), summary.skippedRows(),
                summary.geocodedRows(), summary.enterprises(), mapping, agents, cities, notFoundCount, errorMessage);
    }
}
