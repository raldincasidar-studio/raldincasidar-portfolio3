# Portfolio API Master Documentation

**Version:** 1.0  
**Audience:** Frontend developers building the public portfolio and admin dashboard  
**Base URL (local):** `http://localhost:3000`  
**Base URL (same Vercel deployment):** `/api`

This API manages the portfolio's **Selected Works** case studies and **Apps Lab** entries. Media is external: the API stores image/video URLs only and never accepts uploaded files.

## 1. General conventions

- All request and response bodies use JSON.
- Send `Content-Type: application/json` for requests with a body.
- IDs returned by the API are MongoDB ObjectId strings.
- Public endpoints return only records with `status: "published"`.
- Admin endpoints can read and manage `draft`, `published`, and `archived` records.
- `DELETE` is a soft delete: the record is changed to `status: "archived"`.
- `sortOrder` is an integer; lower values appear first.
- External media URLs should use HTTPS in production.
- Frontend requests using cookie authentication must include `credentials: "include"`.

### Frontend API helper

```js
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Request failed')
    error.status = response.status
    error.code = payload.error?.code
    error.details = payload.error?.details
    throw error
  }
  return payload
}
```

Use a relative `/api` base in production. Do not put `MONGODB_URI`, `JWT_SECRET`, or any other server secret in a `VITE_*` variable.

## 2. Standard response shapes

### Successful collection response

```json
{
  "data": [
    {
      "id": "66f000000000000000000001",
      "slug": "angels-pizza-app",
      "title": "Angel's Pizza Super App",
      "status": "published",
      "sortOrder": 1
    }
  ]
}
```

### Successful single-record response

```json
{
  "data": {
    "id": "66f000000000000000000001",
    "slug": "angels-pizza-app",
    "title": "Angel's Pizza Super App"
  }
}
```

### Successful action response

```json
{
  "data": {
    "ok": true
  }
}
```

### Error response

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Work not found",
    "details": {}
  }
}
```

`details` is included for validation errors when available.

Common status codes:

| Status | Meaning |
|---:|---|
| 200 | Successful read/update/action |
| 201 | Successful create |
| 401 | Missing, invalid, or expired authentication |
| 403 | Authenticated account is inactive/forbidden |
| 404 | Record or API route not found |
| 409 | Duplicate unique value, usually a slug/email conflict |
| 422 | Invalid request body or route parameter |
| 500 | Server/database error |

## 3. Health check

### `GET /api/health`

Checks whether the API can connect to MongoDB.

#### Request

```http
GET /api/health HTTP/1.1
Accept: application/json
```

#### Successful response — `200`

```json
{
  "ok": true,
  "database": "connected"
}
```

If the database cannot be reached, the API returns an error response with status `500`.

## 4. Public Selected Works API

### `GET /api/works`

Returns all published works ordered by `sortOrder`, then most recently published.

#### Request

```http
GET /api/works HTTP/1.1
Accept: application/json
```

#### Response — `200`

```json
{
  "data": [
    {
      "id": "66f000000000000000000001",
      "slug": "angels-pizza-app",
      "title": "Angel's Pizza Super App",
      "description": "A modern pizza ordering app with real-time updates and seamless payment integration.",
      "tags": ["Mobile App", "Community"],
      "year": "2026",
      "device": "phone",
      "previewVideoUrl": "https://cdn.example.com/videos/angels-pizza.mp4",
      "previewImageUrl": "https://cdn.example.com/images/angels-pizza-poster.jpg",
      "status": "published",
      "sortOrder": 1,
      "viewCount": 0,
      "createdAt": "2026-09-22T05:00:00.000Z",
      "updatedAt": "2026-09-22T05:00:00.000Z",
      "publishedAt": "2026-09-22T05:00:00.000Z"
    }
  ]
}
```

The frontend adapter can map `previewVideoUrl` to the current component prop `videoSrc`, and `tags.join(', ')` to the current `WorkCard` string prop.

### `GET /api/works/:slug`

Returns one published work and its complete case-study content.

#### Request

```http
GET /api/works/angels-pizza-app HTTP/1.1
Accept: application/json
```

#### Response — `200`

```json
{
  "data": {
    "id": "66f000000000000000000001",
    "slug": "angels-pizza-app",
    "title": "Angel's Pizza Super App",
    "description": "A modern pizza ordering app with real-time updates and seamless payment integration.",
    "tags": ["Mobile App", "Community"],
    "year": "2026",
    "device": "phone",
    "previewVideoUrl": "https://cdn.example.com/videos/angels-pizza.mp4",
    "status": "published",
    "sortOrder": 1,
    "caseStudy": {
      "clientName": "ANGEL’S PIZZA",
      "type": "MOBILE APP",
      "caseTitle": "Turning a confusing checkout into Angel's Pizza's fastest-growing sales channel.",
      "caseDescription": "Customers were getting lost mid-order, checkout took too many taps, and sales were flatlining.",
      "hero": {
        "type": "phone",
        "videoUrl": "https://cdn.example.com/videos/angels-pizza-hero.mp4",
        "imageUrl": "https://cdn.example.com/images/angels-pizza-hero.jpg"
      },
      "story": "I took the provided Figma design and turned it into a fully working production app.",
      "contribution": {
        "role": "Full-stack App Developer",
        "client": "Angel’s Pizza",
        "year": "2024-2026",
        "discipline": "Mobile App Development, UX Engineering",
        "scope": ["Frontend", "Backend", "UX", "Database"]
      },
      "numbers": [
        { "label": "APP SALES", "value": "+100%" },
        { "label": "SALES AFTER LAUNCH", "value": "2x" }
      ],
      "visualIdentity": {
        "colorsTitle": "Built to whet the appetite",
        "colors": [
          { "name": "Lemon Orange", "hex": "#FAD81E" }
        ],
        "fontsTitle": "Typeset for a fast, easy read",
        "fonts": [
          { "label": "PRIMARY", "name": "POPPINS FONT" }
        ]
      },
      "solutionsOverview": {
        "description": "The Figma design solved the visual problem.",
        "slides": [
          {
            "videoUrl": "https://cdn.example.com/videos/solution-1.mp4",
            "imageUrl": "https://cdn.example.com/images/solution-1.jpg",
            "videoType": "phone",
            "description": "Smooth, premium transitions between every screen.",
            "sortOrder": 1
          }
        ]
      }
    },
    "createdAt": "2026-09-22T05:00:00.000Z",
    "updatedAt": "2026-09-22T05:00:00.000Z",
    "publishedAt": "2026-09-22T05:00:00.000Z"
  }
}
```

#### Not found — `404`

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Work not found"
  }
}
```

