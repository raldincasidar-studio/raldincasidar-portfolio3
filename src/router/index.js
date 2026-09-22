import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import AdminLoginView from '@/views/AdminLoginView.vue'
import MaintenanceView from '@/views/MaintenanceView.vue'
import { useAdminSession } from '@/composables/useAdminSession.js'
import { publicApi } from '@/api/admin.js'

const routes = [
  { path: '/maintenance', name: 'maintenance', component: MaintenanceView, meta: { title: 'Maintenance' } },
  { path: '/admin/login', name: 'admin-login', component: AdminLoginView, meta: { title: 'Admin login' } },
  { path: '/admin', component: AdminLayout, meta: { requiresAdmin: true }, children: [
    { path: '', name: 'admin-dashboard', component: () => import('@/views/AdminDashboardView.vue'), meta: { title: 'Dashboard' } },
    { path: 'works', name: 'admin-works', component: () => import('@/views/AdminCollectionView.vue'), props: { type: 'works' }, meta: { title: 'Case studies' } },
    { path: 'works/:id/edit', name: 'admin-work-edit', component: () => import('@/views/AdminEditorView.vue'), props: { type: 'works' }, meta: { title: 'Edit case study' } },
    { path: 'works/new', name: 'admin-work-new', component: () => import('@/views/AdminEditorView.vue'), props: { type: 'works' }, meta: { title: 'New case study' } },
    { path: 'labs', name: 'admin-labs', component: () => import('@/views/AdminCollectionView.vue'), props: { type: 'labs' }, meta: { title: 'Apps Lab' } },
    { path: 'labs/:id/edit', name: 'admin-lab-edit', component: () => import('@/views/AdminEditorView.vue'), props: { type: 'labs' }, meta: { title: 'Edit App Lab' } },
    { path: 'labs/new', name: 'admin-lab-new', component: () => import('@/views/AdminEditorView.vue'), props: { type: 'labs' }, meta: { title: 'New App Lab' } },
    { path: 'settings', name: 'admin-settings', component: () => import('@/views/AdminSettingsView.vue'), meta: { title: 'Settings' } },
  ] },
  { path: '/', component: DefaultLayout, children: [
    { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/case-study/:id', name: 'case-study', component: () => import('@/views/CaseStudyView.vue') },
    { path: 'blank', name: 'blank', component: () => import('@/views/BlankTemplateView.vue'), meta: { title: 'New Page', navbarSolid: true } },
  ] },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]
const router = createRouter({ history: createWebHistory(), routes, scrollBehavior(to, from, savedPosition) { if (savedPosition) return savedPosition; if (to.hash) return { el: to.hash, behavior: 'smooth' }; return { top: 0 } } })
let maintenanceCheckedAt = 0
let maintenanceMode = false
router.beforeEach(async (to) => {
  if (to.meta.requiresAdmin) {
    const session = useAdminSession()
    if (session.isAuthenticated.value) return true
    try { await session.check(); return true } catch (error) { if (error.status === 401) return { name: 'admin-login', query: { redirect: to.fullPath } }; return true }
  }
  if (to.name === 'maintenance' || to.name === 'admin-login') return true
  if (Date.now() - maintenanceCheckedAt > 30000) {
    try { maintenanceMode = Boolean((await publicApi.settings()).data.maintenanceMode); maintenanceCheckedAt = Date.now() } catch { return true }
  }
  if (maintenanceMode) return { name: 'maintenance' }
  return true
})
function analyticsSessionId() {
  const key = 'portfolio_analytics_session'
  let value = localStorage.getItem(key)
  if (!value) { value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem(key, value) }
  return value
}
function trackPageView(to) {
  if (to.path.startsWith('/admin') || to.name === 'maintenance') return
  const resourceType = to.name === 'case-study' ? 'work' : 'page'
  publicApi.track({ eventType: resourceType === 'work' ? 'case_study_view' : 'page_view', path: to.path, resourceType, resourceSlug: typeof to.params.id === 'string' ? to.params.id : undefined, referrerOrigin: document.referrer || undefined, anonymousSessionId: analyticsSessionId(), deviceCategory: window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop' }).catch(() => {})
}
router.afterEach((to) => { document.title = to.meta?.title ? `${to.meta.title} · Raldin Casidar` : 'Raldin Casidar - Fullstack Developer & Systems Builder'; trackPageView(to) })
export default router
