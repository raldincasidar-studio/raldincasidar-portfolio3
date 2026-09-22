import { computed, ref } from 'vue'
import { adminApi } from '@/api/admin.js'

const admin = ref(null)
const checked = ref(false)
const checking = ref(false)

export function useAdminSession() {
  const isAuthenticated = computed(() => Boolean(admin.value))
  async function check() {
    if (checking.value) return admin.value
    checking.value = true
    try { admin.value = (await adminApi.me()).data; return admin.value }
    catch (error) { if (error.status === 401) admin.value = null; throw error }
    finally { checked.value = true; checking.value = false }
  }
  async function login(credentials) { admin.value = (await adminApi.login(credentials)).data; checked.value = true; return admin.value }
  async function logout() { await adminApi.logout().catch(() => {}); admin.value = null; checked.value = true }
  return { admin, checked, checking, isAuthenticated, check, login, logout }
}
