# User Stories Booklet

Priority (MoSCoW): **Must** = demo blocker, **Should** = expected, **Could** = if time allows.

## Screens (mockups)

| Screen | Name | Stories |
|---|---|---|
| S1 | Imports list (cards / table) | US-10, US-12 |
| S2 | Wizard - upload & template | US-01, US-02 |
| S3 | Wizard - preview & column mapping | US-03, US-04 |
| S4 | Wizard - enterprises & name | US-05, US-06 |
| S5 | Import report / detail | US-07, US-08, US-09, US-11 |
| S6 | Map dashboard | US-13, US-14, US-15, US-16, US-17, US-18 |
| S7 | Planner - parameters | US-19, US-20, US-21, US-22, US-35 |
| S8 | Planner - result (calendar + map + KPIs) | US-23, US-24, US-25 |
| S9 | What-if analysis | US-26 |
| S10 | Scenarios compare | US-27 |
| S11 | Agent plan (calendar, export, directions) | US-28, US-29, US-30 |
| S12 | Register / Log in | US-31, US-32, US-37 |
| S13 | Tenant profile | US-34 |

## Stories

| ID | As a | I want | So that | Priority | Screen | Owner | Non-functional requirements | Status |
|---|---|---|---|---|---|---|---|---|
| US-01 | Analyst | to download an Excel import template | I know which data the tool expects | Must | S2 | Puccetti | Template generated with no real data; downloadable in < 1 s | DONE |
| US-02 | Analyst | to upload the Excel file exported from the ERP | I can analyze the most recent data | Must | S2 | Puccetti | Accepts .xlsx up to 20 MB; 5,000 rows parsed in < 5 s; file not stored after parsing | DONE |
| US-03 | Analyst | to preview the first rows of the uploaded file | I can check that I selected the right file | Must | S3 | Puccetti | Preview returns in < 2 s; shows at most 10 rows | DONE |
| US-04 | Analyst | to map each column of my file to the field it represents | I can import files whose columns have different names or a different order | Must | S3 | Puccetti | Mapping by header name, independent of column order; IT/EN synonyms suggested automatically; required fields validated before import | DONE |
| US-05 | Analyst | to choose which columns contain the revenue of each enterprise and how to name them | the tool works with any number of federation companies | Must | S4 | Puccetti | Any number of enterprise columns (>= 1); colors must keep WCAG AA contrast on the map | DONE |
| US-06 | Analyst | to give a name to each import | I can recognize it later | Must | S4 | Puccetti | Name required, max 150 chars; creation date set by the system | DONE |
| US-07 | Analyst | to see an import report with imported and skipped rows | I can trust the imported data | Must | S5 | Puccetti | Subtotal and invalid rows skipped and counted; report is exact (imported + skipped = total) | DONE |
| US-08 | Analyst | the delivery addresses to be geolocated automatically | customers can be placed on the map | Must | S5 | Puccetti | Nominatim usage policy: max 1 req/s, identifying User-Agent; results cached forever; only address + city leave the system (NDA) | DONE |
| US-09 | Analyst | to see which addresses could not be geolocated and set their position manually | no relevant customer is missing from the analysis | Should | S5 | Puccetti | Manual coordinates validated (lat -90..90, lon -180..180) | DONE |
| US-10 | Analyst | to see all past imports as cards or as a table with name and creation date | I can choose which dataset to work on | Must | S1 | Puccetti | List loads in < 1 s with 100 imports; card/table choice remembered in the browser | DONE |
| US-11 | Analyst | to open the detail of an import | I can see its summary and its delivery points | Must | S5 | Puccetti | Geocoding progress refreshed every 3 s while running | DONE |
| US-12 | Analyst | to delete an import | I can remove wrong or outdated data | Should | S1 | Puccetti | Confirmation dialog; deletion cascades to points, revenues and plans | DONE |
| US-13 | Analyst | to see all the delivery points of an import on a map | I can understand where the customers are | Must | S6 | Rivera | OpenStreetMap tiles with attribution; 1,000 markers rendered smoothly (> 30 fps pan/zoom) | DONE |
| US-14 | Analyst | to filter the map by enterprise | I can see the customers of each company | Must | S6 | Rivera | Filter applied client-side in < 200 ms | DONE |
| US-15 | Analyst | to filter the map by agent, city and minimum revenue | I can focus on a territory or on the most valuable customers | Should | S6 | Rivera | Filters combinable; state kept in the URL query string | DONE |
| US-16 | Analyst | markers colored by enterprise and sized by revenue | I can spot the most valuable areas at a glance | Must | S6 | Rivera | Marker area proportional to revenue (sqrt scale); legend always visible; colorblind-safe palette | DONE |
| US-17 | Analyst | to click on a marker to see the customer, the address and the revenue per enterprise | I can inspect a single delivery point | Must | S6 | Rivera | Popup keyboard accessible; amounts formatted in EUR | DONE |
| US-18 | Sales Manager | to see summary indicators (revenue per enterprise, per agent, per city, top customers, revenue concentration) | I can understand where the value is | Should | S6 | Rivera | Indicators consistent with the import totals (same rounding rules) | DONE |
| US-19 | Analyst | to choose a commercial campaign (before Christmas, before Easter, end of summer or custom dates) | visits are concentrated in the periods of greatest interest | Must | S7 | Marzella | Campaign windows computed for any year (Easter via computus); Italian public holidays excluded | DONE |
| US-20 | Analyst | to set the maximum number of working days within which the visits must be completed | the plan fits the available time | Must | S7 | Marzella | Working days only Monday to Friday; 1..260 days accepted | DONE |
| US-21 | Analyst | to set the visit parameters (visit duration, working hours, maximum distance) | the plan is realistic | Should | S7 | Marzella | Defaults: visit 210 min, workday 480 min, max 80 km; every day starts and ends at the tenant starting base (US-35); invalid values rejected with a clear message | DONE |
| US-22 | Analyst | to choose which enterprises and agents to include and give priority weights to the enterprises | the plan follows the commercial goals of the campaign | Must | S7 | Marzella | Weight 0 excludes an enterprise; weights >= 0 | DONE |
| US-23 | Analyst | the system to propose which customers to visit, in which order and on which day (Monday to Friday, public holidays excluded) | the expected revenue is maximized | Must | S8 | Marzella | Deterministic (same input, same plan); < 2 s for 1,000 points; never exceeds the working day capacity | DONE |
| US-24 | Analyst | to see the itinerary of each day on the map | I can check that the route makes sense | Should | S8 | Marzella | Itinerary drawn base -> visits -> base; one day selectable at a time | DONE |
| US-25 | Analyst | to see the indicators of a plan (covered revenue and its share, number of visits, km travelled, last visit day) and the valuable customers left out | I can evaluate it | Must | S8 | Marzella | Coverage and upper bound shown; valuable customers left out listed (top 20) | DONE |
| US-26 | Sales Manager | to compare the same plan over different time horizons (for example 20, 30 and 40 working days) | I can decide how much time to invest in the campaign | Must | S9 | Marzella | 5 horizons computed in one request in < 5 s; marginal revenue per extra block shown | DONE |
| US-27 | Sales Manager | to save plans as named scenarios and compare them side by side | I can choose the best one | Should | S10 | Marzella | Scenarios persisted in the database; 2-3 scenarios compared side by side | DONE |
| US-28 | Sales Agent | to see my visit calendar day by day | I know which customers to visit and when | Should | S11 | Rivera | Calendar readable on a tablet (>= 768 px) | DONE |
| US-29 | Sales Agent | to export my plan to Excel | I can use it offline and share it | Could | S11 | Rivera | Excel export with one sheet per agent | DONE |
| US-30 | Sales Agent | to open a planned visit in OpenStreetMap directions | I can reach the customer easily | Could | S11 | Rivera | Link opens openstreetmap.org directions in a new tab | DONE |
| US-31 | Tenant admin | to register my tenant with its name, my email and a password | my team gets its own private workspace | Must | S12 | Puccetti | One account per tenant; password 8-64 characters (minimum configurable), no composition rules, stored hashed with Argon2id (OWASP ASVS 5.0); email unique (case-insensitive) | DONE |
| US-32 | User | to log in and log out | only my team can see our data | Must | S12 | Puccetti | Server session in an HttpOnly, SameSite=Lax cookie; CSRF token on every state-changing request; generic "invalid email or password" message; every `/api` endpoint except register and login returns 401 without a session | DONE |
| US-33 | Tenant admin | the imports, maps and plans of my tenant to be invisible to any other tenant | our confidential revenue data stays private (NDA) | Must | - | Puccetti | Enforced by one backend guard on all `/api/imports/{id}/**` and `/api/plans/{planId}/**` routes; another tenant's id returns 404, not 403; covered by an automated isolation test | DONE |
| US-34 | Tenant admin | a profile page to change the tenant name and the password | our information stays up to date | Should | S13 | Puccetti | Password change requires the current password and logs out the other sessions | DONE |
| US-35 | Analyst | to set the starting base of my tenant once by typing its address in the planner | every plan starts from our real base without entering it again | Should | S7 | Puccetti | One base per tenant, stored in the database; address + city geocoded with the Nominatim cache and rate limit; address not found -> clear message and the saved base unchanged; until a base is set the planner uses the configured default (Rome centre) | DONE |
| US-36 | User | to switch the interface between light and dark mode | I can work comfortably in any light | Could | All (header) | Puccetti | Follows the operating system setting until the user chooses; the choice is remembered in the browser; no flash of the wrong theme on load; toggle reachable by keyboard with its state announced to screen readers; text contrast WCAG AA in both themes; also available before login | DONE |
| US-37 | User | to stay logged in on my own device | I do not have to type my credentials every day | Could | S12 | Puccetti | Opt-in checkbox at login, off by default; 14 days (configurable); HttpOnly, SameSite=Lax, Secure over HTTPS cookie; random token stored server-side and replaced at every use, reuse of an old token logs out every remembered device; logout forgets this device only, password change forgets every device; the password is never stored by the application | DONE |
| US-38 | User | a modern and consistent interface where the key figures stand out | I can read the data at a glance | Could | All | Puccetti | Same design tokens in light and dark mode; text contrast WCAG AA in both; one brand color for highlights only, never for data (enterprise colors stay the only data colors); pill navigation usable by keyboard with the current page announced; layout usable from 375 px wide; no new dependency (system font) | DONE |
| US-39 | Analyst | the planner to use real road distances and driving times | every planned day can really be driven within the working hours | Could | S8 | Puccetti | Optional self-hosted OSRM (Docker Compose profile with the OpenStreetMap extract of central Italy), so customer coordinates never leave the system; one distance and time table per import and base, about 1 s for 1,000 points and kept in memory; when the road network is off or unreachable the plan uses the straight-line estimate and says which one it used | DONE |

## Cross-cutting non-functional requirements

- **Deployability (IaC)**: the whole system starts with `docker compose up --build` on any machine with Docker; the database schema is created by Liquibase.
- **Confidentiality (NDA)**: the real dataset is never committed; only address + city are sent to the external geocoder.
- **Security and tenant isolation**: every API call needs a logged-in session; a tenant never sees another tenant's data; passwords only stored hashed.
- **Accessibility**: WCAG AA (contrast, focus, keyboard navigation, ARIA labels).
- **Portability of data**: the tool works with any yearly export (other years, other column names/orders, any number of enterprises).
- **Browsers**: latest Chrome, Edge, Firefox; desktop first, usable on tablets.
