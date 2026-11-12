import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import type { Plugin } from 'vite'

const BUILD_VERSION = new Date().toISOString().slice(0, 16)

// Every deploy ships a new sw.js that pre-downloads all JS/CSS of the build,
// so every page (POS included) opens offline even if it was never visited online.
function swPrecache(): Plugin {
  let files: string[] = []
  return {
    name: 'sw-precache',
    apply: 'build',
    generateBundle(_, bundle) {
      files = Object.keys(bundle).filter((f) => /\.(js|css)$/.test(f)).map((f) => `/${f}`)
    },
    closeBundle() {
      const out = path.resolve(__dirname, 'dist/sw.js')
      if (!fs.existsSync(out)) return
      const src = fs.readFileSync(out, 'utf8')
        .replace(/const CACHE_NAME = '[^']*';/, `const CACHE_NAME = 'kabrak-${BUILD_VERSION}';`)
        .replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = ${JSON.stringify(files)};`)
      fs.writeFileSync(out, src)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swPrecache()],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
