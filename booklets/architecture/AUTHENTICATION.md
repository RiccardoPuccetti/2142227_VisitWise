# Authentication and Tenant Isolation

Implemented registration, login, remember-me, profile and starting base.
Source: [tenant package](../../source/backend/src/main/java/it/teamlab/visitwise/tenant), [Angular auth](../../source/frontend/src/app/core/auth), [API contract](API_CONTRACT.md).

## Account and credentials

- **A1 - Account:** one shared login per tenant/federation; `tenant` stores name, unique normalized email, password hash, security metadata and optional base.
- **A2 - Password rules:** Unicode NFKC normalization before validation, hashing and verification; 8..64 code points by default, no composition rules. `PASSWORD_MIN_LENGTH` changes the minimum.
- **A3 - Hashing:** Argon2id with 19 MiB memory, two iterations, parallelism 1, 16-byte salt and 32-byte hash; stored through a delegating encoder with the `{argon2}` prefix.
- There is no common-password blocklist, email verification, self-service password recovery, MFA, OAuth, separate user management or roles.
- Email changes and account deletion are not exposed. A developer password-reset procedure is documented in [the source README](../../source/README.md).

## Session and browser flow

- **A4 - Session:** Spring Security uses an in-memory `HttpSession`, 30-minute idle timeout, HttpOnly `JSESSIONID`, SameSite=Lax. `SESSION_COOKIE_SECURE=true` enables Secure cookies for HTTPS deployments.
- A backend restart removes sessions; a valid persistent remember-me cookie can authenticate the device again. No JWT is used.
- **A5 - Login:** `POST /api/auth/login` accepts form-encoded `username` (email), `password`, optional `remember-me=true`; success returns `CurrentTenant` and changes the session id.
- Registration returns `201 CurrentTenant` without a session; the SPA immediately logs in using the supplied credentials.
- **A6 - CSRF:** `csrf.spa()` exposes `XSRF-TOKEN`; Angular sends it in `X-XSRF-TOKEN` on same-origin mutations. Public login and registration still require CSRF protection.
- At startup, `AuthService` fetches `/api/auth/csrf`, then `/api/auth/me`; logout clears local state and fetches a fresh CSRF token for the next login.
- **A7 - Unauthenticated access:** protected API calls return `401` problem+json. Angular guards/interceptor return the user to login with a validated internal return URL.
- Public endpoints are GET `/api/auth/csrf`, POST `/api/auth/register` and `/api/auth/login`, health, Swagger/OpenAPI and `/error`.

## Failure handling and password changes

- **A8 - Login errors:** wrong password, unknown email and locked account share `401 Invalid email or password`; missing CSRF is `403`, rate limiting is `429`.
- Duplicate email at registration returns `409`, so registration can reveal that an account exists; this is an accepted limitation.
- **A9 - Account lockout:** five consecutive failures trigger a one-minute lock; later failures after expiry increase it exponentially to 15 minutes. Attempts during a lock do not extend it; successful login resets the counter.
- IP throttling shares one fixed one-minute window across login, registration and password changes: default 20 requests, configured by `AUTH_RATE_LIMIT_PER_MINUTE`; excess requests receive `429` and `Retry-After`.
- Lockout data persists in PostgreSQL; IP counters and the session registry are local to the backend process.
- **A10 - Password change:** requires the current password, validates/hashes the replacement, marks other sessions expired, revokes every remembered device and rotates the current session id.
- **A11 - Audit:** login, failures, lockout, logout, registration and password changes are logged with relevant tenant/email/IP metadata; passwords and hashes are not logged.

## Isolation and persistent login

- **A12 - Tenant boundary:** imports list by the authenticated tenant; `TenantGuardFilter` checks `/api/imports/{id}/**` and `/api/plans/{planId}/**` before controllers.
- A missing resource and another tenant's resource both return `404`. Child resources must also belong to the guarded parent; manual location updates check point and import together.
- `import_batch.tenant_id` carries ownership; enterprises, points, revenues, plans and visits belong through the import. Profile endpoints take tenant identity from the principal.
- **A13 - Remember-me:** opt-in persistent tokens in `persistent_logins`; a random series identifies a device and its token rotates on automatic login.
- Cookie `remember-me` is HttpOnly/SameSite=Lax, follows the Secure setting, and lasts 14 days by default (`REMEMBER_ME_DAYS`). Tokens are stored as issued by Spring's persistent-token scheme.
- Logout invalidates the current session and removes only the series supplied by that device. Password changes revoke all series for the tenant.
- Reuse of a replaced token removes all the tenant's remembered tokens and leaves the request unauthenticated; protected resources then return `401`.

## Profile and starting base

- PATCH `/api/profile` changes the tenant name; PUT `/api/profile/password` changes its password.
- GET `/api/profile/base` returns the saved address/city/coordinates, or `204` if unset.
- PUT `/api/profile/base` geocodes address/city through the shared cache, then saves the result on `tenant`.
- Unknown addresses return `422`, provider failures `503`; both preserve the previous base.
- The planner form uses this base, falling back to its `DEFAULT_BASE` in Rome (`41.8960, 12.4823`). The API requires coordinates in each plan request.
- Saved plan parameters retain their own base; changing the profile base does not replace it.

## Deployment boundary

- nginx proxies `/api` on the SPA origin; Angular needs no cross-origin credential flow.
- Browser headers include CSP, `nosniff`, `X-Frame-Options: DENY`, referrer and permissions policies. CSP permits OSM tiles and restricts API connections to the same origin.
- Compose binds the backend to `127.0.0.1:8080`; it accepts forwarded client addresses from the proxy for logs and throttling.
- Session storage and IP throttling assume a single backend instance; this deployment does not provide distributed sessions.
- Schema: changesets 002/003 add tenants and ownership, 005 adds remembered devices, 006 adds the starting base.
