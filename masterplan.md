# Masterplan: Dropbox media management for the admin portal

## Goal

Allow an authenticated admin to upload and manage images in Dropbox, select them while editing case studies and Apps Lab entries, or continue using a direct URL. Published content must keep working without an admin session. Add a media library and storage usage to the admin, plus Dropbox connection settings. This document is a plan only; it does not connect to Dropbox, change existing data, or implement the feature.

## Existing application

- Vue 3/Vite frontend; Express API in `api/index.js`, MongoDB/Mongoose in `api/models.js`, with a Vercel API rewrite in `vercel.json`.
- Admin routes are children of `/admin` in `src/router/index.js`, with navigation in `src/components/admin/AdminSidebar.vue`. Server routes use `requireAuth` and `loadAdmin` from `api/auth.js`.
- `src/views/AdminEditorView.vue` contains work card preview, case study hero and solution slide image fields, and Apps Lab image fields. `src/components/admin/AdminMediaItem.vue` handles story image and gallery items through `AdminPostEditor.vue`.
- Existing content stores URL strings, including `previewImageUrl`, `caseStudy.hero.imageUrl`, `caseStudy.solutionsOverview.slides[].imageUrl`, `caseStudy.post.blocks[].url`, gallery item URLs, and lab `imageUrl`. Public components already render URLs. Existing links and content must remain compatible.
- `src/api/client.js` assumes JSON for requests with bodies; binary uploads need an explicit upload helper. `api/index.js` currently limits JSON to 1 MB. Runtime/proxy limits, especially on Vercel, must be verified before choosing the upload limit.

## Product decisions and scope

1. **Images first:** support images in all image fields above. Preserve existing video URL inputs; Dropbox video uploads and large-file sessions are a later phase. Allow ordinary direct links unchanged.
2. **Library:** browse the Dropbox app's permitted root and folders, upload images, select an image, copy its public direct link, delete individual files, and see account storage usage. Default to an **App folder** Dropbox app to limit access. Do not implement folder deletion, move, overwrite, batch delete, or permanent delete in v1.
3. **Sharing is explicit:** selecting/copying a Dropbox image for public content creates or reuses a publicly accessible shared link. Explain this exposure and require confirmation before creating a new public link. Merely browsing or uploading does not make a file public. Dropbox account/team sharing policies may prevent public sharing; show an actionable error rather than claiming success.
4. **Stable public links:** do not save `files/get_temporary_link` URLs: they expire after four hours. Create/reuse a Dropbox shared link with public visibility, then derive a direct-content link using Dropbox's supported `raw=1` parameter (remove conflicting `dl`/`raw` parameters). Verify anonymous image loading and link behavior in a real Dropbox account before release. Dropbox bandwidth limits, browser behavior, and policy restrictions mean hotlink availability is not guaranteed; expose failures and document that a dedicated CDN may be needed for production traffic. Never claim links are permanent or universally available.
5. **Credentials:** “API key” alone cannot authorize Dropbox file access. Settings should label the app key accurately and provide a **Connect Dropbox** OAuth 2 flow with offline access and a server-held refresh token; optionally allow a manually supplied short-lived access token for temporary testing, clearly marked as expiring. Do not request credentials in chat or place tokens in source, browser storage, public APIs, logs, or audit records.

## Connection and secret design

- Register a Dropbox app with least privilege: `files.metadata.read`, `files.content.read`, `files.content.write`, `account_info.read`, `sharing.read`, and `sharing.write`. Select App folder unless broader access is expressly needed. Configure an exact HTTPS OAuth callback for each deployed environment; Dropbox/Atlas access is unavailable in the current sandbox, so connection setup must be verified in a suitable environment.
- Settings contains app key (not an access token), a masked write-only app secret if required by the selected OAuth flow, connection status/account display name, connect/reconnect, and disconnect controls. Prefer authorization-code flow with PKCE, and follow Dropbox's current OAuth documentation for public versus confidential clients. Never expose client secret or refresh/access tokens to the browser. The callback uses an authenticated server-side session and a short-lived, single-use, session-bound, cryptographically random `state` plus PKCE verifier; validate exact redirect URI and state before exchanging the code. Register callback handling so the redirect can complete securely even if session expires; require reauthentication on failure.
- Persist only the secret material needed across restarts in a separate server-only integration record, not public `SiteSettings` responses. Encrypt refresh token and any app secret at rest with authenticated encryption (AES-256-GCM with unique random IV, authentication tag and key version); encryption key comes from a separate server-only environment variable, never MongoDB or `VITE_*`. Document backup, rotation, and loss of that key. Restrict DB projection and API responses to connection status and non-secret account metadata. Keep access tokens in server memory only and refresh as needed, with per-connection refresh coordination; never log token responses, authorization codes, or temporary links. On 401 refresh once when possible; otherwise request reconnection. Disconnect removes stored credentials after confirmation; it must not delete files or revoke shared links automatically.
- Add sensitive admin endpoints with `requireAuth` and `loadAdmin`, explicit input validation, rate limits where appropriate, same-origin/CSRF protection for cookie-authenticated mutations (including OAuth initiation and disconnect), and restrictive cache headers. Existing CORS configuration and `vercel.json` wildcard CORS header must be reviewed so they do not undermine credentialed access. Mask/redact Dropbox error payloads and never return secrets.

