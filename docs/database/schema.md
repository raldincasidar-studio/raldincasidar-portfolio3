# MongoDB / Mongoose Schema

This schema is the proposed source of truth for the portfolio content API. The `api/` implementation should use these fields and constraints rather than mirroring Vue-specific display props such as `videoSrc` or `className`.

## Shared conventions

- MongoDB ObjectId `_id` is the internal identifier.
- `slug` is the public stable identifier for works and the optional public identifier for labs.
- `status` is one of `draft`, `published`, or `archived`.
- `sortOrder` is a non-negative integer; lower values appear first.
- `createdAt` and `updatedAt` are Mongoose timestamps.
- `publishedAt` is set when status becomes `published`.
- All asset fields are external HTTPS URLs in production.

## Work / case study document

Collection: `works`

```js
{
  _id: ObjectId,
  slug: String,                 // required, unique, lowercase
  title: String,                // required
  description: String,           // required; card summary
  tags: [String],                // e.g. ["Mobile App", "Community"]
  year: String,                  // display value, e.g. "2026" or "2024-2026"
  device: "phone" | "browser", // card mockup
  previewVideoUrl: String,       // external URL
  previewImageUrl: String,       // optional poster/fallback
  status: "draft" | "published" | "archived",
  sortOrder: Number,
  viewCount: Number,
  lastViewedAt: Date,

  caseStudy: {
    clientName: String,
    type: String,
    caseTitle: String,
    caseDescription: String,
    hero: {
      type: "phone" | "browser",
      videoUrl: String,
      imageUrl: String
    },
    story: String,
    contribution: {
      role: String,
      client: String,
      year: String,
      discipline: String,
      scope: [String]
    },
    numbers: [{
      label: String,
      value: String
    }],
    visualIdentity: {
      colorsTitle: String,
      colors: [{ name: String, hex: String }],
      fontsTitle: String,
      fonts: [{ label: String, name: String }]
    },
    solutionsOverview: {
      description: String,
      slides: [{
        videoUrl: String,
        imageUrl: String,
        videoType: "phone" | "web",
        description: String,
        sortOrder: Number
      }]
    }
  },

  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date
}
```

### Work indexes

```js
{ slug: 1 }                 // unique
{ status: 1, sortOrder: 1 }
{ status: 1, updatedAt: -1 }
```

## App Lab document

Collection: `labs`

```js
{
  _id: ObjectId,
  slug: String,                 // required, unique
  title: String,                // required
  description: String,           // required
  category: String,              // display string, e.g. "Mobile App, Pizza"
  categories: [String],
  device: "phone" | "browser",
  videoUrl: String,              // external URL
  imageUrl: String,              // optional poster/fallback
  externalUrl: String,           // optional app/demo link
  status: "draft" | "published" | "archived",
  sortOrder: Number,
  viewCount: Number,
  lastViewedAt: Date,
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date
}
```

### Lab indexes

```js
{ slug: 1 }                 // unique
{ status: 1, sortOrder: 1 }
{ status: 1, updatedAt: -1 }
```

## Admin user document

Collection: `admins`

