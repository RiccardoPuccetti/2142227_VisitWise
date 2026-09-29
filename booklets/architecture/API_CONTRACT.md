# API Contract (v1)

> **Source of truth** for frontend-backend integration. TypeScript mirror: `source/frontend/src/app/core/models/api.models.ts`.
> Change process: open a `docs/api-...` PR that updates **this file and the TS models together**, tag the other owners, merge only after both agree.
> Each member builds pages on **their own** endpoints. A page that consumes another member's endpoint uses a local fixture copied from these examples until that endpoint is merged (see hand-offs in `booklets/team/TASKS.md`).

Conventions

- Base path `/api`. JSON in camelCase. Money = number with 2 decimals (EUR). `LocalDate` = `"YYYY-MM-DD"`, timestamps = ISO-8601 with offset.
- Errors: RFC 9457 `application/problem+json` -> `{ "type", "title", "status", "detail", "instance" }`. 400 validation, 404 not found, 409 conflict, 422 unprocessable file.
- Authentication (section 4): every endpoint needs a logged-in session except those marked *public*; without it the answer is `401`. State-changing requests (POST, PUT, PATCH, DELETE) carry the CSRF token from cookie `XSRF-TOKEN` in header `X-XSRF-TOKEN` (Angular `HttpClient` does it automatically for relative URLs); missing token -> `403`. Data of another tenant answers `404`.
- Swagger UI (generated from code) at `http://localhost:8080/swagger-ui.html`: it must stay consistent with this file.

## 1. Imports - owner Puccetti (endpoint 7: Rivera)

| # | Method | URL | Description | US |
|---|---|---|---|---|
| 1 | GET | `/api/imports/template` | Downloads `visitwise-import-template.xlsx` | 1 |
| 2 | POST | `/api/imports/preview` | multipart `file` -> headers, sample rows, suggested mapping. Nothing is saved | 2, 3, 4, 5 |
| 3 | POST | `/api/imports` | multipart `file` + part `request` (JSON `CreateImportRequest`) -> parses, saves, starts geocoding. `201` + `ImportSummary` | 2, 4, 5, 6, 7 |
| 4 | GET | `/api/imports` | `ImportSummary[]`, newest first | 10 |
| 5 | GET | `/api/imports/{id}` | `ImportDetail` (poll it every 3 s while `status = GEOCODING`) | 7, 8, 11 |
| 6 | DELETE | `/api/imports/{id}` | Deletes import, points, plans. `204` | 12 |
| 7 | GET | `/api/imports/{id}/points?geocodeStatus=NOT_FOUND` | `DeliveryPoint[]` (filter optional). Used by map, detail table, planner. **Owner: Rivera** (`analytics` package) | 9, 11, 13 |
| 8 | PATCH | `/api/imports/{id}/points/{pointId}/location` | body `{ "latitude": 41.9, "longitude": 12.5 }` (lat -90..90, lon -180..180, else `400`) -> status `MANUAL`. Returns `DeliveryPoint` | 9 |
| 9 | POST | `/api/imports/{id}/geocoding/retry` | Re-queues `NOT_FOUND`/`PENDING` points (cached misses are asked to the provider again). `202` | 9 |
| 9b | GET | `/api/imports/{id}/geocoding` | `GeocodingProgress`: the planner polls it every 3 s while `status = GEOCODING` or `pending > 0` | 8, 9 |

**GeocodingProgress** `{ "status": "GEOCODING", "total": 73, "located": 40, "pending": 31, "notFound": 2, "errorMessage": null }`

- `located` counts `OK`, `FROM_FILE` and `MANUAL` points. `errorMessage` is set when the job stopped because the geocoder was unavailable ("Geocoding interrupted: ... Retry later.").
- Geocoding runs in the background right after `POST /api/imports` commits (one request per second to Nominatim, results cached in `geocode_cache`); imports left in `GEOCODING` by a restart are resumed at startup.

**POST /api/imports/preview** -> 200

