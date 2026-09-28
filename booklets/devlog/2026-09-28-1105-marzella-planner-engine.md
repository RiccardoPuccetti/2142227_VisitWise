# MAR-2 - Deterministic visit planner

- **Author:** Marzella
- **Task / user stories:** MAR-2; US-22, US-23, US-25
- **What changed:** Added the pure Java `VisitPlanner` strategy, immutable engine
  inputs/results and `GreedyVisitPlanner`: grouping, filters, seed-and-fill,
  bounded local search, front-loading, revenue/travel KPIs and top-20 omissions.
  Updated the strategy, task status and related story statuses.
- **Why / decisions:** Marzella confirmed filling days up to their time capacity,
  including more than three stops, and using positive unweighted revenues of
  selected enterprises for revenue KPIs. All permutations are evaluated up to
  three stops, then cheapest insertion is used. Local search permits 20 improving
  swaps per visitor. The strategy documents grouping, deterministic ties,
  exclusions, upper bounds and the engine-to-API hand-off.
- **Verification:** `GreedyVisitPlannerTest` was written before the implementation;
  red runs failed at compilation because `GreedyVisitPlanner` did not exist.
  The first implementation passed 13 functional cases but failed the 2-second
  synthetic performance limit at 2.285 s. Pruning candidates that cannot improve
  insertion gain and reusing the remainder route fixed that failure. Additional
  regression tests cover front-loading, exact three-stop routing, per-agent upper
  bounds and immutable/validated inputs. Final targeted command:
  `mvn -B -Dtest=GreedyVisitPlannerTest,PlannerParametersTest,WorkingCalendarTest,VisitConstraintsTest,TravelModelTest verify`.
  All 90 cases passed (26 new, 64 existing), no failures/errors/skips; the backend
  executable JAR built successfully. The synthetic 1,000-point case, including
  both input-order runs, took 0.54 s. Maven 3.9.16 was launched from the existing
  wrapper distribution with its user cache because the wrapper/sandbox could not
  read the cache correctly. Full-suite, frontend, database and Docker checks were
  not run, following the user's request to test only affected functionality.
- **Slide note:** The planner selects valuable nearby visits within the workday,
  keeps parallel agent calendars deterministic, and reports coverage against a
  travel-free upper bound. Shorter visits can use more than three daily slots.
- **Screenshot path:** Not applicable (pure engine, no UI).
- **Publication:** Local branch `codex/MAR-2-planner-engine`; no push or PR requested.
