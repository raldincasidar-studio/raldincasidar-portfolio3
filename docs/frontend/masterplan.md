# Frontend API Integration Masterplan

## Goal

Replace the hard-coded work, lab, and case-study literals with API-backed data while preserving the current Vue 3 visual design, routes, external media behavior, and animated preloader.

## Current frontend findings

- `HomeView.vue` owns hard-coded `works` and `labs` arrays and releases the preloader with a fixed 1.2 second timer.
- `CaseStudyView.vue` uses a mock delayed fetch and a large inline `pageData` object.
- `WorkCard.vue` expects `videoSrc`, a string `tags`, and an `id` used to build `/case-study/:id`.
- `LabCard.vue` expects `videoSrc`, `category`, and an optional CSS `className`.
- `Preloader.vue` already scans images/videos/fonts and waits for `preloader:data-ready` on `/`, but the event can be dispatched before all API/media work is truly ready.
- The router currently falls back unknown URLs to `/`; the admin route should be explicit and protected by an auth guard.

## Frontend structure to add

```text
src/
├── api/
│   ├── client.js          # fetch wrapper, base URL, JSON/error handling
│   ├── publicContent.js   # works, labs, case-study reads
│   └── admin.js           # auth, analytics, admin CRUD
├── composables/
│   ├── usePortfolioData.js
│   └── useAdminSession.js
├── stores/                # optional; use only if shared state needs it
└── views/
    └── AdminView.vue      # login + dashboard shell
```

Keep the API base relative by default (`/api`) so the browser never calls localhost in a deployed preview. Allow `VITE_API_BASE_URL` only for explicitly configured remote development.

## Data flow

### Home

1. On route entry, fetch `/api/works` and `/api/labs` concurrently with `Promise.all`.
2. Normalize API objects in one adapter to the existing card props.
3. Keep `isLoading` true until both requests resolve and the initial Vue DOM has rendered with `nextTick()`.
4. Dispatch `preloader:data-ready` only after data is available. `Preloader.vue` then waits for the resulting images/videos/fonts, with its existing hard timeout as a safety net.
5. Show a recoverable error state if content fails; do not silently render stale hard-coded content in production.

### Case study

1. Fetch `/api/works/:slug` (route param is currently called `id`; rename internally to `slug` without breaking existing URLs).
2. Map `caseStudy` fields to the view's existing presentation model.
3. Drive the loading state from the request rather than `setTimeout`.
4. On 404, render a not-found state and provide a link back to selected works.
5. Start asset readiness only after the API response has rendered.

### Navigation prefetching

- Add a small in-memory cache for works/labs and case studies.
- Fetch the home payload at application bootstrap so navigation does not wait unnecessarily.
- Prefetch a case study on work-card pointer/focus intent, but never block normal interaction on prefetch.
- Invalidate public caches after an admin mutation or on a short TTL.

## Preloader integration

Refactor readiness into a composable/event contract:

- `usePortfolioData` exposes `contentReady` and `contentError`.
- `Preloader.vue` receives or observes a single promise/event for route data readiness instead of knowing route-specific behavior.
- Keep image/video/font tracking in the preloader, but ensure dynamically inserted media is queried after data rendering (`nextTick`).
- Ensure a rejected API request still resolves the readiness gate so the user can reach an error UI.
- On subsequent internal navigation, do not show the full splash loader again unless the route explicitly requests it; use a smaller route transition if needed.

## Admin page

Add `/admin` outside the public navbar/footer flow or use an admin-specific layout. It should include:

1. Login screen.
2. Dashboard overview with published/draft/archived counts, total works/labs, recent updates, and API/database health.
3. Selected Works manager: searchable table, status filter, create/edit form, reorder control, publish/archive/delete actions.
4. Apps Lab manager with the same CRUD affordances.
5. External media URL inputs with URL validation and preview cards; no file upload control in v1.
6. Unsaved-changes warning and clear success/error toasts.

The admin UI should use the same Vue app but lazy-load its views/components. It must not expose admin data or controls to unauthenticated users.

## Auth and security behavior

- Use an HTTP-only secure auth cookie in production; the frontend calls `credentials: 'include'`.
- Add router guard for `/admin`; redirect unauthenticated users to `/admin/login`.
- Treat frontend route guards as UX only; every admin API route must enforce auth server-side.
- Do not put MongoDB credentials or admin secrets in `VITE_*` variables.
- Escape/render text content safely and reject unsafe URLs at the API boundary.

## Compatibility changes

- Update `WorkCard` to accept `tags` as either an array or display string, and use a real `<button>`/router link rather than relying on a parent click handler.
- Update `LabCard` to use stable `_id`/slug keys and preserve optional layout metadata only if it remains a presentation concern.
- Replace `videoSrc`/`video_url` naming drift with a consistent frontend model.
- Preserve existing external URL requirement: videos/images remain URL fields in MongoDB and are never bundled into the Vite build.

## Testing and rollout

- Unit-test API client errors, normalization, loading gates, and auth state.
- Run `npm run build` after adding the admin route.
- Verify public pages with an unavailable API, slow API, empty collections, and malformed media URLs.
- Verify admin CRUD, refresh/session persistence, unauthorized responses, and soft delete.
- Deploy API and SPA together on Vercel and test direct refreshes of `/admin` and `/case-study/:slug`.

## Platform features to integrate in the next frontend phase

### Maintenance mode

Add a public `/maintenance` route with the same visual language as the preloader and hero: cyan/sky gradient, dark typography, centered message, and a subtle animated logo treatment. On application bootstrap:

1. Fetch `GET /api/site-settings`.
2. If `maintenanceMode` is true and the route is public, redirect to `/maintenance`.
3. Allow `/admin`, `/admin/login`, and `/maintenance` through the guard.
4. Do not redirect if the settings request fails; show the normal site and report the failure non-blockingly.
5. Avoid redirect loops and preserve the intended public path for after maintenance is disabled.

Inside Settings, the maintenance toggle must call `PATCH /api/admin/settings/site`, show a confirmation dialog, show the active banner throughout the admin shell, and refresh the shared settings cache after success.

### Change password

Connect the existing Settings security card to `POST /api/admin/auth/change-password`. Add field-level errors, password strength guidance, confirmation matching, loading state, success toast, and session invalidation handling. On success, force a fresh login if the backend revokes the current session.

### Audit logs

Replace the current placeholder with a responsive log viewer after `GET /api/admin/logs` exists:

- date range filter;
- action/resource filters;
- search;
- paginated results;
- loading skeleton;
- empty state;
- API error/retry state.

Display action, actor, resource, timestamp, and safe summary only. Never render raw metadata blindly or expose token/password fields.

### Traffic/referral analytics

Replace the dashboard analytics placeholder with API-backed cards and charts:

- period selector for 7/30/90 days;
- visits;
- unique visitors;
- daily traffic line/area chart;
- top content;
- referral origins;
- device breakdown.

Use an accessible data table fallback. Fetch analytics independently from content counts so a slow or failed analytics request does not block dashboard navigation. Show `Analytics unavailable` with retry instead of fabricated zeroes when the request fails.

Add lightweight public event tracking after the backend collector exists. Page views must be queued and sent with `navigator.sendBeacon` where available, or a low-priority fetch. Event failures must be silent to the visitor and must never delay the preloader.
