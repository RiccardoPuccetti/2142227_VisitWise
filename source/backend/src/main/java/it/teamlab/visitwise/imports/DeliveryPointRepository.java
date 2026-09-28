package it.teamlab.visitwise.imports;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryPointRepository extends JpaRepository<DeliveryPoint, Long> {

    /** All points of an import with their revenues loaded (used by map, analytics and planner). */
    @EntityGraph(attributePaths = {"revenues", "revenues.enterprise"})
    List<DeliveryPoint> findByImportBatchId(Long importId);

    List<DeliveryPoint> findByImportBatchIdAndGeocodeStatus(Long importId, GeocodeStatus status);

    long countByImportBatchId(Long importId);

    long countByImportBatchIdAndGeocodeStatus(Long importId, GeocodeStatus status);

    java.util.Optional<DeliveryPoint> findByIdAndImportBatchId(Long id, Long importId);
}
