package it.teamlab.visitwise.planning.engine;

import java.util.List;

/** Strategy boundary for deterministic, side-effect-free visit planning. */
public interface VisitPlanner {
    PlannerResult plan(List<PlannerPoint> points, PlannerParameters parameters);
}
