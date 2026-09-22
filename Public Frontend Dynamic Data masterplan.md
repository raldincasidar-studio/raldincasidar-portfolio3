# Public Frontend Dynamic Data Masterplan

## 1. Goal

Convert the public Vue portfolio from hard-coded content to API-backed content while preserving the current visual experience:

- Homepage sections continue to look like the existing design.
- Selected Works cards are loaded from `GET /api/works`.
- Apps Lab cards are loaded from `GET /api/labs`.
- Case-study pages are loaded from `GET /api/works/:slug`.
- Images and videos remain external URLs stored in MongoDB.
- The existing preloader waits for API data and the resulting media assets before revealing the page.
- Maintenance mode is respected before public content renders.
- API failures produce useful UI states instead of blank sections or raw errors.

This document is the implementation contract for the public frontend migration.

## 2. Current static data locations

The current public content is embedded in:

- `src/views/HomeView.vue` — hard-coded `works` and `labs` arrays.
- `src/views/CaseStudyView.vue` — inline `pageData` mock object and simulated delay.
- `src/components/sections/WorkCard.vue` — expects `videoSrc`, string `tags`, `year`, `device`, and an `href`.
- `src/components/sections/LabCard.vue` — expects `videoSrc`, `category`, `title`, and `description`.
- `src/components/layout/Preloader.vue` — scans page media and waits for `preloader:data-ready`.

The static arrays and simulated case-study request must be removed after the API integration is verified.

## 3. API contract

### Homepage

```http
GET /api/works
GET /api/labs
```

Only `status: "published"` records are returned by the public API.

### Case-study page

```http
GET /api/works/:slug
```

The route currently uses `/case-study/:id`. Keep the URL compatible by treating `route.params.id` as the work slug. New links should use `work.slug`, not a MongoDB ID.

### Public site settings

```http
GET /api/site-settings
```

Returns:

```json
{
  "data": {
    "maintenanceMode": false,
    "maintenanceMessage": "Back shortly — the studio is being updated."
  }
}
```

### Analytics

Public route navigation can send best-effort events:

```http
POST /api/analytics/events
```

Analytics failures must never block rendering, routing, or the preloader.

## 4. Data adapter layer

Do not spread API-to-component field mapping throughout views. Create one adapter module:

```text
src/api/
├── client.js
├── admin.js
├── publicContent.js
└── adapters.js
```

Recommended public API module:

```js
import { apiFetch } from './client.js'

export const publicContentApi = {
  getHomeContent: async () => {
    const [{ data: works }, { data: labs }] = await Promise.all([
      apiFetch('/works'),
      apiFetch('/labs'),
    ])
    return { works, labs }
  },
  getWork: async (slug) => (await apiFetch(`/works/${encodeURIComponent(slug)}`)).data,
  getSettings: async () => (await apiFetch('/site-settings')).data,
}
```

### Work card adapter

API work:

```js
{
  slug,
  title,
  description,
  tags: ['Mobile App', 'Community'],
  year,
  device,
  previewVideoUrl,
  previewImageUrl
}
```

Public card model:

```js
{
  id: slug,
  title,
  description,
  tags: tags.join(', '),
  year,
  device,
  videoSrc: previewVideoUrl,
  imageSrc: previewImageUrl,
  href: `/case-study/${slug}`
}
```

Update `WorkCard.vue` to support:

- `imageSrc` as a video poster/fallback;
- a router link instead of a dead anchor;
- stable `slug`/`id` navigation;
- missing media fallback;
- accessible title and preview labels.

### Lab card adapter

API lab:

```js
{
  slug,
  title,
  description,
  category,
  categories,
  device,
  videoUrl,
  imageUrl,
  externalUrl
}
```

Public card model:

```js
{
  id: slug,
  title,
  description,
  category: category || categories.join(', '),
  device,
  videoSrc: videoUrl,
  imageSrc: imageUrl,
  externalUrl
}
```

Update `LabCard.vue` to support an image fallback and optional external link. Keep the existing dark radial design.

## 5. Homepage migration

### 5.1 State model

Replace hard-coded refs with:

```js
const works = ref([])
const labs = ref([])
const isLoading = ref(true)
const contentError = ref(null)
```

Use a single composable:

```text
src/composables/usePublicContent.js
```

It should expose:

- `works`;
- `labs`;
- `isLoading`;
- `error`;
- `loadHomeContent`;
- `reload`;
- cached data/promise for route reuse.

### 5.2 Loading flow

1. Router checks public site settings for maintenance mode.
2. Homepage requests works and labs concurrently.
3. API response is normalized through the adapter.
4. Vue renders the sections and their media elements.
5. `nextTick()` waits for the DOM.
6. Dispatch `preloader:data-ready`.
7. Existing `Preloader.vue` scans `<img>` and `<video>` elements.
8. The preloader exits after data and assets are ready, with its existing safety timeout.

Do not use the current fixed `setTimeout(1200)` as a substitute for API readiness.

### 5.3 Section states

Each homepage section should support:

