# Authentication - registration, login, profile

> Owner: Puccetti (PUC-8, PUC-9). Stories: US-31, US-32, US-33, US-34. Decision: D-09.
> Implemented step by step on branch `tenant_login`: every step ends with a check that must pass before the next one starts.

## 1. Scope

**One account per tenant.** The tenant (a federation) is both the owner of the data and the login: the analyst, the sales manager and the agents of that federation share it.

| In scope | Out of scope (and why) |
|---|---|
| Registration of a tenant (name, email, password) | OAuth2 / OpenID Connect, social login (not wanted) |
| Log in, log out, "who am I" | Multi-factor authentication, passkeys |
| Profile: tenant name, change password | Change email, delete account (not needed for the demo) |
| Tenant isolation of imports and plans | Password reset by email, email verification (no mail server in the stack) |
| | Several users per tenant, roles, "remember me" |

A forgotten password is reset by a developer (procedure in the README), because there is no email channel.

## 2. Standards followed

- **NIST SP 800-63B-4** (2025) - password rules.
- **OWASP ASVS 5.0** (V6 Authentication, V7 Session management) and the OWASP Password Storage, Authentication and Session Management cheat sheets.
- **Spring Security 7** defaults (the version managed by Spring Boot 4.1): session fixation protection, security headers, CSRF protection for SPAs.

Deliberate deviations for the demo: minimum password length 8 instead of the recommended 15 (configurable), no blocklist of common passwords.

## 3. Design decisions

| # | Topic | Decision | Reason |
|---|---|---|---|
| A1 | Account | One table `tenant` holds the tenant data and its credentials. Login with the email (trimmed, stored lower case, unique) + password | One account per tenant; everything else is keyed by `tenant_id`, so splitting users into their own table later does not touch imports or plans |
| A2 | Password rules | Length between `visitwise.auth.password.min-length` (default **8**) and 64 characters, counted as Unicode code points; no composition rules; paste and password managers allowed; Unicode NFKC normalization before hashing | ASVS 5.0 V6.2 (min 8, 15 recommended), NIST SP 800-63B-4 (max >= 64, no composition rules). Raise the minimum to 15 for production by config only |
| A3 | Password hashing | Argon2id (m = 19 MiB, t = 2, p = 1, 16-byte salt) through Spring's `DelegatingPasswordEncoder` (stored as `{argon2}...`). New dependency: BouncyCastle (`bcprov-jdk18on`) | OWASP: Argon2id first choice, bcrypt only for legacy; the delegating encoder allows changing the algorithm later |
| A4 | Session | Server-side `HttpSession` kept in memory; cookie `HttpOnly`, `SameSite=Lax`, `Secure` when served over HTTPS (env `SESSION_COOKIE_SECURE`), 30 min idle timeout. No JWT | Simplest safe option for a same-origin SPA: not readable by JavaScript, revocable. Restarting the backend logs everybody out (accepted) |
| A5 | Login endpoint | Spring Security `formLogin` at `POST /api/auth/login` (form-encoded `username`, `password`) with JSON success / failure handlers | Reuses the framework flow: new session id on login (fixation), context saved in the session, CSRF token refreshed. No hand-written login code |
| A6 | CSRF | `csrf.spa()`: token in cookie `XSRF-TOKEN`, sent back in header `X-XSRF-TOKEN` by Angular `HttpClient` automatically | Same names as Angular's defaults, so no frontend code; required because the session is a cookie |
| A7 | Unauthenticated calls | `401` problem+json, never a redirect | The SPA decides where to go |
| A8 | Error messages | Login failure always `401 "Invalid email or password"` (wrong password, unknown email, locked account). Registration with a used email: `409` | No account enumeration at login. At registration it cannot be avoided without email verification: accepted risk, mitigated by A9 |
| A9 | Brute force | Per account: after 5 consecutive failures, lock for 1 min, doubling up to 15 min; reset on success. Per client IP: max 20 login / register attempts per minute. The lock is silent (same 401) | NIST: limit failed attempts (<= 100 consecutive); ASVS V6.3 |
| A10 | Password change | Needs the current password; on success the session id changes and the tenant's other sessions are expired | ASVS V6 / V7 |
| A11 | Audit | Log login success, failure, lock, logout, registration, password change with email and IP; never passwords or hashes | ASVS V16 (security logging) |
| A12 | Tenant isolation | `import_batch.tenant_id`; one guard on `/api/imports/{id}/**` and `/api/plans/{planId}/**`; another tenant's id answers `404` | D-09 |