## Backend API and Dropbox adapter

Build a server-only Dropbox adapter (e.g. `api/dropbox.js`) with injectable HTTP transport for tests. No browser request may use Dropbox credentials. Validate IDs/paths and respect the app root; root is `""`, never `/`. Resolve file metadata before mutation or sharing; operate on Dropbox IDs where supported, compare the confirmed ID/path/revision at deletion to reduce stale-selection mistakes.

Proposed routes under `/api/admin/dropbox`, all authenticated:

| Route | Purpose |
| --- | --- |
| `GET /connection` | Non-secret status, account label, capabilities and configuration state. |
| `PUT /connection/config` | Save app key and optional write-only secret securely; blank secret means keep existing. |
| `POST /connection/start` and `GET /connection/callback` | Initiate and complete OAuth with state/PKCE; route callback appropriately through existing rewrite. |
| `DELETE /connection` | Confirmed disconnect, no Dropbox file changes. |
| `GET /usage` | Call `users/get_space_usage`; return used and allocation, calculated remaining only when the allocation type supports it; handle team/shared allocations and unknown values honestly. |
| `GET /files?path=...` and `POST /files/continue` | Browse folders with cursor pagination using `files/list_folder` and `list_folder/continue`, excluding deleted entries; no concurrent duplicate requests for a folder. |
| `POST /files` | Upload one validated image to the selected folder with `files/upload`, `mode: add`, `autorename: true`; return actual Dropbox metadata, including renamed path and size. |
| `POST /files/link` | Resolve metadata, check existing links and create/reuse a public shared link only after the UI's explicit confirmation. Return normalized direct URL, file ID and visibility; fail closed if public access cannot be established. |
| `DELETE /files` | After explicit confirmation of the exact file and rechecking metadata, use recoverable `files/delete_v2`; report the actual path and recovery caveat. Reject folders and stale/mismatched IDs/revisions. |

- Dropbox RPC calls use POST/JSON, except no-argument account/usage calls send no body or JSON content type. Upload uses raw bytes, `application/octet-stream`, and a header-safe JSON `Dropbox-API-Arg` (escape non-ASCII). Parse structured 409 tags and preserve the Dropbox request ID in sanitized errors.
- Uploads: start with a documented conservative limit (proposed 4 MB maximum per image, lower if the deployed runtime requires it), enforced at browser, API and streaming parser. Confirm Vercel request-body limits and multipart/base64 overhead during implementation. Prefer a bounded raw binary request with file name and destination passed separately; stream to Dropbox where runtime permits, avoiding unbounded memory or persistent local files. Check actual bytes against a small allowlist of supported image formats (JPEG, PNG, WebP, GIF); reject SVG and content/type mismatches, path traversal, invalid names, empty files and oversized bodies. Report size and progress when possible. Limit concurrent uploads. Simple Dropbox uploads are under the provider's 150 MB limit; resumable sessions are outside v1.
- Retry 429/503 and other transient 5xx with capped jitter/backoff and `Retry-After`, respecting timeouts. Never blindly retry an ambiguous upload, delete, or link creation: reconcile metadata/shared links first, because the operation may already have succeeded. Do not retry 400/401/403/409 unchanged. Distinguish expired/revoked token, missing scope, quota, sharing policy, conflicts and network failures. Do not log bodies containing tokens or sensitive URLs.
- Audit connection changes, uploads, link creation and deletion with actor, action, path/ID and result, excluding secrets, file bytes and link URLs. Extend the current `AuditEvent` metadata schema deliberately if needed.

## Admin UX

### Media library (`/admin/media`)

