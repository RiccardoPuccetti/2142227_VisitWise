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
import java.math.BigDecimal;

/** Yearly revenue of one delivery point for one enterprise. Only non-zero cells are stored. */
@Entity
@Table(name = "revenue")
public class Revenue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "delivery_point_id", nullable = false)
    private DeliveryPoint deliveryPoint;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enterprise_id", nullable = false)
    private Enterprise enterprise;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    protected Revenue() {
    }

    Revenue(DeliveryPoint deliveryPoint, Enterprise enterprise, BigDecimal amount) {
        this.deliveryPoint = deliveryPoint;
        this.enterprise = enterprise;
        this.amount = amount;
    }

    public Long getId() {
        return id;
    }

    public DeliveryPoint getDeliveryPoint() {
        return deliveryPoint;
    }

    public Enterprise getEnterprise() {
        return enterprise;
    }

    public BigDecimal getAmount() {
        return amount;
    }
}
