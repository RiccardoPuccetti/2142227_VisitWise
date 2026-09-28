package it.teamlab.visitwise.planning.engine;

import java.time.LocalDate;
import java.util.List;

public record PlannerResult(List<PlannedDay> days, Kpis kpis, List<VisitTarget> notPlanned,
                            int excludedNotGeocoded) {
    public PlannerResult {
        days = List.copyOf(days);
        notPlanned = List.copyOf(notPlanned);
    }

    /** Working days used counts distinct dates, rather than the sum of agent-days. */
    public record Kpis(int plannedVisits, int uniqueCustomers, double coveredRevenue,
                       double eligibleRevenue, double coverage, double upperBoundRevenue,
                       double totalKm, double travelHours, int workingDaysUsed,
                       LocalDate lastVisitDate, int visitsAfterDeadline, int excludedOutOfRange) { }
}
