# Admin Frontend Implementation Masterplan

## 1. Product direction

Build a desktop-optimized, mobile-first admin workspace for managing Raldin Casidar's portfolio content. The dashboard should feel like the existing portfolio: bold typography, large media previews, rounded controls, deliberate whitespace, bright cyan brand accents, dark editorial surfaces, and small moments of motion.

The admin is an operational tool, not a separate visual identity. It should feel like the same studio viewed from backstage:

- **Public site:** expressive, spacious, media-forward, cyan-to-sky gradients, dark Apps Lab section.
- **Admin:** focused, information-dense, dark navigation rail, white content canvas, cyan active states, the same Bricolage/Geist type system, and the same phone/browser mockups used by the public cards.

Implementation remains inside the existing Vue 3 + Vue Router + Tailwind CSS v4 application. All admin screens should use reusable Vue components and the existing API client contract in `API_Master_Documentation.md`.

## 2. Design principles

### 2.1 Visual principles

1. **Content first:** media and editable content remain the focus; chrome stays quiet.
2. **Studio system:** use cyan as a functional accent, not a flood of color.
3. **Editorial hierarchy:** Bricolage Grotesque for headings and Geist for body/control text.
4. **Soft geometry:** rounded-xl/2xl cards, pill actions, 1px borders, restrained shadows.
5. **Preview parity:** an editor should see the same work/lab mockup that visitors see.
6. **Progressive disclosure:** desktop can show secondary metadata panels; mobile collapses them into drawers, accordions, or a floating inspector card.
7. **Motion with purpose:** use short fades, blur reveals, and slide transitions; never animate around data-entry fields in a distracting way.
8. **Accessible by default:** keyboard focus, labels, contrast, reduced-motion support, and non-color status indicators are required.

### 2.2 Existing visual tokens to reuse

```css
--color-blue: #17a6e3;
--font-bricolage: "Bricolage Grotesque";
--font-geist: "Geist";
```

Additional admin palette:

| Token | Value | Use |
|---|---|---|
| `admin-ink` | `#07090D` | Sidebar, dark hero surfaces, primary dark text |
| `admin-panel` | `#0E1722` | Sidebar cards and dark inspector surfaces |
| `admin-cyan` | `#17A6E3` | Brand accent, active navigation, primary actions |
| `admin-sky` | `#BBE6F6` | Highlight backgrounds and selected states |
| `admin-paper` | `#F7F8FA` | App shell background |
| `admin-line` | `#E5E7EB` | Borders and dividers |
| `admin-muted` | `#667085` | Secondary text |
| `success` | `#16A36A` | Published/success states |
| `warning` | `#D98A00` | Draft/unsaved states |
| `danger` | `#D64545` | Archive/delete/errors |

Use existing `#17A6E3`, `#000000`, `#132132`, white/white opacity values, and the existing gradients wherever possible. Add admin-specific tokens in `src/assets/styles/main.css` rather than scattering hex values across templates.

## 3. Application shell

### 3.1 Route layout

The admin should use its own layout rather than the public `DefaultLayout`:

```text
/admin/login
/admin
/admin/works
/admin/works/new
/admin/works/:id/edit
/admin/labs
/admin/labs/new
/admin/labs/:id/edit
/admin/settings
```

`AdminLayout.vue` provides:

- persistent desktop sidebar;
- mobile top bar and slide-over navigation;
- top utility bar;
- page title/breadcrumb region;
- global toast host;
- unsaved-change navigation guard;
- authenticated router-view.

The public `AppNavbar`, public footer, and full splash preloader should not render inside the admin. Replace them with a compact admin loading bar and route transition. The public preloader remains unchanged for public routes.

### 3.2 Desktop shell

At `lg` and above:

- fixed left sidebar: `width: 264px`;
- full-height dark surface with subtle cyan radial glow near the top;
- content area fills the rest of the viewport;
- top utility bar inside content: `height: 72px`;
- content max width around `1440px`, with `24px–40px` gutters;
- sidebar remains visible while content scrolls;
- forms use a two-column editor at wide widths: main editor `minmax(0, 1fr)` plus a `320px` inspector.