## 4. API

Endpoints 19-25 in `API_CONTRACT.md` section 4. The session cookie is sent automatically; `CurrentTenant` = `{ "id", "name", "email" }`.

## 5. Data model (Liquibase `002-tenant.sql`)

- `tenant`: `id`, `name` (150, not null), `email` (254, not null, unique, lower case), `password_hash` (255, not null), `failed_login_count` (default 0), `locked_until`, `password_changed_at`, `last_login_at`, `created_at`.
- Step 8 adds `import_batch.tenant_id` (not null, FK with cascade, index).

## 6. Steps

Every step: tests written first (TDD, `source/AGENTS.md` section 3), its own commits (`Refs: PUC-x, US-xx`), build + tests green, and the **check** below done together before starting the next step.
The branch is merged into `develop` only after step 8, so teammates never meet a half-finished login.

| Step | What | Check |
|---|---|---|
| 0 | Decisions A1-A12 agreed; endpoints 19-25 and `CurrentTenant` added to `API_CONTRACT.md` and `api.models.ts` | Done when the contract is reviewed |
| 1 | Schema `002-tenant.sql`, entity `Tenant`, `TenantRepository` (package `tenant`) | Liquibase applies on a clean DB; `ddl-auto: validate` passes; repository test for the unique lower-case email |
| 2 | Security baseline: `spring-boot-starter-security`, `SecurityFilterChain` (public list, `401` problem+json, `csrf.spa()`, session cookie settings, headers), `GET /api/auth/csrf`; existing tests adapted | `curl /api/imports` -> 401; `/api/auth/csrf` sets `XSRF-TOKEN`; POST without token -> 403; Swagger and health still reachable |
| 3 | Registration: Argon2id encoder, `PasswordPolicy` (configurable min length, max 64, NFKC), `POST /api/auth/register` | Tests: valid registration stores an `{argon2}` hash; too short / too long rejected with a clear message; min length read from config; duplicate email (any case) -> 409 |
| 4 | Login, logout, me: `formLogin` with JSON handlers, `UserDetailsService` exposing the tenant id, lockout + IP rate limit, audit log | Tests: login OK sets a new session id; wrong password / unknown email / locked -> identical 401; 6th failure locked; logout kills the session; `/me` after logout -> 401 |
| 5 | Profile API: rename tenant, change password (current password, session rotation, other sessions expired) | Tests: wrong current password -> 400; after the change the old password fails and a second session is expired |
| 6 | Frontend core (`core/auth/`): `AuthService` (current tenant signal, loaded at startup), `authGuard` / `guestGuard`, 401 interceptor -> `/login?returnUrl=` (internal paths only), routes `/login`, `/register`, `/profile`; tenant menu with logout in the shell (commit reviewed by Rivera) | Unit tests for guards, interceptor, returnUrl validation; protected routes redirect when logged out |
| 7 | Pages (spartan): login, register, profile. `autocomplete` attributes (`username`, `current-password`, `new-password`), show / hide password, length hint, accessible errors (WCAG AA) | Manual run in `docker compose`: register -> auto login -> profile -> change password -> logout -> login; keyboard-only pass |
| 8 | Tenant isolation: `import_batch.tenant_id`, tenant guard, imports list filtered, demo tenant in the dev seed (Liquibase context `dev`), test helper `TenantTestSupport.asTenant(id)` for teammates' controller tests | Isolation test: tenant B gets 404 on every import / plan URL of tenant A and does not see it in the list |
| 9 | Hardening and docs: nginx security headers (CSP allowing OSM tiles, `Referrer-Policy`, `Permissions-Policy`), `SESSION_COOKIE_SECURE` in compose, `Student_doc.md` (endpoints, pages, tables), `ARCHITECTURE.md`, README (demo account, password reset procedure) | `docker compose down -v && docker compose up --build` end to end; response headers checked in the browser |

The tenant starting base (US-35, PUC-10, D-10) follows after step 9.
