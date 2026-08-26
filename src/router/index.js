import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  ROUTES
 *
 *  Every page is nested under `DefaultLayout`, which provides the shared
 *  chrome (Preloader + Navbar + Footer). To add a new page:
 *
 *    1. Create a view in `src/views/` (copy `BlankTemplateView.vue`).
 *    2. Add a child route below.
 *    3. Done — the navbar/footer/preloader come along automatically.
 *
 *  Route `meta` flags:
 *    • `title`       — sets the browser tab title (see `afterEach` below).
 *    • `navbarSolid` — renders the navbar with its solid "pill" background
 *                      immediately, instead of only after scrolling.
 * ─────────────────────────────────────────────────────────────────────────
 */
const routes = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
      },
      {
        path: '/case-study/:id',
        name: 'case-study',
        component: () => import('@/views/CaseStudyView.vue')
      },
      {
        path: 'blank',
        name: 'blank',
        component: () => import('@/views/BlankTemplateView.vue'),
        meta: { title: 'New Page', navbarSolid: true },
      },
    ],
  },

  // Unknown routes → back home
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = to.meta?.title
    ? `${to.meta.title} · Raldin Casidar`
    : 'Raldin Casidar - Fullstack Developer & Systems Builder'
})

export default router
