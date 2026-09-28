# MAR-4 - Visit planner page

- **Author:** Marzella
- **Task / user stories:** MAR-4; US-19, US-20, US-21, US-22, US-23,
  US-24, US-25
- **What changed:** Replaced the planner placeholder with the campaign and
  visit-parameter form, enterprise priorities, optional agent filters, client
  validation, simulation results, KPIs, day-by-day timeline, the selected
  itinerary on `MapView`, valuable excluded customers and named scenario save.
  Added the focused API, model and page tests and updated the task status log.
- **Why / decisions:** The page mirrors the accepted planning API contract and
  uses the existing analytics summary to obtain enterprise and agent options.
  Routes contain the base before and after the selected day's visits. Until
  PUC-10 provides the tenant starting-base component and API, the form uses the
  documented Rome fallback. Existing spartan components provide accessible
  fields, feedback, tables and cards without adding dependencies.
- **Verification:** Tests were written before implementation. The first focused
  run failed at compilation because `planner.service` and `planner.model` did
  not exist; the page test then failed because the placeholder sent no requests.
  After implementation, the final targeted run of `planner-page.spec.ts`,
  `planner.service.spec.ts` and `planner.model.spec.ts` passed all 6 tests. The
  Angular production build also completed successfully. The full test suite was
  not run, following the request to test only affected functionality. The build
  retained the pre-existing spartan CSS syntax warnings and exceeded the
  initial bundle budget by 3.67 kB.
- **Slide note:** Analysts can configure a campaign, prioritize enterprises,
  inspect daily routes and planning KPIs, and save the result as a reusable
  named scenario from one workflow.
- **Screenshot path:** Not captured, at the explicit request to push without a
  screenshot.
- **Publication:** Branch `feat/MAR-4-planner-page` pushed for review; no pull
  request created.
