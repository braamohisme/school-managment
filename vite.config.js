import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base path from env, default root
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  build: {
    outDir: 'build',
  },
  plugins: [react()],
})
