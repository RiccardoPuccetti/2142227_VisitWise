# SYSTEM DESCRIPTION:

VisitWise is a web dashboard for a federation of companies that supply bars, restaurants, hotels and shops. Each company sells to customers at one or more delivery points, and each delivery point is followed by a sales agent. In this business, revenue grows when an agent visits the customer in person; a visit takes 3 to 4 hours, so only a few visits fit in a working day, and they matter most right before the periods of highest interest (before Christmas, before Easter, at the end of summer).

The analyst uploads the yearly revenue file exported from the company ERP through an import wizard: the file can change every year, its columns can have any name and any order, and the analyst chooses which columns contain the revenue of each company of the federation. A template can be downloaded. Each import is named by the analyst, stored in the database with its creation date, and listed as cards or as a table. Delivery addresses are geolocated automatically.

Each federation registers as a tenant with its own login, and its imports and plans are invisible to other tenants. In the planner the analyst sets the tenant's starting base once, by typing its address: every plan starts and ends each working day there.

On an OpenStreetMap map the analyst sees the customers of each company, filters them by company, agent, city and revenue, and reads the main indicators. The planner proposes which customers to visit, in which order and on which working day (Monday to Friday, public holidays excluded) in order to maximize the revenue covered within a maximum number of days chosen by the analyst, inside a commercial campaign window. The analyst can run what-if analyses, save plans as scenarios and compare them; agents can consult and export their own visit calendar.

# USER STORIES:

1) As an Analyst, I want to download an Excel import template, so that I know which data the tool expects
2) As an Analyst, I want to upload the Excel file exported from the ERP, so that I can analyze the most recent data
3) As an Analyst, I want to preview the first rows of the uploaded file, so that I can check that I selected the right file
4) As an Analyst, I want to map each column of my file to the field it represents, so that I can import files whose columns have different names or a different order
5) As an Analyst, I want to choose which columns contain the revenue of each enterprise and how to name them, so that the tool works with any number of federation companies
6) As an Analyst, I want to give a name to each import, so that I can recognize it later
7) As an Analyst, I want to see an import report with imported and skipped rows, so that I can trust the imported data
8) As an Analyst, I want the delivery addresses to be geolocated automatically, so that customers can be placed on the map
9) As an Analyst, I want to see which addresses could not be geolocated and set their position manually, so that no relevant customer is missing from the analysis
10) As an Analyst, I want to see all past imports as cards or as a table with name and creation date, so that I can choose which dataset to work on
11) As an Analyst, I want to open the detail of an import, so that I can see its summary and its delivery points
12) As an Analyst, I want to delete an import, so that I can remove wrong or outdated data
13) As an Analyst, I want to see all the delivery points of an import on a map, so that I can understand where the customers are
14) As an Analyst, I want to filter the map by enterprise, so that I can see the customers of each company
15) As an Analyst, I want to filter the map by agent, city and minimum revenue, so that I can focus on a territory or on the most valuable customers
16) As an Analyst, I want markers colored by enterprise and sized by revenue, so that I can spot the most valuable areas at a glance
17) As an Analyst, I want to click on a marker to see the customer, the address and the revenue per enterprise, so that I can inspect a single delivery point
18) As a Sales Manager, I want to see summary indicators (revenue per enterprise, per agent, per city, top customers, revenue concentration), so that I can understand where the value is
19) As an Analyst, I want to choose a commercial campaign (before Christmas, before Easter, end of summer or custom dates), so that visits are concentrated in the periods of greatest interest
20) As an Analyst, I want to set the maximum number of working days within which the visits must be completed, so that the plan fits the available time
21) As an Analyst, I want to set the visit parameters (visit duration, working hours, maximum distance), so that the plan is realistic
22) As an Analyst, I want to choose which enterprises and agents to include and give priority weights to the enterprises, so that the plan follows the commercial goals of the campaign
23) As an Analyst, I want the system to propose which customers to visit, in which order and on which day (Monday to Friday, public holidays excluded), so that the expected revenue is maximized
24) As an Analyst, I want to see the itinerary of each day on the map, so that I can check that the route makes sense
25) As an Analyst, I want to see the indicators of a plan (covered revenue and its share, number of visits, km travelled, last visit day) and the valuable customers left out, so that I can evaluate it
26) As a Sales Manager, I want to compare the same plan over different time horizons (for example 20, 30 and 40 working days), so that I can decide how much time to invest in the campaign
27) As a Sales Manager, I want to save plans as named scenarios and compare them side by side, so that I can choose the best one
28) As a Sales Agent, I want to see my visit calendar day by day, so that I know which customers to visit and when
29) As a Sales Agent, I want to export my plan to Excel, so that I can use it offline and share it
30) As a Sales Agent, I want to open a planned visit in OpenStreetMap directions, so that I can reach the customer easily
31) As a Tenant admin, I want to register my tenant with its name, my email and a password, so that my team gets its own private workspace
32) As a User, I want to log in and log out, so that only my team can see our data
33) As a Tenant admin, I want the imports, maps and plans of my tenant to be invisible to any other tenant, so that our confidential revenue data stays private (NDA)
34) As a Tenant admin, I want a profile page to change the tenant name and the password, so that our information stays up to date
35) As an Analyst, I want to set the starting base of my tenant once by typing its address in the planner, so that every plan starts from our real base without entering it again


