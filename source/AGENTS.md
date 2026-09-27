# AGENTS.md - Rules for every AI agent (and human) working on VisitWise

> Read this file completely before doing anything. It overrides your default habits.
> Everything you write (code, comments, file names, commits, docs) is in **English**.
> All paths in this file are relative to the **repository root**.

How each tool loads this file (it lives in `source/` because the course allows only 4 visible items at the root):

| Tool | Setup |
|---|---|
| Claude Code | Start from the repo root: `.claude/CLAUDE.md` imports this file |
| Cursor | Picks up nested `AGENTS.md` automatically |
| Gemini CLI | `.gemini/settings.json` makes it load `AGENTS.md` files |
| GitHub Copilot | `.github/copilot-instructions.md` points here |
| Codex / others | First prompt of every session: "Read source/AGENTS.md and follow it" |

## 1. Project in one paragraph

**VisitWise - smart visit planning for sales territories.** Hackathon project of team TeamLab (3 people, a few days).
A web dashboard for a federation of companies that supply customers at delivery points.
The analyst uploads the yearly ERP Excel export through a wizard (any column order, any number of enterprise columns), the data is saved in PostgreSQL and geocoded, customers are shown on an OpenStreetMap map per enterprise, and a planner proposes **which customers to visit, in which order and on which working day (Mon-Fri)** to maximize revenue within a maximum number of days, with **what-if analysis** over different horizons.
Each federation is a **tenant** with its own login: its data is invisible to other tenants, and its enterprises registered in the profile pre-fill the import wizard.
Read these before working on the related area:

- `booklets/architecture/OPTIMIZATION_STRATEGY.md` - how the planner works and why (ACCEPTED decision).
- `booklets/architecture/API_CONTRACT.md` - the frontend/backend contract (source of truth).
- `booklets/architecture/ARCHITECTURE.md` - containers, data model, tech choices.
- `booklets/team/TASKS.md` - who owns what. **Only work on the task you were given.**
- `booklets/user-stories/USER_STORIES.md` - user stories (US-xx) with non-functional requirements.

## 2. Repository layout (required by the course - STRICT)

The root contains **exactly** these four visible items. **Never create any other visible file or folder at the root**
(only hidden git/tool config such as `.gitignore`, `.github/`, `.claude/` may live there).

```
.
├── input.txt            # system description + user stories (course format) - do not reformat
├── Student_doc.md       # deployed system specs (course format) - update when you add endpoints/pages/tables
├── source/              # all code + IaC
│   ├── AGENTS.md        # this file
│   ├── README.md        # quick start
│   ├── docker-compose.yml, .env.example
│   ├── backend/         # Spring Boot 4.1 (Java 21, Maven) + Liquibase
│   ├── frontend/        # Angular 22 + spartan-ng (helm/brain) + Tailwind 4 + OpenLayers
│   └── sample-data/     # SYNTHETIC datasets + generator (safe to commit)
└── booklets/            # documentation for the exam: architecture, user stories, mockups, devlog, slides
```

## 3. Stack and commands

| Area | Tech | Commands (run from the folder shown) |
|---|---|---|
| Whole system | Docker Compose | `source/`: `docker compose up --build` -> app http://localhost:4200, API http://localhost:8080/swagger-ui.html |
| DB only (for local dev) | PostgreSQL 17 | `source/`: `docker compose up -d db` |
| Backend | Spring Boot 4.1.1, Java 21, Maven wrapper | `source/backend/`: `./mvnw spring-boot:run`, `./mvnw verify` (tests need the db container running) |
| Backend without local Java | Docker | `source/`: `docker compose up --build backend` |
| Frontend | Angular 22, Vitest | `source/frontend/`: `npm ci`, `npm start` (proxies `/api` to :8080), `npx ng build`, `npx ng test --watch=false` |
| Sample data | Python + openpyxl | repo root: `python source/sample-data/generate_samples.py` |

### Backend conventions

