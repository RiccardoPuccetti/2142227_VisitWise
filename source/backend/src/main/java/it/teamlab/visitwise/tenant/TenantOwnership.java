package it.teamlab.visitwise.tenant;

import it.teamlab.visitwise.imports.ImportBatchRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Answers "does this import / plan belong to this tenant?" for the {@link TenantGuardFilter}. */
@Component
public class TenantOwnership {

    private final ImportBatchRepository imports;
    private final EntityManager entityManager;

    public TenantOwnership(ImportBatchRepository imports, EntityManager entityManager) {
        this.imports = imports;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public boolean ownsImport(Long tenantId, Long importId) {
        return imports.existsByIdAndTenantId(importId, tenantId);
    }

    /** A plan belongs to the tenant of its import (native query: no dependency on the planning package). */
    @Transactional(readOnly = true)
    public boolean ownsPlan(Long tenantId, Long planId) {
        Object found = entityManager.createNativeQuery("""
                SELECT EXISTS (
                    SELECT 1 FROM visit_plan p JOIN import_batch i ON i.id = p.import_id
                    WHERE p.id = :planId AND i.tenant_id = :tenantId)
                """)
                .setParameter("planId", planId)
                .setParameter("tenantId", tenantId)
                .getSingleResult();
        return Boolean.TRUE.equals(found);
    }
}
