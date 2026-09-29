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

### D-09 Tenants, login and data isolation
- Context: the data is under NDA and was reachable by anyone with the URL; more federations could share one deployment; the enterprises had to be re-entered at every import.
- Decision: a **tenant** is one federation with one login (email + password). Out of scope: several users per tenant, roles, email verification, password reset. The `tenant` table holds the credentials too (no separate user table). Spring Security with a server session (HttpOnly cookie) and a CSRF cookie that Angular `HttpClient` sends back automatically; no JWT. `import_batch.tenant_id` is the only tenant column on imported data: points, revenues and plans hang off the import, so one guard on `/api/imports/{id}/**` and `/api/plans/{planId}/**` isolates everything and answers 404 for other tenants.
- Consequences: after PUC-8 merges every API call needs a session (demo tenant in the dev seed). New endpoints on tenant data stay under those routes, or filter by the current tenant explicitly.

### D-10 One starting base per tenant
- Context: the planner needs the point where every working day starts and ends; typing it for every plan is error-prone. The enterprise registry first proposed with D-09 was dropped as not needed for the demo.
- Decision: the tenant saves one starting base (address + city, geocoded with the Nominatim cache) from a field at the top of the planner form, owned by Puccetti. The field fills the existing `PlanParameters.base`, so the engine and the plan contract do not change; each saved plan keeps the base it used.
- Consequences: until a base is saved the planner uses the configured default (Rome centre). Changing the base does not change saved plans. The geocoder also receives the base address (address + city only).

### D-11 Optional self-hosted OSRM for road distances (updates D-05)
- Context: the planner estimated travel with the straight-line distance x road factor at one average speed (D-05). The public OSRM demo server allows 1 request per second and forbids large tables, so it could only draw the route of one day.
- Decision: an optional Docker Compose profile `osrm` runs OSRM v6 (contraction hierarchies, car profile) on the Geofabrik extract of central Italy, downloaded and prepared once into a volume. When `ROUTING_MATRIX_ENABLED=true` the backend asks the table service for the distances and driving times between the base and every located point of the import, in blocks of 500 x 500 (`--max-table-size 500`), keeps the last 4 tables in memory, and the engine uses them for range, workday and route length. Points that OSRM places more than 1 km away (outside the extract) and pairs without a road keep the estimate. The plan KPIs say which figures were used (`travelSource`). Without the profile nothing changes.
- Consequences: no rate limit and no coordinate leaves the machine; about 1 s for 1,000 points the first time. The profile downloads about 370 MB and needs up to 4 GB of memory to prepare it, once (about 1 GB on disk); the server then uses about 0.6 GB. OSRM times assume free-flowing traffic, so they are shorter than the 25 km/h city estimate and more visits fit in a day. The average speed and road factor parameters then apply only to the pairs left to the estimate.
