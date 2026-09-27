package it.teamlab.visitwise.analytics;

import it.teamlab.visitwise.imports.GeocodeStatus;
import java.math.BigDecimal;
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
}
