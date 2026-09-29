package it.teamlab.visitwise.analytics;

import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.DeliveryPointRepository;
import it.teamlab.visitwise.imports.EnterpriseRepository;
import it.teamlab.visitwise.imports.GeocodeStatus;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads the delivery points of an import and computes its indicators. Ownership of the import is checked by the
 * tenant guard before the controller is reached.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private final DeliveryPointRepository points;
    private final EnterpriseRepository enterprises;

    public AnalyticsService(DeliveryPointRepository points, EnterpriseRepository enterprises) {
        this.points = points;
        this.enterprises = enterprises;
    }

    /** Points in file order, optionally only those with the given geocoding status. */
    public List<DeliveryPointResponse> points(Long importId, GeocodeStatus geocodeStatus) {
        return points.findByImportBatchId(importId).stream()
                .filter(point -> geocodeStatus == null || point.getGeocodeStatus() == geocodeStatus)
                .sorted(Comparator.comparingInt(DeliveryPoint::getSourceRow))
                .map(DeliveryPointResponse::of)
                .toList();
    }

    public AnalyticsSummary summary(Long importId, Collection<Long> enterpriseIds, Collection<String> agents) {
        List<EnterpriseInfo> infos = enterprises.findByImportBatchIdOrderByPosition(importId).stream()
                .map(enterprise -> new EnterpriseInfo(enterprise.getId(), enterprise.getName(), enterprise.getColor()))
                .toList();
        return AnalyticsCalculator.summarize(infos, points(importId, null), enterpriseIds, agents);
    }

}
