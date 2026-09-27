package it.teamlab.visitwise.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;

/** Runs against the PostgreSQL container, so the Liquibase schema is the one under test. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TenantRepositoryTest {

    @Autowired
    private TenantRepository tenants;

    @Autowired
    private EntityManager entityManager;

    @Test
    void savesTenantWithTrimmedLowerCaseEmail() {
        Tenant saved = tenants.saveAndFlush(new Tenant("Demo federation", "  Demo@VisitWise.Test ", "{argon2}hash"));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEmail()).isEqualTo("demo@visitwise.test");
        assertThat(saved.getName()).isEqualTo("Demo federation");
        assertThat(saved.getPasswordHash()).isEqualTo("{argon2}hash");
        assertThat(saved.getFailedLoginCount()).isZero();
        assertThat(saved.getLockedUntil()).isNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getPasswordChangedAt()).isNotNull();
    }

    @Test
    void findsTenantByNormalizedEmail() {
        tenants.saveAndFlush(new Tenant("Demo federation", "demo@visitwise.test", "{argon2}hash"));

        assertThat(tenants.findByEmail(Tenant.normalizeEmail(" DEMO@visitwise.TEST"))).isPresent();
        assertThat(tenants.existsByEmail(Tenant.normalizeEmail("Demo@VisitWise.test"))).isTrue();
        assertThat(tenants.findByEmail("other@visitwise.test")).isEmpty();
    }

    @Test
    void rejectsSameEmailWithDifferentCase() {
        tenants.saveAndFlush(new Tenant("First", "demo@visitwise.test", "{argon2}hash"));

        assertThatThrownBy(() -> tenants.saveAndFlush(new Tenant("Second", "DEMO@VisitWise.test", "{argon2}hash")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void schemaRejectsUpperCaseEmailWrittenBypassingTheEntity() {
        assertThatThrownBy(() -> entityManager
                .createNativeQuery("INSERT INTO tenant (name, email, password_hash) VALUES ('X', 'Upper@VisitWise.test', 'h')")
                .executeUpdate())
                .isInstanceOf(PersistenceException.class);
    }
}
