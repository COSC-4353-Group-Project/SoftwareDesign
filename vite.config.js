import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // During `npm run dev`, any fetch('/api/...') from the React pages gets forwarded
    // to the Express backend in server/ (started with `npm run server`).
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  // Vitest settings (`npm test`, `npm run coverage`)
  test: {
    environment: 'node',
    include: ['server/tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      // Only measure backend code. index.js just starts the server, so there's nothing to test in it.
      include: ['server/**/*.js'],
      exclude: ['server/index.js', 'server/tests/**'],
      reporter: ['text', 'html'],
    },
  },
})
