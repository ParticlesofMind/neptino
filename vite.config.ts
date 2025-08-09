import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use 'src/scss/abstracts/variables' as *;`
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})
