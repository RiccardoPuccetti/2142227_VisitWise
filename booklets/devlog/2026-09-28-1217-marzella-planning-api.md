# MAR-3 - Planning API

- **Author:** Marzella
- **Task / user stories:** MAR-3; US-19, US-20, US-21, US-22, US-23,
  US-25, US-26, US-27, US-28
- **What changed:** Added authenticated endpoints for campaign presets, plan
  simulation, multi-horizon what-if analysis, and the save/list/get/delete
  lifecycle of named planning scenarios. The service maps imported delivery
  points and enterprise revenues to the pure MAR-2 engine, returns routes,
  KPIs, exclusions and warnings, and persists scenario parameters, KPIs and
  planned visits. Updated the task status log for review.
- **Why / decisions:** The HTTP DTOs mirror the accepted API contract while the
  engine remains independent of Spring and JPA. What-if horizons are sorted and
  share one loaded import to avoid repeated database work. Saved visits keep the
  downstream agent-plan/export hand-off available, while deterministic
  recomputation provides the complete plan response. Existing tenant guards
  protect every import and plan URL.
- **Verification:** `PlanningControllerTest` was written before the
  implementation; its five cases initially failed with the expected `404`
  responses because the endpoints did not exist. After implementation all five
  controller cases passed. The final targeted command ran
  `PlanningControllerTest,TenantIsolationTest`: 20 tests passed with no failures,
  errors or skips. It covered campaigns, simulation, what-if marginal revenue,
  validation, scenario persistence and tenant isolation. The full suite was not
  run, following the request to test only affected functionality.
- **Slide note:** One API now turns imported revenue and locations into
  deterministic campaign routes, compares up to five horizons, and saves named
  scenarios for later comparison and agent use.
- **Screenshot path:** Not applicable (backend API, no UI).
- **Publication:** Branch `feat/MAR-3-planning-api` pushed for review; no pull
  request created.
