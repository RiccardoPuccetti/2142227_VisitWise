package it.teamlab.visitwise.imports;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A company of the federation, i.e. one revenue column of the imported file (e.g. ENTERPRISE A). */
@Entity
@Table(name = "enterprise")
public class Enterprise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "import_id", nullable = false)
    private ImportBatch importBatch;

    /** Header of the Excel column this enterprise was read from. */
    @Column(name = "source_column", nullable = false, length = 150)
    private String sourceColumn;

    /** Display name chosen by the analyst in the wizard. */
    @Column(nullable = false, length = 100)
    private String name;

    /** Hex color used on map and charts, e.g. #2563eb. */
    @Column(length = 7)
    private String color;

    @Column(nullable = false)
    private int position;

    protected Enterprise() {
    }

    public Enterprise(ImportBatch importBatch, String sourceColumn, String name, String color, int position) {
        this.importBatch = importBatch;
        this.sourceColumn = sourceColumn;
        this.name = name;
        this.color = color;
        this.position = position;
    }

    public Long getId() {
        return id;
    }

    public ImportBatch getImportBatch() {
        return importBatch;
    }

    public String getSourceColumn() {
        return sourceColumn;
    }

    public String getName() {
        return name;
    }

    public String getColor() {
        return color;
    }

    public int getPosition() {
        return position;
    }
}
