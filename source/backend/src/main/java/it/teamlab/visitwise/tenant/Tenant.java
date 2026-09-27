package it.teamlab.visitwise.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Locale;

/**
 * A federation using VisitWise: owner of its imports and plans, and its only login account (one account per tenant).
 * See booklets/architecture/AUTHENTICATION.md.
 */
@Entity
@Table(name = "tenant")
public class Tenant {

    static final int FAILURES_BEFORE_LOCK = 5;
    static final Duration MAX_LOCK = Duration.ofMinutes(15);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    /** Login identifier, always stored trimmed and lower case (see {@link #normalizeEmail}). */
    @Column(nullable = false, unique = true, length = 254)
    private String email;

    /** Encoded by the {@code DelegatingPasswordEncoder}, e.g. {@code {argon2}...}. Never the plain password. */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "failed_login_count", nullable = false)
    private int failedLoginCount;

    @Column(name = "locked_until")
    private OffsetDateTime lockedUntil;

    @Column(name = "password_changed_at", nullable = false)
    private OffsetDateTime passwordChangedAt;

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Tenant() {
    }

    public Tenant(String name, String email, String passwordHash) {
        this.name = name;
        this.email = normalizeEmail(email);
        this.passwordHash = passwordHash;
        this.createdAt = OffsetDateTime.now();
        this.passwordChangedAt = this.createdAt;
    }

    /** The only form in which emails are stored and looked up. */
    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    /** Brute-force protection (AUTHENTICATION.md A9): true while a lock is active. */
    public boolean isLocked(OffsetDateTime now) {
        return lockedUntil != null && now.isBefore(lockedUntil);
    }

    /**
     * From the 5th consecutive failure: lock for 1 min, doubling with every further failure, at most 15 min.
     * Attempts during an active lock are ignored (they are refused anyway), so they cannot extend the lock.
     */
    public void recordFailedLogin(OffsetDateTime now) {
        if (isLocked(now)) {
            return;
        }
        failedLoginCount++;
        if (failedLoginCount >= FAILURES_BEFORE_LOCK) {
            int doublings = Math.min(failedLoginCount - FAILURES_BEFORE_LOCK, 4);
            Duration lock = Duration.ofMinutes(1L << doublings);
            lockedUntil = now.plus(lock.compareTo(MAX_LOCK) > 0 ? MAX_LOCK : lock);
        }
    }

    public void rename(String name) {
        this.name = name;
    }

    /** @param passwordHash already encoded by the {@code PasswordEncoder} */
    public void changePassword(String passwordHash, OffsetDateTime now) {
        this.passwordHash = passwordHash;
        this.passwordChangedAt = now;
    }

    public void recordSuccessfulLogin(OffsetDateTime now) {
        failedLoginCount = 0;
        lockedUntil = null;
        lastLoginAt = now;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public int getFailedLoginCount() {
        return failedLoginCount;
    }

    public OffsetDateTime getLockedUntil() {
        return lockedUntil;
    }

    public OffsetDateTime getPasswordChangedAt() {
        return passwordChangedAt;
    }

    public OffsetDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
