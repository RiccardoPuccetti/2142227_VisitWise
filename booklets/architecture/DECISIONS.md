# Decision Log

> Short records of decisions that affect more than one member. Newest at the bottom. Format: context -> decision -> consequences.
> Add an entry when you change something shared (contract, schema, dependency, tooling).

### D-01 Repository layout (scaffolding)
- Context: the course requires exactly `input.txt`, `Student_doc.md`, `source/`, `booklets/` at the root.
- Decision: all code/IaC and `AGENTS.md` under `source/`; docs under `booklets/`; only hidden git/agent config at the root.
- Consequences: agents must be pointed to `source/AGENTS.md` (hidden configs do it for Claude, Gemini, Copilot).

### D-02 Modular monolith instead of microservices
- Context: 3 people, a few days; the domain is small and tightly coupled (planner needs import data).
- Decision: one Spring Boot backend with feature packages; 3 containers (frontend, backend, db).
- Consequences: simple deploy and debugging; packages keep ownership boundaries clear.

### D-03 Planner = deterministic domain heuristic
- See `OPTIMIZATION_STRATEGY.md` (options A/B/C). Accepted.

### D-04 Geocoding with public Nominatim + permanent cache
- Decision: 1 req/s background worker, `geocode_cache` table, optional lat/lon columns, manual fix.
- Consequences: the first import of a file with a few hundred distinct addresses takes several minutes (1 address per second); re-imports are almost instant. Start it early before the demo and keep the DB volume.

### D-05 Travel time without routing API
- Decision: haversine x road factor / average speed.
- Consequences: no external dependency and no rate limit; road polylines are optional.

### D-06 JSON payloads stored as text
- Decision: `column_mapping`, `parameters`, `kpis` are `text` columns holding JSON, serialized with Jackson.
- Consequences: no Hibernate JSON type configuration; not queried by SQL (not needed).

### D-07 Mapping by header name
- Decision: the wizard maps fields to header names; the backend re-reads the file with that mapping.
- Consequences: column order is irrelevant; duplicate headers get ` (2)` suffixes.

### D-08 Task split by full vertical slices
- Context: the first split gave all frontend pages to one member; those pages depended on the other two members' APIs (mocks everywhere) and the backend-only member ran out of work early.
- Decision: each member owns a feature end to end - Puccetti: import; Marzella: planning (engine, API, planner/what-if/scenarios pages); Rivera: platform (shell, UI kit, shared `MapView`), read API, map dashboard, agent plan + export, booklets/slides.
- Consequences: each page is built on its owner's own API; only 4 cross-member hand-offs remain (dev seed, UI kit, points endpoint, plans API), delivered first (see `booklets/team/TASKS.md`).
