// Background service worker - WebSocket сигналинг и хранение сообщений

const WS_URL = 'ws://localhost:3000';

let ws = null;
let clientId = null;
let isOnline = false;
let unreadMessages = [];
let popupPort = null;

// Подключение WebSocket
connectWebSocket();

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[Background] WebSocket подключен');
    notifyPopup({ type: 'ws-connected' });
  };

  ws.onmessage = async (event) => {
    let data;
    try {
      if (event.data instanceof Blob) {
        data = JSON.parse(await event.data.text());
      } else {
        data = JSON.parse(event.data);
      }
    } catch (error) {
      console.error('[Background] Ошибка парсинга:', error);
      return;
    }

    console.log('[Background] Получено:', data.type, data);

    switch (data.type) {
      case 'init':
        clientId = data.clientId;
        console.log('[Background] Мой ID:', clientId);
        notifyPopup({ type: 'init', clientId: data.clientId });
        break;

      case 'status':
        isOnline = data.count === 2;
        console.log('[Background] Статус:', { online: isOnline, shouldInitiate: data.shouldInitiate });
        // НЕ меняем badge здесь - только когда P2P реально подключится
        notifyPopup({ type: 'status', online: isOnline, shouldInitiate: data.shouldInitiate });
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        // Пересылаем WebRTC сигналы в popup
        notifyPopup({ type: 'webrtc-signal', signal: data });
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('[Background] WebSocket ошибка:', error);
  };

  ws.onclose = () => {
    console.log('[Background] WebSocket закрыт, переподключение...');
    isOnline = false;
    updateBadge(false);
    notifyPopup({ type: 'ws-disconnected' });
    setTimeout(connectWebSocket, 3000);
  };
}

// Слушаем long-lived connection от popup
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    console.log('[Background] Popup подключился');
    popupPort = port;

    // Отправляем текущий статус
    port.postMessage({ 
      type: 'init-state', 
      online: isOnline,
      clientId: clientId,
      unreadMessages: unreadMessages
    });

    // Очищаем непрочитанные при открытии popup
    unreadMessages = [];
    updateBadgeCount(0);

    port.onMessage.addListener((message) => {
      console.log('[Background] Сообщение от popup:', message.type);

      switch (message.type) {
        case 'ws-send':
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message.data));
          }
          break;

        case 'p2p-connected':
          // P2P соединение установлено - показываем зеленый badge
          console.log('[Background] P2P соединение активно');
          updateBadge(true);
          break;

        case 'p2p-disconnected':
          // P2P соединение закрыто - показываем красный badge
          console.log('[Background] P2P соединение закрыто');
          updateBadge(false);
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[Background] Popup отключился');
      popupPort = null;
      // Popup закрыт = P2P закрыт = красный badge
      updateBadge(false);
    });
  }
});

// Слушаем обычные сообщения (для совместимости)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Получено сообщение:', message.type);

  switch (message.type) {
    case 'getStatus':
      sendResponse({ 
        online: isOnline, 
        clientId: clientId,
        unreadMessages: unreadMessages
      });
      break;
  }

  return true;
});

// Отправка сообщения в popup
function notifyPopup(message) {
  if (popupPort) {
    try {
      popupPort.postMessage(message);
    } catch (err) {
      console.log('[Background] Popup недоступен:', err.message);
      popupPort = null;
    }
  }
}

// Обновление badge
function updateBadge(online) {
  const color = online ? '#10b981' : '#ef4444';
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text: '●' });
}

// Обновление счетчика непрочитанных
function updateBadgeCount(count) {
  if (count > 0) {
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
    chrome.action.setBadgeText({ text: count.toString() });
  } else if (isOnline) {
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    chrome.action.setBadgeText({ text: '●' });
  }
}

// Инициализация
chrome.runtime.onInstalled.addListener(() => {
  updateBadge(false);
});

console.log('[Background] Service Worker загружен');
