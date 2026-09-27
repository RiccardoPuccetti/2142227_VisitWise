# VisitWise - smart visit planning for sales territories

Source code and Infrastructure as Code of the TeamLab hackathon project.
Project description and user stories: `../input.txt`. Deployed system specs: `../Student_doc.md`. Design documents: `../booklets/`.
**Contributors and AI agents: read `AGENTS.md` first.**

## Run everything (only Docker needed)

```bash
cd source
cp .env.example .env          # Windows: copy .env.example .env  - then set GEOCODING_USER_AGENT
docker compose up --build
```

| What | URL |
|---|---|
| Web app | http://localhost:4200 |
| API docs (Swagger UI) | http://localhost:8080/swagger-ui.html |
| Health | http://localhost:8080/actuator/health |
| PostgreSQL | localhost:5432, db/user/password `visitwise` |

Reset all data: `docker compose down -v`.

## Develop

```bash
# database only
docker compose up -d db

# backend (Java 21) - from source/backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
./mvnw verify                 # tests need the db container

# frontend (Node 24) - from source/frontend
npm ci
npm start                     # http://localhost:4200, /api proxied to :8080
npx ng test --watch=false
```

No local Java? `docker compose up --build backend db` and run only the frontend with `npm start`.

## Folders

| Folder | Content |
|---|---|
| `backend/` | Spring Boot 4.1 API, Liquibase changelog in `src/main/resources/db/changelog`, import template in `src/main/resources/import-template` |
| `frontend/` | Angular 22 SPA (spartan-ng, Tailwind, OpenLayers), nginx config for Docker |
| `sample-data/` | Synthetic datasets (no real data) and their generator `generate_samples.py` |
| `docker-compose.yml` | db + backend + frontend |

## Data confidentiality

The real ERP dataset is under NDA: keep it in `source/data-private/` (gitignored) or outside the repository. Use `sample-data/` for tests, screenshots and demos to third parties.
