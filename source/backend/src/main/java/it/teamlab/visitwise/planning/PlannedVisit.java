package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.imports.DeliveryPoint;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

/** One visit of a saved plan: who visits which delivery point, on which day and in which order. */
@Entity
@Table(name = "planned_visit")
public class PlannedVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private VisitPlan plan;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_point_id", nullable = false)
    private DeliveryPoint deliveryPoint;

    @Column(length = 120)
    private String agent;

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    /** 0-based index of the working day inside the plan horizon. */
    @Column(name = "day_index", nullable = false)
    private int dayIndex;

    /** 1-based order of the visit inside its day. */
    @Column(nullable = false)
    private int slot;

    @Column(name = "expected_revenue", nullable = false, precision = 14, scale = 2)
    private BigDecimal expectedRevenue;

    /** Estimated km from the previous stop (or from the base for slot 1). */
    @Column(name = "travel_km", nullable = false, precision = 8, scale = 2)
    private BigDecimal travelKm;

    protected PlannedVisit() {
    }

    public PlannedVisit(VisitPlan plan, DeliveryPoint deliveryPoint, String agent, LocalDate visitDate,
                        int dayIndex, int slot, BigDecimal expectedRevenue, BigDecimal travelKm) {
        this.plan = plan;
        this.deliveryPoint = deliveryPoint;
        this.agent = agent;
        this.visitDate = visitDate;
        this.dayIndex = dayIndex;
        this.slot = slot;
        this.expectedRevenue = expectedRevenue;
        this.travelKm = travelKm;
    }

    public Long getId() {
        return id;
    }

    public VisitPlan getPlan() {
        return plan;
    }

    public DeliveryPoint getDeliveryPoint() {
        return deliveryPoint;
    }

    public String getAgent() {
        return agent;
    }

    public LocalDate getVisitDate() {
        return visitDate;
    }

    public int getDayIndex() {
        return dayIndex;
    }

    public int getSlot() {
        return slot;
    }

    public BigDecimal getExpectedRevenue() {
        return expectedRevenue;
    }

    public BigDecimal getTravelKm() {
        return travelKm;
    }
}