At tablet/mobile:

- sidebar becomes a right/left slide-over with a dark overlay;
- top bar includes hamburger, page title, save state, and profile menu;
- content uses `16px` gutters and one column;
- inspector becomes a bottom sheet or floating card;
- all tables become cards or horizontal-scroll regions with important actions pinned.

### 3.3 Sidebar

#### Brand block

- Logo from `/assets/img/logo-white.svg`.
- Text: `Raldin.` and small `STUDIO ADMIN` eyebrow.
- Sidebar collapse button on desktop; collapsed state is optional after the first implementation.

#### Navigation groups

**Workspace**

- Dashboard
- Case studies
- Apps Lab

**System**

- Settings

Bottom area:

- API/database status dot;
- `View public site` external/action link;
- user avatar/initials;
- Log out.

#### Sidebar states

- Default: white/70 text, transparent item background.
- Hover: white text, `bg-white/10`.
- Active: `bg-[#17A6E3]`, white text, subtle shadow, `rounded-xl`.
- Draft badge: amber dot and count.
- Mobile: close button with `aria-label="Close navigation"`.

Each item must be a real router link so active state follows the current route. The sidebar must not use full-page reloads.

### 3.4 Top utility bar

Left:

- breadcrumb: `Admin / Case studies / Angel's Pizza`;
- page title on mobile if breadcrumb is hidden.

Right:

- API health indicator: `Connected`, `Unavailable`, or `Checking`;
- save indicator: `Saved`, `Unsaved changes`, `Saving…`;
- notification/log shortcut;
- avatar menu with Settings and Log out.

The health indicator is informational and must not expose MongoDB details or secrets.

## 4. Shared component library

Create admin components under `src/components/admin/`:

```text
admin/
├── AdminLayout.vue
├── AdminSidebar.vue
├── AdminTopbar.vue
├── AdminBreadcrumbs.vue
├── AdminPageHeader.vue
├── AdminStatCard.vue
├── AdminStatusBadge.vue
├── AdminToastHost.vue
├── AdminModal.vue
├── AdminConfirmDialog.vue
├── AdminEmptyState.vue
├── AdminErrorState.vue
├── AdminSkeleton.vue
├── AdminSearchInput.vue
├── AdminFilterBar.vue
├── AdminPagination.vue
├── MediaUrlField.vue
├── MediaPreview.vue
├── MockupPreview.vue
├── SortableList.vue
├── FloatingInspector.vue
├── FieldGroup.vue
└── editors/
    ├── WorkEditor.vue
    ├── WorkCardPreview.vue
    ├── CaseStudyEditor.vue
    ├── LabEditor.vue
    └── SolutionSlidesEditor.vue
```

### 4.1 Buttons

Primary button:

- cyan background `#17A6E3`;
- white text;
- `rounded-full` or `rounded-xl` depending on context;
- hover: slightly brighter cyan and `translateY(-1px)`;
- pressed: no scale overshoot;
- disabled: 50% opacity and no pointer interaction.

Secondary button:

- white/dark-paper background;
- border `#D0D5DD`;
- dark text;
- hover border cyan.

Dark button:

- `bg-[#0E1722]`, white text;
- use for preview or destructive-adjacent non-primary actions.

Danger button:

- subdued red border/text by default;
- filled red only inside confirmed destructive dialogs.

Icon buttons:

- minimum 40x40px hit target;
- tooltip on desktop;
- visible label or `aria-label` always required.

### 4.2 Status badges

- Published: green dot + `Published`.
- Draft: amber dot + `Draft`.
- Archived: gray/red dot + `Archived`.
- Unsaved: amber outline + `Unsaved changes`.

Never rely on color alone; include text and, where practical, a dot/icon.

### 4.3 Toasts

