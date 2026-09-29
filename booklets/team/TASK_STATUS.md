# Task status log

Status of every task in `TASKS.md`, checked against what is merged in `develop` (commits, endpoints, pages), not
against what is planned. Newest check first: add a new dated section on top, do not edit the old ones.

**Every time a task is completed** (or partly done when its work is merged), whoever did it - person or AI agent - adds a new section in the same PR (`source/AGENTS.md`, section 6 rule 9, and the Definition of Done): copy the latest section, update the rows of that task, the summary and the blockers, and put the `develop` commit in the title.

Legend: ✅ done (merged in `develop`) · 🟡 partly done · ❌ not started · ⏭️ skipped by decision · ❓ not visible in the repo

## 2026-09-29 - Code review on `chore/code-review` (base `develop` at `2a49535`)

This section records a review of the whole project, merged into `develop` with this branch: seven bugs fixed, dead
code removed and repeated logic shared, on the frontend and the backend, with no change to the API contract. It
changes code of Marzella (planning engine, API, planner and what-if pages) and Rivera (map dashboard, agent plan
page, shared components): both review it. The mockups rows follow PR #10 (`2a49535`). Other task statuses are
carried forward from the previous checks.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 12 (PUC-2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14) | 1 (PUC-7) | - | 1 skipped (PUC-1) |
| Marzella (MAR) | 6 (MAR-1, 2, 3, 4, 5, 6) | - | - | - |
| Rivera (RIV) | 4 (RIV-1, 2, 3, 4) | - | - | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | ✅ Done | Merged in `develop` (`d4ced7d`): create, `GET /api/imports`, `GET /api/imports/{id}` (`ImportDetail`), `DELETE /api/imports/{id}` (database cascade to enterprises, points, revenues, plans) (`afaaa5e`) |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location. Code review: the job no longer overwrites a position placed by hand while it runs (nor counts it twice), a retry asked during a run follows it, the starting base lookup commits its cache row in its own transaction |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ✅ Done | Merged into `develop` with `feat/PUC-6-imports-pages`. **Imports list** `/imports` (US-10, US-12): cards or table, choice kept in `localStorage`, empty state, delete after an alert dialog (`366075e`). **Import detail** `/imports/:importId` (US-07..US-09, US-11, US-12): report and column mapping, geocoding progress polled every 3 s while the import is `GEOCODING` (detail and points reloaded at the end), retry of the addresses not found or never tried, points table with a not-located filter and 50 points per page, manual location form (decimal comma accepted), delete (`657f28d`). Tests: 58 new (imports folder 89 in total) |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. Mockups S1-S13 added with PR #10 (`2a49535`); real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |
| PUC-13 Visual revamp | ✅ Done | First part merged with `feat/PUC-13-visual-revamp` (theme tokens, inset shell, `PageHeader`, import detail). Every page restyled with `feature/restyling-ui` (`fea356f`, `ce76274`, merged in `6f45513`). Visual fixes merged with `fix/PUC-13-imports-cards-alignment`: import cards with imported, located and skipped rows; map dashboard with charts above the map, filters beside it, the selected point in a popup on its marker, the list paged with a shared pager (`TablePager`, `createPaging`) and opened on the clicked point; import detail laid out like the map; planner with Setup and Plan tabs, a day timeline of agent routes, the scenario saved from a dialog, the geocoding status as a slim strip and the estimate settings grouped as the road fallback; what-if and scenarios with a rail beside the comparison; agent plan page marked as a saved scenario, one week at a time with a day strip, readable stop cards (`readableName`); key figures of every page as a headline and details (`KpiSummary`, `KpiCard` removed); page header as a title row and a strip of facts with icons (no breadcrumb); more page padding and 28 px between sections; navigation below 1024 px as an off-canvas drawer. Merged with `fix/PUC-13-working-days-slider`: planner working days as a slider of the working days in the time frame (`workingDaysBetween`, mirroring the backend calendar); loading placeholders in the shape of each page (imports list and detail, map dashboard, planner result, agent plan) held for at least 450 ms (`minimumLoading`, `LOADING_MIN_MS`); skeleton tinted with the text colour; shared enter/leave motion classes, progress and revenue bars that grow in, a map that glides to new data, the what-if curve drawn in (reduced motion respected). Frontend suite 330 tests |
| PUC-14 Self-hosted OSRM | ✅ Done | Merged into `develop` with `feat/PUC-14-self-hosted-osrm`: Compose profile `osrm` (`osrm-data` downloads the Geofabrik extract of central Italy and prepares it once into volume `visitwise-osrm-data`; `osrm` serves it on 127.0.0.1:5000 with `--max-table-size 500`); engine `Travel` / `RoadMatrix` (measured km and minutes by direction, estimate for unknown pairs) used for range, workday and route length; `OsrmRoadMatrixProvider` (table service in blocks of 500, points snapped more than 1 km away left to the estimate, last 4 tables cached), switched on by `ROUTING_MATRIX_ENABLED`; `PlanKpis.travelSource` (`OSRM` / `ESTIMATE`) shown next to the hours on the road in the planner; both OSRM clients ask for gzip (the deflate answer of `osrm-routed` broke the JDK client). Decision D-11, US-39 |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`). Code review: members only tests used removed; the workday rule is `VisitConstraints.fitsWorkday`, also used by the planner |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6. Code review: a missing what-if horizon is a 400 (was 500), warnings write the km the Italian way and agree with the number of points, saved visits written once (cascade), one `DeliveryPointResponse.of` mapping, shared OSRM client setup |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save. Code review: no endless geocoding polling on a READY import with PENDING points (retry offered), load errors shown instead of breaking the page, placeholders held for the minimum time |
| MAR-5 What-if + scenarios compare pages | ✅ Done | Merged with PR #7 (`fe7180a`): what-if page (coverage curve and table over up to 5 horizons) and saved scenarios side by side, with a link to the agent plan page and delete. Code review: load errors shown, placeholders held for the minimum time, campaign dates written like the rest of the app |
| MAR-6 Mockups S7-S10 | ✅ Done | Merged into `develop` (`b707798`): `booklets/user-stories/mockups/S7-planner-parameters.png`, `S8-planner-result.png`, `S9-what-if.png`, `S10-scenarios-compare.png`, grayscale 1280 x 900 with synthetic sample names, generated by `booklets/user-stories/mockups/tools/GenerateMockups.java` (Java2D, no `.bmpr`); mockups README updated. Scope reduced to the mockups: no "measured results" section |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`). Code review: placeholders end when the summary fails, one main enterprise color rule with the import detail |
| RIV-4 Agent plan page + Excel export | ✅ Done | Merged with PR #8 (`b8745e0`): `GET /api/plans/{planId}/export` (one sheet per agent, `?agent=` filter) and the agent plan page `imports/:importId/plans/:planId` (calendar Mon-Fri, directions links, agent filter, Excel export) |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; mockups S6 and S11 added with PR #10; no slides in the repo yet |

