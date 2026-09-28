package it.teamlab.visitwise.imports;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImportBatchRepository extends JpaRepository<ImportBatch, Long> {

    /** The imports list (US-10) only ever shows the logged-in tenant's imports (D-09). */
    List<ImportBatch> findAllByTenantIdOrderByCreatedAtDescIdDesc(Long tenantId);

    boolean existsByIdAndTenantId(Long id, Long tenantId);

    /** Imports whose background geocoding is still running (resumed after a restart). */
    List<ImportBatch> findByStatus(ImportStatus status);
}
