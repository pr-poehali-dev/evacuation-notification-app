self.addEventListener('push', function (event) {
  let data = { title: 'EVAC·SYSTEM', body: 'Тревога эвакуации!' };
  try {
    data = event.data.json();
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'evacuation-alarm',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: self.location.origin },
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
