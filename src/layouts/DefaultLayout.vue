<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Preloader from '@/components/layout/Preloader.vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

/**
 * DefaultLayout — the shared "chrome" every page inherits.
 *
 * Reuse it on any new page by simply adding a child route under it
 * (see `src/router/index.js`). You can tweak its behaviour per page
 * with route `meta`:
 *   • `meta.navbarSolid` → render the navbar with its solid background.
 */
const route = useRoute()
const navbarSolid = computed(() => Boolean(route.meta.navbarSolid))
</script>

<template>
  <Preloader />
  <AppNavbar :solid="navbarSolid" />

  <main>
    <router-view />
  </main>

  <AppFooter />
</template>
