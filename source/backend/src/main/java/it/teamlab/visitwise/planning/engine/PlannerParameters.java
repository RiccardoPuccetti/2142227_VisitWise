package it.teamlab.visitwise.planning.engine;

import java.time.LocalDate;
import java.util.Map;
import java.util.Set;

/**
 * Weights omitted from the map are excluded; an empty agent set selects all agents. {@code roads} gives the distances
 * and times used for range, workday and route length: the {@code travel} estimate unless road figures are supplied.
 */
public record PlannerParameters(LocalDate startDate, LocalDate deadline, int workingDays,
                                Map<Long, Double> enterpriseWeights, Set<String> agents,
                                PlanningMode planningMode, GeoPoint base, VisitConstraints constraints,
                                TravelModel travel, double travelCostPerKm, double minRevenue, Travel roads) {

    public PlannerParameters(LocalDate startDate, LocalDate deadline, int workingDays,
                             Map<Long, Double> enterpriseWeights, Set<String> agents,
                             PlanningMode planningMode, GeoPoint base, VisitConstraints constraints,
                             TravelModel travel, double travelCostPerKm, double minRevenue) {
        this(startDate, deadline, workingDays, enterpriseWeights, agents, planningMode, base, constraints, travel,
                travelCostPerKm, minRevenue, travel);
    }

    public PlannerParameters {
        if (roads == null) {
            roads = travel;
        }
        if (startDate == null || startDate.getYear() < 1 || deadline == null || deadline.getYear() < 1
                || workingDays < 1 || workingDays > 260 || enterpriseWeights == null || agents == null
                || planningMode == null || base == null || constraints == null || travel == null) {
            throw new IllegalArgumentException("Valid dates, horizon (1..260) and planner settings are required");
        }
        if (!Double.isFinite(travelCostPerKm) || travelCostPerKm < 0
                || !Double.isFinite(minRevenue) || minRevenue < 0) {
            throw new IllegalArgumentException("Travel penalty and minimum revenue must be finite and non-negative");
        }
        for (var entry : enterpriseWeights.entrySet()) {
            if (entry.getKey() == null || entry.getKey() <= 0 || entry.getValue() == null
                    || !Double.isFinite(entry.getValue()) || entry.getValue() < 0) {
                throw new IllegalArgumentException("Enterprise weights must be finite and non-negative with positive ids");
            }
        }
        if (agents.stream().anyMatch(java.util.Objects::isNull)) {
            throw new IllegalArgumentException("Agent filters cannot contain null");
        }
        enterpriseWeights = Map.copyOf(enterpriseWeights);
        agents = Set.copyOf(agents);
    }
}
