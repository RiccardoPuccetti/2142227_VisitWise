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
| API docs (Swagger UI) | http://localhost:8080/swagger-ui.html (this machine only) |
| Health | http://localhost:8080/actuator/health |
| PostgreSQL | localhost:5432, db/user/password `visitwise` |

Reset all data: `docker compose down -v`.

Log in with the **demo tenant** `demo.federation@visitwise.test` / `visitwise-demo`, or register a new one.
The demo tenant exists only with `LIQUIBASE_CONTEXTS=dev` (the compose default). Its password is public: on the
machine that holds the real data set `LIQUIBASE_CONTEXTS=default` before the first start and register a tenant.

**Forgotten password or locked account** (there is no email reset): set the password to `visitwise-demo` and unlock,
then log in and change it at once in Profile. Replace the email:

```bash
docker compose exec db psql -U visitwise -d visitwise -c "UPDATE tenant SET password_hash = '{argon2}\$argon2id\$v=19\$m=19456,t=2,p=1\$/b3IGPBu1LUaNd2VbqK/Bw\$zcVDzhody8uIo0mdpcETy5wx9nl/j4/VovVxRvE6kF0', failed_login_count = 0, locked_until = NULL WHERE email = 'someone@example.com'"
```

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

## Real road distances (optional, self-hosted OSRM)

By default the planner estimates travel (straight line x road factor at an average speed) and the public OSRM demo
server draws the route of one day. To plan with real road distances and driving times, run OSRM locally: in `.env`
set `COMPOSE_PROFILES=osrm`, `ROUTING_BASE_URL=http://osrm:5000` and `ROUTING_MATRIX_ENABLED=true` (see
`.env.example`), then `docker compose up --build`.

- The first start downloads the OpenStreetMap extract of central Italy from Geofabrik (about 370 MB) into the volume
  `visitwise-osrm-data` and prepares the car road network (a few minutes and up to 4 GB of memory, once; about 1 GB
  on disk). Later starts reuse it; the server then uses about 0.6 GB of memory.
  Another region: set `OSRM_PBF_URL` to another Geofabrik `.osm.pbf` link.
- Points outside the downloaded region keep the estimate. The planner shows "road network" or "estimate" next to the
  hours on the road.
- A backend started with `./mvnw` reaches the server at `ROUTING_BASE_URL=http://127.0.0.1:5000`.
- OSRM driving times assume free-flowing traffic: in city centres real times are longer.

## Folders

| Folder | Content |
|---|---|
| `backend/` | Spring Boot 4.1 API, Liquibase changelog in `src/main/resources/db/changelog`, import template in `src/main/resources/import-template` |
| `frontend/` | Angular 22 SPA (spartan-ng, Tailwind, OpenLayers), nginx config for Docker |
| `sample-data/` | Synthetic datasets (no real data) and their generator `generate_samples.py` |
| `docker-compose.yml` | db + backend + frontend |

## Data confidentiality

The real ERP dataset is under NDA: keep it in `source/data-private/` (gitignored) or outside the repository. Use `sample-data/` for tests, screenshots and demos to third parties.
