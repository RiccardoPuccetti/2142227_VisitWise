package it.teamlab.visitwise.planning.engine;

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

    /** The inclusive range limit applies to the one-way road distance from the base (estimated or measured). */
    public boolean isWithinRange(GeoPoint base, GeoPoint target, Travel travel) {
        requireTravel(travel);
        return travel.roadDistanceKm(base, target) <= maxDistanceKm;
    }

    /** A day holds its visits and all its travel, return to the base included; fractional minutes are not rounded. */
    public boolean fitsWorkday(double travelMinutes, int visits) {
        return travelMinutes + (double) visits * visitDurationMinutes <= workdayMinutes;
    }

    private static void requireTravel(Travel travel) {
        if (travel == null) {
            throw new IllegalArgumentException("Travel model is required");
        }
    }
}
