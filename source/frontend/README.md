# VisitWise frontend

Angular 22 + spartan-ng + Tailwind 4 + OpenLayers. Rules: `AGENTS.md` (this folder) and `../AGENTS.md`.

```bash
npm ci
npm start                    # http://localhost:4200, /api -> http://localhost:8080 (proxy.conf.json)
npx ng build
npx ng test --watch=false
```

- API types: `src/app/core/models/api.models.ts` (mirror of `booklets/architecture/API_CONTRACT.md`).
- Features: `src/app/features/{imports,dashboard,planner}`; routes in `src/app/app.routes.ts`.
- Docker: `Dockerfile` builds the app and serves it with nginx (`nginx.conf` proxies `/api` to the backend service).
