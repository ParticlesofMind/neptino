import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    host: 'localhost',
    open: true,
    strictPort: true, // Exit if port 3000 is already in use
    cors: true,
    // Improve watch options for better file watching
    watch: {
      usePolling: false, // Better performance on macOS
      interval: 100,
    }
  },
  preview: {
    port: 3000,
    host: 'localhost',
    open: true,
    strictPort: true
  },
  // Optimize dependencies to reduce connection issues
  optimizeDeps: {
    include: ['@supabase/supabase-js']
  },
  // Better build configuration
  build: {
    target: 'esnext',
    sourcemap: true
  }
})
