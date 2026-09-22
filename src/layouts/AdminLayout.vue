<script setup>
import { ref, provide, onMounted, onBeforeUnmount } from 'vue'
import { RouterView } from 'vue-router'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminToastHost from '@/components/admin/AdminToastHost.vue'
const menuOpen = ref(false)
const toastHost = ref(null)
provide('adminToast', { success: (message) => toastHost.value?.push(message, 'success'), error: (message) => toastHost.value?.push(message, 'error') })

// index.html starts with the public preloader scroll lock. Admin routes do not
// mount that preloader, so explicitly release the lock for the dashboard.
onMounted(() => {
  document.documentElement.classList.remove('preloader-lock')
  document.body.classList.remove('menu-open')
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('preloader-lock')
  document.body.classList.remove('menu-open')
})
</script>
<template>
  <div class="min-h-screen bg-[#F7F8FA] text-[#07090D]">
    <div class="fixed inset-y-0 left-0 z-50 hidden lg:flex"><AdminSidebar /></div>
    <div v-if="menuOpen" class="fixed inset-0 z-40 bg-black/60 lg:hidden" @click="menuOpen = false" />
    <div class="fixed inset-y-0 left-0 z-50 flex -translate-x-full transition-transform lg:hidden" :class="menuOpen ? '!translate-x-0' : ''"><AdminSidebar @close="menuOpen = false" /></div>
    <main class="min-h-screen lg:pl-[264px]"><header class="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-gray-200/80 bg-[#F7F8FA]/90 px-4 backdrop-blur-md sm:px-6 lg:px-10"><button class="grid size-10 place-items-center rounded-xl border border-gray-200 bg-white lg:hidden" aria-label="Open navigation" @click="menuOpen = true">☰</button><div class="hidden text-sm text-gray-500 sm:block">Studio / <span class="text-gray-900">Admin workspace</span></div><div class="flex items-center gap-3 text-xs text-gray-500"><span class="hidden items-center gap-2 sm:flex"><i class="size-2 rounded-full bg-emerald-500" /> API connected</span><router-link to="/admin/settings" class="rounded-full border border-gray-200 bg-white px-3 py-2 hover:border-[#17A6E3]">Settings</router-link></div></header><div class="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-10"><RouterView /></div></main>
    <AdminToastHost ref="toastHost" />
  </div>
</template>
