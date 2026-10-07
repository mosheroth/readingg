import type { Plugin, ViteDevServer } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    catalogDevApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'השולחן — שלוש המלצות קריאה',
        short_name: 'השולחן',
        description: 'סקר קצר, שלושה קוראים, ספר אחד שאתם בוחרים.',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        background_color: '#1c1612',
        theme_color: '#1c1612',
        start_url: '/',
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

function catalogDevApi(): Plugin {
  const attach = (server: ViteDevServer) => {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url || ''
      if (!url.startsWith('/api/books')) {
        next()
        return
      }
      try {
        const mod = (await server.ssrLoadModule('/src/simania/http.ts')) as typeof import('./src/simania/http.ts')
        const result = await mod.booksPayload(url)
        res.statusCode = result.status
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(result.body))
      } catch (error) {
        res.statusCode = 500
        res.setHeader('content-type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'failed', books: [], total: 0 }))
      }
    })
  }
  return {
    name: 'catalog-dev-api',
    configureServer(server) {
      attach(server)
    },
  }
}
