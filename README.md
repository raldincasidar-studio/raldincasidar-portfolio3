# Raldin Casidar — Portfolio (Vue 3)

A Vue 3 conversion of the static Tailwind CSS site, restructured into reusable
components with **Vite**, **Vue Router** and **Tailwind CSS v4**.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (http://localhost:5173)
npm run dev

# 3. Production build + local preview
npm run build
npm run preview
```

Requires **Node 18+**.

---

## Pages (routes)

| Path      | View                        | Description                                  |
| --------- | --------------------------- | -------------------------------------------- |
| `/`       | `src/views/HomeView.vue`    | The full portfolio page (hero → works → labs → about) |
| `/blank`  | `src/views/BlankTemplateView.vue` | Blank template to start designing a new page |

---

## Project structure

```
raldin-portfolio/
├── index.html                  # HTML shell (fonts, preloader scroll-lock)
├── vite.config.js              # Vue + Tailwind v4 plugins, `@` → `src/` alias
├── package.json
├── public/                     # Static files served from the site root
│   ├── favicon.png
│   └── assets/
│       ├── img/
│       │   └── logo-white.svg  # ← replace with your real logo
│       └── video/              # ← replace with your real screen recordings
│           ├── head-image-loop.mp4
│           ├── bangsamoro-app.mp4
│           ├── ramadhan-app.mp4
│           ├── ella-web.mp4
│           └── pasado-app.mp4
└── src/
    ├── main.js                 # App entry — mounts Vue + router
    ├── App.vue                 # Root (renders <router-view />)
    ├── router/
    │   └── index.js            # Routes + page titles + scroll behaviour
    ├── layouts/
    │   └── DefaultLayout.vue   # Shared chrome: Preloader + Navbar + Footer
    ├── assets/
    │   └── styles/
    │       └── main.css        # Tailwind import + theme tokens + custom CSS
    ├── components/
    │   ├── layout/             # Site-wide chrome (reused on every page)
    │   │   ├── AppNavbar.vue
    │   │   ├── AppFooter.vue
    │   │   └── Preloader.vue
    │   ├── ui/                 # Small reusable primitives
    │   │   └── ArrowIcon.vue
    │   └── sections/           # Reusable page sections
    │       ├── HeroSection.vue
    │       ├── WorkCard.vue    # card used by WorksSection
    │       ├── WorksSection.vue
    │       ├── LabCard.vue     # card used by LabsSection
    │       ├── LabsSection.vue
    │       └── AboutSection.vue
    └── views/                  # One file per route
        ├── HomeView.vue
        └── BlankTemplateView.vue
```

---

## How to add a new page

1. Copy `src/views/BlankTemplateView.vue` → e.g. `src/views/AboutView.vue`.
2. Register it in `src/router/index.js`:

   ```js
   {
     path: 'about',
     name: 'about',
     component: () => import('@/views/AboutView.vue'),
     meta: { title: 'About', navbarSolid: true }, // navbarSolid optional
   },
   ```

3. Link to it from anywhere:

   ```vue
   <router-link to="/about">About</router-link>
   ```

The **preloader, navbar and footer are applied automatically** via
`DefaultLayout`, so a new page only needs its own content.

---

## Reusing components

- **Navbar / Footer / Preloader** — already global via `DefaultLayout`.
- **Sections** (`HeroSection`, `WorksSection`, …) — import and drop into any view:

  ```vue
  <script setup>
  import HeroSection from '@/components/sections/HeroSection.vue'
  </script>

  <template>
    <HeroSection />
  </template>
  ```

- **Content is data-driven** — edit the `works` / `labs` arrays in
  `WorksSection.vue` / `LabsSection.vue` to add projects without touching markup.

---

## Tailwind CSS v4 notes

- There is **no `tailwind.config.js`** — v4 is configured in CSS
  (`src/assets/styles/main.css`) via `@theme`.
- Custom theme tokens:

  ```css
  @theme {
    --color-blue: #17a6e3;     /* → bg-blue, text-blue, …  (brand blue) */
    --font-bricolage: …;       /* → font-bricolage            */
    --font-geist: …;           /* → font-geist                */
    --text-subtitle: 1rem;     /* → text-subtitle             */
  }
  ```

- The preloader, hamburger animation and `.gradient` / `.bouncing-text`
  utilities were ported verbatim into `main.css`.

---

## What changed vs. the static version

- Markup split into components; repeated SVGs replaced by `ArrowIcon.vue`.
- `<video>` sources now use `mp4` (the original referenced `.mp4` files,
  which most browsers won't play). Placeholder videos are included —
  **drop your real recordings into `public/assets/video/`**.
- Placeholder logo + favicon included — replace `logo-white.svg` / `favicon.png`
  with your real artwork (keep the same filenames).
- Dead `#!` links kept as placeholders; nav links now smooth-scroll to the
  `#works` / `#labs` / `#about` sections, and "Say Hi" opens a mailto link.
- A `blank` route demonstrates the page template.

---

## Notes

- `npm install` (or `npm ci` if a lockfile exists) installs everything:
  `vue`, `vue-router`, `vite`, `@vitejs/plugin-vue`, `tailwindcss`,
  `@tailwindcss/vite`.
- The preloader has built-in safety nets (8s per-video, 12s overall) so it
  can never get stuck.
