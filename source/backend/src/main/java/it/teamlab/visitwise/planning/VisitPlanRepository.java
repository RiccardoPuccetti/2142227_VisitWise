package it.teamlab.visitwise.planning;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VisitPlanRepository extends JpaRepository<VisitPlan, Long> {

    List<VisitPlan> findByImportBatchIdOrderByCreatedAtDesc(Long importId);
}
