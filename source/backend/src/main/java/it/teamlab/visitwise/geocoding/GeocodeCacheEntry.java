package it.teamlab.visitwise.geocoding;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** Result of one geocoding query, shared by all imports (misses are stored too, to avoid re-asking). */
@Entity
@Table(name = "geocode_cache")
public class GeocodeCacheEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Normalized "ADDRESS, CITY" (upper case, single spaces). */
    @Column(name = "query_key", nullable = false, unique = true, length = 400)
    private String queryKey;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false)
    private boolean found;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected GeocodeCacheEntry() {
    }

    public GeocodeCacheEntry(String queryKey, Double latitude, Double longitude, boolean found, String provider) {
        this.queryKey = queryKey;
        this.latitude = latitude;
        this.longitude = longitude;
        this.found = found;
        this.provider = provider;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public boolean isFound() {
        return found;
    }

    /** Overwrites a cached miss after a successful retry (keeps the unique key, no delete + insert). */
    public void update(Double latitude, Double longitude, boolean found, String provider) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.found = found;
        this.provider = provider;
        this.createdAt = OffsetDateTime.now();
    }
}
