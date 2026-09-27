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
  Docker was initially unavailable to the session; subsequent checks found that
  the WSL2 hypervisor was not active. After the host was configured, the Docker
  verification below completed successfully. No API, database, frontend or
  infrastructure files were changed.
- **Docker verification (2026-09-28):** `docker compose up -d --build` built and
  started PostgreSQL, the backend and the frontend successfully. Built a test
  image from the existing backend Dockerfile with `docker build --target build
  --tag visitwise-mar1-tests ./backend`, then ran `mvn -B --no-transfer-progress
  verify` in that image against a separate PostgreSQL 17 container on a temporary
  network. All **155 backend tests passed**, including the 76 MAR-1 cases:
  zero failures, errors or skipped tests. Liquibase initialized the empty test
  database successfully. HTTP checks: backend `/actuator/health` returned `UP`,
  frontend `/` returned 200, and `/api/auth/csrf` through the frontend proxy
  returned 204 with the CSRF cookie. Reports and logs are saved locally under
  `source/backend/target/docker-mar1-reports/` and
  `source/backend/target/docker-mar1-test.log` (gitignored). The temporary test
  resources were removed after verification; the application stack was left
  running. The frontend build emitted four CSS syntax warnings and npm reported
  seven high-severity dependency vulnerabilities; no frontend files or
  dependencies were changed because they are outside MAR-1.
- **Slide note:** Calendar, campaign and travel rules can be verified without a
  database. The distance model uses local Haversine estimates and includes the
  return to base in the workday budget.
- **Screenshot path:** Not applicable (pure Java engine; no UI changes).
- **Publication:** Marzella authorized the first push of
  `feat/MAR-1-engine-basics` to GitHub. No pull request has been opened.