## 5. Public Apps Lab API

### `GET /api/labs`

Returns published Apps Lab entries ordered by `sortOrder`.

#### Request

```http
GET /api/labs HTTP/1.1
Accept: application/json
```

#### Response — `200`

```json
{
  "data": [
    {
      "id": "66f000000000000000000010",
      "slug": "bangsamoro-ramadhan-app",
      "title": "Bangsamoro Ramadhan App",
      "description": "A mobile app for managing Bangsamoro Ramadhan activities and information.",
      "category": "Mobile App, Religion",
      "categories": ["Mobile App", "Religion"],
      "device": "phone",
      "videoUrl": "https://cdn.example.com/videos/ramadhan-app.mp4",
      "imageUrl": "https://cdn.example.com/images/ramadhan-app.jpg",
      "externalUrl": "https://example.com/app",
      "status": "published",
      "sortOrder": 2,
      "viewCount": 0,
      "createdAt": "2026-09-22T05:00:00.000Z",
      "updatedAt": "2026-09-22T05:00:00.000Z",
      "publishedAt": "2026-09-22T05:00:00.000Z"
    }
  ]
}
```

The frontend adapter can map `videoUrl` to the current `LabCard` prop `videoSrc`.

## 6. Admin authentication

Admin routes require an authenticated admin session. The preferred browser flow uses an HTTP-only cookie.

### `POST /api/admin/auth/login`

#### Request

```http
POST /api/admin/auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "a-strong-admin-password"
}
```

The server sets an HTTP-only cookie named `portfolio_admin_token`. A browser frontend must use `credentials: "include"` on login and all later admin requests.

#### Response — `200`

```json
{
  "data": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

#### Invalid credentials — `401`

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid credentials"
  }
}
```

### `POST /api/admin/auth/logout`

Clears the admin cookie.

```http
POST /api/admin/auth/logout HTTP/1.1
Cookie: portfolio_admin_token=...
```

Response — `200`:

```json
{
  "data": { "ok": true }
}
```

### `GET /api/admin/auth/me`

Checks the current session.

#### Request

```http
GET /api/admin/auth/me HTTP/1.1
Accept: application/json
Cookie: portfolio_admin_token=...
```