Toast host is fixed at the top-right on desktop and bottom-center on mobile.

Types:

- success: `Saved successfully`;
- info: `Preview updated`;
- warning: `You have unsaved changes`;
- error: API validation or connection error with a retry action.

Toasts auto-dismiss after 4 seconds, except errors and unsaved-change warnings. They include a close button and live-region semantics.

### 4.4 Loading and empty states

- Initial page load: skeleton header, skeleton stat cards, skeleton grid.
- Button action: spinner inside the button and preserve its width.
- Empty collection: dark/cyan illustration treatment and `Create your first case study` CTA.
- API error: human-readable message, retry button, and no blank canvas.
- Offline/connection failure: preserve unsaved local form state where possible.

## 5. Dashboard page

Route: `/admin`

### 5.1 Header

Title: `Good morning, Raldin.`  
Subtitle: `A clear view of what is live, what is changing, and what needs attention.`

Actions:

- `View public site`;
- `New case study`;
- `New app lab`.

### 5.2 Overview stat cards

Responsive grid: 1 column mobile, 2 tablet, 4 desktop.

Cards:

1. Published case studies.
2. Published Apps Lab entries.
3. Total content items.
4. Drafts needing review.
5. Total case-study views.
6. Total lab views.

Each card includes:

- label in uppercase tracking;
- large Bricolage number;
- delta or period label where available;
- tiny sparkline when analytics data exists;
- cyan top rule or subtle radial gradient;
- link to the relevant management page.

The current API only provides content counts and recent works. Traffic, referrals, view trends, and sparkline numbers require a later analytics endpoint or an external privacy-compliant provider. The dashboard must show `Analytics not connected` rather than inventing values until those fields exist.

### 5.3 Analytics sections

Desktop layout:

- wide `Traffic overview` chart card;
- narrow `Top referrals` card;
- below: `Most viewed work` and `Most viewed Apps Lab` lists.

Mobile layout: stack cards, horizontal-scroll chart if needed.

Planned data contract:

```json
{
  "traffic": {
    "period": "30d",
    "visits": 0,
    "uniqueVisitors": 0,
    "series": []
  },
  "referrals": [],
  "topContent": [],
  "contentCounts": {}
}
```

Controls:

- period segmented control: `7 days`, `30 days`, `90 days`;
- refresh icon button;
- date range label;
- tooltip on chart points;
- accessible table fallback for chart data.

### 5.4 Recent activity

List recent creates, edits, publishes, and archives. Each row:

- action icon;
- action label;
- content title;
- timestamp;
- status badge;
- link to edit.

Until the audit event endpoint exists, derive this from recent `updatedAt` records and label it `Recent content updates` rather than pretending it is an audit log.

## 6. Case Studies page

Route: `/admin/works`

### 6.1 Page header

Title: `Case studies`  
Description: `Manage the work that appears in Selected works and its detailed project pages.`

Actions:

- `New case study` primary button;
- search field;
- status filter;
- sort selector: manual order, newest updated, title;
- refresh button.

### 6.2 Responsive grid

Use a responsive grid:

- mobile: 1 column;
- tablet: 2 columns;
- desktop: 2 columns at normal width, 3 columns if the sidebar is collapsed or viewport is wide.

Each card copies the public `WorkCard` visual contract:

- gradient rounded preview container;
- phone mockup for `device: phone`;
- browser mockup for `device: browser`;
- external video URL autoplay/muted/loop/playsinline where allowed;
- image poster fallback;
- hover overlay with `Edit case study` CTA;
- title, description, tags, year;
- status badge and overflow menu;
- drag handle or order number for manual sorting.

Admin-only card actions:

- Edit;
- Preview public page;
- Duplicate;
- Publish / unpublish;
- Archive.

Cards must use `id` or `slug` as Vue keys, never title.

### 6.3 Card interaction

Clicking the main card or `Edit case study` navigates to `/admin/works/:id/edit`. `Preview public page` opens the public route in a new tab only after a published record exists; drafts open the admin preview mode.

