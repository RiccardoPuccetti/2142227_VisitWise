# Task status log

Status of every task in `TASKS.md`, checked against what is merged in `develop` (commits, endpoints, pages), not
against what is planned. Newest check first: add a new dated section on top, do not edit the old ones.

**Every time a task is completed** (or partly done when its work is merged), whoever did it - person or AI agent - adds a new section in the same PR (`source/AGENTS.md`, section 6 rule 9, and the Definition of Done): copy the latest section, update the rows of that task, the summary and the blockers, and put the `develop` commit in the title.

Legend: ✅ done (merged in `develop`) · 🟡 partly done · ❌ not started · ⏭️ skipped by decision · ❓ not visible in the repo

## 2026-09-28 - Planning routing fix on `matteomarzella-fix-planning-routing-ux` (base `develop` at `fe22836`)

This section records local work awaiting review and merge. It touches the planning slice (MAR-2/3/4) and, with the
owner's agreement, the two Puccetti tasks the planner could not work without (PUC-4 geocoding, PUC-10 starting base).
Other task statuses are carried forward from the previous check, with MAR-4 now merged in `develop`.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 6 (PUC-2, 5, 8, 9, 11, 12) | 2 (PUC-3, 7) + 2 in review (PUC-4, 10) | 1 (PUC-6) | 1 skipped (PUC-1) |
| Marzella (MAR) | 4 (MAR-1, 2, 3, 4) | 1 in review (planning routing fix) | 2 (MAR-5, 6) | - |
| Rivera (RIV) | 3 (RIV-1, 2, 3) | - | 1 (RIV-4) | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | 🟡 Partly done | Create done (`POST /api/imports`, `95e4bf4`, batched inserts `d66f0d3`); `POST /api/imports` now ends in `GEOCODING` and publishes `ImportCreatedEvent`. Missing: list, detail, delete |
| PUC-4 Background geocoding | REVIEW (local, not merged) | `geocoding` package: Nominatim client (1 req/s, User-Agent, structured then free-form query), `geocode_cache` hits/misses, async job after import commit + resume at startup, `GET /api/imports/{id}/geocoding`, `POST .../geocoding/retry`, `PATCH .../points/{pointId}/location`; 12 tests (`GeocodingServiceTest`, `ImportGeocodingJobTest`, `GeocodingControllerTest`) |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ❌ Not started | Both pages are placeholders |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant (merged from `tenant_login`) |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | REVIEW (local, not merged) | Changeset `006-tenant-starting-base.sql`, `GET/PUT /api/profile/base` (geocoded, `422` unknown address, `503` geocoder down); the base field lives in the planner page instead of a separate `StartingBaseField`; 5 tests (`StartingBaseTest`) |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs merged in `develop` (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if and save/list/get/delete plan endpoints merged in `develop` (`3cd7e04`). In review: `POST /api/imports/{id}/plans/route` (endpoint 18b, OSRM with estimate fallback, `OsrmRouteProviderTest` + 3 controller tests) |
| MAR-4 Planner page | ✅ Done / REVIEW (rework) | Merged in `develop` (`fe22836`). In review: simplified layout (starting point by address -> campaign -> results), real `hlm-native-select` dropdowns (fixes the unstyled/dark-mode menus), geocoding progress banner with retry, base marker + numbered stops + real road polyline with km/min badge; 12 focused tests pass |
| MAR-5 What-if + scenarios compare pages | ❌ Not started | Placeholder page. Needs MAR-3 |
| MAR-6 Strategy doc results, mockups S7-S10 | ❌ Not started | `OPTIMIZATION_STRATEGY.md` section 9 updated for the daily road route |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ❌ Not started | Placeholder page. MAR-3 dependency is now available |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no mockup images or slides in the repo yet |

### Blockers and next steps

- **Geocoding is no longer the critical path** once this branch merges: imported addresses are located in the background and the planner shows progress. Public Nominatim is 1 address/second: a 700-row file takes ~12 minutes the first time (cached afterwards).
- **Perf test `ImportCreateTest.fiveThousandRowsTakeLessThanFiveSeconds` fails on this machine also on `develop`** (7-11 s against the Docker Desktop database): environment-dependent, not caused by this branch. To be re-checked on the demo laptop.
- **Reaching an import from the UI** still needs the rest of PUC-3 (list, detail, delete) and PUC-6.
- **MAR-5** remains to expose what-if analysis and scenario comparison.

## 2026-09-28 - MAR-4 review on `feat/MAR-4-planner-page` (base `develop` at `3cd7e04`)

This section records local MAR-4 work awaiting review and merge. Other task statuses are carried forward from the
previous check, with MAR-3 now merged in `develop`.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 6 (PUC-2, 5, 8, 9, 11, 12) | 2 (PUC-3, 7) | 3 (PUC-4, 6, 10) | 1 skipped (PUC-1) |
| Marzella (MAR) | 3 (MAR-1, 2, 3) | 1 in review (MAR-4) | 2 (MAR-5, 6) | - |
| Rivera (RIV) | 3 (RIV-1, 2, 3) | - | 1 (RIV-4) | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | 🟡 Partly done | Create done (`POST /api/imports`, `95e4bf4`, batched inserts `d66f0d3`). Missing: list `GET /api/imports`, detail `GET /api/imports/{id}`, delete `DELETE /api/imports/{id}` |
| PUC-4 Background geocoding | ❌ Not started | Only the `geocode_cache` table and entity from the scaffolding. Imported points stay `PENDING` unless the file has coordinates |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ❌ Not started | Both pages are placeholders |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant (merged from `tenant_login`) |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ❌ Not started | Spec only (US-35). Needs PUC-4 for geocoding |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs merged in `develop` (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if and save/list/get/delete plan endpoints merged in `develop` (`3cd7e04`) |
| MAR-4 Planner page | REVIEW (local, not merged) | Parameters and priorities form, client validation, KPIs, day-by-day timeline, selected-day route on `MapView`, excluded customers and scenario save on `feat/MAR-4-planner-page`; 6 focused tests pass |
| MAR-5 What-if + scenarios compare pages | ❌ Not started | Placeholder page. Needs MAR-3 |
| MAR-6 Strategy doc results, mockups S7-S10 | ❌ Not started | |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ❌ Not started | Placeholder page. MAR-3 dependency is now available |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no mockup images or slides in the repo yet |

### Blockers and next steps

- **PUC-4 geocoding remains the data critical path**: points without coordinates are excluded from planning. PUC-10 also depends on it.
- **Planning UI**: MAR-4 is implemented locally and awaits review/merge. MAR-5 remains to expose what-if analysis and scenario comparison.
- **Starting base**: MAR-4 uses the contract's Rome fallback until PUC-10 provides `StartingBaseField` and the tenant starting-base API.
- **Reaching an import from the UI** needs the rest of PUC-3 (list, detail, delete) and PUC-6: today only the wizard's "Open the import" link leads there, to a placeholder.

## 2026-09-28 - MAR-3 review on `feat/MAR-3-planning-api` (base `develop` at `376eaa2`)

This section records local MAR-3 work awaiting review and merge. Other task statuses are carried forward from the previous check, with MAR-2 now merged in `develop`.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 6 (PUC-2, 5, 8, 9, 11, 12) | 2 (PUC-3, 7) | 3 (PUC-4, 6, 10) | 1 skipped (PUC-1) |
| Marzella (MAR) | 2 (MAR-1, 2) | 1 in review (MAR-3) | 3 (MAR-4..6) | - |
| Rivera (RIV) | 3 (RIV-1, 2, 3) | - | 1 (RIV-4) | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | 🟡 Partly done | Create done (`POST /api/imports`, `95e4bf4`, batched inserts `d66f0d3`). Missing: list `GET /api/imports`, detail `GET /api/imports/{id}`, delete `DELETE /api/imports/{id}` |
| PUC-4 Background geocoding | ❌ Not started | Only the `geocode_cache` table and entity from the scaffolding. Imported points stay `PENDING` unless the file has coordinates |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ❌ Not started | Both pages are placeholders |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant (merged from `tenant_login`) |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ❌ Not started | Spec only (US-35). Needs PUC-4 for geocoding |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs merged in `develop` (`376eaa2`) |
| MAR-3 Planning API | REVIEW (local, not merged) | Campaigns, simulate, what-if and save/list/get/delete plan endpoints implemented on `feat/MAR-3-planning-api`; 5 controller and 15 tenant-isolation tests pass |
| MAR-4 Planner page | ❌ Not started | Placeholder page. Needs MAR-3 |
| MAR-5 What-if + scenarios compare pages | ❌ Not started | Placeholder pages. Needs MAR-3 |
| MAR-6 Strategy doc results, mockups S7-S10 | ❌ Not started | |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ❌ Not started | Placeholder page. Needs MAR-3 |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no mockup images or slides in the repo yet |

### Blockers and next steps

- **PUC-4 geocoding remains the data critical path**: points without coordinates are excluded from planning. PUC-10 also depends on it.
- **Planning chain**: MAR-3 now exposes the engine and saved scenarios locally and awaits review/merge. MAR-4, MAR-5 and RIV-4 remain blocked until it is merged.
- **Reaching an import from the UI** needs the rest of PUC-3 (list, detail, delete) and PUC-6: today only the wizard's "Open the import" link leads there, to a placeholder.
- **Branches to delete** (fully merged): `tenant_login`, `feat/RIV-2-read-api`, `feat/PUC-5-import-wizard`, `feat/PUC-12-remember-me`, previous MAR-2 branch.

## 2026-09-28 - MAR-2 review on `codex/MAR-2-planner-engine` (base `develop` at `8ae533b`)

This section records local MAR-2 work awaiting review and merge. Other task statuses are carried forward from the previous check.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 6 (PUC-2, 5, 8, 9, 11, 12) | 2 (PUC-3, 7) | 3 (PUC-4, 6, 10) | 1 skipped (PUC-1) |
| Marzella (MAR) | 1 (MAR-1) | 1 in review (MAR-2) | 4 (MAR-3..6) | - |
| Rivera (RIV) | 3 (RIV-1, 2, 3) | - | 1 (RIV-4) | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | 🟡 Partly done | Create done (`POST /api/imports`, `95e4bf4`, batched inserts `d66f0d3`). Missing: list `GET /api/imports`, detail `GET /api/imports/{id}`, delete `DELETE /api/imports/{id}` |
| PUC-4 Background geocoding | ❌ Not started | Only the `geocode_cache` table and entity from the scaffolding. Imported points stay `PENDING` unless the file has coordinates |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ❌ Not started | Both pages are placeholders |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant (merged from `tenant_login`) |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ❌ Not started | Spec only (US-35). Needs PUC-4 for geocoding |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | REVIEW (local, not merged) | Pure Java greedy planner, bounded local search, deterministic routes and KPIs; 26 new tests plus 64 relevant foundation tests pass; backend JAR built. US-22/23/25 engine complete; API/UI remain MAR-3/4 |
| MAR-3 Planning API | ❌ Not started | No `/plans` endpoints yet. Engine ready on MAR-2 branch, pending merge |
| MAR-4 Planner page | ❌ Not started | Placeholder page. Needs MAR-3 |
| MAR-5 What-if + scenarios compare pages | ❌ Not started | Placeholder pages. Needs MAR-3 |
| MAR-6 Strategy doc results, mockups S7-S10 | ❌ Not started | |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ❌ Not started | Placeholder page. Needs MAR-3 |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no mockup images or slides in the repo yet |

### Blockers and next steps

- **PUC-4 geocoding is the critical path**: without coordinates the map dashboard (RIV-3) is empty for a normal ERP
  file and the planner (MAR-2/3) has nothing to route. PUC-10 also depends on it.
- **Planning chain**: MAR-2 is implemented locally and awaits review/merge. MAR-3 can integrate the engine next, then MAR-4, MAR-5 and RIV-4. RIV-4 remains blocked until MAR-3 is merged.
- **Reaching an import from the UI** needs the rest of PUC-3 (list, detail, delete) and PUC-6: today only the
  wizard's "Open the import" link leads there, to a placeholder.
- **Branches to delete** (fully merged): `tenant_login`, `feat/RIV-2-read-api`, `feat/PUC-5-import-wizard`,
  `feat/PUC-12-remember-me`.

## 2026-09-28 - `develop` at `6ce1573`

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 6 (PUC-2, 5, 8, 9, 11, 12) | 2 (PUC-3, 7) | 3 (PUC-4, 6, 10) | 1 skipped (PUC-1) |
| Marzella (MAR) | 1 (MAR-1) | - | 5 (MAR-2..6) | - |
| Rivera (RIV) | 3 (RIV-1, 2, 3) | - | 1 (RIV-4) | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | 🟡 Partly done | Create done (`POST /api/imports`, `95e4bf4`, batched inserts `d66f0d3`). Missing: list `GET /api/imports`, detail `GET /api/imports/{id}`, delete `DELETE /api/imports/{id}` |
| PUC-4 Background geocoding | ❌ Not started | Only the `geocode_cache` table and entity from the scaffolding. Imported points stay `PENDING` unless the file has coordinates |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ❌ Not started | Both pages are placeholders |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant (merged from `tenant_login`) |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ❌ Not started | Spec only (US-35). Needs PUC-4 for geocoding |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ❌ Not started | |
| MAR-3 Planning API | ❌ Not started | No `/plans` endpoints yet. Needs MAR-2 |
| MAR-4 Planner page | ❌ Not started | Placeholder page. Needs MAR-3 |
| MAR-5 What-if + scenarios compare pages | ❌ Not started | Placeholder pages. Needs MAR-3 |
| MAR-6 Strategy doc results, mockups S7-S10 | ❌ Not started | |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ❌ Not started | Placeholder page. Needs MAR-3 |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no mockup images or slides in the repo yet |

### Blockers and next steps

- **PUC-4 geocoding is the critical path**: without coordinates the map dashboard (RIV-3) is empty for a normal ERP
  file and the planner (MAR-2/3) has nothing to route. PUC-10 also depends on it.
- **Planning chain**: MAR-2 -> MAR-3 -> MAR-4, MAR-5 and RIV-4. RIV-4 is blocked until MAR-3 is merged.
- **Reaching an import from the UI** needs the rest of PUC-3 (list, detail, delete) and PUC-6: today only the
  wizard's "Open the import" link leads there, to a placeholder.
- **Branches to delete** (fully merged): `tenant_login`, `feat/RIV-2-read-api`, `feat/PUC-5-import-wizard`,
  `feat/PUC-12-remember-me`.
