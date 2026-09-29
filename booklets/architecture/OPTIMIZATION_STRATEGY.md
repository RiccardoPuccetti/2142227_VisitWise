# Optimization Strategy - How VisitWise turns the brief into a solvable problem

> Status: **ACCEPTED** (scaffolding decision). Owner: Marzella. Changing it needs agreement of the whole team.
> This document is the reasoning behind the planner. It feeds slide "How we optimize".

## 1. What the brief asks

- A web dashboard for a federation of three companies (enterprises A, B and C) that supply customers at delivery points.
- Revenue grows when an agent **visits the customer in person**. A visit takes **3-4 hours**.
- Visits should be concentrated in **periods of highest interest** (before Christmas, before Easter, end of summer, ...).
- The analyst uploads the yearly ERP export (any year, the file can change), states **the maximum time to complete the visits**, and the system proposes **which visits, in which order and on which days**. Work happens **Monday to Friday** only.
- **What-if analysis** is required: "if 30 days are not enough, what happens with 40? with 20?".

## 2. What the data actually contains (and what it does not)

| Present in the file | NOT present |
|---|---|
| Customer, delivery point, address, city | Order dates / monthly breakdown |
| Agent serving that point | Visit history, visit outcomes |
| Yearly revenue per enterprise (can be negative: credit notes) | Opening hours, customer availability |
| Subtotal rows per customer and a grand total (must be skipped) | Coordinates (must be geocoded) |

What matters for the design (figures of the real file are not reported anywhere in the repository - NDA):

- Hundreds of customers, each with one or more delivery points, served by a handful of agents; most customers are in one metropolitan area, a few are far away.
- **Revenue is typically highly concentrated** (Pareto): a small share of the visit targets holds a large share of the revenue. The analytics page shows this curve for whatever file is imported.

Two consequences drive every design decision below:

1. **There is no time dimension in the data.** Seasonality cannot be *learned*; it must be *given* by the analyst (campaign calendar) - the tool must not pretend otherwise.
2. **Capacity is far smaller than demand.** One agent can do at most 2 visits per day (2 x 3.5 h + travel <= 8 h). In 20 working days that is 40 visits, far fewer than the customers each agent serves. The problem is **not** "visit everyone in the best order"; it is **"choose the visits that are worth the time, then schedule them"**.

## 3. How we interpret "maximize revenue"

We cannot predict the *incremental* revenue of a visit (no history). We use the standard key-account proxy:

> **Expected value of visiting a target = its historical revenue for the selected enterprises, multiplied by the analyst's enterprise weights.**

`value(i) = sum over enterprises e of weight(e) * max(0, revenue(i, e))`

- Negative rows (credit notes) count as 0, never as a penalty.
- Weight 0 excludes an enterprise ("only Enterprise A customers"), weights > 1 prioritize it ("Enterprise A x1.5 before Christmas"). This is how seasonality **per enterprise** is expressed without inventing data.
- Rationale for the talk: protecting and growing the largest accounts right before a peak season is where a visit has the most leverage; the Pareto curve of the data (section 2) shows why a small number of well-chosen visits covers a large share of revenue.

## 4. The decision: three options considered

| | Option A - Ranking only | Option B - Generic solver (OR-Tools / Timefold VRP) | **Option C - Domain heuristic (CHOSEN)** |
|---|---|---|---|
| Idea | Top-N customers by revenue, then fill the calendar | Model as Prize-Collecting VRP with time budget, let a solver optimize | Greedy "seed & fill" per day + local search, exploiting the 2-visits/day structure |
| Uses geography | No -> zig-zag across Rome | Yes, optimally | Yes, explicitly (revenue vs km trade-off) |
| Speed | ms | seconds to minutes, needs tuning of time limits | ms -> **what-if sweeps are instant** |
| Explainability in a 10-minute talk | Trivial | Black box | **Every choice has a one-line reason** |
| Risk in a few-day hackathon | None | High: native libs (OR-Tools) or a new framework (Timefold), non-determinism, tuning | Low: plain Java, unit-testable from minute zero |
| Deterministic | Yes | Not by default | **Yes** (same input -> same plan, essential for what-if comparisons) |

