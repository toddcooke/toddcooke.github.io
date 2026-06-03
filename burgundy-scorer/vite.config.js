import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build into Hugo's static/ dir so the app is served at /burgundy-scorer/.
export default defineConfig({
  plugins: [react()],
  base: '/burgundy-scorer/',
  build: {
    outDir: '../static/burgundy-scorer',
    emptyOutDir: true,
  },
})
