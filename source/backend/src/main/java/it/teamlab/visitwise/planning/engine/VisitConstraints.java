package it.teamlab.visitwise.planning.engine;

import java.util.List;

/** Validated visit settings and feasibility rules; does not select or reorder targets. */
public record VisitConstraints(int visitDurationMinutes, int workdayMinutes, double maxDistanceKm) {

    public static final VisitConstraints DEFAULT = new VisitConstraints(210, 480, 80);

    public VisitConstraints {
        if (visitDurationMinutes < 30 || visitDurationMinutes > 480) {
            throw new IllegalArgumentException("Visit duration must be between 30 and 480 minutes");
        }
        if (workdayMinutes < visitDurationMinutes) {
            throw new IllegalArgumentException("Workday must be at least as long as a visit");
        }
        if (!Double.isFinite(maxDistanceKm) || maxDistanceKm < 0) {
            throw new IllegalArgumentException("Maximum distance must be finite and non-negative");
        }
    }

    /** The inclusive range limit applies to one-way estimated road distance from the base. */
    public boolean isWithinRange(GeoPoint base, GeoPoint target, TravelModel travel) {
        requireTravel(travel);
        return travel.roadDistanceKm(base, target) <= maxDistanceKm;
    }

    public boolean fitsDay(GeoPoint base, List<GeoPoint> stops, TravelModel travel) {
        requireTravel(travel);
        double travelMinutes = travel.roundTripMinutes(base, stops);
        for (GeoPoint stop : stops) {
            if (!isWithinRange(base, stop, travel)) {
                return false;
            }
        }
        return travelMinutes + (double) stops.size() * visitDurationMinutes <= workdayMinutes;
    }

    private static void requireTravel(TravelModel travel) {
        if (travel == null) {
            throw new IllegalArgumentException("Travel model is required");
        }
    }
}
