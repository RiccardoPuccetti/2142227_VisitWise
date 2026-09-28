package it.teamlab.visitwise.planning;

import it.teamlab.visitwise.analytics.DeliveryPointResponse;
import it.teamlab.visitwise.planning.engine.PlanningMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** HTTP DTOs for planning endpoints 11-17 in API_CONTRACT.md. */
public final class PlanningDtos {

    private PlanningDtos() {
    }

    public enum CampaignCode { CHRISTMAS, EASTER, END_OF_SUMMER, CUSTOM }

    public record EnterpriseWeight(Long enterpriseId, double weight) { }

    public record GeoPoint(double latitude, double longitude) { }

    public record PlanParameters(
            CampaignCode campaign,
            LocalDate startDate,
            LocalDate deadline,
            int workingDays,
            List<EnterpriseWeight> enterpriseWeights,
            List<String> agents,
            PlanningMode planningMode,
            int visitDurationMinutes,
            int workdayMinutes,
            double averageSpeedKmh,
            double roadFactor,
            double maxDistanceKm,
            GeoPoint base,
            double travelCostPerKm,
            double minRevenue) { }

    public record PlanKpis(
            int plannedVisits,
            int uniqueCustomers,
            double coveredRevenue,
            double eligibleRevenue,
            double coverage,
            double upperBoundRevenue,
            double totalKm,
            double travelHours,
            int workingDaysUsed,
            LocalDate lastVisitDate,
            int visitsAfterDeadline,
            int excludedOutOfRange) { }

    public record PlannedVisitResponse(
            Long deliveryPointId,
            String customerName,
            String pointName,
            String address,
            String city,
            String agent,
            double latitude,
            double longitude,
            LocalDate date,
            int dayIndex,
            int slot,
            double expectedRevenue,
            double travelKm) { }

    public record PlanDay(LocalDate date, String agent, List<PlannedVisitResponse> visits, double km) { }

    public record PlanResult(
            Long id,
            String name,
            PlanParameters parameters,
            PlanKpis kpis,
            List<PlanDay> days,
            List<DeliveryPointResponse> notPlanned,
            List<String> warnings) { }

    public record PlanSummary(
            Long id,
            String name,
            OffsetDateTime createdAt,
            PlanParameters parameters,
            PlanKpis kpis) { }

    public record WhatIfRequest(PlanParameters base, List<Integer> horizons) { }

    public record WhatIfRow(int workingDays, PlanKpis kpis, double marginalRevenue) { }

    public record WhatIfResult(List<WhatIfRow> rows) { }

    public record CreatePlanRequest(String name, PlanParameters parameters) { }

    /** Endpoint 18: the ordered stops of one day (base excluded), plus the travel model for the estimate fallback. */
    public record RouteRequest(GeoPoint base, List<GeoPoint> stops, double averageSpeedKmh, double roadFactor) { }

    public enum RouteSource { OSRM, ESTIMATE }

    public record RouteLeg(double km, double minutes) { }

    /** Base -> stops -> base: real road figures when {@code source = OSRM}, straight-line estimate otherwise. */
    public record RouteResponse(RouteSource source, double km, double minutes, List<RouteLeg> legs,
                                List<GeoPoint> geometry) { }
}
