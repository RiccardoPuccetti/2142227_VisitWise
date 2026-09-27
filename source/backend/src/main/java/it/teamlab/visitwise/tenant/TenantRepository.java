package it.teamlab.visitwise.tenant;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Emails passed to these methods must already be normalized with {@link Tenant#normalizeEmail}. */
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    Optional<Tenant> findByEmail(String email);

    boolean existsByEmail(String email);
}
