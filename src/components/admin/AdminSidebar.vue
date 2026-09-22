<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useAdminSession } from '@/composables/useAdminSession.js'
const emit = defineEmits(['close'])
const route = useRoute(); const router = useRouter(); const session = useAdminSession()
const links = [{ label: 'Dashboard', to: '/admin', icon: '▦' }, { label: 'Case studies', to: '/admin/works', icon: '◫' }, { label: 'Apps Lab', to: '/admin/labs', icon: '✦' }, { label: 'Settings', to: '/admin/settings', icon: '⚙' }]
async function logout() { await session.logout(); router.push('/admin/login') }
</script>
<template>
  <aside class="flex h-full w-[264px] shrink-0 flex-col bg-[#07090D] p-5 text-white shadow-2xl">
    <div class="mb-10 flex items-center justify-between">
      <router-link to="/admin" class="flex items-center gap-2" @click="emit('close')"><img src="/assets/img/logo-white.svg" class="h-9" alt="" /><span class="font-bricolage text-xl font-semibold">Raldin.</span></router-link>
      <button class="lg:hidden text-white/60" aria-label="Close navigation" @click="emit('close')">×</button>
    </div>
    <p class="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.28em] text-white/40">Workspace</p>
    <nav class="space-y-1">
      <router-link v-for="link in links" :key="link.to" :to="link.to" class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/65 transition hover:bg-white/10 hover:text-white" :class="route.path === link.to || (link.to !== '/admin' && route.path.startsWith(link.to)) ? 'bg-[#17A6E3] !text-white shadow-lg shadow-cyan-900/20' : ''" @click="emit('close')"><span class="w-5 text-center text-lg">{{ link.icon }}</span>{{ link.label }}</router-link>
    </nav>
    <div class="mt-auto space-y-3">
      <a href="/" target="_blank" class="block rounded-xl border border-white/10 px-3 py-3 text-sm text-white/65 hover:border-white/30 hover:text-white">↗ View public site</a>
      <div class="flex items-center gap-3 border-t border-white/10 pt-4"><span class="grid size-9 place-items-center rounded-full bg-[#BBE6F6] font-bold text-[#132132]">{{ session.admin.value?.email?.[0]?.toUpperCase() || 'A' }}</span><div class="min-w-0 flex-1"><p class="truncate text-sm">{{ session.admin.value?.email || 'Admin' }}</p><p class="text-xs text-white/40">Administrator</p></div><button class="text-xs text-white/50 hover:text-white" @click="logout">Log out</button></div>
    </div>
  </aside>
</template>