- Package per feature under `it.teamlab.visitwise`: `imports`, `geocoding`, `planning` (+ `planning.engine`), `analytics`, `tenant`, `common`. Do not create `controller/`, `service/` layer packages at the top level.
- DTOs are Java `record`s. Never return JPA entities from controllers.
- Errors: throw `NotFoundException` / `IllegalArgumentException`; `GlobalExceptionHandler` turns them into problem+json. Add handlers there, do not catch-and-wrap in controllers.
- **Database schema changes only through Liquibase**: add `NNN-description.sql` in `src/main/resources/db/changelog/changes/` and include it in `db.changelog-master.yaml`. **Never edit a changeset already merged in `develop`.** Hibernate runs with `ddl-auto: validate`: entity and schema must match.
- JSON columns are stored as `text` (e.g. `column_mapping`, `parameters`, `kpis`): serialize with the Jackson `ObjectMapper` bean.
- **Spring Boot 4 gotchas** (your training data may be older): Jackson 3 -> `tools.jackson.databind.*` (annotations stay `com.fasterxml.jackson.annotation.*`); starters are modular (`spring-boot-starter-webmvc`, `*-test`); test slices moved packages (`org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`, `org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest`); prefer `RestClient` for HTTP calls. If an import does not compile, check the Boot 4 package before inventing workarounds.
- **Tenant isolation** (D-09): endpoints on tenant data live under `/api/imports/{id}/...` or `/api/plans/{planId}/...`, where the tenant guard checks ownership centrally. Never add an endpoint that lists or reads data across imports without filtering by the current tenant.
- `planning.engine` is **pure Java** (no Spring, no JPA): unit-test it with plain JUnit.
- Tests: JUnit 5 + AssertJ. Every engine rule has a unit test. Controllers: at least one happy-path test.

### Frontend conventions

- Follow `source/frontend/AGENTS.md` (standalone components, signals, `input()`/`output()`, native control flow, OnPush default, no `CommonModule`, `inject()`, strict TS, WCAG AA).
- UI components: spartan-ng helm/brain (skill in `.claude/skills/spartan` and `.agents/skills/spartan`; MCP `spartan-ui`). Styling with Tailwind classes and the theme tokens in `src/styles.css`. No other UI kit (no Angular Material, no Bootstrap).
- Structure: `src/app/core/` (models, shared services), `src/app/features/<feature>/` (pages + feature services), `src/app/shared/` (reusable presentational components). Routes are lazy and already declared in `app.routes.ts`.
- API types come **only** from `core/models/api.models.ts`. Do not redeclare them.
- HTTP: relative URLs `/api/...` (proxy in dev, nginx in Docker). Never hard-code `localhost`.
- Map: OpenLayers (`ol`) with OSM tiles. No Leaflet, no Google Maps.
- Charts: keep it light (plain SVG or one small library agreed in `booklets/architecture/DECISIONS.md`).

### Test-driven development (mandatory, backend and frontend)

Every change of behavior starts from a failing test (red -> green -> refactor):

1. **Red**: write the smallest test for the next behavior (from the task's acceptance criteria and the story's non-functional requirements). Run it and see it fail for the expected reason.
2. **Green**: write the minimum code that makes it pass.
3. **Refactor**: clean up with all tests green. Repeat for the next behavior.

- Backend (JUnit 5 + AssertJ): plain unit tests for pure logic (`planning.engine`, validators, policies); MockMvc for controllers (status codes, problem+json, security rules); tests against the `db` container for repositories and Liquibase changesets.
- Frontend (Vitest via `ng test`): services, guards, interceptors, pipes and component logic are tested first (`HttpTestingController` for HTTP). Pure layout and styling are checked visually, not test-first.
- A bug fix starts with a test that reproduces the bug.
- The test and the code that makes it pass go in the same commit: never commit failing tests.
- Agents: in the final report, list the tests written first, the failure seen before the implementation, and the passing run after.

## 4. Git workflow (mandatory)

- **Nobody works on `main`. Nobody commits directly on `develop`.**
- `main` = demo-ready releases only (merged from `develop` by the team, tagged `v0.x`, `v1.0`).
- `develop` = integration branch. All work lands via Pull Request.
- One branch per task/feature, created from an up-to-date `develop`:
  `feat/<TASK-ID>-<short-slug>` · `fix/<TASK-ID>-<slug>` · `docs/<slug>` · `chore/<slug>` · e.g. `feat/PUC-2-import-preview`, `feat/MAR-2-planner-engine`, `feat/RIV-3-map-dashboard`.
- Keep branches short-lived (< 1 day). Before opening a PR: `git fetch origin && git merge origin/develop`, then run the build and tests of the part you touched.
- PR into `develop`, fill the PR template, at least one teammate reviews. Squash merge.

## 5. Commit messages (Conventional Commits - strict)