**Why C wins.** With visits of 3-4 hours a working day usually holds 2 (rarely 3) stops, so we can try every order. With shorter visits, routes can grow to the time budget using cheapest insertion (Marzella's MAR-2 decision, 2026-09-28). All the value is in **selection** and **pairing nearby visits on the same day**, which a domain heuristic handles well. It is fast enough to recompute a plan on every slider change and to run the what-if sweep in one request, it is deterministic, and we can explain it. We also report an **upper bound** (sum of the best unweighted selected revenues in `days x slots`, separately for each visitor, ignoring travel) so the revenue coverage gap is measurable. Weights affect the selection objective, so this bound measures unweighted revenue capacity rather than optimality of the weighted objective.

The engine sits behind a `VisitPlanner` interface (Strategy pattern): a Timefold implementation can be added later without touching API or UI. This is **out of scope** unless everything else is done.

## 5. Parameters exposed to the user (the "parametric dashboard")

| Parameter | Default | Why it exists |
|---|---|---|
| Campaign | Christmas / Easter / End of summer / Custom | Pre-fills start date and deadline: visits concentrate in the high-interest window |
| Start date | from campaign | First day of visits |
| **Max working days** | 20 | The brief's "at most in how much time". Only Mon-Fri, Italian public holidays excluded |
| Deadline | from campaign | Visits after it are flagged (warning + KPI) |
| Enterprise weights | 1 for each | Include/exclude/prioritize companies (seasonal emphasis) |
| Agents | all | Plan for one agent or all of them |
| Planning mode | Per agent | `PER_AGENT`: each agent visits his own customers, calendars run in parallel (matches the data). `SINGLE_VISITOR`: one person visits everyone (e.g. the owner) |
| Visit duration | 210 min | 3-4 h from the brief |
| Working day | 480 min | 8 h including travel |
| Starting point | Tenant starting base (US-35); Rome, Piazza Venezia until one is saved | Each day starts and ends here (agent's base) |
| Max distance | 80 km | Day trips only: far-away customers (other cities) are excluded and listed as "out of range" |
| Average speed / road factor | 25 km/h / 1.3 | Travel time = straight-line km x road factor / speed (urban Rome) |
| Travel penalty | 2 EUR/km | Trade-off knob: how much revenue a km of driving must be worth |
| Min revenue | 0 | Ignore tiny customers |

The maximum distance is the **one-way estimated road distance from the base**
(`great-circle km x roadFactor`), with the limit included. It is not a limit on the
total daily route. This interpretation was confirmed by Marzella for MAR-1.
Daily feasibility separately includes every travel leg, the return to the supplied
base, and all visit durations; fractional travel minutes are not rounded away.

## 6. Seasonality: campaign windows (computed for any year)

| Campaign | Window | Note |
|---|---|---|
| Christmas | Nov 1 - Dec 19 | Christmas orders are placed in November/early December |
| Easter | Easter - 42 days -> Easter - 3 days | Easter date computed with the Gregorian computus, so it works for 2026, 2027, ... |
| End of summer | Aug 25 - Sep 30 | After the August closures, restocking for autumn |
| Custom | user dates | |

Public holidays excluded: Jan 1, Jan 6, Easter Monday, Apr 25, May 1, Jun 2, Jun 29 (Rome patron saints), Aug 15, Nov 1, Dec 8, Dec 25, Dec 26.

**Scheduling rule inside the window: front-loading.** The most valuable days are placed first. If the campaign slips, the top accounts are already done, and early visits turn into orders before the peak.

### MAR-1 engine foundations

The pure Java types in `planning.engine` provide:

- `WorkingCalendar`: Gregorian Easter, the holiday calendar above, inclusive
  window counts, and the first 1..260 working dates on or after a start date.
- `CampaignWindows`: the three annual presets and custom inclusive date windows,
  with their working-day counts. Window endpoints remain as entered or specified,
  even when they are not working days; a holiday-only window has a count of zero.
- `GeoPoint` and `TravelModel`: validated coordinates and local Haversine estimates
  using a mean Earth radius of 6371.0088 km, configurable road factor and speed,
  and route totals in the supplied stop order, starting and ending at the base.
- `VisitConstraints`: visit duration, workday and distance validation, with range
  and daily feasibility checks. Defaults are 210 minutes, 480 minutes and 80 km;
  the default travel model uses 25 km/h and a road factor of 1.3.

The working-day horizon is independent of the campaign deadline: dates beyond
the deadline remain available for the later planner to flag as specified above.
These foundations do not select targets, optimize routes or expose HTTP endpoints
(MAR-2 and MAR-3).

## 7. Algorithm (reference for implementation - task MAR-2)

```
INPUT: delivery points (geocoded), parameters
1. Build visit targets: group points by (normalized address, city, agent); value = weighted revenue (section 3).
   Drop: not geocoded (count), value <= minRevenue, distance(base) > maxDistanceKm (count as out of range).
2. Partition targets: by agent (PER_AGENT) or a single group (SINGLE_VISITOR).
3. Calendar: the first `workingDays` Mon-Fri non-holiday dates from startDate.
4. For each group, for each day d = 1..workingDays:
     seed := most valuable unassigned target that fits alone (base -> seed -> base + visit <= workday)
     if none: stop
     route := [seed]
     repeat:
        for every unassigned j that can be inserted feasibly (try all orders up to 3 stops,
            cheapest insertion in the existing order above 3, no fixed stop cap):
            gain(j) := value(j) - travelCostPerKm * extraKm(j)
        take j with max gain; if gain <= 0 or none feasible: break; insert j
5. Local search (bounded iterations, deterministic tie-break by id):
     swap an assigned target with an unassigned one if the day stays feasible and
     sum(value) - travelCostPerKm * km increases.
6. Order days by total value (desc) and assign them to calendar dates (front-loading), per agent.
7. KPIs: plannedVisits, uniqueCustomers, coveredRevenue (unweighted), eligibleRevenue, coverage,
   upperBoundRevenue, totalKm, travelHours, workingDaysUsed, lastVisitDate, visitsAfterDeadline,
   excludedOutOfRange; plus the list of the most valuable targets NOT planned.
```

The greedy insertion scan is O(targets x stops) for each added visit. Local search
is bounded to 20 accepted replacements per visitor. Routes of more than three
stops use insertion into the remaining order when replacing a stop too.

### MAR-2 engine semantics and hand-off

`VisitPlanner` is the pure Java strategy interface; `GreedyVisitPlanner` implements
it using `PlannerPoint` and `PlannerParameters`, returning an immutable
`PlannerResult`. These are engine types, not HTTP DTOs. MAR-3 will map persisted
points and the existing API contract to/from them.

- Agent filters apply first (empty means all). An absent or zero enterprise weight
  excludes that enterprise. An empty weight map therefore produces no visits.
- Geocoded points are grouped by normalized address **and city**, plus the exact
  agent identifier, in both modes. Normalization uses Unicode NFKC, case folding
  with `Locale.ROOT`, trimming and collapsed whitespace; it does not guess street
  abbreviations. Null agents map to the empty string. Points without coordinates
  are counted separately and excluded before grouping. The smallest remaining
  point id supplies the target id and coordinates when geocodes differ; all source
  points remain available on the target for API mapping and unique-customer counts.
- Each revenue row is clipped at zero before aggregation. Weighted value drives
  selection and the strict `value > minRevenue` filter. Covered, eligible and upper
  bound revenue sum positive revenues of enterprises with weight > 0, without
  multiplying by weights (confirmed by Marzella, 2026-09-28).
- Eligible revenue includes in-range targets that cannot fit even alone. These
  remain candidates for the top-20 unplanned list. Range exclusions count grouped
  targets after the value filter; missing-geocode exclusions count source points.
- Capacity has no three-stop cap. All visit minutes and every travel leg, including
  return to the supplied base, count without rounding. Insertions require positive
  weighted gain after the distance penalty. A seed only needs to fit the day.
- All comparisons use stable target ids for ties. Local search takes the first
  strict improvement in day / assigned-id / unassigned-id order, then restarts,
  up to 20 accepted swaps. Days are subsequently ordered by weighted value per
  visitor. The engine is stateless and input-order independent.
- The upper bound sorts eligible **unweighted** target revenues within each
  visitor, taking at most `workingDays * floor(workdayMinutes / visitDurationMinutes)`.
  PER_AGENT calendars run in parallel; `workingDaysUsed` counts distinct dates.
  SINGLE_VISITOR day entries use an empty agent string; targets retain their agents.
- Unique customers are distinct source customer names across planned targets.
  Empty plans have zero coverage and no last visit date. Deadline is a soft limit:
  visits after it remain scheduled and are counted. The unplanned list contains
  the 20 highest weighted-value eligible targets, with id ties.
- Distance caching is bounded to 2,000 targets (about 32 MB at that limit); larger
  inputs calculate distances directly. No network calls, Spring or JPA are used.

Verification: 26 planner/parameter test cases plus 64 relevant MAR-1 cases pass.
The 1,000-point synthetic test (30-minute visits, 20 working days) verifies the
2-second computation limit, feasibility, uniqueness and equality after reversing
the input. Its full test case, including both runs, took 0.54 s locally on Java 21.
This is a local synthetic check, not a guarantee for every dataset or machine.

## 8. What-if analysis

- `POST /api/imports/{id}/plans/what-if` runs step 1-7 for each horizon (e.g. 10, 20, 30, 40, 60 days) with the same parameters.
- The UI shows the **coverage curve** (covered revenue vs working days) and the **marginal revenue** of each extra block of days: this answers "is it worth 40 days instead of 30?" with diminishing returns visible at a glance.
- Saved plans (scenarios) can be compared side by side (KPIs + differences in visited customers).

## 9. Maps, geocoding and routing choices

- **Map**: OpenLayers + OpenStreetMap tiles (as required).
- **Geocoding**: public Nominatim, **max 1 request/second** with an identifying User-Agent (usage policy). Mitigations: a **global cache table** (an address is geocoded once, ever: re-importing next year's file is fast), background processing with progress, optional Latitude/Longitude columns in the template, manual fix for addresses not found.
- **Privacy/NDA**: only `address + city` are sent to Nominatim. Customer names and revenues never leave our containers.
- **Travel times for selection**: computed locally (straight line x road factor / speed), not with a routing API. A public OSRM demo server has no SLA and a 700 x 700 matrix is exactly what its usage policy forbids; with at most 3 stops a day the approximation error does not change which visits are chosen.
  - **Update 2026-09-28 (US-39, PUC-14, decision D-11)**: with the optional self-hosted OSRM (Compose profile `osrm`, `ROUTING_MATRIX_ENABLED=true`) the engine receives measured road distances and driving times (`RoadMatrix`, OSRM table service) and uses them for the range limit, the working-day check and the route length; the estimate stays the default and the fallback for every pair the road network cannot answer. The plan KPIs carry `travelSource` (`OSRM` or `ESTIMATE`). Road times may differ by direction, so the engine keeps both directions.
- **Real road route of the displayed day** (implemented 2026-09-28, endpoint 18b): once the plan exists, the planner asks the backend for the OSRM `route/v1/driving` polyline of the *selected day only* (base -> stops -> base, at most 30 stops: a handful of requests per session, well within the demo server policy). The map draws the road geometry and shows real km/minutes with a "road route" badge; when OSRM is disabled (`ROUTING_ENABLED=false`) or unreachable the response is marked `ESTIMATE` and uses the same Haversine model as the KPIs, so the page never breaks and the two figures never disagree on the fallback. The call goes through the backend because the SPA's CSP allows `connect-src 'self'` only.

## 10. Out of scope (said explicitly in the talk)

Real incremental-revenue prediction, customer opening hours / time windows, multi-day trips with overnight stays, traffic-aware routing, authentication. Each is a natural extension point of the architecture.