#### Response — `200`

```json
{
  "data": {
    "id": "66f000000000000000000099",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

Unauthenticated requests return `401` with code `UNAUTHORIZED`.

## 7. Admin work management

Every admin work endpoint requires the login cookie or this header:

```http
Authorization: Bearer <jwt-token>
```

### `GET /api/admin/works`

Returns all works, including drafts and archived records.

Optional status filter:

```http
GET /api/admin/works?status=draft HTTP/1.1
```

Allowed values: `draft`, `published`, `archived`.

### `POST /api/admin/works`

Creates a work.

#### Request body

```json
{
  "slug": "angels-pizza-app",
  "title": "Angel's Pizza Super App",
  "description": "A modern pizza ordering app with real-time updates and seamless payment integration.",
  "tags": ["Mobile App", "Community"],
  "year": "2026",
  "device": "phone",
  "previewVideoUrl": "https://cdn.example.com/videos/angels-pizza.mp4",
  "previewImageUrl": "https://cdn.example.com/images/angels-pizza-poster.jpg",
  "status": "draft",
  "sortOrder": 1,
  "caseStudy": {
    "clientName": "ANGEL’S PIZZA",
    "type": "MOBILE APP",
    "caseTitle": "Turning a confusing checkout into Angel's Pizza's fastest-growing sales channel.",
    "caseDescription": "Customers were getting lost mid-order.",
    "hero": {
      "type": "phone",
      "videoUrl": "https://cdn.example.com/videos/hero.mp4",
      "imageUrl": "https://cdn.example.com/images/hero.jpg"
    },
    "story": "The complete project story.",
    "contribution": {
      "role": "Full-stack App Developer",
      "client": "Angel’s Pizza",
      "year": "2024-2026",
      "discipline": "Mobile App Development, UX Engineering",
      "scope": ["Frontend", "Backend", "UX", "Database"]
    },
    "numbers": [{ "label": "APP SALES", "value": "+100%" }],
    "visualIdentity": {
      "colorsTitle": "Brand colors",
      "colors": [{ "name": "Lemon Orange", "hex": "#FAD81E" }],
      "fontsTitle": "Typography",
      "fonts": [{ "label": "PRIMARY", "name": "POPPINS FONT" }]
    },
    "solutionsOverview": {
      "description": "Implementation details.",
      "slides": [{
        "videoUrl": "https://cdn.example.com/videos/solution.mp4",
        "imageUrl": "https://cdn.example.com/images/solution.jpg",
        "videoType": "phone",
        "description": "A smooth flow.",
        "sortOrder": 1
      }]
    }
  }
}
```

Required fields: `slug`, `title`, `description`, and `previewVideoUrl`.  
Valid `device` values: `phone`, `browser`.  
Valid `status` values: `draft`, `published`, `archived`.

#### Response — `201`

Returns the newly created work using the standard single-record response shape.

### `GET /api/admin/works/:id`

Returns one work by MongoDB ObjectId, regardless of status.

### `PATCH /api/admin/works/:id`

Updates one or more work fields. The request body is partial; send only changed fields.

```http
PATCH /api/admin/works/66f000000000000000000001 HTTP/1.1
Content-Type: application/json
Cookie: portfolio_admin_token=...