```
<type>(<scope>): <imperative summary, max 72 chars, no final period>

<body: WHAT changed and WHY, wrapped at 72 chars. Only facts about the staged diff.>

Refs: <TASK-ID>[, US-xx]
```

- `type`: `feat` | `fix` | `refactor` | `test` | `docs` | `build` | `ci` | `chore`
- `scope`: `backend` | `frontend` | `db` | `infra` | `engine` | `booklets` | `docs`
- Examples:
  - `feat(backend): add Excel preview endpoint with header detection` / body / `Refs: PUC-2, US-03, US-04`
  - `fix(engine): skip targets farther than maxDistanceKm` / body / `Refs: MAR-2`
  - `docs(booklets): add devlog entry for import wizard` / `Refs: PUC-5`
- One logical change per commit. Do not mix formatting with behavior changes.
- The message describes **only what is in the diff**. No marketing words ("robust", "comprehensive", "enhanced"), no claims about things not done, no invented issue numbers.

## 6. Rules for AI agents - DO NOT take initiative

1. **Scope lock.** Do only what the current task/prompt asks. No "while I was here" refactors, renames, reformatting, dependency upgrades, or extra features. If you notice something worth doing, **write it in your final message** as a suggestion; do not do it.
2. **Stay in your area.** Only modify files owned by your task (see `booklets/team/TASKS.md` -> "Owned paths"). Shared files (`api.models.ts`, `API_CONTRACT.md`, `docker-compose.yml`, `pom.xml`, `package.json`, `db.changelog-master.yaml`, `source/AGENTS.md`) change **only if the task says so**, in a dedicated commit. Never add visible files at the repository root.
3. **Ask before**: adding a dependency; changing the API contract; changing the DB schema outside your task; deleting files; changing Docker/CI config; touching another member's feature.
4. **Never**: commit to `main`/`develop`; `git push` unless the human says so; `--force` push; amend/rebase pushed commits; skip hooks (`--no-verify`); commit secrets or `.env`; **commit or paste the real dataset** (NDA - see section 8).
5. **Test first, verify, then report.** Work test-first (section 3, "Test-driven development"). Before saying "done": build + tests of the touched part. Report exactly what you ran and the result. If something fails or you skipped it, say so.
6. **Do not invent.** Unknown requirement -> read the booklets; still unclear -> ask the human. Do not fabricate API fields, data, or test results.
7. **Small commits** following section 5. Stage explicit paths (`git add <paths>`), never blindly `git add -A`.
8. **Keep docs in sync in the same PR**: new endpoint -> `API_CONTRACT.md` (if agreed) + `Student_doc.md` endpoints table; new page -> `Student_doc.md` pages table; new table -> `Student_doc.md` DB structure.

## 7. Every push is documented (booklets feed the slides)

Before every `git push`, add **one new file** in `booklets/devlog/` (one file per push = no merge conflicts):

- File name: `YYYY-MM-DD-HHMM-<surname>-<slug>.md` (lower case), e.g. `2026-09-28-1430-puccetti-import-preview.md`
- Copy `booklets/devlog/_TEMPLATE.md` and fill **every** field (what, why/decisions, user stories, how verified, slide note, screenshot path if any).
- Commit it with the work (`docs(booklets): devlog for <TASK-ID>`).
- Screenshots of new UI go in `booklets/slides/assets/` (PNG, descriptive name). They are reused in the final PowerPoint.

## 8. NDA and data handling

- The real ERP file is under NDA. Keep it **outside the repo** or in `source/data-private/` (gitignored). `*.xlsx` is gitignored except the synthetic samples and the import template.
- Never put real customer names, addresses or revenue in code, tests, fixtures, docs, screenshots committed to the repo, or prompts to external services beyond what the task strictly needs. Use `source/sample-data/` for tests and screenshots.
- Nothing derived from the real file is committed either: no counts, totals, percentages or column layout. Figures in docs, screenshots and slides come from `source/sample-data/`.
- The only external service that receives data is the geocoder (Nominatim), and it receives **only address fields** (street, postal code, city, province) of delivery points and enterprise headquarters.

## 9. Definition of Done (for every task)

- [ ] Written test-first (section 3); code builds; tests of the touched area pass; `docker compose up --build` still works.
- [ ] Acceptance criteria of the task in `TASKS.md` are met; related US ids are in the commits.
- [ ] Docs updated (contract / Student_doc / architecture) where relevant.
- [ ] Devlog file added; screenshots for UI work.
- [ ] PR opened into `develop` with the template filled.