### Blockers and next steps

- **Visual revamp (PUC-13)**: the last branches change pages of Rivera (map dashboard, agent plan page, app shell) and Marzella (planner, what-if, scenarios), which review them. US-38 asks for WCAG AA text contrast in both themes: the colors come from the theme tokens and were checked by eye, not measured with a tool. The story text still mentions pill navigation, now a sidebar and, below 1024 px, a drawer.
- **Saved plan vs. export**: `GET /api/plans/{planId}` recomputes the plan from its saved parameters, the Excel export reads the saved visits. They differ if the points of the import change after the plan is saved (geocoding, manual location), and now also if the road network (PUC-14) is switched on or off: to be agreed between Marzella and Rivera.
- **Road network times (PUC-14)**: OSRM driving times assume free-flowing traffic, shorter than the 25 km/h city estimate (synthetic sample `sample-erp-layout.xlsx`, 10 working days: 30 h on the road instead of 53 h, 61 visits instead of 58). With the road network the average speed and road factor apply only to the pairs left to the estimate. Marzella to confirm the engine change (D-11) and whether a traffic factor on the road times is needed.
- **Data sent outside**: the directions links (US-30) open openstreetmap.org with the coordinates of the stops, like the OSRM road route of the planner with the default public server (with the `osrm` profile the routes stay on the machine); `source/AGENTS.md` section 8 names only Nominatim. To be confirmed by the team.
- **Bundle budget**: the initial bundle is 581.29 kB (budget 500 kB, 611.70 kB before the unused spartan libraries were removed): the alert dialog of PUC-6 brings `@angular/cdk` to the startup bundle, the revamp adds the shell icons and styles. `app.css` is 7.42 kB, over the 4 kB component style warning (`angular.json`). To be decided.
- **Repository root**: PR #10 added a visible `README.md` at the root; `source/AGENTS.md` allows only `input.txt`, `Student_doc.md`, `source/` and `booklets/` there. To be moved (e.g. to `source/README.md`) by agreement with Marzella.
- **Endpoint numbers**: `API_CONTRACT.md` no longer numbers its endpoints, while code comments still cite them (e.g. "Endpoint 18b"). To be aligned.
- **Left by the code review** (need a decision): `ImportStatus.FAILED` and `PROCESSING` are never visible, and some API fields are never shown (`upperBoundRevenue`, `visitsAfterDeadline`, `excludedOutOfRange`, `topPoints`, `sourceRow`): removing them changes the contract. No confirmation before deleting a scenario; the imports list does not refresh while an import is processing.

## 2026-09-29 - PUC-13 on `fix/PUC-13-working-days-slider` (base `develop` at `1746a17`)

This section records the last part of PUC-13 (US-38) and a planner fix (US-19, US-20), merged into `develop` with
this branch. The planner "Working days" field is a slider bound to the working days (Mon-Fri, holidays excluded) of
the selected time frame, so it can no longer ask for more days than the campaign window has. The pages show loading
placeholders in the shape of their content, kept up for at least 450 ms, and light motion on data changes. The
devlog was dropped. This branch changes pages of Rivera (map dashboard, agent plan page, shared components) and
Marzella (planner, what-if): both review it. Other task statuses are carried forward from the previous checks.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 12 (PUC-2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14) | 1 (PUC-7) | - | 1 skipped (PUC-1) |
| Marzella (MAR) | 6 (MAR-1, 2, 3, 4, 5, 6) | - | - | - |
| Rivera (RIV) | 4 (RIV-1, 2, 3, 4) | - | - | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | ✅ Done | Merged in `develop` (`d4ced7d`): create, `GET /api/imports`, `GET /api/imports/{id}` (`ImportDetail`), `DELETE /api/imports/{id}` (database cascade to enterprises, points, revenues, plans) (`afaaa5e`) |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ✅ Done | Merged into `develop` with `feat/PUC-6-imports-pages`. **Imports list** `/imports` (US-10, US-12): cards or table, choice kept in `localStorage`, empty state, delete after an alert dialog (`366075e`). **Import detail** `/imports/:importId` (US-07..US-09, US-11, US-12): report and column mapping, geocoding progress polled every 3 s while the import is `GEOCODING` (detail and points reloaded at the end), retry of the addresses not found or never tried, points table with a not-located filter and 50 points per page, manual location form (decimal comma accepted), delete (`657f28d`). Tests: 58 new (imports folder 89 in total) |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |
| PUC-13 Visual revamp | ✅ Done | First part merged with `feat/PUC-13-visual-revamp` (theme tokens, inset shell, `PageHeader`, import detail). Every page restyled with `feature/restyling-ui` (`fea356f`, `ce76274`, merged in `6f45513`). Visual fixes merged with `fix/PUC-13-imports-cards-alignment`: import cards with imported, located and skipped rows; map dashboard with charts above the map, filters beside it, the selected point in a popup on its marker, the list paged with a shared pager (`TablePager`, `createPaging`) and opened on the clicked point; import detail laid out like the map; planner with Setup and Plan tabs, a day timeline of agent routes, the scenario saved from a dialog, the geocoding status as a slim strip and the estimate settings grouped as the road fallback; what-if and scenarios with a rail beside the comparison; agent plan page marked as a saved scenario, one week at a time with a day strip, readable stop cards (`readableName`); key figures of every page as a headline and details (`KpiSummary`, `KpiCard` removed); page header as a title row and a strip of facts with icons (no breadcrumb); more page padding and 28 px between sections; navigation below 1024 px as an off-canvas drawer. Merged with `fix/PUC-13-working-days-slider`: planner working days as a slider of the working days in the time frame (`workingDaysBetween`, mirroring the backend calendar); loading placeholders in the shape of each page (imports list and detail, map dashboard, planner result, agent plan) held for at least 450 ms (`minimumLoading`, `LOADING_MIN_MS`); skeleton tinted with the text colour; shared enter/leave motion classes, progress and revenue bars that grow in, a map that glides to new data, the what-if curve drawn in (reduced motion respected). Frontend suite 330 tests |
| PUC-14 Self-hosted OSRM | ✅ Done | Merged into `develop` with `feat/PUC-14-self-hosted-osrm`: Compose profile `osrm` (`osrm-data` downloads the Geofabrik extract of central Italy and prepares it once into volume `visitwise-osrm-data`; `osrm` serves it on 127.0.0.1:5000 with `--max-table-size 500`); engine `Travel` / `RoadMatrix` (measured km and minutes by direction, estimate for unknown pairs) used for range, workday and route length; `OsrmRoadMatrixProvider` (table service in blocks of 500, points snapped more than 1 km away left to the estimate, last 4 tables cached), switched on by `ROUTING_MATRIX_ENABLED`; `PlanKpis.travelSource` (`OSRM` / `ESTIMATE`) shown next to the hours on the road in the planner; both OSRM clients ask for gzip (the deflate answer of `osrm-routed` broke the JDK client). Decision D-11, US-39 |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6 |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save |
| MAR-5 What-if + scenarios compare pages | ✅ Done | Merged with PR #7 (`fe7180a`): what-if page (coverage curve and table over up to 5 horizons) and saved scenarios side by side, with a link to the agent plan page and delete |
| MAR-6 Mockups S7-S10 | ✅ Done | Merged into `develop` (`b707798`): `booklets/user-stories/mockups/S7-planner-parameters.png`, `S8-planner-result.png`, `S9-what-if.png`, `S10-scenarios-compare.png`, grayscale 1280 x 900 with synthetic sample names, generated by `booklets/user-stories/mockups/tools/GenerateMockups.java` (Java2D, no `.bmpr`); mockups README updated. Scope reduced to the mockups: no "measured results" section |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ✅ Done | Merged with PR #8 (`b8745e0`): `GET /api/plans/{planId}/export` (one sheet per agent, `?agent=` filter) and the agent plan page `imports/:importId/plans/:planId` (calendar Mon-Fri, directions links, agent filter, Excel export) |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no S6/S11 mockup images or slides in the repo yet |

