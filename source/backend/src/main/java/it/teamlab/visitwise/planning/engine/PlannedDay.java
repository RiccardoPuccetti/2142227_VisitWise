package it.teamlab.visitwise.planning.engine;

import java.time.LocalDate;
import java.util.List;

/** Ordered targets; km and travelMinutes include the return to base. Empty agent denotes a single visitor. */
public record PlannedDay(LocalDate date, String agent, List<VisitTarget> targets, double km,
                         double travelMinutes) {
    public PlannedDay { targets = List.copyOf(targets); }
}