```js
{
  _id: ObjectId,
  email: String,                 // required, unique, lowercase
  passwordHash: String,          // bcrypt/argon2 hash only
  role: "admin",
  active: Boolean,
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

The initial admin should be provisioned through an environment-backed seed/setup command. No public registration endpoint should exist.

## Optional audit event document

Collection: `auditEvents`

```js
{
  _id: ObjectId,
  actorId: ObjectId,
  action: "create" | "update" | "publish" | "archive" | "delete" | "login",
  resourceType: "work" | "lab" | "admin",
  resourceId: ObjectId,
  metadata: Mixed,
  createdAt: Date
}
```

This is recommended for the admin dashboard's activity feed, but it can be introduced after the core CRUD paths are working.

## API serialization mapping

The frontend should receive display-friendly fields without exposing internal model details:

- `previewVideoUrl` → `videoSrc` for existing `WorkCard`.
- `videoUrl` → `videoSrc` for existing `LabCard`.
- `caseStudy.hero.videoUrl` → the current case-study hero `src`.
- `caseStudy.solutionsOverview.slides[*].videoUrl` → `video_url` only inside a compatibility adapter, or preferably `videoUrl` after the case-study view is normalized.
- `tags` should be joined for the current card (`tags.join(', ')`) until the component accepts arrays.

The preferred long-term approach is to update components to consume the API shape directly and keep compatibility mapping in one frontend adapter, not in every view.

## Site settings document

Collection: `siteSettings`

There is one active document, identified by a stable key such as `key: "global"`.

```js
{
  _id: ObjectId,
  key: "global",                 // required, unique
  maintenanceMode: Boolean,
  maintenanceMessage: String,
  updatedBy: ObjectId,            // ref Admin
  createdAt: Date,
  updatedAt: Date
}
```

Only `maintenanceMode` and `maintenanceMessage` are exposed by the public settings endpoint. Admin identity and internal fields remain server-only.

## Expanded admin document

Add session/security metadata to `admins`:

```js
{
  ...,
  passwordChangedAt: Date,
  sessionVersion: Number,         // increment to revoke existing JWTs
  lastLoginAt: Date,
  failedLoginCount: Number,
  lockedUntil: Date
}
```

JWTs should include the session version or a revocation timestamp. `change-password` increments `sessionVersion`, causing previously issued tokens to fail validation.

## Audit event document

Collection: `auditEvents`

```js
{
  _id: ObjectId,
  actorId: ObjectId,              // nullable for anonymous/system events
  action: String,                 // login, update, publish, maintenance_on, ...
  resourceType: String,           // work, lab, settings, admin, analytics
  resourceId: ObjectId,
  resourceSlug: String,
  resourceTitle: String,
  summary: String,                // safe human-readable summary
  metadata: {                     // allowlisted, redacted values only
    changedFields: [String],
    statusFrom: String,
    statusTo: String,
    requestId: String
  },
  ipHash: String,                 // optional rotating-salt hash; never raw IP
  userAgentFamily: String,        // optional coarse value, not full UA required
  createdAt: Date
}
```

Recommended indexes:

```js
{ createdAt: -1 }
{ action: 1, createdAt: -1 }
{ resourceType: 1, createdAt: -1 }
{ actorId: 1, createdAt: -1 }
```

Audit events are append-only. Never persist passwords, cookies, authorization headers, full request bodies, or arbitrary client metadata.

## Analytics event document

Collection: `analyticsEvents`

```js
{
  _id: ObjectId,
  eventType: "page_view" | "case_study_view" | "lab_view",
  path: String,                   // normalized pathname only
  resourceType: "page" | "work" | "lab",
  resourceSlug: String,
  referrerOrigin: String,         // origin only, no query string
  anonymousSessionId: String,     // random client ID, no account identity
  deviceCategory: "mobile" | "tablet" | "desktop" | "unknown",
  occurredAt: Date,
  expiresAt: Date                 // TTL retention boundary
}
```

Recommended indexes:

```js
{ occurredAt: -1, eventType: 1 }
{ resourceType: 1, resourceSlug: 1, occurredAt: -1 }
{ referrerOrigin: 1, occurredAt: -1 }
{ expiresAt: 1 }                  // TTL index
```

The API must normalize and allowlist all values before insert. Set a documented retention period, for example 90 days, and avoid collecting full IP addresses or personally identifying data.

## Analytics response view models

The database event shape should not be returned directly to the dashboard. Aggregate into:

```js
{
  period: "30d",
  generatedAt: Date,
  summary: {
    visits: Number,
    uniqueVisitors: Number,
    pageViews: Number
  },
  series: [{ date: "2026-09-22", visits: Number, uniqueVisitors: Number }],
  referrals: [{ origin: String, visits: Number }],
  topContent: [{ type: "work", slug: String, title: String, views: Number }],
  devices: [{ category: String, visits: Number }]
}
```

## Visitor IP and geolocation fields

`analyticsEvents` now contains:

```js
{
  ipAddress: String,              // select:false; short retention, admin-only
  ipHash: String,                 // salted SHA-256, used for unique visitor grouping
  geo: {
    continent: String,
    continentCode: String,
    country: String,
    countryCode: String,
    region: String,
    regionName: String,
    city: String,
    district: String,
    zip: String,
    lat: Number,
    lon: Number,
    timezone: String,
    isp: String,
    org: String,
    as: String,
    proxy: Boolean,
    hosting: Boolean,
    mobile: Boolean
  }
}
```

The geolocation provider is called by the browser only. The API validates and stores the returned values but does not make a provider request. `ipAddress` is never returned by public APIs and dashboard output masks it before display. Use `ANALYTICS_HASH_SALT` as a server-only rotating salt.