### Blockers and next steps

- **Planner geocoding polling**: the planner page treats `pending > 0` as running, so on a `READY` import with points left `PENDING` (geocoder unavailable, or imported before PUC-4) it polls every 3 s without end. The import detail page polls only while the status is `GEOCODING` and offers a retry. To be agreed with Marzella.
- **Visual revamp (PUC-13)**: the last branches change pages of Rivera (map dashboard, agent plan page, app shell) and Marzella (planner, what-if, scenarios), which review them. US-38 asks for WCAG AA text contrast in both themes: the colors come from the theme tokens and were checked by eye, not measured with a tool. The story text still mentions pill navigation, now a sidebar and, below 1024 px, a drawer.
- **Saved plan vs. export**: `GET /api/plans/{planId}` recomputes the plan from its saved parameters, the Excel export reads the saved visits. They differ if the points of the import change after the plan is saved (geocoding, manual location), and now also if the road network (PUC-14) is switched on or off: to be agreed between Marzella and Rivera.
- **Road network times (PUC-14)**: OSRM driving times assume free-flowing traffic, shorter than the 25 km/h city estimate (synthetic sample `sample-erp-layout.xlsx`, 10 working days: 30 h on the road instead of 53 h, 61 visits instead of 58). With the road network the average speed and road factor apply only to the pairs left to the estimate. Marzella to confirm the engine change (D-11) and whether a traffic factor on the road times is needed.
- **Data sent outside**: the directions links (US-30) open openstreetmap.org with the coordinates of the stops, like the OSRM road route of the planner with the default public server (with the `osrm` profile the routes stay on the machine); `source/AGENTS.md` section 8 names only Nominatim. To be confirmed by the team.
- **Bundle budget**: the initial bundle is 611.70 kB (budget 500 kB): the alert dialog of PUC-6 brings `@angular/cdk` to the startup bundle, the revamp adds the shell icons and styles. `app.css` is 7.52 kB, over the 4 kB component style warning (`angular.json`). To be decided.
- **Mockups S1-S6, S11-S13** (Puccetti, Rivera) are still missing from the repo.

## 2026-09-29 - PUC-13 on `fix/PUC-13-imports-cards-alignment` (base `develop` at `6f45513`)

This section records the rest of PUC-13 (visual revamp, US-38), merged into `develop` with this branch. The restyling
of every page (`feature/restyling-ui`, `fea356f`, `ce76274`) was merged into `develop` in `6f45513` and had no section
of its own: it is recorded here too. This branch changes pages of Rivera (map dashboard, agent plan page, app shell,
shared components) and Marzella (planner, what-if and scenarios): both review it. Other task statuses are carried
forward from the previous checks.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 12 (PUC-2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14) | 1 (PUC-7) | - | 1 skipped (PUC-1) |
| Marzella (MAR) | 6 (MAR-1, 2, 3, 4, 5, 6) | - | - | - |
| Rivera (RIV) | 4 (RIV-1, 2, 3, 4) | - | - | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | ✅ Done | Merged in `develop` (`d4ced7d`): create, `GET /api/imports`, `GET /api/imports/{id}` (`ImportDetail`), `DELETE /api/imports/{id}` (database cascade to enterprises, points, revenues, plans) (`afaaa5e`) |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ✅ Done | Merged into `develop` with `feat/PUC-6-imports-pages`. **Imports list** `/imports` (US-10, US-12): cards or table, choice kept in `localStorage`, empty state, delete after an alert dialog (`366075e`). **Import detail** `/imports/:importId` (US-07..US-09, US-11, US-12): report and column mapping, geocoding progress polled every 3 s while the import is `GEOCODING` (detail and points reloaded at the end), retry of the addresses not found or never tried, points table with a not-located filter and 50 points per page, manual location form (decimal comma accepted), delete (`657f28d`). Tests: 58 new (imports folder 89 in total) |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |
| PUC-13 Visual revamp | ✅ Done | First part merged with `feat/PUC-13-visual-revamp` (theme tokens, inset shell, `PageHeader`, import detail). Every page restyled with `feature/restyling-ui` (`fea356f`, `ce76274`, merged in `6f45513`). Visual fixes merged with `fix/PUC-13-imports-cards-alignment`: import cards with imported, located and skipped rows; map dashboard with charts above the map, filters beside it, the selected point in a popup on its marker, the list paged with a shared pager (`TablePager`, `createPaging`) and opened on the clicked point; import detail laid out like the map; planner with Setup and Plan tabs, a day timeline of agent routes, the scenario saved from a dialog, the geocoding status as a slim strip and the estimate settings grouped as the road fallback; what-if and scenarios with a rail beside the comparison; agent plan page marked as a saved scenario, one week at a time with a day strip, readable stop cards (`readableName`); key figures of every page as a headline and details (`KpiSummary`, `KpiCard` removed); page header as a title row and a strip of facts with icons (no breadcrumb); more page padding and 28 px between sections; navigation below 1024 px as an off-canvas drawer. Frontend suite 311 tests |
| PUC-14 Self-hosted OSRM | ✅ Done | Merged into `develop` with `feat/PUC-14-self-hosted-osrm`: Compose profile `osrm` (`osrm-data` downloads the Geofabrik extract of central Italy and prepares it once into volume `visitwise-osrm-data`; `osrm` serves it on 127.0.0.1:5000 with `--max-table-size 500`); engine `Travel` / `RoadMatrix` (measured km and minutes by direction, estimate for unknown pairs) used for range, workday and route length; `OsrmRoadMatrixProvider` (table service in blocks of 500, points snapped more than 1 km away left to the estimate, last 4 tables cached), switched on by `ROUTING_MATRIX_ENABLED`; `PlanKpis.travelSource` (`OSRM` / `ESTIMATE`) shown next to the hours on the road in the planner; both OSRM clients ask for gzip (the deflate answer of `osrm-routed` broke the JDK client). Decision D-11, US-39 |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6 |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save |
| MAR-5 What-if + scenarios compare pages | ✅ Done | Merged with PR #7 (`fe7180a`): what-if page (coverage curve and table over up to 5 horizons) and saved scenarios side by side, with a link to the agent plan page and delete |
| MAR-6 Mockups S7-S10 | ✅ Done | Merged into `develop` (`b707798`): `booklets/user-stories/mockups/S7-planner-parameters.png`, `S8-planner-result.png`, `S9-what-if.png`, `S10-scenarios-compare.png`, grayscale 1280 x 900 with synthetic sample names, generated by `booklets/user-stories/mockups/tools/GenerateMockups.java` (Java2D, no `.bmpr`); mockups README updated. Scope reduced to the mockups: no "measured results" section |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ✅ Done | Merged with PR #8 (`b8745e0`): `GET /api/plans/{planId}/export` (one sheet per agent, `?agent=` filter) and the agent plan page `imports/:importId/plans/:planId` (calendar Mon-Fri, directions links, agent filter, Excel export) |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no S6/S11 mockup images or slides in the repo yet |

