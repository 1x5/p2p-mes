// Service Worker для PWA версии p2p-mas
const CACHE_NAME = 'p2p-mas-v1';
const urlsToCache = [
  '/',
  '/app.html',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Установка Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кэширование файлов');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Ошибка кэширования:', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация Service Worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // Для WebSocket соединений не используем кэш
  if (event.request.url.startsWith('ws://') || event.request.url.startsWith('wss://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем из кэша если есть
        if (response) {
          return response;
        }

        // Иначе загружаем из сети
        return fetch(event.request).catch(() => {
          // Если нет сети, показываем офлайн страницу
          if (event.request.destination === 'document') {
            return caches.match('/app.html');
          }
        });
      })
  );
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  console.log('[SW] Получено push-уведомление');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'p2p-mas', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Новое сообщение',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: 'Открыть',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Закрыть'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'p2p-mas', options)
  );
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Клик по уведомлению:', event.action);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Обработка сообщений от основного приложения
self.addEventListener('message', (event) => {
  console.log('[SW] Получено сообщение:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker загружен');