Use a three-dot menu for secondary actions to keep the preview visually clean.

## 7. Case study editor

Routes:

- `/admin/works/new`
- `/admin/works/:id/edit`

The editor should look like the public case-study page while adding a persistent editing layer. Use the existing `CaseStudyView.vue` structure as the visual base, but extract presentational sections so each dynamic field can bind to an editor model.

### 7.1 Editor layout

Desktop:

```text
┌─────────────────────────────────────────────────────────┐
│ Admin topbar: breadcrumb | save state | preview | save  │
├─────────────────────────────────────┬───────────────────┤
│ Live case-study canvas              │ Floating inspector│
│ editable title/media/text           │ metadata + status │
│                                     │                 │
│ content sections                    │                 │
└─────────────────────────────────────┴───────────────────┘
```

Mobile:

- full-width preview;
- sticky bottom action bar: `Save`, `Preview`, `More`;
- floating inspector card auto-shrinks to a compact pill showing status/save state;
- tapping the pill opens a bottom sheet with slug, year, device, status, sort order, and publish controls.

### 7.2 Instant preview behavior

Use a local reactive draft object:

```js
const draft = reactive(structuredClone(serverData))
```

Bind form controls to `draft`, and pass `draft` to the same preview components used by the public view. Changes should render immediately without an API request. Save sends only the normalized draft to `PATCH`.

Do not mutate the cached server object directly. Track:

- `isDirty` by comparing normalized draft to the last saved snapshot;
- `isSaving`;
- `lastSavedAt`;
- `saveError`.

Autosave is not required for the first release. If added later, debounce it and clearly distinguish autosaved drafts from published content.

### 7.3 Editable case-study sections

#### Hero metadata

Editable fields:

- client name;
- year;
- type;
- case title;
- case description;
- hero device type;
- hero video URL;
- hero image URL.

Hero editor includes:

- URL input with HTTPS hint;
- media preview;
- `Replace video URL` and `Use image fallback` controls;
- invalid media warning;
- device toggle: phone/browser.

#### Story

- large textarea/editor field;
- character count;
- preview updates as the user types;
- preserve paragraph breaks.

#### Contribution

Editable fields:

- role;
- client;
- year;
- discipline;
- scope tag list.

Scope control:

- text input + `Add` button;
- removable pill tags;
- Enter key adds a tag;
- duplicate tags rejected locally.

#### Numbers/statistics

Repeatable rows:

- label;
- value;
- drag handle;
- duplicate/remove actions.

Limit visual preview to the same number of stat blocks the public page supports, while allowing additional rows only if the public component is updated to display them.

#### Visual identity

- colors title;
- repeatable colors with name and hex input;
- native color picker enhancement;
- font title;
- repeatable font label/name rows.

Show live swatches and warn if the hex value is invalid.

#### Solutions overview

- overview description;
- repeatable solution slide editor;
- each slide has video URL, image URL, device/type, description, and order;
- drag-and-drop reordering on desktop;
- move up/down buttons as keyboard/mobile fallback;
- slide preview uses the same case-study carousel card.

### 7.4 Floating inspector

The inspector is a dark card with `rounded-2xl`, subtle shadow, and cyan edge accent.

Fields:

- slug;
- status;
- year;
- device;
- sort order;
- preview URL health;
- last saved timestamp;
- record ID (read-only, collapsed by default).

Actions:

- Save draft;
- Publish;
- Unpublish to draft;
- Archive;
- Delete/archive confirmation.

Slug behavior:

- auto-suggest from title only on new records;
- once saved, do not overwrite automatically;
- validate before save;
- warn that changing a slug can break shared public URLs.

## 8. Apps Lab page and editor

Routes:

- `/admin/labs`
- `/admin/labs/new`
- `/admin/labs/:id/edit`

### 8.1 Apps Lab grid

Use the public `LabCard` visual language:

- dark radial background;
- centered phone/browser mockup;
- external video/image preview;
- title, description, category;
- status and order controls.

