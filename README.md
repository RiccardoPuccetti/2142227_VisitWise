# VisitWise

VisitWise imports Excel revenue data, maps delivery points and plans sales visits with campaign priorities, what-if comparisons and Excel export. Each federation shares a tenant account with isolated data.

**Stack:** Angular 22, Spring Boot 4.1.1 / Java 21, PostgreSQL 17, OpenLayers and Docker Compose.

## Build and run

Install Docker with Compose (Docker Desktop with Linux containers on Windows), then run from the repository root:

```sh
cd source
cp .env.example .env
```

In PowerShell, use `Copy-Item .env.example .env`. Skip the copy if `.env` already exists. Set `GEOCODING_USER_AGENT` in `.env` to identify your application and contact, then build and start:

```sh
docker compose up --build
```

Docker builds both applications and starts the database; no local Java or Node.js installation is needed. For build only, use `docker compose build`.

- App: [localhost:4200](http://localhost:4200)
- API docs: [Swagger UI](http://localhost:8080/swagger-ui.html)
- Register an account, or use the default development login: `demo.federation@visitwise.test` / `visitwise-demo`.
- Try the synthetic Excel files in [source/sample-data](source/sample-data/).

Stop with `docker compose down` from `source/`; database data remains in its Docker volume. Image builds skip backend tests; development and test commands are in [source/README.md](source/README.md).

## Optional road-based planning

In `source/.env`, set `COMPOSE_PROFILES=osrm`, replace the routing URL with `ROUTING_BASE_URL=http://osrm:5000`, and set `ROUTING_MATRIX_ENABLED=true`; rerun `docker compose up --build`. The first start downloads and prepares central Italy's road network.
Without this option, planning estimates travel and public OSRM supplies the displayed day's route, with an estimate fallback.

## Project information

- [System specification and user stories](Student_doc.md)
- [Architecture and API documentation](booklets/architecture/ARCHITECTURE.md)
- [Development and configuration](source/README.md)

For confidential data, use `LIQUIBASE_CONTEXTS=default` before the first start and register a private account. Keep real datasets outside the repository or in the ignored `source/data-private/` directory.