```json
{
  "fileName": "sample-erp-layout.xlsx",
  "sheetName": "Sheet1",
  "headers": ["Ragione Sociale", "Punto Vendita", "Indirizzo", "Comune", "Agente", "Totale", "ENTERPRISE A", "ENTERPRISE B", "ENTERPRISE C"],
  "sampleRows": [["ACME SRL (10001)", "RISTORANTE ACME", "VIA DEL CORSO 300", "ROMA", "AGENT NORTH", "2080.5", "1250.5", "-", "830"]],
  "totalRows": 129,
  "suggestedMapping": {
    "customer": "Ragione Sociale",
    "deliveryPoint": "Punto Vendita",
    "address": "Indirizzo",
    "city": "Comune",
    "agent": "Agente",
    "latitude": null,
    "longitude": null,
    "enterprises": [
      { "sourceColumn": "ENTERPRISE A", "name": "ENTERPRISE A", "color": "#2563eb" },
      { "sourceColumn": "ENTERPRISE B", "name": "ENTERPRISE B", "color": "#16a34a" },
      { "sourceColumn": "ENTERPRISE C", "name": "ENTERPRISE C", "color": "#dc2626" }
    ]
  }
}
```

In `suggestedMapping` a field is `null` when no header of the file matched it (TS type `SuggestedMapping`); the import request needs the four required fields.

Parsing rules (both preview and import):

- First sheet, first non-empty row = headers. Duplicate headers are made unique by appending ` (2)`, ` (3)`.
- Mapping is **by header name**, so column order does not matter.
- Suggested mapping: case/accent-insensitive synonyms (IT + EN), e.g. customer = `cliente|rag. soc|ragione sociale|customer`, address = `indirizzo|address`, city = `città|citta|comune|city`, agent = `agente|agent`, deliveryPoint = `cliente di consegna|punto|delivery point|point of sale`. Numeric columns not mapped to anything else are suggested as enterprises, **except** columns named like `total|totale|totali`.
- A row is **skipped** (and counted in `skippedRows`) when a required field (customer, deliveryPoint, address, city) is empty: this removes the `... Totale` subtotal rows and the grand total automatically.
- Revenue cells: empty or `-` = 0; numbers or numeric strings with `,` or `.` decimals; negative allowed. Only non-zero amounts are stored.
- If latitude/longitude are mapped and valid, the point is `FROM_FILE` and is not geocoded.
- A row is also skipped when a revenue cell is not a number or a value is longer than its column (255 characters, 120 for city and agent).
- Limits: `.xlsx` only, 20 MB, 20,000 data rows, 200 columns; beyond them, or for an unreadable file, `422` with the reason in `detail`. A file with no importable row is `422` too and saves nothing.
- Import request checks (`400`, `detail` = `field: message`, e.g. `mapping.city: column 'Città' is not in the file`): name 1-150 characters; customer, delivery point, address, city mapped; at least one enterprise; every mapped column exists in the file and is used once; enterprise names unique ignoring case, 1-100 characters; latitude and longitude mapped together; colors `#RRGGBB` with at least 3:1 contrast on white.

**POST /api/imports** request part `request`:

```json
{ "name": "Sample 2025 - full year", "mapping": { "...": "same shape as suggestedMapping" } }
```

**ImportSummary** (response of 3 and items of 4)

```json
{
  "id": 7, "name": "Sample 2025 - full year", "sourceFileName": "sample-erp-layout.xlsx",
  "createdAt": "2026-09-28T10:15:00+02:00", "status": "GEOCODING",
  "totalRows": 129, "importedRows": 73, "skippedRows": 56, "geocodedRows": 40,
  "enterprises": [{ "id": 21, "name": "ENTERPRISE A", "color": "#2563eb", "sourceColumn": "ENTERPRISE A" }]
}
```

**ImportDetail** = ImportSummary + `{ "mapping": ColumnMapping, "agents": ["..."], "cities": ["ROMA", "..."], "notFoundCount": 2, "errorMessage": null }`

**DeliveryPoint**

```json
{
  "id": 1001, "sourceRow": 2, "customerName": "ACME SRL (10001)", "pointName": "RISTORANTE ACME",
  "address": "VIA DEL CORSO 300", "city": "ROMA", "agent": "AGENT NORTH",
  "latitude": 41.9031, "longitude": 12.4794, "geocodeStatus": "OK",
  "totalRevenue": 2080.5,
  "revenues": [{ "enterpriseId": 21, "amount": 1250.5 }, { "enterpriseId": 23, "amount": 830.0 }]
}
```

## 2. Analytics - owner Rivera

| # | Method | URL | Description | US |
|---|---|---|---|---|
| 10 | GET | `/api/imports/{id}/analytics/summary?enterpriseIds=21,23&agents=A,B` | KPIs of the (filtered) import | 18 |

