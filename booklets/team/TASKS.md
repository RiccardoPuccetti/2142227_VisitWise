# Team Tasks

Each member owns one feature **end to end** (API + pages) and works in parallel with the others.
Task IDs go in branch names (`feat/PUC-2-import-preview`) and commits (`Refs: PUC-2, US-03`).
Status: `TODO` / `DOING` / `REVIEW` / `DONE` - update it in your PR.

| Member | Slice |
|---|---|
| **Puccetti** (`PUC`) | Import: Excel -> database -> geocoding, wizard and imports pages |
| **Marzella** (`MAR`) | Planning: engine, planning API, planner / what-if / scenarios pages |
| **Rivera** (`RIV`) | Platform & map: app shell, UI kit, map dashboard, agent plan, booklets & slides |

## Start (everyone, together)

1. Read `source/AGENTS.md`, `OPTIMIZATION_STRATEGY.md`, `API_CONTRACT.md`; agree on the user stories in `input.txt`.
2. Group leader: create the private repo **`<MATRICOLA>_VISITWISE`**, push to `main`, create `develop`, protect both.
3. Everyone: `cd source && docker compose up --build`. Keep the real Excel file outside the repo (NDA).

## Hand-offs (deliver these first - they are the only cross-member dependencies)

| Deliverable | From | Unblocks |
|---|---|---|
| Synthetic sample preloaded in the DB (PUC-1) | Puccetti | Marzella and Rivera test their APIs without waiting for the import |
| UI kit + shared components, incl. `MapView` (RIV-1) | Rivera | Everyone's pages |
| Points list endpoint (RIV-2) | Rivera | Puccetti's import detail page |
| Plans API (MAR-3) | Marzella | Rivera's agent plan page (uses the contract example JSON until then) |

## Puccetti - Import

Owns: backend `imports/`, `geocoding/`, `db/changelog/dev/`; frontend `features/imports/`; `docker-compose.yml`; `sample-data/`; `Student_doc.md`.

| ID | Task | Stories | Needs |
|---|---|---|---|
| PUC-1 | Repo setup + **dev seed**: synthetic sample with coordinates loaded by Liquibase only with context `dev` | - | - |
| PUC-2 | Template download + preview API (headers, 10 rows, suggested mapping from IT/EN synonyms) | 1, 3, 4, 5 | - |
| PUC-3 | Import API: mapping by header name, skip subtotal rows, save revenues; list, detail, delete | 2, 6, 7, 10, 11, 12 | PUC-2 |
| PUC-4 | Background geocoding (Nominatim 1 req/s + cache), retry, manual location | 8, 9 | PUC-3 |
| PUC-5 | Import wizard page: upload -> column mapping -> enterprises -> name -> report | 1-7 | PUC-3, RIV-1 |
| PUC-6 | Imports list (cards/table) + import detail (progress, points table, fix location, delete) | 8-12 | PUC-4, RIV-1, RIV-2 |
| PUC-7 | `Student_doc.md`, mockups S1-S5, real file imported on the demo laptop | - | - |

## Marzella - Planning

Owns: backend `planning/` (except `planning/export/`); frontend `features/planner/`; `OPTIMIZATION_STRATEGY.md`.

| ID | Task | Stories | Needs |
|---|---|---|---|
| MAR-1 | Engine basics (pure Java): working calendar + Italian holidays, campaign windows, travel model | 19, 20, 21 | - |
| MAR-2 | Planner algorithm as in `OPTIMIZATION_STRATEGY.md` sec. 7, deterministic, unit-tested | 22, 23, 25 | MAR-1 |
| MAR-3 | Planning API: campaigns, simulate, what-if, save/list/get/delete plans | 19-28 | MAR-2, PUC-1 |
| MAR-4 | Planner page: parameters form, KPIs, day-by-day timeline, routes on `MapView`, save scenario | 19-25 | MAR-3, RIV-1 |
| MAR-5 | What-if page (coverage curve over horizons) + scenarios side-by-side compare | 26, 27 | MAR-3, RIV-1 |
| MAR-6 | Update the strategy doc with measured results, mockups S7-S10 | - | - |

## Rivera - Platform & map

Owns: frontend `app.*`, `core/`, `shared/`, `features/dashboard/`, `features/plans/`, `styles.css`, spartan components; backend `analytics/`, `planning/export/`; `booklets/` (except `OPTIMIZATION_STRATEGY.md`).

| ID | Task | Stories | Needs |
|---|---|---|---|
| RIV-1 | App shell + spartan UI kit + shared `KpiCard`, `EnterpriseLegend`, `EurPipe`, `MapView` (OpenLayers + OSM) | - | - |
| RIV-2 | Read API: points list + analytics summary (totals by enterprise/agent/city, top points, Pareto) | 11, 13, 18 | PUC-1 |
| RIV-3 | Map dashboard: markers by enterprise sized by revenue, filters, popup, KPI panel | 13-18 | RIV-1, RIV-2 |
| RIV-4 | Agent plan page (calendar, OSM directions) + Excel export endpoint | 28, 29, 30 | RIV-1, MAR-3 |
| RIV-5 | Architecture booklet, user stories spreadsheet, mockups S6/S11, slides, demo script | - | - |

## Finish (everyone)

- Real-file end-to-end test on a clean `docker compose down -v && docker compose up --build` (Puccetti).
- Rehearse the demo, review slides, freeze booklets, merge `develop` -> `main`, tag `v1.0` (all).
