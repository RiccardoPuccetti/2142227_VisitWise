# Task status log

Status of every task in `TASKS.md`, checked against what is merged in `develop` (commits, endpoints, pages), not
against what is planned. Newest check first: add a new dated section on top, do not edit the old ones.

**Every time a task is completed** (or partly done when its work is merged), whoever did it - person or AI agent - adds a new section in the same PR (`source/AGENTS.md`, section 6 rule 9, and the Definition of Done): copy the latest section, update the rows of that task, the summary and the blockers, and put the `develop` commit in the title.

Legend: ✅ done (merged in `develop`) · 🟡 partly done · ❌ not started · ⏭️ skipped by decision · ❓ not visible in the repo

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
