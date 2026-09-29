# Architecture Decisions

### D-01 Repository layout

Code/IaC lives in `source/`, documentation in `booklets/`, with `input.txt` and `Student_doc.md` at the root, alongside hidden tooling configuration.

### D-02 Modular monolith

One Spring Boot backend uses feature packages because imports, analytics and planning share data. Compose runs frontend, backend and PostgreSQL, with optional OSRM services.

### D-03 Deterministic planner

A pure Java seed-and-fill heuristic with bounded local search implements `VisitPlanner`. It supports repeatable what-if runs without a solver dependency, but cannot guarantee optimality. See [the algorithm](OPTIMIZATION_STRATEGY.md).

### D-04 Cached geocoding

Nominatim resolves address/city through a global cache of successes and misses. The worker defaults to 1100 ms between calls; supplied/manual coordinates avoid geocoding, and explicit retry bypasses cached misses.

### D-05 Estimated travel (extended by D-11)

Haversine distance times road factor, divided by average speed, remains the default planning model and fallback. The displayed day's OSRM route is calculated separately and can differ from planning estimates.

### D-06 Persistence

Mapping, plan parameters and KPIs are JSON in text columns; other data retains relational keys. Liquibase owns the schema, Hibernate validates it. Saving persists parameters, KPIs and visits; list reads stored summaries, detail recomputes with current data, export reads stored visits. These views can diverge after geocoding/routing changes.

### D-07 Mapping by header

The wizard sends header names, making column order irrelevant. The parser disambiguates duplicates; enterprises are rows per import, supporting a variable number of revenue columns.


### D-08 Tenant authentication

One federation has one email/password account, server sessions and CSRF protection. Import/plan guards hide foreign ids with `404`; lists filter by tenant. Persistent remember-me tokens survive backend restarts. See [authentication](AUTHENTICATION.md).

### D-09 One starting base per tenant

The planner saves address/city and geocoded coordinates on the tenant. New requests use that base or the frontend's Rome fallback; saved parameters retain their original base. Enterprises remain import-scoped.

### D-10 Optional self-hosted road matrix

The `osrm` profile prepares central Italy's car/CH network with OSRM v6. Set a local `ROUTING_BASE_URL` and enable `ROUTING_MATRIX_ENABLED`; starting the profile alone does not switch providers.
Tables cover the base and located points, in blocks (default 500), with four matrices cached in memory. Directional road data drives range, route length and workday feasibility.
Missing pairs or points snapped over 1 km use estimates; provider failure falls back entirely. `travelSource=OSRM` means a matrix was supplied, possibly with estimated legs.
By default, day-route requests send coordinates to public OSRM. Self-hosting keeps routing local; geocoding and map tiles remain external.