```json
{
  "totalRevenue": 571053.35, "pointCount": 73, "customerCount": 55,
  "byEnterprise": [{ "enterpriseId": 21, "name": "ENTERPRISE A", "color": "#2563eb", "revenue": 104141.02, "pointCount": 46 }],
  "byAgent": [{ "key": "AGENT NORTH", "revenue": 112621.24, "pointCount": 20 }],
  "byCity": [{ "key": "ROMA", "revenue": 531815.92, "pointCount": 69 }],
  "topPoints": ["DeliveryPoint (top 10 by revenue)"],
  "pareto": [{ "points": 10, "revenueShare": 0.51 }, { "points": 20, "revenueShare": 0.74 }]
}
```

## 3. Planning - owner Marzella (endpoint 18: Rivera)

| # | Method | URL | Description | US |
|---|---|---|---|---|
| 11 | GET | `/api/planning/campaigns?year=2026` | `CampaignPreset[]` with computed windows | 19 |
| 12 | POST | `/api/imports/{id}/plans/simulate` | body `PlanParameters` -> `PlanResult` (not saved, `id: null`) | 20-25 |
| 13 | POST | `/api/imports/{id}/plans/what-if` | body `WhatIfRequest` -> `WhatIfResult` | 26 |
| 14 | POST | `/api/imports/{id}/plans` | body `CreatePlanRequest` -> computes + saves, `201` `PlanSummary` | 27 |
| 15 | GET | `/api/imports/{id}/plans` | `PlanSummary[]` newest first | 27 |
| 16 | GET | `/api/plans/{planId}` | `PlanResult` of a saved plan | 27, 28 |
| 17 | DELETE | `/api/plans/{planId}` | `204` | 27 |
| 18 | GET | `/api/plans/{planId}/export?agent=AGENT%20NORTH` | `.xlsx` of the plan (optional agent filter). **Owner: Rivera** (`planning.export` package) | 29 |
| 18b | POST | `/api/imports/{id}/plans/route` | body `RouteRequest` -> `RouteResponse`: real road route of one day (OSRM) or the straight-line estimate when the road service is down. `400` without stops or with more than 30 | 24 |

**RouteRequest** `{ "base": GeoPoint, "stops": [GeoPoint, "..."], "averageSpeedKmh": 25, "roadFactor": 1.3 }` - the ordered stops of one day, base excluded (it is added at both ends).

**RouteResponse**

```json
{
  "source": "OSRM",                      // "ESTIMATE" when OSRM is disabled/unreachable: Haversine x road factor, as the plan KPIs without road network
  "km": 18.7, "minutes": 46.2,
  "legs": [{ "km": 2.4, "minutes": 6.1 }, { "km": 3.1, "minutes": 7.5 }],   // base->stop1, stop1->stop2, ..., last->base
  "geometry": [{ "latitude": 41.896, "longitude": 12.4823 }, "..."]        // polyline to draw; base/stops/base for ESTIMATE
}
```

**CampaignPreset**

```json
{ "code": "CHRISTMAS", "label": "Before Christmas", "startDate": "2026-11-01", "endDate": "2026-12-19", "workingDays": 34 }
```

**PlanParameters** (defaults shown; the frontend sends every field)

```json
{
  "campaign": "CHRISTMAS",
  "startDate": "2026-11-02",
  "deadline": "2026-12-19",
  "workingDays": 20,
  "enterpriseWeights": [{ "enterpriseId": 21, "weight": 1.0 }, { "enterpriseId": 23, "weight": 1.5 }],
  "agents": [],
  "planningMode": "PER_AGENT",
  "visitDurationMinutes": 210,
  "workdayMinutes": 480,
  "averageSpeedKmh": 25,
  "roadFactor": 1.3,
  "maxDistanceKm": 80,
  "base": { "latitude": 41.8960, "longitude": 12.4823 },   // filled by the planner form from the tenant starting base (endpoint 26); the frontend default (Rome, Piazza Venezia) until one is saved
  "travelCostPerKm": 2.0,
  "minRevenue": 0
}
```

Validation: `workingDays` 1..260, `visitDurationMinutes` 30..480, `workdayMinutes` >= `visitDurationMinutes`, weights >= 0, speed > 0, roadFactor >= 1.

**PlanResult**

