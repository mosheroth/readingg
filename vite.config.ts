import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        globIgnores: ['**/catalog-data-*.js'],
      },
      manifest: {
        name: 'השולחן',
        short_name: 'השולחן',
        description: 'ספר אחרון, שתי שאלות, ושלושה ספרים עם ביקורת טובה ורעה.',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        background_color: '#1c1612',
        theme_color: '#1c1612',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173 },
  test: { environment: 'node' },
})
