// Web Push service worker: shows the notification and handles the
// "Accetta richiesta" action / a tap on the notification body by opening (or
// focusing) the staff dashboard with ?claim=<id>, which staff-app.tsx reads
// to auto-claim the request.
self.addEventListener('push', (event) => {
  let data = { title: 'RoomCall', body: 'Nuova richiesta', data: {} }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // ignore malformed payloads, fall back to the defaults above
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: data.data,
      actions: [{ action: 'accept', title: 'Accetta richiesta' }],
      requireInteraction: true,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/staff'

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(url)
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
