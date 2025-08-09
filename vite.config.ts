import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    host: 'localhost',
    open: true,
    strictPort: true, // Exit if port 3000 is already in use
    cors: true
  },
  preview: {
    port: 3000,
    host: 'localhost',
    open: true,
    strictPort: true
  }
})
