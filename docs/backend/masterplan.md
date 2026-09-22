# Backend API Masterplan

## Goal

Add a secure, Vercel-compatible Express API backed by MongoDB/Mongoose for the portfolio's two editable content collections:

- **Selected works** — portfolio case studies shown on the home page and `/case-study/:id`.
- **Apps Lab** — shipped apps/experiments shown in the Labs section.

The API will use external asset URLs only. No image or video binary will be uploaded to, or stored in, this repository.

## Current source findings

The current Vue data is hard-coded in `src/views/HomeView.vue` and `src/views/CaseStudyView.vue`.

- Work cards currently use `title`, `description`, `tags`, `year`, `videoSrc`, `device`, and `id`.
- Lab cards currently use `title`, `description`, `category`, `videoSrc`, and optional `className`.
- Case-study detail data includes client metadata, title/description, hero video, story, contribution, numbers, visual identity, and solution slides.
- `Preloader.vue` already waits for page assets and a `preloader:data-ready` event, but Home currently uses a fixed 1.2 second timer instead of waiting for a real request.

The implementation should preserve the existing visual contracts while normalizing API names to predictable camelCase JSON.

## Proposed API shape

Base URL: `/api`

### Public endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Deployment/database health check (no secrets) |
| GET | `/api/works` | List published selected works, ordered by `sortOrder` |
| GET | `/api/works/:slug` | Fetch one published case study |
| GET | `/api/labs` | List published Apps Lab items, ordered by `sortOrder` |

### Admin endpoints