# CONTAINERS:

## CONTAINER_NAME: visitwise-frontend

### DESCRIPTION: 
Single page web application used by analysts, sales managers and sales agents. It is served by nginx, which also forwards every `/api` request to the backend container.

### USER STORIES:
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 34, 35

### PORTS: 
4200:80

### DESCRIPTION:
The container is built in two stages: Node.js compiles the Angular application, then an nginx image serves the static files, falls back to `index.html` for client-side routes and reverse-proxies `/api/` to `backend:8080`, so the browser only talks to one origin.

### PERSISTENCE EVALUATION
The frontend container is stateless. Only user interface preferences may be kept in the browser local storage.

### EXTERNAL SERVICES CONNECTIONS
The browser downloads map tiles from the OpenStreetMap tile servers (attribution shown on the map). Directions links open openstreetmap.org.

### MICROSERVICES:

#### MICROSERVICE: visitwise-frontend
- TYPE: frontend
- DESCRIPTION: Angular single page application: import wizard, imports list and detail, map dashboard, visit planner, what-if analysis and scenarios.
- PORTS: 80
- TECHNOLOGICAL SPECIFICATION:
Angular 22 (standalone components, signals, lazy routes), TypeScript in strict mode, spartan-ng (brain/helm) UI components, Tailwind CSS 4, OpenLayers with OpenStreetMap tiles for maps, Vitest for unit tests, nginx for serving.
- SERVICE ARCHITECTURE: 
`core/` holds the API models (mirror of the API contract) and shared services, `features/<feature>/` holds one folder per functional area (imports, dashboard, planner) with its pages and API service, `shared/` holds reusable presentational components.

- PAGES:

	| Name | Description | Related Microservice | User Stories |
	| ---- | ----------- | -------------------- | ------------ |
	| Imports list | Imports as cards or table with name, creation date and status | visitwise-backend | 10, 12 |
	| Import wizard | Upload, preview, column mapping, enterprise columns, name, report; template download | visitwise-backend | 1, 2, 3, 4, 5, 6, 7 |
	| Import detail | Summary, geocoding progress, delivery points table, manual position fix, delete | visitwise-backend | 8, 9, 11, 12 |
	| Map dashboard | OpenStreetMap map of delivery points with filters and summary indicators | visitwise-backend | 13, 14, 15, 16, 17, 18 |
	| Visit planner | Campaign and parameters, proposed plan (calendar, map itineraries, indicators) | visitwise-backend | 19, 20, 21, 22, 23, 24, 25 |
	| What-if and scenarios | Coverage over different horizons, saved scenarios compared side by side | visitwise-backend | 26, 27 |
	| Plan detail | Day-by-day calendar per agent, Excel export, directions links | visitwise-backend | 28, 29, 30 |

## CONTAINER_NAME: visitwise-backend

### DESCRIPTION: 
REST API that imports the Excel files, stores and geolocates the data, computes the analytics and the visit plans.

### USER STORIES:
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35

### PORTS: 
8080:8080

### DESCRIPTION:
A Spring Boot application organized by feature (imports, geocoding, analytics, planning). The database schema is created and versioned by Liquibase at startup. The planning engine is plain Java code with no framework dependency, so it is fast and fully unit tested.

### PERSISTENCE EVALUATION
The backend is stateless: every import, delivery point, revenue, geocoding result and saved plan is stored in the visitwise-db container. Uploaded Excel files are parsed in memory and not kept.

