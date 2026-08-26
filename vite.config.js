import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      // `@` -> `src/` so you can import components as `@/components/...`
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Allow any host so the app also works behind preview/proxy tunnels
    // (e.g. the Arena live preview). Remove for a strict local-only setup.
    allowedHosts: true,
  },
})
