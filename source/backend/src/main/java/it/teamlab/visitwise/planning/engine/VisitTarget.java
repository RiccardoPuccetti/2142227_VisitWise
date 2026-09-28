package it.teamlab.visitwise.planning.engine;

import java.util.List;

/** One visit for an address/city and agent; id and location come from the lowest geocoded point id. */
public record VisitTarget(long id, String agent, GeoPoint location, List<PlannerPoint> points,
                          double value, double revenue) {
    public VisitTarget { points = List.copyOf(points); }
}
