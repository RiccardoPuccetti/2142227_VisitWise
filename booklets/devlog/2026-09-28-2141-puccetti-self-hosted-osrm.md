# PUC-14 - Self-hosted OSRM: real road distances and times for the planner

- **Author:** Puccetti
- **Task / user stories:** PUC-14; US-39 (with US-24 for the day route)
- **What changed:** An optional Docker Compose profile `osrm` runs OSRM v6 on this
  machine. A one-off container downloads the OpenStreetMap extract of central Italy
  from Geofabrik and prepares the car road network into a volume (once; again only
  when `OSRM_PBF_URL` changes), then `osrm-routed` serves it. With
  `ROUTING_MATRIX_ENABLED=true` the backend asks its table service for the road
  distances and driving times between the base and every located point of the
  import, in blocks of 500 x 500, and keeps the last 4 tables in memory. The engine
  takes them through a small `Travel` interface (the straight-line `TravelModel` is
  one implementation, `RoadMatrix` the other) and uses them for the range limit, the
  working-day check and the route length, in both directions. The plan KPIs say which
  figures were used (`travelSource`), and the planner shows "road network" or
  "estimate" next to the hours on the road. The day route drawn on the map uses the
  same local server.
- **Why / decisions:** The public OSRM demo server allows 1 request per second and
  forbids large tables, so the planner could only estimate travel (decision D-05).
  A local server has no limit and keeps the customer coordinates on the machine
  (decision D-11). Contraction hierarchies, because the planner mostly asks tables.
  Blocks of 500: a 1,000-point table took 3.1 s in blocks of 100, 1.1 s in blocks
  of 500 and 0.8 s in one request. OSRM moves every point to the nearest road it
  knows, even thousands of km away (a test point at 0, 0 got a 181 km route), so a
  point placed more than 1 km away keeps the estimate, like pairs without a road.
  Both OSRM clients now ask for gzip: `osrm-routed` answers "deflate" in a form the
  JDK HTTP client cannot read (`ZipException: incorrect header check`); the public
  server sits behind a proxy, so the route of the day never hit it before. Without
  the profile nothing changes.
- **Verification:** Tests written first: `RoadMatrixTest` (directions, estimate for
  unknown points and missing roads, own copy, validation) and a planner test where
  road figures exclude a point the estimate kept and fit one visit instead of two;
  each failed to compile because the types did not exist. `OsrmRoadMatrixProviderTest`
  (units, blocks, points off the map, cache, errors, disabled) and the
  `PlanningControllerTest` cases for `travelSource` failed the same way. The verbatim
  OSRM answer passed in the unit test while the running backend failed: a probe with
  the real JDK client showed the `ZipException`, and the gzip header expectation in
  both client tests failed before the fix. Planning, export and tenant isolation
  tests: 152, 0 failures. Frontend: `travelBasis` and the planner Distance card
  failed first; all 269 frontend tests pass and `ng build` succeeds (warnings: the
  initial bundle and `app.css` budgets, and four CSS syntax warnings in Tailwind's
  generated RTL variants; this change touches no styles). With `docker compose up
  --build` and the profile on, on the synthetic sample (`sample-erp-layout.xlsx`,
  10 working days): `travelSource` `OSRM`, 61 visits instead of 58, 30 h on the road
  instead of 53 h; first request 0.24 s, then 0.04 s from the cache; the day route
  came back from the local server (24.1 km against 23.9 km from the table). Preparing the extract took
  about 2 minutes (download 30 s, extraction 15 s, contraction 45 s) with a peak of
  4.2 GB of memory; the volume holds 0.9 GB and the server uses 0.6 GB.
- **Slide note:** Plans can now be built on the real road network, run entirely on
  our own machine: no rate limit, and customer locations never leave it.
- **Screenshot path:** Not added (`booklets/slides/assets/` does not exist in the
  repository yet).
- **Publication:** Branch `feat/PUC-14-self-hosted-osrm`; changes Marzella's engine
  and planner page, so it waits for her review before the merge.