### EXTERNAL SERVICES CONNECTIONS
Nominatim (OpenStreetMap geocoding, https://nominatim.openstreetmap.org) to turn addresses into coordinates: at most 1 request per second with an identifying User-Agent, as required by its usage policy. Every result is cached in the database, so an address is geocoded only once. Only address and city are sent: customer names and revenues never leave the system.

### MICROSERVICES:

#### MICROSERVICE: visitwise-backend
- TYPE: backend
- DESCRIPTION: Import of Excel files, geocoding, analytics and visit planning.
- PORTS: 8080
- TECHNOLOGICAL SPECIFICATION:
Java 21, Spring Boot 4.1 (Web MVC, Data JPA, Validation, Actuator), Liquibase for database migrations, PostgreSQL JDBC driver, Apache POI for reading and writing Excel files, springdoc-openapi for the Swagger UI (`/swagger-ui.html`), Maven as build tool, JUnit 5 for tests.
- SERVICE ARCHITECTURE: 
Packages per feature: `imports` (Excel parsing, column mapping, import lifecycle), `geocoding` (background geocoding with cache), `analytics` (aggregated indicators), `planning` (REST API and persistence of plans) with `planning.engine` (working calendar, campaign windows, travel model, visit planner heuristic), `common` (error handling as RFC 9457 problem details).

- ENDPOINTS:
		
	| HTTP METHOD | URL | Description | User Stories |
	| ----------- | --- | ----------- | ------------ |
	| GET | /api/imports/template | Download the Excel import template | 1 |
	| POST | /api/imports/preview | Read headers and first rows of an uploaded file and suggest a column mapping | 2, 3, 4, 5 |
	| POST | /api/imports | Import a file with the chosen mapping and name, start geocoding | 2, 4, 5, 6, 7 |
	| GET | /api/imports | List imports, newest first | 10 |
	| GET | /api/imports/{id} | Import detail with counts and geocoding progress | 7, 8, 11 |
	| DELETE | /api/imports/{id} | Delete an import with its points and plans | 12 |
	| GET | /api/imports/{id}/points | Delivery points of an import with coordinates and revenues | 9, 11, 13 |
	| PATCH | /api/imports/{id}/points/{pointId}/location | Set the position of a point manually | 9 |
	| POST | /api/imports/{id}/geocoding/retry | Retry geocoding of points not found | 9 |
	| GET | /api/imports/{id}/analytics/summary | Indicators by enterprise, agent and city, top points, revenue concentration | 18 |
	| GET | /api/planning/campaigns | Campaign windows (Christmas, Easter, end of summer) for a year | 19 |
	| POST | /api/imports/{id}/plans/simulate | Compute a visit plan without saving it | 20, 21, 22, 23, 25 |
	| POST | /api/imports/{id}/plans/what-if | Compute the plan indicators for several horizons | 26 |
	| POST | /api/imports/{id}/plans | Compute and save a plan as a named scenario | 27 |
	| GET | /api/imports/{id}/plans | List saved plans of an import | 27 |
	| GET | /api/plans/{planId} | Saved plan with days and visits | 27, 28 |
	| DELETE | /api/plans/{planId} | Delete a saved plan | 27 |
	| GET | /api/plans/{planId}/export | Download a plan (optionally one agent) as Excel | 29 |
	| GET | /api/auth/csrf | Public. Issue the CSRF token cookie used by the web app on every state-changing request | 31, 32 |
	| POST | /api/auth/register | Public. Register a tenant with its name, email and password (hashed with Argon2id) | 31 |

## CONTAINER_NAME: visitwise-db

### DESCRIPTION: 
Relational database of the system.

### USER STORIES:
2, 6, 7, 8, 9, 10, 11, 12, 27, 28, 31, 33, 34, 35

### PORTS: 
5432:5432

### DESCRIPTION:
PostgreSQL 17. The schema is not created by hand: Liquibase changesets in `source/backend/src/main/resources/db/changelog` are applied by the backend at startup, so the database can be recreated on any machine with `docker compose up`.

### PERSISTENCE EVALUATION
Data is persisted in the named Docker volume `visitwise-db-data`, so it survives container restarts. `docker compose down -v` resets the system.

### EXTERNAL SERVICES CONNECTIONS
None.

### MICROSERVICES:

#### MICROSERVICE: visitwise-db
- TYPE: database
- DESCRIPTION: PostgreSQL database used by visitwise-backend.
- PORTS: 5432
- TECHNOLOGICAL SPECIFICATION:
PostgreSQL 17 (official alpine image), schema managed with Liquibase.
- SERVICE ARCHITECTURE: 
Single database `visitwise`, schema `public`.

- DB STRUCTURE: 

	**_tenant_** :	| **_id_** | name | email | password_hash | failed_login_count | locked_until | password_changed_at | last_login_at | created_at |

	**_import_batch_** :	| **_id_** | name | source_file_name | created_at | status | total_rows | imported_rows | skipped_rows | geocoded_rows | column_mapping | error_message |

	**_enterprise_** :	| **_id_** | import_id | source_column | name | color | position |

	**_delivery_point_** :	| **_id_** | import_id | source_row | customer_name | point_name | address | city | agent | latitude | longitude | geocode_status | total_revenue |

	**_revenue_** :	| **_id_** | delivery_point_id | enterprise_id | amount |

	**_geocode_cache_** :	| **_id_** | query_key | latitude | longitude | found | provider | created_at |

	**_visit_plan_** :	| **_id_** | import_id | name | created_at | parameters | kpis |

	**_planned_visit_** :	| **_id_** | plan_id | delivery_point_id | agent | visit_date | day_index | slot | expected_revenue | travel_km |