Admin controls match case studies:

- search;
- status filter;
- sort order;
- edit;
- preview;
- publish;
- archive;
- duplicate.

### 8.2 Apps Lab editor fields

- slug;
- title;
- description;
- category display string;
- category tag list;
- device;
- video URL;
- image/poster URL;
- external app/demo URL;
- status;
- sort order.

The preview updates instantly and uses the same `LabCard` component, with an editor-only badge when viewing a draft.

## 9. Settings page

Route: `/admin/settings`

Use tabs or stacked cards on mobile:

1. Site settings
2. Security
3. Logs

### 9.1 Maintenance mode

Card:

- title: `Maintenance mode`;
- explanatory text;
- large toggle;
- current state badge;
- optional public message field;
- `Preview maintenance page` button;
- `Save settings` button.

Behavior:

- when enabled, public route navigation redirects to `/maintenance`;
- `/admin`, `/admin/*`, and `/maintenance` remain accessible;
- backend should be the source of truth so the setting works across Vercel instances;
- frontend can cache the setting briefly but must refresh it on app bootstrap;
- show a confirmation dialog before enabling maintenance mode;
- show a prominent amber banner across the admin while enabled.

Required future API contract:

```http
GET /api/site-settings
PATCH /api/admin/settings/site
```

```json
{
  "maintenanceMode": true,
  "maintenanceMessage": "Back shortly — the studio is being updated."
}
```

Do not implement maintenance mode using only localStorage.

### 9.2 Change password

Fields:

- current password;
- new password;
- confirm new password;
- show/hide controls;
- password strength hint;
- submit button.

Client validation:

- minimum 12 characters;
- new and confirmation must match;
- submit disabled while invalid/saving.

Required future endpoint:

```http
POST /api/admin/auth/change-password
```

Passwords never appear in logs, toasts, analytics, or frontend state after submission.

### 9.3 Logs

Card/table:

- timestamp;
- actor;
- action;
- resource type;
- resource title/id;
- result;
- filter by action and date;
- pagination;
- mobile card fallback.

Use the optional `auditEvents` collection described in `docs/database/schema.md`. Until that endpoint exists, display a clear `Audit logs are not connected yet` state rather than presenting content updates as security logs.

Required future endpoint:

```http
GET /api/admin/logs?action=update&from=...&to=...
```

## 10. Router guards and session handling

### 10.1 Public/admin route metadata

```js
{
  path: '/admin',
  component: AdminLayout,
  meta: { requiresAdmin: true },
  children: [
    { path: '', component: AdminDashboardView },
    { path: 'works', component: AdminWorksView },
    { path: 'settings', component: AdminSettingsView },
  ],
}
```

### 10.2 Guard behavior

1. If route does not require admin, continue.
2. If session state is already authenticated, continue.
3. Call `GET /api/admin/auth/me` once per app session.
4. While checking, show the admin shell skeleton, not a public page flash.
5. If `401`, redirect to `/admin/login?redirect=<encoded-path>`.
6. If authenticated, render the requested admin route.
7. If API is unavailable, show an admin connection error with retry; do not redirect to login.
8. After login, return to the requested redirect path only if it is an internal `/admin` path.

### 10.3 Logout

- call `POST /api/admin/auth/logout`;
- clear session state and admin caches;
- redirect to `/admin/login`;
- show a short confirmation toast.

### 10.4 Unsaved changes guard

For editor routes:

- intercept router navigation when `isDirty`;
- show `Leave without saving?` confirmation;
- use `beforeunload` for browser/tab close;
- do not block logout after explicit confirmation.

## 11. Data and state architecture

Recommended composables:

```text
src/
├── api/
│   ├── client.js
│   ├── publicContent.js
│   └── admin.js
├── composables/
│   ├── useAdminSession.js
│   ├── useAdminContent.js
│   ├── useEditorDraft.js
│   ├── useToasts.js
│   └── useUnsavedChanges.js
└── utils/
    ├── contentAdapters.js
    ├── normalizeContent.js
    └── mediaValidation.js
```

