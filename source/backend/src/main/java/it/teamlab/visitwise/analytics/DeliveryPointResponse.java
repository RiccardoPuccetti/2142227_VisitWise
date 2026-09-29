package it.teamlab.visitwise.analytics;

import it.teamlab.visitwise.imports.DeliveryPoint;
import it.teamlab.visitwise.imports.GeocodeStatus;
import it.teamlab.visitwise.imports.Revenue;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

/** A delivery point with coordinates and revenue per enterprise (API_CONTRACT: DeliveryPoint, endpoint 7). */
public record DeliveryPointResponse(
        Long id,
        int sourceRow,
        String customerName,
        String pointName,
        String address,
        String city,
        String agent,
        Double latitude,
        Double longitude,
        GeocodeStatus geocodeStatus,
        BigDecimal totalRevenue,
        List<RevenueLine> revenues) {

    /** Revenue lines follow the enterprise order of the import. */
    public static DeliveryPointResponse of(DeliveryPoint point) {
        List<RevenueLine> revenues = point.getRevenues().stream()
                .sorted(Comparator.comparingInt((Revenue revenue) -> revenue.getEnterprise().getPosition()))
                .map(revenue -> new RevenueLine(revenue.getEnterprise().getId(), revenue.getAmount()))
                .toList();
        return new DeliveryPointResponse(point.getId(), point.getSourceRow(), point.getCustomerName(),
                point.getPointName(), point.getAddress(), point.getCity(), point.getAgent(), point.getLatitude(),
                point.getLongitude(), point.getGeocodeStatus(), point.getTotalRevenue(), revenues);
    }
}
