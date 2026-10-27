self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      const windows = await self.clients.matchAll({ type: 'window' })
      await self.registration.unregister()
      for (const client of windows) client.navigate(client.url)
    })(),
  )
})
