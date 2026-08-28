import { readFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const pkg = JSON.parse(readFileSync(`${rootDir}/package.json`, 'utf-8')) as { version: string }

const base = process.env.VITE_BASE_PATH || '/veyra/'
const appVersion = process.env.VITE_APP_VERSION || pkg.version
const buildHash = process.env.VITE_BUILD_HASH || 'dev'
const buildTime = process.env.VITE_BUILD_TIME || new Date().toISOString()

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Veyra',
        short_name: 'Veyra',
        description: 'Tu IA personal. Tu memoria. En tu dispositivo.',
        lang: 'es',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: `${base}app`,
        scope: base,
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
          {
            src: `${base}icons/icon-maskable.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2,webmanifest,mjs}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
    {
      name: 'github-pages-spa-fallback',
      closeBundle() {
        const distDir = join(rootDir, 'dist')
        copyFileSync(join(distDir, 'index.html'), join(distDir, '404.html'))
      },
    },
    {
      name: 'veyra-version-file',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify(
            {
              version: appVersion,
              buildHash,
              buildTime,
            },
            null,
            2,
          ),
        })
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 3000,
  },
  worker: {
    format: 'es',
  },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_HASH__: JSON.stringify(buildHash),
    __BUILD_TIME__: JSON.stringify(buildTime),
    __REPO_URL__: JSON.stringify(
      process.env.VITE_REPO_URL || 'https://github.com/databrainsco/veyra',
    ),
  },
})
