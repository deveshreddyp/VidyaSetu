// Firebase Cloud Messaging Service Worker
// Receives background push notifications when the browser tab is closed/hidden.
// Uses compat SDK (importScripts) since service workers cannot use ES modules.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDx1-u3gCNQCNmef7b5wJpkXi0paUGqUO4',
  authDomain: 'vidyasetu-ai-2026.firebaseapp.com',
  projectId: 'vidyasetu-ai-2026',
  storageBucket: 'vidyasetu-ai-2026.firebasestorage.app',
  messagingSenderId: '819901877182',
  appId: '1:819901877182:web:d6f36f3a00be0ccf40c7ef',
});

const messaging = firebase.messaging();

// Handle background messages (tab closed or not focused)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const chatId = payload.data?.chatId;
  const chatName = payload.data?.chatName || 'Chat';

  self.registration.showNotification(title || 'New Message', {
    body: body || 'You have a new message',
    icon: '/logo.jpeg',
    badge: '/logo.jpeg',
    tag: chatId || 'chat-notification',  // Replace earlier notif from same chat
    renotify: true,
    data: { chatId, chatName },
  });
});

// Clicking a notification opens the app and navigates to the chat
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const chatId = event.notification.data?.chatId;
  const url = chatId ? `/?chatId=${chatId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus an existing tab if one is open
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
