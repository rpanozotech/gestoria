self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let data = { title: 'RP Asesoría', body: 'Tienes una actualización pendiente en RP Asesoría', url: '/crm' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: 'Tienes una actualización pendiente en RP Asesoría',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: data.url || '/crm' },
    tag: 'rp-asesoria-update',
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const target = event.notification.data?.url || '/crm';
    const existing = clients.find((client) => 'focus' in client);
    return existing ? existing.focus() : self.clients.openWindow(target);
  }));
});