- Add a sidebar entry and protected `AdminMediaView.vue`; reuse a `DropboxMediaLibrary` component in both the page and picker dialog.
- Show connection status and a Settings link if not connected; show storage used / allocated / remaining with an unknown state when not calculable. Browse folders with breadcrumbs, pagination/load more, refresh, empty/loading/error states, accessible image previews and file metadata. Preview private files through an authenticated, bounded thumbnail endpoint using Dropbox thumbnail APIs, or use an icon until implemented; do not create public links just to render a thumbnail.
- Upload via file input and drag/drop with accepted types/size, validation, progress/status, actual returned filename, and retry guidance. Preserve current folder and refresh the listing after success.
- Provide select/copy-link and delete for files. Before creating a public link, display that anyone with the link can access it and ask for confirmation. Before delete, resolve and display the exact path/name and warn published content using it may break; require a clear confirmation per file. On success explain Dropbox recovery is time-limited and depends on account history. Never silently delete or permanently delete.

### Picker in editors

- Create a reusable accessible media source control/dialog: **Direct link** and **Dropbox library**. Existing URLs stay editable; selecting/uploading an image inserts its stable direct URL into the same field without saving the draft automatically. Show loading, errors, and preview; closing/cancelling leaves the value and unsaved draft intact. Support keyboard focus, escape, focus return and clear labels.
- Integrate every image location in `AdminEditorView.vue` (work preview, hero, solution slides and lab image), and image/gallery entries in `AdminMediaItem.vue` / `AdminPostEditor.vue`. Do not apply image selection to video URLs or external navigation links. Ensure replacing a media item keeps alt/caption unless the existing UX explicitly resets it.
- Warn that a Dropbox image becomes publicly accessible on sharing, including when used in a draft. A published work or lab should render the URL without authentication. Keep current URL schema compatible; only introduce optional Dropbox ID/path metadata if needed for usage tracking, updating Zod, Mongoose, serialization and editor round trips together. Without complete reference tracking, deletion warnings must not assert that a file is unused.

### Settings

- Add a Dropbox integration section to `AdminSettingsView.vue` with app key/configuration, OAuth connect/reconnect, connection status, required scopes and troubleshooting for expired credentials, missing scopes and restricted sharing. Never prefill or reveal stored secrets. Explain App folder access and that disconnect does not remove previously created public links.

## Delivery phases

1. **Foundation:** document setup, runtime limits and security model; build encrypted integration storage, OAuth and status APIs; add settings UX and tests. Review existing auth, CSRF and CORS before exposing endpoints.
2. **Library:** implement provider adapter, usage/list pagination, safe image upload, non-destructive previews, confirmed recoverable delete and library page. Include audit and error handling.
3. **Editor integration:** add shared-link confirmation and URL insertion across all image fields, maintaining direct-link and legacy-content behavior.
4. **Validation and release:** run mocked automated tests, build and regression checks; then conduct a separate real-account test when Dropbox and MongoDB connectivity are available. Deploy server-only keys and configure exact OAuth redirects. Do not seed/reset an admin or alter real Dropbox files without authorization.

## Test and acceptance checklist

- Unit/integration tests mock MongoDB and Dropbox transport: no secrets appear in responses, logs, public settings or audit; authorization, inactive admin, CSRF, state/PKCE, expired state and refresh/reconnect behavior; encryption/tamper/key failure; scope and sharing-policy errors; disconnected and quota states.
- Exercise root and nested listing, cursor continuation, empty and Unicode names, concurrent list suppression, sanitized 409s/request IDs, 429 `Retry-After`, capped backoff, ambiguous mutations and transient errors.
- Upload valid images and reject invalid bytes, traversal, too-large and unsupported files; verify collision autorename and returned path. Verify requests fit the actual deployment limit. Delete only after explicit confirmation and metadata recheck; stale selection and folders rejected; cancellation makes no Dropbox call.
- Verify public sharing requires confirmation, existing links are reused where appropriate, direct URL normalization avoids expiring links, and denied public visibility does not produce a supposedly usable URL. Manually test anonymous image retrieval with a real Dropbox app when available.
- UI tests cover library, storage unknown/team cases, picker and direct URLs in every listed editor field, unsaved draft preservation, keyboard access, previews, and error states. Regression-test existing work/lab create/edit/public rendering with old URL data and video fields.
- Run `npm run build` and `npm run test:api` plus new mocked tests; do not count tests that skip database connectivity as proof of a working database. Real Dropbox/Mongo integration and deployment upload-limit checks remain explicitly pending until an environment with access is available.

## Risks and operational notes

- Public links expose files to anyone holding them and are subject to Dropbox policies, availability and bandwidth limitations. Removing/revoking a link or deleting a file can break published content. Keep original files and consider a CDN if traffic grows.
- OAuth app configuration, approved scopes, exact callback URLs, encryption key and operational MongoDB access are prerequisites. A short-lived access token alone is not a durable integration. Losing the encryption key requires reconnecting.
- The sandbox cannot reach the MongoDB/Dropbox hosts; use mocks for implementation tests and avoid representing simulated results as live verification. Never put credentials in the repository or example values.
