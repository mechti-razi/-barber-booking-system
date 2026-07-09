/**
 * Push Notification Service Worker
 * Handles push events from the server and shows notifications even when the app is closed.
 * This file must be served from the root of the app (e.g. /push-sw.js).
 */

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    // Plain text fallback
    data = {
      notification: {
        title: 'Barber Reminder',
        body: event.data.text(),
      },
    };
  }

  const notification = data.notification || {};
  const title = notification.title || 'Barber Booking';
  const options = {
    body: notification.body || '',
    icon: notification.icon || '/assets/icons/icon-192x192.png',
    badge: notification.badge || '/assets/icons/icon-72x72.png',
    data: notification.data || {},
    actions: notification.actions || [],
    requireInteraction: false,
    tag: 'appointment-reminder-' + (notification.data?.appointment_id || Date.now()),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const url = event.notification.data?.url || '/appointments';
  const action = event.action;

  if (action === 'view' || !action) {
    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then(function (clientList) {
          // If a window is already open, focus it and navigate
          for (const client of clientList) {
            if ('focus' in client) {
              client.focus();
              if ('navigate' in client) {
                client.navigate(url);
              }
              return;
            }
          }
          // Otherwise open a new window
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

self.addEventListener('pushsubscriptionchange', function (event) {
  // The browser re-subscribes automatically; we just need to update the server.
  // This is handled by the Angular app when it next loads.
  console.log('[push-sw] pushsubscriptionchange — re-subscribe on next app load');
});