Use local component state for editor drafts. Use a small shared session composable for authentication. Avoid introducing a global store until multiple distant components require the same mutable state.

API data rules:

- public content cache may be reused between home and case-study routes;
- admin lists and detail data are separate cache entries;
- invalidate the relevant list after create/update/archive;
- update detail cache optimistically only after API success;
- never show a draft on the public route.

## 12. Responsive behavior matrix

| Feature | Mobile | Tablet | Desktop |
|---|---|---|---|
| Sidebar | Slide-over | Slide-over/collapsible | Persistent 264px rail |
| Grid | 1 column | 2 columns | 2–3 columns |
| Editor | Preview + bottom inspector | Preview + collapsible inspector | Two-column editor |
| Save actions | Sticky bottom bar | Topbar + bottom fallback | Topbar and inspector |
| Tables | Cards/horizontal scroll | Horizontal scroll | Full table |
| Toasts | Bottom center | Bottom right | Top right |
| Modal | Full-screen sheet | Centered modal | Centered modal |
| Charts | Stacked/scrollable | Stacked | Multi-column dashboard |

All interactive controls must remain usable at 320px width. Do not rely on hover to reveal an essential action.

## 13. Accessibility and quality requirements

- Every input has a visible label or accessible name.
- Every icon-only button has `aria-label`.
- Focus rings use cyan with sufficient contrast.
- Dialogs trap focus and close with Escape.
- Status is conveyed through text, not color alone.
- Media previews have meaningful alt text or are marked decorative where appropriate.
- Video previews are muted, inline, and have image fallback.
- Honor `prefers-reduced-motion`.
- Keyboard users can reorder repeatable fields using move buttons.
- Errors appear next to fields and in the toast summary.
- No secrets are rendered in the DOM or logged to the console.

## 14. Implementation sequence

### Phase 1 — foundation

1. Add admin route tree and `AdminLayout`.
2. Add session composable and router guard.
3. Add sidebar/topbar/toast/modal primitives.
4. Add admin tokens and responsive shell styles.
5. Add API client with credentials and typed/normalized response helpers.

### Phase 2 — read-only workspace

1. Dashboard content counts and recent updates.
2. Case-study grid with real media previews.
3. Apps Lab grid with real media previews.
4. Loading, empty, error, and retry states.

### Phase 3 — editors

1. Extract reusable public case-study presentation components.
2. Implement work editor with instant reactive preview.
3. Implement solution slide/color/font repeaters.
4. Implement Apps Lab editor.
5. Add save, publish, archive, and unsaved-change guards.

### Phase 4 — settings and analytics

1. Settings shell and maintenance-mode UI once backend settings endpoints exist.
2. Change-password flow once backend endpoint exists.
3. Logs view once audit endpoint exists.
4. Traffic/referrals UI once analytics data endpoint exists.
5. Keep explicit not-connected states for unavailable backend capabilities.

### Phase 5 — hardening

1. Test mobile widths from 320px through 430px.
2. Test desktop widths from 1024px through 1920px.
3. Test direct refresh of every admin route on Vercel.
4. Test expired sessions and API downtime.
5. Test media URL failures and draft/public visibility.
6. Run `npm run build` and API tests.
7. Verify no secrets are bundled in the client output.

## 15. Definition of done

The admin frontend is ready when:

- an unauthenticated visitor cannot access admin screens;
- an authenticated admin can view dashboard counts, works, and labs;
- work/lab cards visually match the public mockups;
- editors update previews immediately as fields change;
- save/publish/archive behavior matches the API documentation;
- mobile navigation and editor controls work without hover;
- toasts, loading, empty, error, and unsaved states are complete;
- maintenance/settings/log screens clearly distinguish implemented data from future API dependencies;
- public pages never render drafts;
- Vercel production build succeeds and direct route refreshes work.
