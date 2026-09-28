package it.teamlab.visitwise.imports;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DeliveryPointRepository extends JpaRepository<DeliveryPoint, Long> {

    /** All points of an import with their revenues loaded (used by map, analytics and planner). */
    @EntityGraph(attributePaths = {"revenues", "revenues.enterprise"})
    List<DeliveryPoint> findByImportBatchId(Long importId);

    List<DeliveryPoint> findByImportBatchIdAndGeocodeStatus(Long importId, GeocodeStatus status);

    long countByImportBatchId(Long importId);

    long countByImportBatchIdAndGeocodeStatus(Long importId, GeocodeStatus status);

    java.util.Optional<DeliveryPoint> findByIdAndImportBatchId(Long id, Long importId);

    /** Agents of an import, for the filters of the import detail (US-11). */
    @Query("select distinct p.agent from DeliveryPoint p where p.importBatch.id = :importId and p.agent is not null "
            + "order by p.agent")
    List<String> findAgents(Long importId);

    /** Cities of an import, for the filters of the import detail (US-11). */
    @Query("select distinct p.city from DeliveryPoint p where p.importBatch.id = :importId order by p.city")
    List<String> findCities(Long importId);
}