### Blockers and next steps

- **Planner geocoding polling**: the planner page treats `pending > 0` as running, so on a `READY` import with points left `PENDING` (geocoder unavailable, or imported before PUC-4) it polls every 3 s without end. The import detail page polls only while the status is `GEOCODING` and offers a retry. To be agreed with Marzella.
- **Visual revamp (PUC-13)**: this branch changes pages of Rivera (map dashboard, agent plan page, app shell) and Marzella (planner, what-if, scenarios), which review it. US-38 asks for WCAG AA text contrast in both themes: the colors come from the theme tokens and were checked by eye, not measured with a tool. The story text still mentions pill navigation, now a sidebar and, below 1024 px, a drawer.
- **Saved plan vs. export**: `GET /api/plans/{planId}` recomputes the plan from its saved parameters, the Excel export reads the saved visits. They differ if the points of the import change after the plan is saved (geocoding, manual location), and now also if the road network (PUC-14) is switched on or off: to be agreed between Marzella and Rivera.
- **Road network times (PUC-14)**: OSRM driving times assume free-flowing traffic, shorter than the 25 km/h city estimate (synthetic sample `sample-erp-layout.xlsx`, 10 working days: 30 h on the road instead of 53 h, 61 visits instead of 58). With the road network the average speed and road factor apply only to the pairs left to the estimate. Marzella to confirm the engine change (D-11) and whether a traffic factor on the road times is needed.
- **Data sent outside**: the directions links (US-30) open openstreetmap.org with the coordinates of the stops, like the OSRM road route of the planner with the default public server (with the `osrm` profile the routes stay on the machine); `source/AGENTS.md` section 8 names only Nominatim. To be confirmed by the team.
- **Bundle budget**: the initial bundle is 593.79 kB (budget 500 kB): the alert dialog of PUC-6 brings `@angular/cdk` to the startup bundle, the revamp adds the shell icons and styles. `app.css` is 6.53 kB, over the 4 kB component style warning (`angular.json`). To be decided.
- **Mockups S1-S6, S11-S13** (Puccetti, Rivera) are still missing from the repo.

## 2026-09-28 - PUC-14 on `feat/PUC-14-self-hosted-osrm` (base `develop` at `beb06b1`)

