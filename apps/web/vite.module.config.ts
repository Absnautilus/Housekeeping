import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/module-entry.tsx', import.meta.url)),
      formats: ['es'],
      fileName: () => 'housekeeping-module.js',
      cssFileName: 'housekeeping-module',
    },
    rollupOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
      ],
    },
  },
})
