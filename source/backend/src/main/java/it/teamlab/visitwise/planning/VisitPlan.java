package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.imports.ImportBatch;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/** A saved planning scenario: the parameters used and the resulting KPIs. */
@Entity
@Table(name = "visit_plan")
public class VisitPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "import_id", nullable = false)
    private ImportBatch importBatch;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    /** JSON (as text) of the PlanParameters used to compute this plan. */
    @Column(nullable = false, columnDefinition = "text")
    private String parameters;

    /** JSON (as text) of the PlanKpis of this plan. */
    @Column(columnDefinition = "text")
    private String kpis;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlannedVisit> visits = new ArrayList<>();

    protected VisitPlan() {
    }

    public VisitPlan(ImportBatch importBatch, String name, String parameters, String kpis) {
        this.importBatch = importBatch;
        this.name = name;
        this.parameters = parameters;
        this.kpis = kpis;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public ImportBatch getImportBatch() {
        return importBatch;
    }

    public String getName() {
        return name;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public String getParameters() {
        return parameters;
    }

    public String getKpis() {
        return kpis;
    }

    public void addVisit(PlannedVisit visit) {
        visits.add(visit);
    }
}