This section records PUC-14 (self-hosted OSRM, US-39), merged into `develop` with this branch. It changes the planning
engine and the planner page (Marzella's area), so Marzella reviews the pull request. The first part of PUC-13 was
merged into `develop` in `beb06b1`. Other task statuses are carried forward from the previous checks.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 11 (PUC-2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 14) | 2 (PUC-7, 13) | - | 1 skipped (PUC-1) |
| Marzella (MAR) | 6 (MAR-1, 2, 3, 4, 5, 6) | - | - | - |
| Rivera (RIV) | 4 (RIV-1, 2, 3, 4) | - | - | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | ✅ Done | Merged in `develop` (`d4ced7d`): create, `GET /api/imports`, `GET /api/imports/{id}` (`ImportDetail`), `DELETE /api/imports/{id}` (database cascade to enterprises, points, revenues, plans) (`afaaa5e`) |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ✅ Done | Merged into `develop` with `feat/PUC-6-imports-pages`. **Imports list** `/imports` (US-10, US-12): cards or table, choice kept in `localStorage`, empty state, delete after an alert dialog (`366075e`). **Import detail** `/imports/:importId` (US-07..US-09, US-11, US-12): report and column mapping, geocoding progress polled every 3 s while the import is `GEOCODING` (detail and points reloaded at the end), retry of the addresses not found or never tried, points table with a not-located filter and 50 points per page, manual location form (decimal comma accepted), delete (`657f28d`). Tests: 58 new (imports folder 89 in total) |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |
| PUC-13 Visual revamp | 🟡 Partly done | Merged into `develop` with `feat/PUC-13-visual-revamp`: theme tokens for both themes (app frame, page panel, raised surfaces, brand orange for logo, progress and focus only); app shell as a Linear/Vercel inset layout with a sidebar from 1024 px, collapsible to icons (choice in `localStorage`), open import name and account initials, top bar with pill groups below 1024 px (`27e3538`); shared `PageHeader` (breadcrumb, title, description, actions) and the import detail as a Material Design 3 supporting-pane layout with a territory map (`2145ba0`); US-38 and PUC-13 recorded (`6c7c5e8`). Missing: imports list as list-detail, wizard, login, register, profile, map dashboard, planner, what-if and scenarios, agent plan pages |
| PUC-14 Self-hosted OSRM | ✅ Done | Merged into `develop` with `feat/PUC-14-self-hosted-osrm`: Compose profile `osrm` (`osrm-data` downloads the Geofabrik extract of central Italy and prepares it once into volume `visitwise-osrm-data`; `osrm` serves it on 127.0.0.1:5000 with `--max-table-size 500`); engine `Travel` / `RoadMatrix` (measured km and minutes by direction, estimate for unknown pairs) used for range, workday and route length; `OsrmRoadMatrixProvider` (table service in blocks of 500, points snapped more than 1 km away left to the estimate, last 4 tables cached), switched on by `ROUTING_MATRIX_ENABLED`; `PlanKpis.travelSource` (`OSRM` / `ESTIMATE`) shown next to the hours on the road in the planner; both OSRM clients ask for gzip (the deflate answer of `osrm-routed` broke the JDK client). Decision D-11, US-39 |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6 |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save |
| MAR-5 What-if + scenarios compare pages | ✅ Done | Merged with PR #7 (`fe7180a`): what-if page (coverage curve and table over up to 5 horizons) and saved scenarios side by side, with a link to the agent plan page and delete |
| MAR-6 Mockups S7-S10 | ✅ Done | Merged into `develop` (`b707798`): `booklets/user-stories/mockups/S7-planner-parameters.png`, `S8-planner-result.png`, `S9-what-if.png`, `S10-scenarios-compare.png`, grayscale 1280 x 900 with synthetic sample names, generated by `booklets/user-stories/mockups/tools/GenerateMockups.java` (Java2D, no `.bmpr`); mockups README updated. Scope reduced to the mockups: no "measured results" section |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ✅ Done | Merged with PR #8 (`b8745e0`): `GET /api/plans/{planId}/export` (one sheet per agent, `?agent=` filter) and the agent plan page `imports/:importId/plans/:planId` (calendar Mon-Fri, directions links, agent filter, Excel export) |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no S6/S11 mockup images or slides in the repo yet |

### Blockers and next steps

- **Planner geocoding polling**: the planner page treats `pending > 0` as running, so on a `READY` import with points left `PENDING` (geocoder unavailable, or imported before PUC-4) it polls every 3 s without end. The import detail page polls only while the status is `GEOCODING` and offers a retry. To be agreed with Marzella.
- **Visual revamp (PUC-13)**: the next steps restyle pages of Rivera (map dashboard, agent plan) and Marzella (planner, what-if, scenarios); agreed through Puccetti.
- **Saved plan vs. export**: `GET /api/plans/{planId}` recomputes the plan from its saved parameters, the Excel export reads the saved visits. They differ if the points of the import change after the plan is saved (geocoding, manual location), and now also if the road network (PUC-14) is switched on or off: to be agreed between Marzella and Rivera.
- **Road network times (PUC-14)**: OSRM driving times assume free-flowing traffic, shorter than the 25 km/h city estimate (synthetic sample `sample-erp-layout.xlsx`, 10 working days: 30 h on the road instead of 53 h, 61 visits instead of 58). With the road network the average speed and road factor apply only to the pairs left to the estimate. Marzella to confirm the engine change (D-11) and whether a traffic factor on the road times is needed.
- **Data sent outside**: the directions links (US-30) open openstreetmap.org with the coordinates of the stops, like the OSRM road route of the planner with the default public server (with the `osrm` profile the routes stay on the machine); `source/AGENTS.md` section 8 names only Nominatim. To be confirmed by the team.
- **Bundle budget**: the initial bundle is 570.78 kB (budget 500 kB): the alert dialog of PUC-6 brings `@angular/cdk` to the startup bundle, the revamp adds the shell icons and styles. `app.css` is 5.50 kB, over the 4 kB component style warning (`angular.json`). To be decided.
- **Mockups S1-S6, S11-S13** (Puccetti, Rivera) are still missing from the repo.

## 2026-09-28 - PUC-13 on `feat/PUC-13-visual-revamp` (base `develop` at `b707798`)

This section records the first part of PUC-13 (visual revamp, US-38), merged into `develop` with this branch.
MAR-6 was merged into `develop` in `b707798`; PUC-3 and PUC-6 in `d4ced7d` and `03d683a`. Other task statuses are
carried forward from the previous checks.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 10 (PUC-2, 3, 4, 5, 6, 8, 9, 10, 11, 12) | 2 (PUC-7, 13) | - | 1 skipped (PUC-1) |
| Marzella (MAR) | 6 (MAR-1, 2, 3, 4, 5, 6) | - | - | - |
| Rivera (RIV) | 4 (RIV-1, 2, 3, 4) | - | - | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | ✅ Done | Merged in `develop` (`d4ced7d`): create, `GET /api/imports`, `GET /api/imports/{id}` (`ImportDetail`), `DELETE /api/imports/{id}` (database cascade to enterprises, points, revenues, plans) (`afaaa5e`) |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ✅ Done | Merged into `develop` with `feat/PUC-6-imports-pages`. **Imports list** `/imports` (US-10, US-12): cards or table, choice kept in `localStorage`, empty state, delete after an alert dialog (`366075e`). **Import detail** `/imports/:importId` (US-07..US-09, US-11, US-12): report and column mapping, geocoding progress polled every 3 s while the import is `GEOCODING` (detail and points reloaded at the end), retry of the addresses not found or never tried, points table with a not-located filter and 50 points per page, manual location form (decimal comma accepted), delete (`657f28d`). Tests: 58 new (imports folder 89 in total) |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |
| PUC-13 Visual revamp | 🟡 Partly done | Merged into `develop` with `feat/PUC-13-visual-revamp`: theme tokens for both themes (app frame, page panel, raised surfaces, brand orange for logo, progress and focus only); app shell as a Linear/Vercel inset layout with a sidebar from 1024 px, collapsible to icons (choice in `localStorage`), open import name and account initials, top bar with pill groups below 1024 px (`27e3538`); shared `PageHeader` (breadcrumb, title, description, actions) and the import detail as a Material Design 3 supporting-pane layout with a territory map (`2145ba0`); US-38 and PUC-13 recorded (`6c7c5e8`). Missing: imports list as list-detail, wizard, login, register, profile, map dashboard, planner, what-if and scenarios, agent plan pages |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6 |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save |
| MAR-5 What-if + scenarios compare pages | ✅ Done | Merged with PR #7 (`fe7180a`): what-if page (coverage curve and table over up to 5 horizons) and saved scenarios side by side, with a link to the agent plan page and delete |
| MAR-6 Mockups S7-S10 | ✅ Done | Merged into `develop` (`b707798`): `booklets/user-stories/mockups/S7-planner-parameters.png`, `S8-planner-result.png`, `S9-what-if.png`, `S10-scenarios-compare.png`, grayscale 1280 x 900 with synthetic sample names, generated by `booklets/user-stories/mockups/tools/GenerateMockups.java` (Java2D, no `.bmpr`); mockups README updated. Scope reduced to the mockups: no "measured results" section |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ✅ Done | Merged with PR #8 (`b8745e0`): `GET /api/plans/{planId}/export` (one sheet per agent, `?agent=` filter) and the agent plan page `imports/:importId/plans/:planId` (calendar Mon-Fri, directions links, agent filter, Excel export) |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no S6/S11 mockup images or slides in the repo yet |

### Blockers and next steps

- **Planner geocoding polling**: the planner page treats `pending > 0` as running, so on a `READY` import with points left `PENDING` (geocoder unavailable, or imported before PUC-4) it polls every 3 s without end. The import detail page polls only while the status is `GEOCODING` and offers a retry. To be agreed with Marzella.
- **Visual revamp (PUC-13)**: the next steps restyle pages of Rivera (map dashboard, agent plan) and Marzella (planner, what-if, scenarios); agreed through Puccetti.
- **Saved plan vs. export**: `GET /api/plans/{planId}` recomputes the plan from its saved parameters, the Excel export reads the saved visits. They differ if the points of the import change after the plan is saved (geocoding, manual location): to be agreed between Marzella and Rivera.
- **Data sent outside**: the directions links (US-30) open openstreetmap.org with the coordinates of the stops, like the OSRM road route of the planner; `source/AGENTS.md` section 8 names only Nominatim. To be confirmed by the team.
- **Bundle budget**: the initial bundle is 570.78 kB (budget 500 kB): the alert dialog of PUC-6 brings `@angular/cdk` to the startup bundle, the revamp adds the shell icons and styles. `app.css` is 5.50 kB, over the 4 kB component style warning (`angular.json`). To be decided.
- **Mockups S1-S6, S11-S13** (Puccetti, Rivera) are still missing from the repo.

## 2026-09-28 - MAR-6 on `matteomarzella-feat/MAR-6-strategy-results-mockups` (base `develop` at `b8745e0`)

This section records local MAR-6 work awaiting review and merge. Other task statuses are carried forward from the
previous check, with RIV-4 (PR #8) now merged in `develop`. MAR-6 was reduced to the mockups S7-S10 on
2026-09-28 (decision of Marzella): the "measured results" section of `OPTIMIZATION_STRATEGY.md` is dropped, the
document already reports the synthetic 1,000-point timing check of MAR-2.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 8 (PUC-2, 4, 5, 8, 9, 10, 11, 12) | 2 (PUC-3, 7) | 1 (PUC-6) | 1 skipped (PUC-1) |
| Marzella (MAR) | 6 (MAR-1, 2, 3, 4, 5, 6) | - | 0 | - |
| Rivera (RIV) | 4 (RIV-1, 2, 3, 4) | - | - | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | 🟡 Partly done | Create done (`POST /api/imports`, ends in `GEOCODING` and publishes `ImportCreatedEvent`). Missing: list, detail, delete |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ❌ Not started | Both pages are placeholders |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6 |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save |
| MAR-5 What-if + scenarios compare pages | ✅ Done | Merged with PR #7 (`fe7180a`): what-if page (coverage curve and table over up to 5 horizons) and saved scenarios side by side, with a link to the agent plan page and delete |
| MAR-6 Mockups S7-S10 | ✅ Done (local, not merged) | `booklets/user-stories/mockups/S7-planner-parameters.png`, `S8-planner-result.png`, `S9-what-if.png`, `S10-scenarios-compare.png`, grayscale 1280 x 900 with synthetic sample names, generated by `booklets/user-stories/mockups/tools/GenerateMockups.java` (Java2D, no `.bmpr`); mockups README updated. Scope reduced to the mockups: no "measured results" section |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ✅ Done | Merged with PR #8 (`b8745e0`): `GET /api/plans/{planId}/export` (one sheet per agent, `?agent=` filter) and the agent plan page `imports/:importId/plans/:planId` (calendar Mon-Fri, directions links, agent filter, Excel export) |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no S6/S11 mockup images or slides in the repo yet |

### Blockers and next steps

- **Reaching an import from the UI** still needs the rest of PUC-3 (list, detail, delete) and PUC-6.
- **Saved plan vs. export**: `GET /api/plans/{planId}` recomputes the plan from its saved parameters, the Excel export reads the saved visits. They differ if the points of the import change after the plan is saved (geocoding, manual location): to be agreed between Marzella and Rivera.
- **Data sent outside**: the directions links (US-30) open openstreetmap.org with the coordinates of the stops, like the OSRM road route of the planner; `source/AGENTS.md` section 8 names only Nominatim. To be confirmed by the team.
- **Bundle budget**: `ng build` reports the initial bundle budget warning already present on `develop` (504.39 kB, budget 500 kB); the agent plan page is a lazy chunk (10 kB).
- **Mockups S1-S6, S11-S13** (Puccetti, Rivera) are still missing from the repo.

## 2026-09-28 - PUC-6 on `feat/PUC-6-imports-pages` (base `develop` at `d4ced7d`)

This section records PUC-6, merged into `develop` with this branch. PUC-3 was merged into `develop` in `d4ced7d`.
Other task statuses are carried forward from the previous check.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 10 (PUC-2, 3, 4, 5, 6, 8, 9, 10, 11, 12) | 1 (PUC-7) | - | 1 skipped (PUC-1) |
| Marzella (MAR) | 5 (MAR-1, 2, 3, 4, 5) | - | 1 (MAR-6) | - |
| Rivera (RIV) | 4 (RIV-1, 2, 3, 4) | - | - | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | ✅ Done | Merged in `develop` (`d4ced7d`): create, `GET /api/imports`, `GET /api/imports/{id}` (`ImportDetail`), `DELETE /api/imports/{id}` (database cascade to enterprises, points, revenues, plans) (`afaaa5e`) |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ✅ Done | Merged into `develop` with `feat/PUC-6-imports-pages`. **Imports list** `/imports` (US-10, US-12): cards or table, choice kept in `localStorage`, empty state, delete after an alert dialog (`366075e`). **Import detail** `/imports/:importId` (US-07..US-09, US-11, US-12): report and column mapping, geocoding progress polled every 3 s while the import is `GEOCODING` (detail and points reloaded at the end), retry of the addresses not found or never tried, points table with a not-located filter and 50 points per page, manual location form (decimal comma accepted), delete (`657f28d`). Tests: 58 new (imports folder 89 in total) |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6 |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save |
| MAR-5 What-if + scenarios compare pages | ✅ Done | Merged with PR #7 (`fe7180a`): what-if page (coverage curve and table over up to 5 horizons) and saved scenarios side by side, with a link to the agent plan page and delete |
| MAR-6 Strategy doc results, mockups S7-S10 | ❌ Not started | `OPTIMIZATION_STRATEGY.md` section 9 updated for the daily road route only |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ✅ Done | Merged with PR #8 (`b8745e0`): `GET /api/plans/{planId}/export` (one sheet per agent, `?agent=`), agent plan page `imports/:importId/plans/:planId` with weekly calendar, OSM directions and export (`c133976`, `e5c5c70`) |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no mockup images or slides in the repo yet |

### Blockers and next steps

- **Planner geocoding polling**: the planner page treats `pending > 0` as running, so on a `READY` import with points left `PENDING` (geocoder unavailable, or imported before PUC-4) it polls every 3 s without end. The import detail page polls only while the status is `GEOCODING` and offers a retry. To be agreed with Marzella.
- **Saved plan vs. export**: `GET /api/plans/{planId}` recomputes the plan from its saved parameters, the Excel export reads the saved visits. They differ if the points of the import change after the plan is saved (geocoding, manual location): to be agreed between Marzella and Rivera.
- **Data sent outside**: the directions links (US-30) open openstreetmap.org with the coordinates of the stops, like the OSRM road route of the planner; `source/AGENTS.md` section 8 names only Nominatim. To be confirmed by the team.
- **Bundle budget**: the initial bundle is 554.11 kB (budget 500 kB, 504.39 kB before PUC-6): the spartan alert dialog used to confirm deletes brings `@angular/cdk` (61 kB raw) into a chunk loaded at startup. To be decided: keep it, or confirm with a native `<dialog>`.
- **MAR-6** (measured results in `OPTIMIZATION_STRATEGY.md`, mockups S7-S10) is the last Marzella task left.

## 2026-09-28 - PUC-3 on `feat/PUC-3-import-list-detail-delete` (base `develop` at `b8745e0`)

This section records local PUC-3 work awaiting review and merge. Other task statuses are carried forward from the
previous check, with RIV-4 (PR #8) now merged in `develop` and `main`.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 8 (PUC-2, 4, 5, 8, 9, 10, 11, 12) | 1 in review (PUC-3), 1 (PUC-7) | 1 (PUC-6) | 1 skipped (PUC-1) |
| Marzella (MAR) | 5 (MAR-1, 2, 3, 4, 5) | - | 1 (MAR-6) | - |
| Rivera (RIV) | 4 (RIV-1, 2, 3, 4) | - | - | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | REVIEW (local, not merged) | Create was already merged. Added on the branch: `GET /api/imports` (the tenant's imports newest first, enterprises read in one query), `GET /api/imports/{id}` (`ImportDetail`: summary + saved mapping, agents, cities, `notFoundCount`, `errorMessage`) and `DELETE /api/imports/{id}` (`204`; the database cascades to enterprises, points, revenues, plans and planned visits). Another tenant's import answers `404` from the tenant guard. Tests: `ImportReadDeleteTest` 9 |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ❌ Not started | Both pages are placeholders |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6 |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save |
| MAR-5 What-if + scenarios compare pages | ✅ Done | Merged with PR #7 (`fe7180a`): what-if page (coverage curve and table over up to 5 horizons) and saved scenarios side by side, with a link to the agent plan page and delete |
| MAR-6 Strategy doc results, mockups S7-S10 | ❌ Not started | `OPTIMIZATION_STRATEGY.md` section 9 updated for the daily road route only |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ✅ Done | Merged with PR #8 (`b8745e0`): `GET /api/plans/{planId}/export` (one sheet per agent, `?agent=`), agent plan page `imports/:importId/plans/:planId` with weekly calendar, OSM directions and export (`c133976`, `e5c5c70`) |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no mockup images or slides in the repo yet |

### Blockers and next steps

- **Reaching an import from the UI** needs PUC-6 (imports list and import detail pages); its API is on the PUC-3 branch. US-10, US-11 and US-12 stay `TODO` until those pages exist.
- **Saved plan vs. export**: `GET /api/plans/{planId}` recomputes the plan from its saved parameters, the Excel export reads the saved visits. They differ if the points of the import change after the plan is saved (geocoding, manual location): to be agreed between Marzella and Rivera.
- **Data sent outside**: the directions links (US-30) open openstreetmap.org with the coordinates of the stops, like the OSRM road route of the planner; `source/AGENTS.md` section 8 names only Nominatim. To be confirmed by the team.
- **Bundle budget**: `ng build` reports the initial bundle budget warning already present on `develop` (504.39 kB, budget 500 kB); the agent plan page is a lazy chunk (10 kB).
- **MAR-6** (measured results in `OPTIMIZATION_STRATEGY.md`, mockups S7-S10) is the last Marzella task left.

## 2026-09-28 - RIV-4 on `RIV-4` (base `develop` at `fe7180a`)

This section records local RIV-4 work awaiting review and merge. Other task statuses are carried forward from the
previous check, with MAR-5 (PR #7) now merged in `develop`.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 8 (PUC-2, 4, 5, 8, 9, 10, 11, 12) | 2 (PUC-3, 7) | 1 (PUC-6) | 1 skipped (PUC-1) |
| Marzella (MAR) | 5 (MAR-1, 2, 3, 4, 5) | - | 1 (MAR-6) | - |
| Rivera (RIV) | 3 (RIV-1, 2, 3) | 1 in review (RIV-4) | - | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | 🟡 Partly done | Create done (`POST /api/imports`, ends in `GEOCODING` and publishes `ImportCreatedEvent`). Missing: list, detail, delete |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ❌ Not started | Both pages are placeholders |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6 |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save |
| MAR-5 What-if + scenarios compare pages | ✅ Done | Merged with PR #7 (`fe7180a`): what-if page (coverage curve and table over up to 5 horizons) and saved scenarios side by side, with a link to the agent plan page and delete |
| MAR-6 Strategy doc results, mockups S7-S10 | ❌ Not started | `OPTIMIZATION_STRATEGY.md` section 9 updated for the daily road route only |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | REVIEW (local, not merged) | **Export** (endpoint 18, US-29): `GET /api/plans/{planId}/export` in `planning.export` reads the saved visits and writes one sheet per agent (date, order, customer, delivery point, address, city, expected revenue, km from the previous stop); `?agent=` keeps one agent, an agent without visits in the plan answers `404` (`c133976`). **Page** `imports/:importId/plans/:planId` (US-28, US-30) replaces the placeholder: name, dates, warnings, indicators, calendar week by week from Monday to Friday with the visits in order and the days after the deadline flagged, OpenStreetMap directions by car from the previous stop in a new tab, agent filter kept in the URL, "Export to Excel" of the whole plan or of the chosen agent (`e5c5c70`). Tests: 10 backend (`PlanWorkbookTest` 5, `PlanExportControllerTest` 5), 17 frontend (`plan.model.spec.ts` 9, `plans.service.spec.ts` 1, `plan-detail-page.spec.ts` 7); after merging `develop`: backend `./mvnw verify` 325 tests, frontend 195 tests, `ng build` succeeds. Checked in the browser at 768 px on the synthetic sample |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no mockup images or slides in the repo yet |

### Blockers and next steps

- **Reaching an import from the UI** still needs the rest of PUC-3 (list, detail, delete) and PUC-6.
- **"Open plan" from the scenarios page** leads to the RIV-4 agent plan page once RIV-4 is merged.
- **Saved plan vs. export**: `GET /api/plans/{planId}` recomputes the plan from its saved parameters, the Excel export reads the saved visits. They differ if the points of the import change after the plan is saved (geocoding, manual location): to be agreed between Marzella and Rivera.
- **Data sent outside**: the directions links (US-30) open openstreetmap.org with the coordinates of the stops, like the OSRM road route of the planner; `source/AGENTS.md` section 8 names only Nominatim. To be confirmed by the team.
- **Bundle budget**: `ng build` reports the initial bundle budget warning already present on `develop` (504.39 kB, budget 500 kB); the agent plan page is a lazy chunk (10 kB).
- **MAR-6** (measured results in `OPTIMIZATION_STRATEGY.md`, mockups S7-S10) is the last Marzella task left.

## 2026-09-28 - MAR-5 on `matteomarzella-feat/MAR-5-whatif-scenario-compare` (base `develop` at `ad28426`)

This section records local MAR-5 work awaiting review and merge. Other task statuses are carried forward from the
previous check, with the planning routing fix (PR #6) now merged in `develop`.

### Summary

| Member | Done | Partly done | Not started | Skipped / unknown |
|---|---|---|---|---|
| Puccetti (PUC) | 8 (PUC-2, 4, 5, 8, 9, 10, 11, 12) | 2 (PUC-3, 7) | 1 (PUC-6) | 1 skipped (PUC-1) |
| Marzella (MAR) | 4 (MAR-1, 2, 3, 4) | 1 in review (MAR-5) | 1 (MAR-6) | - |
| Rivera (RIV) | 3 (RIV-1, 2, 3) | - | 1 (RIV-4) | 1 unknown (RIV-5) |

### Puccetti - Import, tenants and login

| Task | Status | Evidence / what is missing |
|---|---|---|
| PUC-1 Dev seed with the synthetic sample | ⏭️ Skipped | Decided 2026-09-28: log in with the demo tenant and import `source/sample-data/sample-erp-layout.xlsx` with the wizard |
| PUC-2 Template + preview API | ✅ Done | `GET /api/imports/template`, `POST /api/imports/preview` (`4ab1702`, `1963428`, `080375b`) |
| PUC-3 Import API | 🟡 Partly done | Create done (`POST /api/imports`, ends in `GEOCODING` and publishes `ImportCreatedEvent`). Missing: list, detail, delete |
| PUC-4 Background geocoding | ✅ Done | Merged with PR #6 (`ad28426`): Nominatim client + cache, async job, `GET /api/imports/{id}/geocoding`, retry, manual location |
| PUC-5 Import wizard page | ✅ Done | Upload, columns, enterprises and name, report (`10421c7`, `6217f07`) |
| PUC-6 Imports list + import detail pages | ❌ Not started | Both pages are placeholders |
| PUC-7 Student_doc, mockups S1-S5/S12/S13, real file on the demo laptop | 🟡 Partly done | `Student_doc.md` up to date. No mockup images; real file not imported yet |
| PUC-8 Tenants and login (backend) | ✅ Done | Registration, login, lockout, rate limit, profile API, tenant guard, demo tenant |
| PUC-9 Login, register and profile pages | ✅ Done | Pages, route guards, 401 handling, tenant menu |
| PUC-10 Tenant starting base | ✅ Done | Merged with PR #6 (`ad28426`): changeset 006, `GET/PUT /api/profile/base`; the base field lives in the planner page |
| PUC-11 Dark mode | ✅ Done | Header toggle, system theme until chosen (`93ec023`) |
| PUC-12 Keep me logged in | ✅ Done | Persistent remember-me tokens, login checkbox (`95b8c52`, `0e74b73`) |

### Marzella - Planning

| Task | Status | Evidence / what is missing |
|---|---|---|
| MAR-1 Engine basics | ✅ Done | Working calendar, campaign windows, travel model, visit constraints, 76 unit tests (`836bd21`) |
| MAR-2 Planner algorithm | ✅ Done | Deterministic greedy planner, bounded local search, routes and KPIs (`376eaa2`) |
| MAR-3 Planning API | ✅ Done | Campaigns, simulate, what-if, save/list/get/delete plans (`3cd7e04`); road route endpoint 18b merged with PR #6 |
| MAR-4 Planner page | ✅ Done | Merged in `develop` (`fe22836`, rework in `ad28426`): starting point by address, campaign, KPIs, day timeline, real road route, scenario save |
| MAR-5 What-if + scenarios compare pages | REVIEW (local, not merged) | `imports/:importId/scenarios` page replaces the placeholder (US-26, US-27). **What-if**: pick the plan to analyse (planner defaults of a campaign or a saved scenario), type up to 5 horizons (default `20, 30, 40`), `POST .../plans/what-if`; results as an inline SVG coverage curve plus a table (covered revenue, coverage, gain vs. previous horizon, visits, km). **Scenarios**: `GET .../plans` list with tick boxes (up to 4), side-by-side table (campaign, horizon, who visits, priorities, 7 KPIs) with the best value of each row highlighted, link to the plan page, delete (`DELETE /api/plans/{id}`). `PlannerService` gains `whatIf`, `plans`, `deletePlan`; pure helpers in `scenario-compare.model.ts`. 17 new tests (`scenario-compare.model.spec.ts` 8, `scenario-compare-page.spec.ts` 7, `planner.service.spec.ts` +2); the 29 tests of `features/planner` and `app.spec.ts` pass, `ng build` succeeds |
| MAR-6 Strategy doc results, mockups S7-S10 | ❌ Not started | `OPTIMIZATION_STRATEGY.md` section 9 updated for the daily road route only |

### Rivera - Platform and map

| Task | Status | Evidence / what is missing |
|---|---|---|
| RIV-1 App shell, UI kit, shared components, `MapView` | ✅ Done | `58ee3a9`, `4469107`, `a69d56f`, `7d214db` |
| RIV-2 Points list + analytics summary API | ✅ Done | `GET /api/imports/{id}/points`, `GET /api/imports/{id}/analytics/summary` (`57aad60`) |
| RIV-3 Map dashboard | ✅ Done | Markers, filters, point details, indicators (`853de59`, `15c41aa`) |
| RIV-4 Agent plan page + Excel export | ❌ Not started | Placeholder page. The scenarios page (MAR-5) links to `imports/:importId/plans/:planId`, which still shows the placeholder |
| RIV-5 Architecture booklet, stories spreadsheet, mockups, slides, demo script | ❓ Unknown | Booklets and spreadsheet exist; no mockup images or slides in the repo yet |

### Blockers and next steps

- **Reaching an import from the UI** still needs the rest of PUC-3 (list, detail, delete) and PUC-6.
- **"Open plan" from the scenarios page** lands on the RIV-4 placeholder until the agent plan page is done.
- **Frontend tests on this machine** were run inside a `node:24-alpine` container (`docker run ... npx ng test`) because Node.js is not installed locally; `ng build` reports the initial bundle budget warning already present on `develop` (503.75 kB there, 504.23 kB here, budget 500 kB); the page itself is a lazy chunk.
- **MAR-6** (measured results in `OPTIMIZATION_STRATEGY.md`, mockups S7-S10) is the last Marzella task left.

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