{
  "title": "Angel's Pizza Super App — Updated",
  "sortOrder": 0,
  "status": "published"
}
```

Response: `200` with the updated work.

### `DELETE /api/admin/works/:id`

Archives the work rather than physically removing it.

```http
DELETE /api/admin/works/66f000000000000000000001 HTTP/1.1
Cookie: portfolio_admin_token=...
```

Response: `200` with the updated record whose status is `archived`.

## 8. Admin Apps Lab management

Apps Lab uses the same CRUD pattern as works.

### `GET /api/admin/labs`

Returns all lab entries. Supports `?status=draft`, `?status=published`, or `?status=archived`.

### `POST /api/admin/labs`

#### Request body

```json
{
  "slug": "bangsamoro-ramadhan-app",
  "title": "Bangsamoro Ramadhan App",
  "description": "A mobile app for managing Bangsamoro Ramadhan activities and information.",
  "category": "Mobile App, Religion",
  "categories": ["Mobile App", "Religion"],
  "device": "phone",
  "videoUrl": "https://cdn.example.com/videos/ramadhan-app.mp4",
  "imageUrl": "https://cdn.example.com/images/ramadhan-app.jpg",
  "externalUrl": "https://example.com/app",
  "status": "published",
  "sortOrder": 1
}
```

Required fields: `slug`, `title`, `description`, and `videoUrl`.  
`imageUrl` and `externalUrl` are optional.

Response: `201` with the created lab record.

### `GET /api/admin/labs/:id`

Returns one lab entry by MongoDB ObjectId.

### `PATCH /api/admin/labs/:id`

Updates any subset of the lab fields.

```json
{
  "description": "Updated description.",
  "status": "draft"
}
```

Response: `200` with the updated lab record.

### `DELETE /api/admin/labs/:id`

Archives the lab entry. Response: `200` with the archived record.

## 9. Admin analytics

### `GET /api/admin/analytics`

Requires authentication. Returns content-management counts and recently updated works.

#### Response — `200`

```json
{
  "data": {
    "works": {
      "draft": 2,
      "published": 4,
      "archived": 1
    },
    "labs": {
      "draft": 1,
      "published": 3,
      "archived": 0
    },
    "recent": [
      {
        "id": "66f000000000000000000001",
        "title": "Angel's Pizza Super App",
        "slug": "angels-pizza-app",
        "status": "published",
        "updatedAt": "2026-09-22T05:00:00.000Z"
      }
    ]
  }
}
```

A missing status has a count of zero; frontend dashboards should use `counts.published || 0`.

## 10. Frontend implementation flow

### Public home page

```js
const [{ data: works }, { data: labs }] = await Promise.all([
  apiFetch('/works'),
  apiFetch('/labs'),
])

const workCards = works.map((work) => ({
  ...work,
  id: work.slug,
  tags: work.tags.join(', '),
  videoSrc: work.previewVideoUrl,
}))

const labCards = labs.map((lab) => ({
  ...lab,
  videoSrc: lab.videoUrl,
}))
```

Only dispatch the existing `preloader:data-ready` event after both requests have either succeeded or been converted into a visible error state. A rejected request must not leave the preloader permanently locked.

### Case-study page

Use the route slug:

```js
const { data: work } = await apiFetch(`/works/${route.params.id}`)
const pageData = work.caseStudy
```

The view can use `work.title`, `work.year`, `work.caseStudy.caseTitle`, and the other `caseStudy` fields to replace its current inline mock object.

### Admin page startup

```js
try {
  const { data: admin } = await apiFetch('/admin/auth/me')
  // render dashboard
} catch (error) {
  if (error.status === 401) {
    // render login screen or redirect to /admin/login
  }
}
```

After login, preserve the session through the HTTP-only cookie. Do not store the JWT in `localStorage`.

## 11. Seeder

The backend includes `api/seed-admin.js`. Set these server-only values before running it:

```env
MONGODB_URI=...
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-strong-password-at-least-12-characters
```

Run:

```bash
npm run seed:admin
```

The seeder creates or updates one admin account using a bcrypt password hash. It does not expose the password through the API.

## 12. Security requirements for frontend developers

- Never expose MongoDB credentials or JWT secrets in frontend code.
- Always use `credentials: "include"` for admin requests.
- Treat frontend route guards as UX only; the API remains the authority.
- Do not render an external URL without API validation.
- Use `status: "draft"` while editing and publish explicitly.
- Handle `401`, `404`, `409`, and `422` with user-readable UI states.
- Use stable `id`/`slug` keys rather than titles for Vue `v-for` lists.
- Use the `imageUrl` field as a poster/fallback when a video cannot load.

## 13. Planned platform endpoints

The following endpoints are part of the next backend phase. They are documented here before implementation so the admin frontend can be built against a stable contract.

### Public settings

#### `GET /api/site-settings`

Safe public response:

```json
{
  "data": {
    "maintenanceMode": false,
    "maintenanceMessage": "Back shortly — the studio is being updated."
  }
}
```

The response must not include admin identity, database information, environment variables, or internal settings.

### Admin site settings

#### `GET /api/admin/settings/site`

Returns the editable site settings for an authenticated admin.

#### `PATCH /api/admin/settings/site`

Request:

```json
{
  "maintenanceMode": true,
  "maintenanceMessage": "Back shortly — the studio is being updated."
}
```

Response:

```json
{
  "data": {
    "maintenanceMode": true,
    "maintenanceMessage": "Back shortly — the studio is being updated.",
    "updatedAt": "2026-09-22T05:00:00.000Z"
  }
}
```

### Change admin password

#### `POST /api/admin/auth/change-password`

Request:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password-at-least-12-characters",
  "confirmPassword": "new-password-at-least-12-characters"
}
```