- loading skeleton;
- populated grid;
- empty published collection;
- retryable error state;
- media-level fallback.

A failure loading Labs must not erase or block Selected Works. Prefer independent request states if the combined request cannot partially resolve.

### 5.4 Empty states

Selected Works empty state:

```text
Selected works
New work is being prepared. Check back soon.
```

Apps Lab empty state:

```text
Apps I shipped, designed & built.
New experiments are on the way.
```

Do not expose database errors, stack traces, or admin details to public visitors.

## 6. Case-study migration

### 6.1 Route behavior

Keep the current route:

```text
/case-study/:id
```

Use `route.params.id` as the slug. When creating new public links, generate them from `work.slug`.

Future optional alias:

```text
/case-study/:slug
```

Do not break existing shared URLs during the migration.

### 6.2 Request lifecycle

Replace the mock `fetchPageData()` function and artificial delay with:

```js
async function fetchPageData() {
  isLoading.value = true
  try {
    const work = await publicContentApi.getWork(route.params.id)
    pageData.value = normalizeCaseStudy(work)
  } catch (error) {
    requestError.value = normalizePublicError(error)
  } finally {
    isLoading.value = false
    await nextTick()
    window.dispatchEvent(new Event('preloader:data-ready'))
  }
}
```

The readiness event must be dispatched on both success and failure so the preloader cannot remain locked when the API is unavailable.

### 6.3 Case-study adapter

API model:

```js
{
  title,
  year,
  caseStudy: {
    clientName,
    type,
    caseTitle,
    caseDescription,
    hero,
    story,
    contribution,
    numbers,
    visualIdentity,
    solutionsOverview
  }
}
```

Presentation model:

```js
{
  client_name: caseStudy.clientName,
  year: caseStudy.year || work.year,
  type: caseStudy.type,
  case_title: caseStudy.caseTitle || work.title,
  case_description: caseStudy.caseDescription || work.description,
  hero_video: {
    type: caseStudy.hero?.type || work.device,
    src: caseStudy.hero?.videoUrl || work.previewVideoUrl,
    poster: caseStudy.hero?.imageUrl || work.previewImageUrl
  },
  the_story: caseStudy.story,
  contribution: caseStudy.contribution,
  numbers: caseStudy.numbers || [],
  visual_identity: {
    colors_title: caseStudy.visualIdentity?.colorsTitle,
    colors_list: caseStudy.visualIdentity?.colors || [],
    fonts_title: caseStudy.visualIdentity?.fontsTitle,
    fonts_list: caseStudy.visualIdentity?.fonts || []
  },
  solutions_overview: {
    description: caseStudy.solutionsOverview?.description,
    slides: (caseStudy.solutionsOverview?.slides || []).sort((a, b) => a.sortOrder - b.sortOrder).map((slide) => ({
      video_url: slide.videoUrl,
      image_url: slide.imageUrl,
      video_type: slide.videoType,
      description: slide.description
    }))
  }
}
```

Prefer normalizing to camelCase and updating the view template over preserving legacy snake_case names, but use a single adapter during the transition to reduce risk.

### 6.4 Case-study states

Loading:

- retain the existing skeleton blocks;
- do not show placeholder project content as if it were real.

Not found:

- status `404`;
- show `Case study not found`;
- provide `Back to selected works` link;
- set a suitable page title.

API/database unavailable:

- show `This case study is temporarily unavailable.`;
- provide `Try again`;
- provide a home/works link;
- never show raw Mongoose or MongoDB error text.

Partial content:

- render available sections;
- hide empty optional sections rather than showing blank headings;
- hero falls back from video to image, then to branded placeholder.

## 7. External media handling

All media remains external and is loaded from API URLs.

### Video rules

- `autoplay muted loop playsinline` for previews;
- provide `poster` when `imageUrl` exists;
- listen for `error` and show image fallback;
- do not make a failed video block the entire preloader;
- preserve the current per-video timeout.

### Image rules

- validate API URL before binding where practical;
- use meaningful alt text for content images;
- use empty alt for purely decorative preview media;
- apply `loading="lazy"` below the fold;
- do not lazy-load the hero asset needed by the preloader.

### URL safety

The API validates URLs. The frontend should still normalize Markdown-pasted URLs and reject malformed values in fallback UI. Never render arbitrary HTML from API content.

## 8. Caching and prefetching

Implement a small in-memory cache in `usePublicContent`:

```js
{
  home: { data, loadedAt, promise },
  worksBySlug: new Map()
}
```

Rules:

- deduplicate concurrent homepage requests;
- use a short TTL such as 60 seconds for public content;
- reuse home work data when opening a case study, then fetch full detail;
- prefetch case-study detail on work-card pointer/focus intent;
- invalidate cache after admin changes only when the same browser session is used;
- never persist public drafts in localStorage.

## 9. Maintenance mode integration

Use a router-level guard for public routes:

