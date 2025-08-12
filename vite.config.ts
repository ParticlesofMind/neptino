import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    // Automatically map path aliases from tsconfig.json
    tsconfigPaths(),

    // Bundle analysis visualization (only when ANALYZE env var is set)
    ...(process.env.ANALYZE ? [visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })] : []),
  ],
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
    include: ['@supabase/supabase-js', 'pixi.js', '@pixi/devtools']
  },
  // Better build configuration with code splitting
  build: {
    target: 'esnext',
    sourcemap: true,
    chunkSizeWarningLimit: 600, // Increase threshold slightly
  }
})
