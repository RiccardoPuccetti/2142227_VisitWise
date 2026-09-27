package it.teamlab.visitwise.planning;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlannedVisitRepository extends JpaRepository<PlannedVisit, Long> {

    @EntityGraph(attributePaths = "deliveryPoint")
    List<PlannedVisit> findByPlanIdOrderByAgentAscDayIndexAscSlotAsc(Long planId);
}