```json
{
  "id": null, "name": null,
  "parameters": { "...": "PlanParameters" },
  "kpis": {
    "plannedVisits": 40, "uniqueCustomers": 36,
    "coveredRevenue": 395000.0, "eligibleRevenue": 560000.0, "coverage": 0.71,
    "upperBoundRevenue": 402000.0,
    "totalKm": 420.5, "travelHours": 21.9, "workingDaysUsed": 20,
    "lastVisitDate": "2026-11-27", "visitsAfterDeadline": 0, "excludedOutOfRange": 1,
    "travelSource": "OSRM"   // km and hours measured on the road network (US-39); "ESTIMATE" = straight line x road factor at the average speed; null in plans saved before 2026-09-28
  },
  "days": [
    {
      "date": "2026-11-02", "agent": "AGENT NORTH", "km": 18.2,
      "visits": [
        {
          "deliveryPointId": 1001, "customerName": "ACME SRL (10001)", "pointName": "RISTORANTE ACME",
          "address": "VIA DEL CORSO 300", "city": "ROMA", "agent": "AGENT NORTH",
          "latitude": 41.9031, "longitude": 12.4794,
          "date": "2026-11-02", "dayIndex": 0, "slot": 1, "expectedRevenue": 2080.5, "travelKm": 2.1
        }
      ]
    }
  ],
  "notPlanned": ["DeliveryPoint (top 20 eligible not planned)"],
  "warnings": ["1 delivery point is farther than 80 km from the base and was excluded"]
}
```

**WhatIfRequest** `{ "base": PlanParameters, "horizons": [10, 20, 30, 40, 60] }`

**WhatIfResult**

```json
{ "rows": [
  { "workingDays": 10, "kpis": { "...": "PlanKpis" }, "marginalRevenue": 250000.0 },
  { "workingDays": 20, "kpis": { "...": "PlanKpis" }, "marginalRevenue": 145000.0 }
] }
```

**PlanSummary** `{ "id": 3, "name": "Xmas 20d enterprise A x1.5", "createdAt": "...", "parameters": {}, "kpis": {} }`

## 4. Authentication and profile - owner Puccetti

One account per tenant. See `AUTHENTICATION.md` for the security design.

| # | Method | URL | Description | US |
|---|---|---|---|---|
| 19 | GET | `/api/auth/csrf` | *Public.* `204`, sets the `XSRF-TOKEN` cookie. Called once at startup | 31, 32 |
| 20 | POST | `/api/auth/register` | *Public.* body `RegisterRequest` -> `201` `CurrentTenant` (not logged in: the SPA calls 21 next). `400` password rules, `409` email in use | 31 |
| 21 | POST | `/api/auth/login` | *Public.* form-encoded `username` (email), `password`, optional `remember-me=true` (US-37: also sets the 14-day `remember-me` cookie) -> `200` `CurrentTenant` and a new session. `401` "Invalid email or password" for any failure | 32 |
| 22 | POST | `/api/auth/logout` | `204`, session invalidated, cookies cleared, this device's remember-me token deleted | 32, 37 |
| 23 | GET | `/api/auth/me` | `200` `CurrentTenant`, `401` when not logged in | 32 |
| 24 | PATCH | `/api/profile` | body `{ "name": "Demo federation" }` -> `200` `CurrentTenant` | 34 |
| 25 | PUT | `/api/profile/password` | body `ChangePasswordRequest` -> `204`; the tenant's other sessions are logged out. `400` wrong current password or password rules | 34 |
| 26 | GET | `/api/profile/base` | `200` `StartingBase`, or `204` when the tenant has not saved one yet (the planner then uses its default, Rome, Piazza Venezia) | 35 |
| 27 | PUT | `/api/profile/base` | body `SaveStartingBaseRequest` -> geocodes address + city (Nominatim, cached) and saves -> `200` `StartingBase`. `422` "Address not found" (saved base unchanged), `503` geocoder unavailable | 35 |

**RegisterRequest** `{ "tenantName": "Demo federation", "email": "demo@visitwise.test", "password": "correct horse battery" }`

- `tenantName` 1-150 chars; `email` valid, max 254, compared case-insensitively; `password` 8-64 characters (minimum configurable), no composition rules.

**CurrentTenant** `{ "id": 1, "name": "Demo federation", "email": "demo@visitwise.test" }`

**ChangePasswordRequest** `{ "currentPassword": "...", "newPassword": "..." }`

**SaveStartingBaseRequest** `{ "address": "Via del Corso 1", "city": "Roma" }` (address 1-255, city 1-120)

**StartingBase** `{ "address": "Via del Corso 1", "city": "Roma", "latitude": 41.9008, "longitude": 12.4817 }`

Validation errors (`400`) are problem+json with the reason in `detail`, e.g. `"detail": "Password must be at least 8 characters"`.
