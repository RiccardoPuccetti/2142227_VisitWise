# Optimization Strategy

Source: [planning.engine](../../source/backend/src/main/java/it/teamlab/visitwise/planning/engine) and [PlanningService](../../source/backend/src/main/java/it/teamlab/visitwise/planning/PlanningService.java).

## Objective and scope

The planner chooses which delivery locations to visit, their order and working dates within a limited horizon.
Historical enterprise revenue is a prioritization proxy; the system does not predict additional sales caused by visits.
Campaign dates and enterprise weights express the analyst's seasonal priorities; seasonality is not learned from yearly totals.
A deterministic heuristic keeps selection explainable and supports repeated what-if calculations without an external solver.

## Targets and revenue

- Filter agents first: an empty list means all. Exclude points without coordinates and report their count.
- Group located points by normalized address **and city**, plus exact agent, in both planning modes.
- Address normalization uses NFKC, case conversion, trimming and collapsed whitespace; it does not expand street abbreviations.
- The smallest source point id supplies target id and coordinates; all grouped points contribute revenue and customer names.
- `value(target) = sum(weight[enterprise] * max(0, source revenue))` across grouped source points.
- Missing or zero weights exclude an enterprise; an empty weight map yields no visits. Negative revenue entries contribute zero.
- Weighted value drives selection and the strict `value > minRevenue` filter.
- Covered/eligible revenue instead sums positive amounts for selected enterprises without weights. Analytics elsewhere uses net amounts, so its totals can differ.
- Exclude targets whose one-way base-to-target distance exceeds `maxDistanceKm`; equality is allowed. Count range exclusions after the value filter.
- Remaining targets are eligible even if they cannot fit alone in a workday; they still count toward eligible revenue and unplanned results.

## Parameters and calendar

| Parameter | Frontend default / behavior |
|---|---|
| Campaign | Christmas, Easter, end of summer, or custom dates |
| Horizon | 20 working days; API accepts 1..260 |
| Mode | `PER_AGENT`: parallel calendars; `SINGLE_VISITOR`: one shared calendar |
| Enterprise weights / agents | Weight 1 per enterprise / all agents initially |
| Visit / workday | 210 / 480 minutes; visits 30..480, workday at least one visit |
| Base | Saved tenant coordinates; otherwise Rome `41.8960, 12.4823` in the frontend |
| Maximum distance | 80 km one-way from base, not a daily route-length cap |
| Estimated travel | 25 km/h and road factor 1.3 |
| Travel penalty / minimum value | 2 EUR/km / 0 |
| Deadline | Optional soft limit; late visits remain scheduled and counted |

The API requires the base and planning settings; it does not fill them from the tenant automatically.
Dates are the first requested working days on/after `startDate`, independent of the deadline.
The implemented calendar excludes weekends, Jan 1/6, Easter Monday, Apr 25, May 1, Jun 2/29, Aug 15, Nov 1, Dec 8/25/26.
Campaign presets are Nov 1-Dec 19, Easter minus 42 through minus 3 days, and Aug 25-Sep 30; Easter is computed for the requested year.

## Selection and scheduling

1. Build and filter targets as above; partition by agent for `PER_AGENT`, or put all targets in one visitor group.
2. For each available day, seed a route with the highest-value unassigned target that fits alone, including return to base.
3. Try adding each remaining target; calculate `gain = value - travelCostPerKm * extraKm` and accept the best feasible positive gain.
4. For up to three stops, enumerate route orders and choose the shortest distance; above three, use cheapest insertion into the existing order. Check workday feasibility on that chosen route.
5. Continue until no positive feasible insertion remains. There is no fixed two- or three-stop daily cap.
6. Apply at most 20 improving assigned/unassigned replacements per visitor. Each replacement must fit and increase weighted value minus distance penalty.
7. Sort completed days by weighted value within each visitor and place the most valuable days first on the working calendar.

All visit durations, travel legs and the return to base count toward the workday; fractional travel minutes are retained.
Stable id-based ordering resolves ties. Given identical points, parameters and travel data, the engine is input-order independent.
The engine caches directional distances and times for up to 2,000 targets; larger inputs calculate them directly.
It remains a heuristic: shortest-distance ordering, greedy selection and bounded replacements do not prove global optimality.

## Travel data and route display

- Default travel uses Haversine distance (Earth radius 6371.0088 km) times road factor; minutes derive from average speed.
- Optional OSRM matrices provide directional road km/minutes for range checks, day feasibility and route totals.
- Matrix use requires routing enabled, `ROUTING_MATRIX_ENABLED=true` and a self-hosted `ROUTING_BASE_URL`; the Compose profile alone is insufficient.
- The provider loads base plus all located import coordinates, requests table blocks and caches four matrices by coordinate list.
- Unreachable pairs or points snapped more than 1 km use the estimated model. An unavailable matrix makes the whole run estimated.
- `travelSource=OSRM` means a matrix was supplied; it does not guarantee road data for every leg. Speed/road factor affect estimated legs only.
- Day-route display independently calls OSRM with 1..30 ordered stops plus base at both ends, returning geometry, legs, km and minutes.
- Route display falls back to straight segments and estimates when disabled/unavailable. Its values can differ from planning KPIs and do not replace them.
- The public route service receives coordinates by default; self-hosting keeps routing requests local. The pure engine makes no network calls.

## Results, what-if and persistence

- `plannedVisits` counts grouped targets; `uniqueCustomers` counts distinct source customer names in those targets.
- Coverage is covered / eligible unweighted positive revenue, or zero when no eligible revenue exists.
- `upperBoundRevenue` takes the highest unweighted eligible revenues per visitor, up to `workingDays * floor(workdayMinutes / visitDurationMinutes)`, ignoring travel.
- This bound measures unweighted revenue capacity, not optimality of the weighted selection objective.
- `workingDaysUsed` counts distinct dates across parallel agents; late visits are counted against the soft deadline; empty plans have no last visit date.
- The unplanned list contains up to 20 eligible targets ranked by weighted value. API entries represent each group through its smallest-id point.
- Planned API visits carry the grouped revenue; single-visitor day/visit agent is null. The representative point does not enumerate every grouped source point.
- What-if accepts up to five horizons, deduplicates/sorts them, and reuses loaded input/matrix. Marginal revenue is the change from the preceding horizon, starting at zero.
- The UI offers coverage comparison and saved-scenario comparison; the heuristic does not guarantee strictly diminishing marginal returns.
- Save recomputes and persists parameters, KPIs and visits; list returns stored summaries, detail recomputes with current data, and export uses stored visits.

## Limits

No incremental-revenue prediction, customer availability/opening hours, overnight trips, live traffic or exact global optimization is implemented.
Authentication and tenant isolation are implemented separately; see [Authentication](AUTHENTICATION.md).