All admin endpoints require authentication and an admin role. The first implementation should use a signed, HTTP-only JWT cookie or bearer token, with credentials never stored in the database in plain text.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/admin/auth/login` | Authenticate admin credentials |
| POST | `/api/admin/auth/logout` | Clear the auth cookie |
| GET | `/api/admin/auth/me` | Return current admin session |
| GET | `/api/admin/analytics` | Dashboard counts and recent activity |
| GET/POST | `/api/admin/works` | List or create works, including drafts |
| GET/PATCH/DELETE | `/api/admin/works/:id` | Read, update, or delete a work |
| GET/POST | `/api/admin/labs` | List or create lab items |
| GET/PATCH/DELETE | `/api/admin/labs/:id` | Read, update, or delete a lab item |

## Server architecture

1. `api/index.js` creates Express middleware and exports the app for Vercel; it must not call `app.listen()` in production.
2. A small database helper caches the Mongoose connection across warm serverless invocations.
3. Schemas/models live in `api/models/`; routes/controllers/validation should be split into modules once the initial endpoint contract is stable.
4. Central error handling returns a consistent `{ error: { code, message, details? } }` shape.
5. CORS is restricted to `FRONTEND_ORIGIN` in production; local development may use the Vite origin.
6. Rate-limit login and mutating admin routes, validate payloads at the boundary, and never log `MONGODB_URI`, JWT secrets, or passwords.

## Validation and behavior

- Slugs are unique, URL-safe, and immutable by default after creation.
- Public queries return only `status: "published"` documents.
- Admin queries can filter by `draft`, `published`, and `archived`.
- `sortOrder` is an explicit integer; ties fall back to `publishedAt`/`createdAt`.
- Delete should be a soft delete (`status: "archived"`) by default, with a protected hard-delete option only if later required.
- Every write updates `updatedAt`; publish actions set `publishedAt`.
- External URLs must be HTTPS in production and are validated as URLs. The API stores URLs, not downloaded assets.

## Analytics scope

Initial analytics are content-management metrics that are reliable in a serverless environment:

- published/draft/archived work counts;
- published/draft/archived lab counts;
- total content count;
- recently updated items;
- optional `viewCount` and `lastViewedAt` on public detail reads, updated with a best-effort non-blocking operation.

This is not a replacement for a privacy-compliant traffic analytics platform. A later iteration can add an event collection or external analytics provider.

## Vercel deployment

- Keep the entrypoint at `api/index.js`.
- Add a `vercel.json` only if routing requires explicit rewrites; Vercel normally maps `/api/*` automatically.
- Use Node 18+ runtime.
- Required environment variables are listed in `.env.example`.
- Configure MongoDB Atlas network access for Vercel, preferably with least-privilege database credentials.
- Do not use filesystem persistence, process-local sessions, or long-running workers.

## Delivery order

1. Add dependencies and environment template.
2. Implement connection caching, schemas, validation, auth middleware, and health route.
3. Implement public works/labs reads.
4. Implement admin CRUD and auth.
5. Implement analytics endpoint.
6. Add seed script or one-time migration from the current Vue literals.
7. Integrate frontend API client and preloader coordination.
8. Test build, API validation, auth failures, CRUD, and a Vercel-like function invocation.

## Phase 2 platform capabilities

The next backend phase adds operational controls and analytics without making the public Vue client responsible for persistence.

### Maintenance mode

Add a singleton `SiteSettings` document and these endpoints:

- `GET /api/site-settings` — public, returns only safe public settings such as maintenance state and message.
- `GET /api/admin/settings/site` — authenticated admin read.
- `PATCH /api/admin/settings/site` — authenticated admin update.

When `maintenanceMode` is true, the frontend should redirect public routes to `/maintenance`. The backend remains the source of truth so the behavior works across Vercel serverless instances. Admin routes, authentication routes, the settings endpoints, and the maintenance page must remain available.

Required behavior:

1. Read settings during public app bootstrap with a short cache lifetime.
2. Fail open if the settings service is unavailable, so an analytics outage does not take down the portfolio.
3. Record enable/disable changes as audit events.
4. Never expose internal settings, admin email, environment values, or database details in the public response.
5. Use an atomic upsert for the singleton document.

### Change password

Add:

- `POST /api/admin/auth/change-password` — authenticated admin only.

Request fields:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password-at-least-12-chars",
  "confirmPassword": "new-password-at-least-12-chars"
}
```

The API must verify the current bcrypt/argon2 hash, enforce password policy, reject reused passwords where practical, hash the new password, update `passwordChangedAt`, revoke existing sessions/tokens, and write a `password_change` audit event. Never return or log password values.

### Audit logs

Add an `AuditEvent` collection and:

- `GET /api/admin/logs` — authenticated, paginated, filterable logs.

Record at minimum:

- login success/failure (failure events must not reveal whether an email exists);
- logout;
- create, update, publish, archive, and delete actions;
- maintenance mode changes;
- password changes;
- settings changes.

Use append-only events. Do not store raw request bodies, passwords, JWTs, or sensitive query strings. Store a safe metadata summary and a request correlation ID.

Suggested query parameters:

- `page`, `limit`;
- `action`;
- `resourceType`;
- `actorId`;
- `from`, `to` ISO timestamps;
- `search` over safe resource title/slug metadata.

### Traffic and referral analytics

Use a privacy-minimizing first-party event collector instead of trusting arbitrary client-provided numbers.

Add:

- `POST /api/analytics/events` — public, rate-limited, schema-validated ingestion.
- `GET /api/admin/analytics?period=7d|30d|90d` — authenticated aggregate dashboard data.
- `GET /api/admin/analytics/referrals?period=...` — authenticated referral breakdown if kept separate.

The event collector should accept only an allowlisted event type such as `page_view`, `case_study_view`, or `lab_view`; a normalized path/resource slug; timestamp; referrer origin; anonymous session ID; and coarse device category. Do not collect full IP addresses or sensitive URL query strings. If abuse prevention needs an IP, hash it with a rotating server-side salt and set a retention period.

Analytics aggregation should return:

- visits and unique anonymous sessions;
- time-series counts grouped by day;
- top public routes/content;
- referral origin counts;
- device category counts;
- period and generated-at values.

Use MongoDB aggregation pipelines with bounded date ranges, indexes on `occurredAt`/`eventType`, and retention cleanup. Analytics must be best-effort: a failed analytics request must not block public page rendering or preloader readiness.

### New implementation order

1. Add schemas and indexes for `SiteSettings`, `AuditEvent`, and `AnalyticsEvent`.
2. Add validation, safe serializers, and database connection reuse.
3. Add maintenance settings read/update routes and public safe endpoint.
4. Add password-change route and session revocation strategy.
5. Add audit middleware/service and cover all admin mutations.
6. Add analytics ingestion with rate limiting and origin/path normalization.
7. Add analytics aggregation endpoints and tests for date ranges, empty data, and abuse limits.
8. Integrate frontend maintenance guard, settings actions, logs table, and dashboard charts.
