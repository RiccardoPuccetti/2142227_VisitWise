# PUC-3 - Imports list, detail and delete API

- **Author:** Puccetti
- **Task / user stories:** PUC-3; US-10, US-11, US-12
- **What changed:** Added the last three import endpoints of the contract.
  `GET /api/imports` (endpoint 4) returns the logged-in tenant's imports as
  `ImportSummary[]`, newest first. `GET /api/imports/{id}` (endpoint 5) returns
  `ImportDetail`: the summary plus the column mapping saved at import time, the
  agents and cities of the import (sorted, without duplicates), the number of
  points not found by the geocoder and the geocoding error message.
  `DELETE /api/imports/{id}` (endpoint 6) deletes the import and answers `204`.
  Added a new dated section to the task status log.
- **Why / decisions:** The list reads the enterprises of all the tenant's imports
  in one query and groups them by import, instead of one query per import, for
  the "< 1 s with 100 imports" requirement of US-10. Imports created in the same
  instant are ordered by id, so the order is stable. The delete relies on the
  `ON DELETE CASCADE` foreign keys of changeset 001 (enterprises, points,
  revenues, plans, planned visits): no new changeset. A geocoding job still
  running for a deleted import finds no points and stops. The geocode cache is
  shared by all tenants and is kept. Ownership is checked by the tenant guard,
  so another tenant's import answers `404` for detail and delete.
- **Verification:** Tests written first. `ImportReadDeleteTest` (9): before the
  implementation the list answered `405` and detail and delete answered `404`
  (6 failures); the three tests for another tenant's import and the missing
  CSRF token passed already, because the guard and CSRF were in place. After:
  9/9 pass, together with `ImportCreateTest` (15) and `TenantIsolationTest`
  (15), which uses the renamed list query. Tests run with Maven in Docker
  against the compose `db` container, on synthetic rows only.
- **Slide note:** The analyst sees every import of their federation, opens one to
  check its mapping and geocoding result, and deletes an outdated file with all
  its plans in one step.
- **Screenshot path:** None (backend only; the pages are PUC-6).
- **Publication:** Branch `feat/PUC-3-import-list-detail-delete`, not pushed at
  the time of writing.
