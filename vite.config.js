import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base path from env or default to /zhoral3raq-deploy
const base = process.env.VITE_BASE_PATH || '/zhoral3raq-deploy'

export default defineConfig({
  base,
  plugins: [react()],
})
