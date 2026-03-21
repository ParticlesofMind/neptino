import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Build each entry separately to avoid IIFE code-splitting issues
const entry = process.env.ENTRY || 'content-script';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Never empty - we have multiple builds
    rollupOptions: {
      input: resolve(__dirname, `src/${entry}.ts`),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        format: 'iife',
        name: undefined,
        inlineDynamicImports: true, // Now safe since we have single input
        assetFileNames: (assetInfo) => {
          // Rename style.css to content-script.css for content-script entry
          if (entry === 'content-script' && assetInfo.name?.endsWith('.css')) {
            return 'content-script.css';
          }
          return '[name].[ext]';
        },
      },
    },
    sourcemap: false,
    minify: 'esbuild',
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
