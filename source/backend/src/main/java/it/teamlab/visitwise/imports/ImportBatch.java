package it.teamlab.visitwise.imports;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** One uploaded Excel file, named by the analyst. Root of all imported data. */
@Entity
@Table(name = "import_batch")
public class ImportBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "source_file_name")
    private String sourceFileName;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ImportStatus status;

    @Column(name = "total_rows", nullable = false)
    private int totalRows;

    @Column(name = "imported_rows", nullable = false)
    private int importedRows;

    @Column(name = "skipped_rows", nullable = false)
    private int skippedRows;

    @Column(name = "geocoded_rows", nullable = false)
    private int geocodedRows;

    /** JSON (as text) of the column mapping chosen in the wizard, kept for traceability. */
    @Column(name = "column_mapping", columnDefinition = "text")
    private String columnMapping;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    protected ImportBatch() {
    }

    public ImportBatch(String name, String sourceFileName) {
        this.name = name;
        this.sourceFileName = sourceFileName;
        this.createdAt = OffsetDateTime.now();
        this.status = ImportStatus.PROCESSING;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSourceFileName() {
        return sourceFileName;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public ImportStatus getStatus() {
        return status;
    }

    public void setStatus(ImportStatus status) {
        this.status = status;
    }

    public int getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public int getImportedRows() {
        return importedRows;
    }

    public void setImportedRows(int importedRows) {
        this.importedRows = importedRows;
    }

    public int getSkippedRows() {
        return skippedRows;
    }

    public void setSkippedRows(int skippedRows) {
        this.skippedRows = skippedRows;
    }

    public int getGeocodedRows() {
        return geocodedRows;
    }

    public void setGeocodedRows(int geocodedRows) {
        this.geocodedRows = geocodedRows;
    }

    public String getColumnMapping() {
        return columnMapping;
    }

    public void setColumnMapping(String columnMapping) {
        this.columnMapping = columnMapping;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
