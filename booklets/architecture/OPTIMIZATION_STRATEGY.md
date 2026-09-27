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

**Why C wins.** With visits of 3-4 hours a working day holds at most 2 (rarely 3) stops, so the routing part is tiny (at most 3 stops: we can try every order). All the value is in **selection** and **pairing nearby visits on the same day**, which a domain heuristic handles well. It is fast enough to recompute a plan on every slider change and to run the what-if sweep in one request, it is deterministic, and we can explain it. We also report an **upper bound** (sum of the best `days x slots` values ignoring travel) so the quality of the heuristic is measurable: the gap between plan and upper bound is shown in the KPIs.

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
| Starting point | Rome, Piazza Venezia | Each day starts and ends here (agent's base) |
| Max distance | 80 km | Day trips only: far-away customers (other cities) are excluded and listed as "out of range" |
| Average speed / road factor | 25 km/h / 1.3 | Travel time = straight-line km x road factor / speed (urban Rome) |
| Travel penalty | 2 EUR/km | Trade-off knob: how much revenue a km of driving must be worth |
| Min revenue | 0 | Ignore tiny customers |

## 6. Seasonality: campaign windows (computed for any year)

| Campaign | Window | Note |
|---|---|---|
| Christmas | Nov 1 - Dec 19 | Christmas orders are placed in November/early December |
| Easter | Easter - 42 days -> Easter - 3 days | Easter date computed with the Gregorian computus, so it works for 2026, 2027, ... |
| End of summer | Aug 25 - Sep 30 | After the August closures, restocking for autumn |
| Custom | user dates | |

Public holidays excluded: Jan 1, Jan 6, Easter Monday, Apr 25, May 1, Jun 2, Jun 29 (Rome patron saints), Aug 15, Nov 1, Dec 8, Dec 25, Dec 26.

**Scheduling rule inside the window: front-loading.** The most valuable days are placed first. If the campaign slips, the top accounts are already done, and early visits turn into orders before the peak.

## 7. Algorithm (reference for implementation - task MAR-2)

```
INPUT: delivery points (geocoded), parameters
1. Build visit targets: group points by (normalized address, agent); value = weighted revenue (section 3).
   Drop: not geocoded (count), value <= minRevenue, distance(base) > maxDistanceKm (count as out of range).
2. Partition targets: by agent (PER_AGENT) or a single group (SINGLE_VISITOR).
3. Calendar: the first `workingDays` Mon-Fri non-holiday dates from startDate.
4. For each group, for each day d = 1..workingDays:
     seed := most valuable unassigned target that fits alone (base -> seed -> base + visit <= workday)
     if none: stop
     route := [seed]
     repeat:
        for every unassigned j that can be inserted feasibly (cheapest insertion, <= 3 stops: try all orders):
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

Complexity is O(days x targets x stops) per group: milliseconds for ~1000 targets.

## 8. What-if analysis

- `POST /api/imports/{id}/plans/what-if` runs step 1-7 for each horizon (e.g. 10, 20, 30, 40, 60 days) with the same parameters.
- The UI shows the **coverage curve** (covered revenue vs working days) and the **marginal revenue** of each extra block of days: this answers "is it worth 40 days instead of 30?" with diminishing returns visible at a glance.
- Saved plans (scenarios) can be compared side by side (KPIs + differences in visited customers).

## 9. Maps, geocoding and routing choices

- **Map**: OpenLayers + OpenStreetMap tiles (as required).
- **Geocoding**: public Nominatim, **max 1 request/second** with an identifying User-Agent (usage policy). Mitigations: a **global cache table** (an address is geocoded once, ever: re-importing next year's file is fast), background processing with progress, optional Latitude/Longitude columns in the template, manual fix for addresses not found.
- **Privacy/NDA**: only `address + city` are sent to Nominatim. Customer names and revenues never leave our containers.
- **Travel times**: computed locally (straight line x road factor / speed), not with a routing API. A public OSRM demo server has no SLA and a 700 x 700 matrix is exactly what its usage policy forbids; with at most 3 stops a day the approximation error does not change which visits are chosen. Drawing real road polylines for a single day is an optional extra.

## 10. Out of scope (said explicitly in the talk)

Real incremental-revenue prediction, customer opening hours / time windows, multi-day trips with overnight stays, traffic-aware routing, authentication. Each is a natural extension point of the architecture.
