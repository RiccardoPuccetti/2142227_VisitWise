# API Contract

Full field definitions: [TypeScript models](../../source/frontend/src/app/core/models/api.models.ts); backend planning records: [PlanningDtos](../../source/backend/src/main/java/it/teamlab/visitwise/planning/PlanningDtos.java).

## Conventions

- Base path `/api`; JSON uses camelCase, dates `YYYY-MM-DD`, timestamps ISO-8601 with offset, amounts numeric EUR.
- Authentication is required except for the three public auth endpoints below; see [Authentication](AUTHENTICATION.md).
- POST/PUT/PATCH/DELETE require cookie `XSRF-TOKEN` echoed in `X-XSRF-TOKEN`, including login and registration.
- API errors use `application/problem+json`: `type`, `title`, `status`, `detail`, `instance`.
- Statuses: `400` invalid input, `401` unauthenticated, `403` CSRF/access denied, `404` missing or foreign resource, `409` duplicate email, `422` invalid file/address, `429` auth rate limit, `503` geocoder unavailable.
- Upload size is capped at 20 MB by Spring and nginx; rejection at the proxy can be `413`, outside the JSON error handler.
- Generated reference: backend `/swagger-ui.html` and `/v3/api-docs`.

## 1. Imports and geocoding

Paths below are relative to `/api/imports`; `{id}` identifies an import owned by the current tenant.

| Method | Path | Request / response |
|---|---|---|
| GET | `/template` | `200` XLSX template |
| POST | `/preview` | Multipart `file` -> `200 ImportPreview`; nothing persisted |
| POST | (base) | Multipart `file` + JSON part `request: {name, mapping}` -> `201 ImportSummary`, Location header |
| GET | (base) | `200 ImportSummary[]`, newest first, current tenant only |
| GET | `/{id}` | `200 ImportDetail` |
| DELETE | `/{id}` | `204`; cascades to enterprises, points, revenues, plans and visits |
| GET | `/{id}/points` | Optional `geocodeStatus` -> `200 DeliveryPoint[]` |
| PATCH | `/{id}/points/{pointId}/location` | `{latitude, longitude}` -> `200 DeliveryPoint`, status `MANUAL` |
| POST | `/{id}/geocoding/retry` | `202`; retries `PENDING` and `NOT_FOUND`, bypassing cached misses |
| GET | `/{id}/geocoding` | `200 {status, total, located, pending, notFound, errorMessage}` |

- `ImportPreview`: file/sheet names, headers, sample rows, total rows and suggested mapping; unresolved fields are null.
- `ColumnMapping`: required `customer`, `deliveryPoint`, `address`, `city`; optional `agent`, paired `latitude`/`longitude`; `enterprises: [{sourceColumn, name, color}]`.
- `.xlsx`, first sheet, first non-empty row as headers; duplicate headers receive numbered suffixes. Limits: 20,000 data rows and 200 columns.
- Import name: 1..150 characters; at least one enterprise; mapped headers must exist. Enterprise columns cannot reuse another mapped column; names are case-insensitively unique (1..100), source headers at most 150 characters.
- Enterprise colors are `#RRGGBB`, with at least 3:1 contrast on white. Latitude and longitude must be mapped together.
- Rows with missing required values, invalid amounts or overlong text are skipped. Empty/`-` revenue is zero; negative amounts are retained; only non-zero amounts are stored.
- Valid file coordinates, except the pair `(0,0)`, yield `FROM_FILE`; otherwise the point awaits geocoding. Manual coordinates allow latitude -90..90 and longitude -180..180.
- `ImportSummary`: identity, name, filename, creation time, status, row counters and enterprises; `ImportDetail` adds mapping, agents, cities, missing-location count and error message.
- `DeliveryPoint`: source row, customer/point names, address/city, nullable agent/coordinates, geocode status, total revenue and `{enterpriseId, amount}[]`.
- Imports return `READY` if all coordinates are supplied, otherwise `GEOCODING`. The background job finishes as `READY` even on interruption: inspect pending counts and `errorMessage`, not status alone.
- `located` includes `OK`, `FROM_FILE`, `MANUAL`. The UI polls progress every 3 seconds while work remains; imports left `GEOCODING` resume at startup.

## 2. Analytics

`GET /api/imports/{id}/analytics/summary?enterpriseIds=21,23&agents=A,B` -> `200 AnalyticsSummary`.
Empty filters mean all; an enterprise filter retains points having a revenue entry for at least one selected enterprise.
The response contains total revenue, point/customer counts, breakdowns by enterprise/agent/city, top 10 points and Pareto shares.
Analytics sums net revenue, including credit notes; planner revenue instead clips negative entries to zero.

