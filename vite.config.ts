import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
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
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pixi': ['pixi.js', '@pixi/devtools', '@pixi/layout'],
          
          // Course builder modules
          'coursebuilder-core': [
            './src/scripts/coursebuilder/index.ts',
            './src/scripts/coursebuilder/coursebuilder.ts'
          ],
          'coursebuilder-canvas': [
            './src/scripts/coursebuilder/canvas/index.ts',
            './src/scripts/coursebuilder/canvas/PixiCanvas.ts',
            './src/scripts/coursebuilder/canvas/PixiApplicationManager.ts',
            './src/scripts/coursebuilder/canvas/CanvasLayerManager.ts',
            './src/scripts/coursebuilder/canvas/CanvasEventHandler.ts'
          ],
          'coursebuilder-tools': [
            './src/scripts/coursebuilder/tools/index.ts',
            './src/scripts/coursebuilder/tools/ToolManager.ts'
          ],
          'coursebuilder-ui': [
            './src/scripts/coursebuilder/ui/index.ts',
            './src/scripts/coursebuilder/managers/index.ts'
          ],
          
          // Backend modules
          'backend-auth': ['./src/scripts/backend/auth/auth.ts'],
          'backend-courses': ['./src/scripts/backend/courses/index.ts']
        }
      }
    }
  }
})
