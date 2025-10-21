// Background service worker - управляет offscreen document для WebRTC

const WS_URL = 'ws://localhost:3000'; // Для production замени на wss://твой-домен.com

let isOnline = false;
let channelOpen = false;
let clientId = null;

// Создание offscreen document
async function setupOffscreenDocument() {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')]
    });

    if (existingContexts.length > 0) {
      console.log('[Background] Offscreen document уже существует');
      return;
    }

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WEB_RTC'],
      justification: 'WebRTC P2P соединение для мессенджера'
    });

    console.log('[Background] Offscreen document создан');
    
    // Подключаем WebSocket через offscreen
    setTimeout(() => {
      chrome.runtime.sendMessage({ 
        type: 'ws-connect', 
        url: WS_URL 
      }).catch(err => console.log('[Background] Offscreen еще не готов:', err.message));
    }, 200);
  } catch (error) {
    console.error('[Background] Ошибка создания offscreen:', error);
  }
}

// Создание offscreen document при установке
chrome.runtime.onInstalled.addListener(async () => {
  await setupOffscreenDocument();
  updateBadge(false);
});

// Создание offscreen document при старте
chrome.runtime.onStartup.addListener(async () => {
  await setupOffscreenDocument();
});

// Слушаем сообщения от offscreen и popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Получено:', message.type, 'от', sender.url ? 'offscreen' : 'popup');

  switch (message.type) {
    case 'ws-open':
      console.log('[Background] WebSocket подключен');
      notifyPopup({ type: 'connection', status: 'connected' });
      break;

    case 'ws-close':
      console.log('[Background] WebSocket отключен');
      isOnline = false;
      channelOpen = false;
      updateBadge(false);
      notifyPopup({ type: 'connection', status: 'disconnected' });
      break;

    case 'init':
      clientId = message.clientId;
      console.log('[Background] Мой ID:', clientId);
      break;

    case 'status':
      isOnline = message.online;
      console.log('[Background] Статус изменился:', { 
        online: isOnline, 
        shouldInitiate: message.shouldInitiate,
        clientId: message.clientId 
      });
      updateBadge(isOnline);
      notifyPopup({ type: 'status', online: isOnline, count: message.count });
      break;

    case 'channel-open':
      channelOpen = true;
      console.log('[Background] Data channel открыт');
      notifyPopup({ type: 'channel', status: 'open' });
      break;

    case 'channel-close':
      channelOpen = false;
      console.log('[Background] Data channel закрыт');
      notifyPopup({ type: 'channel', status: 'closed' });
      break;

    case 'message':
      console.log('[Background] Получено сообщение:', message.data);
      notifyPopup({ type: 'message', data: message.data });
      break;

    case 'getStatus':
      console.log('[Background] Запрос статуса от popup');
      sendResponse({ 
        online: isOnline, 
        channelOpen: channelOpen 
      });
      break;

    case 'sendMessage':
      console.log('[Background] Отправка сообщения через offscreen');
      chrome.runtime.sendMessage({ 
        type: 'send-message', 
        data: message.data 
      }).then(response => {
        sendResponse(response);
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true; // Асинхронный ответ

    case 'keepalive':
      // Offscreen document шлет keepalive чтобы оставаться активным
      sendResponse({ alive: true });
      break;
  }

  return true;
});

// Отправка сообщения в popup
function notifyPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup может быть закрыт, это нормально
  });
}

// Обновление badge
function updateBadge(online) {
  const color = online ? '#10b981' : '#ef4444';
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text: '●' });
}

console.log('[Background] Service Worker загружен');
