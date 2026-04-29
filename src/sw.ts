/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
} from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { BackgroundSyncPlugin } from 'workbox-background-sync'

declare const self: ServiceWorkerGlobalScope

clientsClaim()
self.skipWaiting()

// --- Precaching ---
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// --- Navigation fallback ---
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'navigations',
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 }),
      ],
    })
  )
)

// --- Supabase REST API (PostgREST) ---
registerRoute(
  ({ url, request }) =>
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/rest/') &&
    request.method === 'GET',
  new NetworkFirst({
    cacheName: 'supabase-rest',
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5,
      }),
    ],
  })
)

// --- Supabase Auth endpoints ---
registerRoute(
  ({ url }) =>
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/auth/'),
  new NetworkFirst({ cacheName: 'supabase-auth', networkTimeoutSeconds: 10 })
)

// --- Supabase Storage (avatars, portfolio images) ---
registerRoute(
  ({ url }) =>
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/storage/'),
  new CacheFirst({
    cacheName: 'supabase-storage',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
    ],
  })
)

// --- Static assets (Google Fonts, CDN icons, etc.) ---
registerRoute(
  ({ request }) =>
    request.destination === 'font' ||
    request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
)

// --- Background sync for mutations ---
const bgSyncPlugin = new BackgroundSyncPlugin('message-queue', {
  maxRetentionTime: 60 * 24,
})

registerRoute(
  ({ url, request }) =>
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/rest/') &&
    request.method === 'POST',
  new NetworkFirst({
    cacheName: 'supabase-mutations',
    plugins: [bgSyncPlugin],
  }),
  'POST'
)

// =========================================================
// PUSH NOTIFICATIONS
// =========================================================

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  const data = event.data.json() as {
    title: string
    body: string
    url?: string
    icon?: string
    badge?: string
    tag?: string
    data?: Record<string, unknown>
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? '/pwa-192x192.png',
      badge: data.badge ?? '/pwa-192x192.png',
      tag: data.tag ?? 'sanayix-notification',
      data: { url: data.url ?? '/notifications', ...data.data },
    } as NotificationOptions & { vibrate?: number[] })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const targetUrl = (event.notification.data?.url as string) ?? '/notifications'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('focus' in client) {
            client.focus()
            client.postMessage({ type: 'NAVIGATE', url: targetUrl })
            return
          }
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})