Response:

```json
{
  "data": {
    "ok": true,
    "requiresLogin": true
  }
}
```

The server verifies the current password, hashes the new password, revokes existing sessions, and records an audit event. Password values are never returned.

### Audit logs

#### `GET /api/admin/logs`

Example:

```http
GET /api/admin/logs?page=1&limit=25&action=update&resourceType=work&from=2026-09-01T00:00:00.000Z&to=2026-09-30T23:59:59.999Z
```

Response:

```json
{
  "data": [
    {
      "id": "66f000000000000000000200",
      "action": "update",
      "resourceType": "work",
      "resourceSlug": "angels-pizza-app",
      "resourceTitle": "Angel's Pizza Super App",
      "summary": "Updated case study content",
      "actor": { "email": "admin@example.com" },
      "createdAt": "2026-09-22T05:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 25, "total": 1, "pages": 1 }
}
```

### Public analytics ingestion

#### `POST /api/analytics/events`

This endpoint is rate-limited and accepts only allowlisted events.

Request:

```json
{
  "eventType": "page_view",
  "path": "/case-study/angels-pizza-app",
  "resourceType": "work",
  "resourceSlug": "angels-pizza-app",
  "referrerOrigin": "https://www.google.com",
  "anonymousSessionId": "random-client-generated-id",
  "deviceCategory": "mobile"
}
```

Response: `202`

```json
{ "data": { "accepted": true } }
```

The collector must not accept passwords, cookies, full URLs with query strings, arbitrary metadata, or raw IP addresses.

### Admin analytics

#### `GET /api/admin/analytics?period=30d`

Allowed periods: `7d`, `30d`, `90d`.

Response:

```json
{
  "data": {
    "period": "30d",
    "generatedAt": "2026-09-22T05:00:00.000Z",
    "summary": { "visits": 1200, "uniqueVisitors": 820, "pageViews": 1650 },
    "series": [{ "date": "2026-09-22", "visits": 42, "uniqueVisitors": 31 }],
    "referrals": [{ "origin": "google.com", "visits": 310 }],
    "topContent": [{ "type": "work", "slug": "angels-pizza-app", "title": "Angel's Pizza Super App", "views": 240 }],
    "devices": [{ "category": "mobile", "visits": 700 }]
  }
}
```

## 14. IP and geolocation analytics

The frontend calls the geolocation provider directly; the backend does not call or proxy it.

```text
GET https://ip-api.com/json/?fields=status,message,query,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,proxy,hosting,mobile
```

The frontend then submits the result with the first-party analytics request:

```json
{
  "eventType": "page_view",
  "path": "/",
  "resourceType": "page",
  "anonymousSessionId": "session-id",
  "ipAddress": "24.48.0.1",
  "geo": {
    "country": "Canada",
    "countryCode": "CA",
    "regionName": "Quebec",
    "city": "Montreal",
    "lat": 45.6085,
    "lon": -73.5493,
    "timezone": "America/Toronto",
    "isp": "Example ISP",
    "proxy": false,
    "hosting": false,
    "mobile": false
  },
  "deviceCategory": "desktop"
}
```

The server validates the IP and geo fields, stores a salted IP hash for aggregation, and retains the raw IP only for the analytics retention window. Public endpoints never return IP or geo records.

The authenticated analytics response additionally contains:

```json
{
  "locations": [{ "country": "Canada", "countryCode": "CA", "visits": 12, "uniqueVisitors": 8 }],
  "visitors": [{ "ipAddress": "24.48.0.1", "country": "Canada", "city": "Montreal", "isp": "Example ISP", "visits": 4 }],
  "isps": [{ "name": "Example ISP", "visits": 8 }]
}
```

The admin UI masks `ipAddress` before display.

## 15. Backend-owned IP collection update

The browser must not call the geolocation provider. For `POST /api/analytics/events`, send only event context:

```json
{
  "eventType": "page_view",
  "path": "/",
  "resourceType": "page",
  "anonymousSessionId": "session-id",
  "deviceCategory": "desktop"
}
```

The API derives the client IP from the request headers/socket and calls the local `fast-geoip` Node.js library. The frontend does not send `ipAddress` or `geo`; any client-supplied values are ignored/overwritten. Geo lookup failure does not block analytics event storage.
