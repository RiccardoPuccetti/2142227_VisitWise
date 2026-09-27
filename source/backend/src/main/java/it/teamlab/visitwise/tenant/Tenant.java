package it.teamlab.visitwise.tenant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Locale;

/**
 * A federation using VisitWise: owner of its imports and plans, and its only login account (one account per tenant).
 * See booklets/architecture/AUTHENTICATION.md.
 */
@Entity
@Table(name = "tenant")
public class Tenant {

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
