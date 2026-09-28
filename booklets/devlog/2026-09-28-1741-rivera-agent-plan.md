# RIV-4 - Agent plan page and Excel export

- **Author:** Rivera
- **Task / user stories:** RIV-4; US-28, US-29, US-30
- **What changed:** Added `GET /api/plans/{planId}/export` (endpoint 18) in
  `planning.export`: the saved visits of a plan as an .xlsx file with one sheet
  per agent (date, order, customer, delivery point, address, city, expected
  revenue, km from the previous stop), or only one agent with `?agent=`.
  Replaced the placeholder of `imports/:importId/plans/:planId` with the agent
  plan page: plan name, dates, warnings and indicators, then a calendar week by
  week from Monday to Friday with the visits of each day in order, the days
  after the deadline flagged, OpenStreetMap directions by car from the previous
  stop (the base for the first visit) in a new tab, an agent filter kept in the
  URL and an "Export to Excel" link for the whole plan or the chosen agent.
  Updated `Student_doc.md`, the task status log and the story statuses.
- **Why / decisions:** The export reads the stored `planned_visit` rows through
  the repository method MAR-3 prepared for it, so the file is the plan as
  saved. An agent with no visits in the plan answers `404`, like a missing plan.
  Sheet names are cleaned for Excel (31 characters, no `: \ / ? * [ ]`) and made
  unique; visits without agent go to a "No agent" sheet, or "Single visitor" in
  single-visitor mode. Column widths are fixed because auto-size needs fonts on
  the server. On the page, dates are handled in UTC so a daylight saving change
  never moves a day; the calendar has five columns from 768 px (US-28) and one
  column on phones. The export is a plain link with `download`: the browser
  sends the session cookie and no CSRF token is needed for a GET.
- **Verification:** Tests written first. Backend: `PlanWorkbookTest` (5) did
  not compile before `PlanWorkbook` existed; `PlanExportControllerTest` (5)
  failed with `404` "No static resource api/plans/{id}/export" before the
  controller; both pass after. Frontend: `plan.model.spec.ts` (9) and
  `plans.service.spec.ts` (1) failed because the modules did not exist,
  `plan-detail-page.spec.ts` (7) failed because the placeholder made no request;
  all 17 pass after. After merging `develop` (`fe7180a`): backend
  `./mvnw verify` 325 tests, 0 failures; frontend `ng test` 195 tests, 0
  failures; `ng build` succeeds with the initial budget warning already on
  `develop`. In the browser (768 px, demo tenant, synthetic sample import, a
  10-day plan saved through the API): calendar, deadline badges, agent filter in
  the URL and directions links checked; the downloaded file has one sheet per
  agent and as many rows as the planned visits of the KPI.
- **Slide note:** The agent opens their plan as a weekly calendar, gets
  OpenStreetMap directions to the next customer in one tap and takes the plan
  offline as an Excel file with one sheet per agent.
- **Screenshot path:** Not added yet (`booklets/slides/assets/` does not exist
  in the repository).
- **Publication:** Branch `RIV-4`, not pushed at the time of writing.
