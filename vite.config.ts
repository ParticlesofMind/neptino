import { defineConfig } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  // Explicitly define as ESM
  esbuild: {
    format: 'esm',
  },
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
    host: true, // Allow external connections for better Docker compatibility
    open: true,
    strictPort: false, // Allow fallback to other ports if 3000 is busy
    cors: true,
    // Enhanced watch options for stability
    watch: {
      usePolling: false, // Better performance on macOS
      interval: 100,
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
    // Add middleware ordering and better error handling
    middlewareMode: false,
    // Prevent server crashes on unhandled errors
    hmr: {
      overlay: true,
      clientPort: 3000,
    },
  },
  preview: {
    port: 3000,
    host: true,
    open: true,
    strictPort: false
  },
  // Enhanced dependency optimization
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'pixi.js', '@pixi/devtools', '@huggingface/transformers'],
    exclude: ['@huggingface/transformers', 'yoga-layout'], // Exclude to prevent pre-bundling issues
    force: false, // Don't force re-optimization unless needed
  },
  // Better build configuration
  build: {
    target: 'esnext',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    // Prevent memory issues during build
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@supabase/supabase-js'],
          pixi: ['pixi.js', '@pixi/devtools', '@pixi/layout'],
          ml: ['@huggingface/transformers'],
        },
      },
    },
  },
  // Support for WebAssembly (needed for transformers.js ONNX runtime)
  worker: {
    format: 'es',
  },
  // Add base URL for proper asset loading
  base: '/',
  // Clear screen on reload for better development experience
  clearScreen: false,
})
