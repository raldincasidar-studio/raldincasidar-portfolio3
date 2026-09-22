<script setup>
import { ref } from 'vue'
const message = ref('Back shortly — the studio is being updated.')
</script>
<template><main class="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,#17A6E3,#132132_55%,#07090D)] p-6 text-center text-white"><div class="max-w-xl"><img src="/assets/img/logo-white.svg" class="mx-auto mb-8 h-16 animate-pulse" alt="Raldin Casidar" /><p class="font-geist text-xs font-bold uppercase tracking-[.4em] text-white/60">Studio maintenance</p><h1 class="mt-5 font-bricolage text-5xl font-bold tracking-tight sm:text-7xl">Back shortly.</h1><p class="mx-auto mt-6 max-w-md text-base leading-7 text-white/75">{{ message }}</p><div class="mx-auto mt-10 h-1 w-24 rounded-full bg-[#BBE6F6]" /></div></main></template>
