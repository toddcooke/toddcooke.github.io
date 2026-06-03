import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build into Hugo's static/ dir so the app is served at /castles-of-burgundy-scorer/.
export default defineConfig({
  plugins: [react()],
  base: '/castles-of-burgundy-scorer/',
  build: {
    outDir: '../static/castles-of-burgundy-scorer',
    emptyOutDir: true,
  },
})