## 3. Planning

| Method | Path (relative to `/api`) | Request / response |
|---|---|---|
| GET | `/planning/campaigns?year=2026` | `CampaignPreset[]`; year 1583..9999 |
| POST | `/imports/{id}/plans/simulate` | `PlanParameters` -> `PlanResult`, null id/name; not saved |
| POST | `/imports/{id}/plans/what-if` | `{base: PlanParameters, horizons: number[]}` -> `{rows}` |
| POST | `/imports/{id}/plans/route` | `RouteRequest` -> `RouteResponse` for one ordered day |
| POST | `/imports/{id}/plans` | `{name, parameters}` -> `201 PlanSummary`, Location header |
| GET | `/imports/{id}/plans` | `PlanSummary[]`, newest first; stored parameters and KPIs |
| GET | `/plans/{planId}` | `PlanResult` recomputed from saved parameters and current import/routing data |
| DELETE | `/plans/{planId}` | `204` |
| GET | `/plans/{planId}/export?agent=...` | XLSX from stored visits; optional agent filter, `404` if no match |

- `PlanParameters`: `campaign`, `startDate`, nullable `deadline`, `workingDays`, `enterpriseWeights`, `agents`, `planningMode`, `visitDurationMinutes`, `workdayMinutes`, `averageSpeedKmh`, `roadFactor`, `maxDistanceKm`, `base`, `travelCostPerKm`, `minRevenue`.
- `base` is `{latitude, longitude}` and must be supplied; the frontend uses the tenant base or its Rome fallback. Campaign codes: `CHRISTMAS`, `EASTER`, `END_OF_SUMMER`, `CUSTOM`; modes: `PER_AGENT`, `SINGLE_VISITOR`.
- Working days 1..260; visit duration 30..480; workday >= visit duration; speed > 0; road factor >= 1; distance, weights, penalty and minimum revenue finite and non-negative.
- Enterprise ids must belong to the import and occur once. Empty agents selects all; omitted/zero enterprise weights exclude those enterprises. A null deadline imposes no deadline.
- `PlanResult`: id/name, parameters, KPIs, days, up to 20 unplanned target representatives and warnings. Each day has date, nullable agent, visits and km; `dayIndex` is zero-based, visit `slot` one-based.
- KPIs: visits/customers, covered/eligible/upper-bound revenue, coverage, km, travel hours, distinct working dates used, last date, late visits, range exclusions and `travelSource`.
- `travelSource` is `OSRM` when a matrix is supplied (individual pairs can still be estimated), otherwise `ESTIMATE`; older stored KPIs may omit it.
- Save recomputes the plan; name is 1..150 characters. Detail recomputation can differ from stored summary/export after coordinates or routing availability change.
- What-if accepts 1..5 horizons (each 1..260), deduplicates and sorts them; rows contain working days, KPIs and covered-revenue change from the previous row (first compared with zero).
- `RouteRequest`: `{base, stops, averageSpeedKmh, roadFactor}`, 1..30 ordered stops excluding the base. Nonpositive speed and road factor below 1 use defaults 25 and 1.3.
- `RouteResponse`: `{source, km, minutes, legs: [{km, minutes}], geometry: GeoPoint[]}`; includes departure/return to base. OSRM failure/disablement yields `ESTIMATE` without changing the plan.

## 4. Authentication and profile

| Method | Path (relative to `/api`) | Request / response |
|---|---|---|
| GET | `/auth/csrf` | Public; `204`, CSRF cookie |
| POST | `/auth/register` | Public; `{tenantName, email, password}` -> `201 CurrentTenant`; does not log in |
| POST | `/auth/login` | Public; form `username` (email), `password`, optional `remember-me=true` -> `200 CurrentTenant` |
| POST | `/auth/logout` | `204`; invalidates session and forgets this remembered device |
| GET | `/auth/me` | `200 CurrentTenant` or `401` |
| PATCH | `/profile` | `{name}` -> `200 CurrentTenant` |
| PUT | `/profile/password` | `{currentPassword, newPassword}` -> `204`; rotates session, expires others, revokes remembered devices |
| GET | `/profile/base` | `200 StartingBase`, or `204` if unset |
| PUT | `/profile/base` | `{address, city}` -> `200 StartingBase`; `422` unknown address, `503` provider failure |

`CurrentTenant = {id, name, email}`; `StartingBase = {address, city, latitude, longitude}`.
Tenant name: 1..150 characters; valid email: at most 254, normalized to lower case; password: 8..64 normalized Unicode code points (minimum configurable).
Base address: 1..255 characters; city: 1..120. Failed geocoding leaves the previous base unchanged.
