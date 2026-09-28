# Planning routing fix - addresses, starting base, real road routes, simpler planner

- **Author:** Marzella
- **Task / user stories:** MAR-2, MAR-3, MAR-4 (rework); PUC-4 and PUC-10
  with the owner's agreement; US-08, US-09, US-24, US-35
- **What changed:**
  - Backend `geocoding` package (PUC-4): Nominatim client (1 request/second,
    identifying User-Agent, structured query then free-form fallback),
    `geocode_cache` hits and misses, background job started after
    `POST /api/imports` commits and resumed at startup, progress endpoint
    `GET /api/imports/{id}/geocoding`, retry `POST .../geocoding/retry`,
    manual fix `PATCH .../points/{pointId}/location`. `422` "Address not found"
    and `503` "Geocoder unavailable" problem details.
  - Tenant starting base (PUC-10): changeset `006-tenant-starting-base.sql`,
    `GET/PUT /api/profile/base` geocoding address + city through the same
    service and cache.
  - Planning: `POST /api/imports/{id}/plans/route` returns the OSRM road route
    (km, minutes, legs, polyline) of one day, or the Haversine estimate marked
    `ESTIMATE` when OSRM is disabled or down. Config `visitwise.routing.*`,
    `ROUTING_ENABLED` / `ROUTING_BASE_URL` in `docker-compose.yml` and
    `.env.example`.
  - Planner page rebuilt around three steps: starting point by address,
    campaign and visits, results. Rarely used inputs (priorities, agents,
    speed, costs) are collapsed. Geocoding progress banner with retry, base
    marker and numbered stops on the map, real road polyline with a
    "road route" / "estimate" badge, scenario save. Dropdowns now use the
    spartan `hlm-native-select` component instead of a non-existent directive,
    which fixes the unstyled white menus in dark mode; a `select`/`option`
    fallback was added to `styles.css`.
  - Docs: `API_CONTRACT.md` (8, 9, 9b, 18b, 26, 27), `OPTIMIZATION_STRATEGY.md`
    section 9, `TASK_STATUS.md`, `USER_STORIES.md`, `Student_doc.md`.
- **Why / decisions:** Customer rows carry addresses, not coordinates, so the
  planner was empty until points were geocoded: geocoding had to land in the
  same branch. Geocoding and routing calls go through the backend because the
  SPA's CSP only allows `connect-src 'self'` and because the Nominatim cache
  and rate limit must be shared. Selection keeps the local straight-line
  model (a full OSRM matrix violates the demo server policy); the real road
  route is fetched only for the day on screen, with a fallback that uses the
  same numbers as the KPIs so the page never breaks. The base address field
  lives in the planner instead of a separate `StartingBaseField` to keep the
  page to one flow.
- **Verification:** Fakes (`FakeGeocoder`, `FakeRouteProvider`, `@Primary` in
  test sources) replace the external providers, so no test calls Nominatim or
  OSRM. New backend tests: `GeocodingServiceTest` (4), `ImportGeocodingJobTest`
  (3), `GeocodingControllerTest` (5), `StartingBaseTest` (5),
  `OsrmRouteProviderTest` (3), 3 route cases in `PlanningControllerTest`;
  `ImportCreateTest` now expects `GEOCODING`. Two bugs found by the tests and
  fixed: ambiguous constructors on `@Component`s with two constructors, and a
  unique-key violation when a cached miss was retried (delete + insert in one
  transaction; now updated in place). Targeted backend run: 43 tests, all pass
  except `ImportCreateTest.fiveThousandRowsTakeLessThanFiveSeconds`, which
  also fails on `develop` on this machine (7-11 s against Docker Desktop
  Postgres). Frontend: `planner-page.spec.ts` rewritten, 12 focused tests pass,
  `ng build` succeeds with the pre-existing CSS warnings and budget notice.
  Only the touched components were tested, as requested.
- **Slide note:** Type the base address once, import the customer file, and
  the planner locates every customer, proposes the visits and draws the real
  road route of each day.
- **Screenshot path:** Not captured.
- **Publication:** Local branch `matteomarzella-fix-planning-routing-ux`, not
  pushed.