1. Fetch `/api/site-settings` with a 30-second cache.
2. If enabled, redirect to `/maintenance`.
3. Permit `/admin`, `/admin/login`, `/maintenance`.
4. Fail open if settings cannot be loaded.
5. Avoid redirect loops.
6. Keep the maintenance message from the API when available.

The homepage and case-study view should not independently implement maintenance redirects.

## 10. Preloader integration

Refactor readiness to avoid race conditions:

- The route/view owns API readiness.
- The preloader owns DOM media/font readiness.
- `preloader:data-ready` is dispatched after success or error state is rendered.
- Dynamic videos/images are queried only after `nextTick()`.
- A failed API request still releases the loader.
- The homepage does not dispatch readiness from an arbitrary timer.
- Case-study navigation should not replay the full splash preloader unnecessarily; use a route transition or local skeleton after the first public load.

Recommended event detail, if needed later:

```js
window.dispatchEvent(new CustomEvent('preloader:data-ready', {
  detail: { route: 'home', status: 'success' }
}))
```

## 11. Error normalization

Create `src/utils/publicErrors.js`:

```js
export function normalizePublicError(error) {
  if (error.status === 404) return { title: 'Not found', message: 'That project is no longer available.' }
  if (error.status >= 500) return { title: 'Temporarily unavailable', message: 'We could not load this content right now.' }
  return { title: 'Something went wrong', message: 'Please try again.' }
}
```

Public UI must never display:

- MongoDB messages;
- Mongoose cast errors;
- stack traces;
- JWT/auth details;
- environment variables;
- raw request URLs.

## 12. Homepage component updates

### `WorksSection.vue`

- receive normalized API data;
- use `slug` for navigation and keys;
- render skeleton/error/empty states;
- do not use a parent click handler with a dead anchor;
- preserve current grid spacing and card design.

### `WorkCard.vue`

- use `RouterLink` or a button with router navigation;
- accept `imageSrc` poster fallback;
- show a graceful media placeholder;
- retain phone/browser layout.

### `LabsSection.vue`

- receive API data and independent loading state;
- preserve dark radial background;
- render empty/error states inside the section.

### `LabCard.vue`

- accept `imageSrc` fallback;
- use `slug`/`id` key;
- optionally link to `externalUrl` with `target="_blank"` and `rel="noopener noreferrer"`.

## 13. Analytics integration

Track only after a successful route navigation:

- `/` → `page_view`;
- `/case-study/:slug` → `case_study_view`;
- optional lab detail routes → `lab_view`.

Use an anonymous session identifier stored locally. Send:

- normalized path;
- event type;
- resource type/slug;
- referrer origin only;
- coarse device category.

Analytics requests must be fire-and-forget and must not affect content loading.

## 14. SEO and browser metadata

For homepage:

- preserve existing title and description;
- optionally update structured data with published work count only if stable.

For case studies:

- set `document.title` from API title/client;
- update description from `caseDescription`;
- add canonical URL based on slug;
- update Open Graph title/image/video fallback when practical;
- avoid indexing drafts because public API never returns them.

## 15. Test plan

### API integration

- published works appear on homepage;
- drafts/archived works do not appear publicly;
- published labs appear correctly;
- a work slug loads the correct case study;
- unknown slug renders 404 state;
- malformed response does not crash the view;
- API 500 produces friendly error state.

### Loading/preloader

- slow works request;
- slow labs request;
- failed works request;
- failed labs request;
- failed video;
- failed image;
- no media;
- preloader always exits.

### Navigation/cache

- home → case study;
- direct case-study refresh;
- case-study → home;
- repeated route navigation uses cache without stale drafts;
- maintenance redirect does not loop;
- admin routes are never blocked by public maintenance mode.

### Responsive visual QA

- 320px mobile;
- 390px mobile;
- tablet;
- 1024px desktop;
- 1440px desktop;
- long titles/descriptions;
- empty collections;
- missing posters and media errors.

## 16. Implementation sequence

1. Create public API module and normalization adapters.
2. Create `usePublicContent` composable/cache.
3. Replace homepage hard-coded arrays with API requests.
4. Update public cards for normalized fields and media fallbacks.
5. Replace case-study mock fetch with slug-based API fetch.
6. Add not-found and API error states.
7. Refactor preloader readiness to wait for API-rendered content.
8. Add maintenance guard and API settings cache.
9. Add best-effort analytics tracking.
10. Add SEO metadata updates.
11. Test slow/error/empty/media-failure states.
12. Run production build and verify direct Vercel route refreshes.

## 17. Definition of done

The public migration is complete when:

- no homepage work/lab content is hard-coded in the view;
- no case-study page uses simulated mock data or artificial fetch delays;
- homepage and case-study content are fetched from the real API;
- only published records render publicly;
- API content is normalized in one adapter layer;
- media fallback behavior is reliable;
- preloader exits on both success and failure;
- maintenance mode works from the API;
- public errors are readable and never expose backend internals;
- analytics is best-effort and non-blocking;
- direct refreshes work on `/` and `/case-study/:slug`;
- `npm run build` passes with the dynamic implementation.
