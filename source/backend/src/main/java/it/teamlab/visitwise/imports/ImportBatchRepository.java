package it.teamlab.visitwise.imports;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportBatchRepository extends JpaRepository<ImportBatch, Long> {

    /** The imports list (US-10) only ever shows the logged-in tenant's imports (D-09). */
    List<ImportBatch> findAllByTenantIdOrderByCreatedAtDesc(Long tenantId);

    boolean existsByIdAndTenantId(Long id, Long tenantId);
}
