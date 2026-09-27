package it.teamlab.visitwise.imports;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * One detail row of the imported file: a customer's delivery point, served by an agent.
 * The same address can appear more than once with different agents.
 */
@Entity
@Table(name = "delivery_point")
public class DeliveryPoint {

    /** Pooled sequence (changeset 004): lets the import batch its inserts. */
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "delivery_point_seq")
    @SequenceGenerator(name = "delivery_point_seq", sequenceName = "delivery_point_id_seq", allocationSize = 50)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "import_id", nullable = false)
    private ImportBatch importBatch;

    /** 1-based row number in the source sheet, for error reporting. */
    @Column(name = "source_row", nullable = false)
    private int sourceRow;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "point_name", nullable = false)
    private String pointName;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false, length = 120)
    private String city;

    @Column(length = 120)
    private String agent;

    private Double latitude;

    private Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(name = "geocode_status", nullable = false, length = 20)
    private GeocodeStatus geocodeStatus = GeocodeStatus.PENDING;

    /** Sum of all enterprise revenues of this row (may be negative because of credit notes). */
    @Column(name = "total_revenue", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalRevenue = BigDecimal.ZERO;

    @OneToMany(mappedBy = "deliveryPoint", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Revenue> revenues = new ArrayList<>();

    protected DeliveryPoint() {
    }

    public DeliveryPoint(ImportBatch importBatch, int sourceRow, String customerName, String pointName,
                         String address, String city, String agent) {
        this.importBatch = importBatch;
        this.sourceRow = sourceRow;
        this.customerName = customerName;
        this.pointName = pointName;
        this.address = address;
        this.city = city;
        this.agent = agent;
    }

    /** Adds a revenue line and keeps {@link #totalRevenue} in sync. */
    public void addRevenue(Enterprise enterprise, BigDecimal amount) {
        revenues.add(new Revenue(this, enterprise, amount));
        totalRevenue = totalRevenue.add(amount);
    }

    public void setCoordinates(Double latitude, Double longitude, GeocodeStatus status) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.geocodeStatus = status;
    }

    public Long getId() {
        return id;
    }

    public ImportBatch getImportBatch() {
        return importBatch;
    }

    public int getSourceRow() {
        return sourceRow;
    }

    public String getCustomerName() {
        return customerName;
    }

    public String getPointName() {
        return pointName;
    }

    public String getAddress() {
        return address;
    }

    public String getCity() {
        return city;
    }

    public String getAgent() {
        return agent;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public GeocodeStatus getGeocodeStatus() {
        return geocodeStatus;
    }

    public BigDecimal getTotalRevenue() {
        return totalRevenue;
    }

    public List<Revenue> getRevenues() {
        return revenues;
    }
}
