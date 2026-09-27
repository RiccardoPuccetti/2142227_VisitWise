# MAR-1 - Engine foundations

- **Author:** Marzella
- **Task / user stories:** MAR-1; US-19, US-20, US-21
- **What changed:** Added pure Java working-calendar, campaign-window and travel
  primitives in `planning.engine`, plus visit-parameter validation and daily
  feasibility checks. Added four unit-test classes and documented the primitives
  in `OPTIMIZATION_STRATEGY.md`.
- **Why / decisions:** These rules are the reusable foundations for MAR-2. The
  calendar follows the project's Italian holiday list, including Rome's June 29
  holiday. Campaign dates are inclusive. Marzella confirmed that the maximum
  distance means estimated one-way road distance from the supplied base. The
  daily time budget includes all visits and the complete return trip. No routing
  service, Spring dependency or persistence dependency is used by the engine.
- **Verification:** Wrote `WorkingCalendarTest`, `CampaignWindowsTest`,
  `TravelModelTest` and `VisitConstraintsTest` before their implementations.
  Initial runs failed at test compilation because the corresponding production
  classes did not exist. After implementation, all 76 cases passed with zero
  failures, errors or skips. Final Maven command (Java 21, Maven 3.9.16):
  `mvn -B -Dtest=WorkingCalendarTest,CampaignWindowsTest,TravelModelTest,VisitConstraintsTest verify`.
  The backend JAR was built successfully. Maven was invoked from the existing
  wrapper distribution with an explicit local repository path because the
  sandbox could not launch the wrapper or access the user cache correctly.
  Docker Compose and database integration tests were not run: Docker is not
  installed on this machine. No API, database, frontend or infrastructure files
  were changed.
- **Slide note:** Calendar, campaign and travel rules can be verified without a
  database. The distance model uses local Haversine estimates and includes the
  return to base in the workday budget.
- **Screenshot path:** Not applicable (pure Java engine; no UI changes).
- **Publication:** Local work only; no push or pull request. Publication awaits
  the human's explicit request.
