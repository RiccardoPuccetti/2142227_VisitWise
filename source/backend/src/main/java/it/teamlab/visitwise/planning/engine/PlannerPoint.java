package it.teamlab.visitwise.planning.engine;

import java.util.Map;

/** Engine input, independent of persistence. A null location means not geocoded. */
public record PlannerPoint(long id, String customerName, String pointName, String address,
                           String city, String agent, GeoPoint location, Map<Long, Double> revenues) {
    public PlannerPoint {
        if (id <= 0 || customerName == null || customerName.isBlank() || pointName == null
                || address == null || address.isBlank() || city == null || city.isBlank()
                || revenues == null) {
            throw new IllegalArgumentException("Point identity, customer, address, city and revenues are required");
        }
        agent = agent == null ? "" : agent;
        for (var entry : revenues.entrySet()) {
            if (entry.getKey() == null || entry.getKey() <= 0 || entry.getValue() == null
                    || !Double.isFinite(entry.getValue())) {
                throw new IllegalArgumentException("Revenue requires a positive enterprise id and a finite amount");
            }
        }
        revenues = Map.copyOf(revenues);
    }
}
