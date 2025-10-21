// PWA версия p2p-mas
// Определяем URL WebSocket сервера
const WS_URL = (window.location.hostname === 'localhost' || window.location.hostname === '192.168.3.83')
  ? 'ws://192.168.3.83:3000' 
  : 'wss://confirm4you.com';

let ws = null;
let pc = null;
let dataChannel = null;
let clientId = null;
let isOnline = false;
let shouldInitiate = false;

// DOM элементы
const elements = {
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  waiting: document.getElementById('waiting'),
  chat: document.getElementById('chat'),
  messages: document.getElementById('messages'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  installPrompt: document.getElementById('installPrompt'),
  installBtn: document.getElementById('installBtn'),
  dismissBtn: document.getElementById('dismissBtn')
};

// PWA функциональность
let deferredPrompt = null;

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker зарегистрирован:', registration);
      })
      .catch((error) => {
        console.error('[PWA] Ошибка регистрации Service Worker:', error);
      });
  });
}

// Обработка установки PWA
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA] Показываем prompt для установки');
  e.preventDefault();
  deferredPrompt = e;
  elements.installPrompt.classList.add('show');
});

elements.installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Результат установки:', outcome);
    deferredPrompt = null;
    elements.installPrompt.classList.remove('show');
  }
});

elements.dismissBtn.addEventListener('click', () => {
  elements.installPrompt.classList.remove('show');
});

// Проверка на уже установленное приложение
window.addEventListener('appinstalled', () => {
  console.log('[PWA] Приложение установлено');
  elements.installPrompt.classList.remove('show');
});

// Подключение к WebSocket
connectWebSocket();

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[PWA] WebSocket подключен к:', WS_URL);
    elements.connectionStatus.textContent = 'Подключено к серверу';
  };

  ws.onpong = () => {
    console.log('[PWA] Получен pong от сервера');
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
      console.error('[PWA] Ошибка парсинга:', error);
      return;
    }

    console.log('[PWA] Получено:', data.type);

    switch (data.type) {
      case 'init':
        clientId = data.clientId;
        console.log('[PWA] Мой ID:', clientId);
        break;

      case 'status':
        isOnline = data.count === 2;
        shouldInitiate = data.shouldInitiate;
        console.log('[PWA] Статус получен:', { 
          count: data.count, 
          isOnline, 
          shouldInitiate, 
          hasPC: !!pc,
          channelOpen: dataChannel?.readyState === 'open'
        });
        updateUI();

        // Создаем P2P если нужно
        if (isOnline && shouldInitiate && !pc) {
          console.log('[PWA] Создаю P2P как инициатор');
          createPeerConnection(true);
        }
        break;

      case 'offer':
        await handleOffer(data.offer);
        break;

      case 'answer':
        await handleAnswer(data.answer);
        break;

      case 'ice-candidate':
        await handleIceCandidate(data.candidate);
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('[PWA] WebSocket ошибка:', error);
  };

  ws.onclose = (event) => {
    console.log('[PWA] WebSocket закрыт:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    elements.connectionStatus.textContent = 'Переподключение...';
    isOnline = false;
    closePeerConnection();
    updateUI();
    
    setTimeout(connectWebSocket, 3000);
  };
}

// WebRTC соединение
function createPeerConnection(isInitiator) {
  console.log('[PWA] Создаю PeerConnection, isInitiator:', isInitiator);
  
  try {
    pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    console.log('[PWA] PeerConnection создан успешно');
  } catch (error) {
    console.error('[PWA] Ошибка создания PeerConnection:', error);
    return;
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('[PWA] Отправка ICE candidate');
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    } else {
      console.log('[PWA] ICE gathering завершен');
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log('[PWA] ICE connection state:', pc.iceConnectionState);
  };

  pc.onconnectionstatechange = () => {
    console.log('[PWA] Connection state:', pc.connectionState);
  };

  if (isInitiator) {
    try {
      dataChannel = pc.createDataChannel('messages', {
        ordered: true
      });
      console.log('[PWA] DataChannel создан');
      setupDataChannel();
    } catch (error) {
      console.error('[PWA] Ошибка создания DataChannel:', error);
    }
  } else {
    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      console.log('[PWA] DataChannel получен');
      setupDataChannel();
    };
  }

  // Создаем offer если это инициатор
  if (isInitiator) {
    setTimeout(async () => {
      try {
        console.log('[PWA] Создаю offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('[PWA] Offer создан и отправлен');
        ws.send(JSON.stringify({
          type: 'offer',
          offer: pc.localDescription
        }));
      } catch (error) {
        console.error('[PWA] Ошибка создания offer:', error);
      }
    }, 1000);
  }
}

function setupDataChannel() {
  console.log('[PWA] Настройка data channel, текущее состояние:', dataChannel.readyState);
  
  dataChannel.onopen = () => {
    console.log('[PWA] Data channel открыт');
    updateUI();
  };

  dataChannel.onclose = () => {
    console.log('[PWA] Data channel закрыт');
    updateUI();
  };

  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[PWA] Получено сообщение:', data);
      addMessage(data.text, data.time, false);
      
      // Показываем push-уведомление
      showNotification('Новое сообщение', data.text);
    } catch (error) {
      console.error('[PWA] Ошибка парсинга сообщения:', error);
    }
  };
}

async function handleOffer(offer) {
  console.log('[PWA] Обработка offer');
  if (!pc) {
    createPeerConnection(false);
  }

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  ws.send(JSON.stringify({
    type: 'answer',
    answer: pc.localDescription
  }));
}

async function handleAnswer(answer) {
  console.log('[PWA] Обработка answer');
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleIceCandidate(candidate) {
  console.log('[PWA] Обработка ICE candidate');
  if (pc && pc.remoteDescription) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

function closePeerConnection() {
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }

  if (pc) {
    pc.close();
    pc = null;
  }
}

// UI функции
function updateUI() {
  const channelOpen = dataChannel && dataChannel.readyState === 'open';
  
  console.log('[PWA] Обновление UI:', { 
    isOnline, 
    channelOpen, 
    dataChannelState: dataChannel?.readyState,
    shouldShowChat: isOnline && channelOpen
  });

  elements.statusDot.classList.toggle('online', isOnline && channelOpen);
  elements.statusText.textContent = (isOnline && channelOpen) ? 'Онлайн' : 'Офлайн';

  if (isOnline && channelOpen) {
    console.log('[PWA] Показываем чат');
    elements.waiting.style.display = 'none';
    elements.chat.classList.add('active');
    elements.messageInput.focus();
  } else {
    console.log('[PWA] Показываем ожидание');
    elements.waiting.style.display = 'flex';
    elements.chat.classList.remove('active');
  }
}

function sendMessage() {
  const text = elements.messageInput.value.trim();
  if (!text || !dataChannel || dataChannel.readyState !== 'open') return;

  const time = new Date().toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  dataChannel.send(JSON.stringify({ text, time }));
  addMessage(text, time, true);

  elements.messageInput.value = '';
  elements.messageInput.focus();
}

function addMessage(text, time, isMine) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isMine ? 'mine' : 'theirs'}`;
  
  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  textDiv.textContent = text;
  
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = time;
  
  messageDiv.appendChild(textDiv);
  messageDiv.appendChild(timeDiv);
  elements.messages.appendChild(messageDiv);
  
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

// Push-уведомления
async function showNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'p2p-message'
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
}

// Запрос разрешения на уведомления
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().then((permission) => {
    console.log('[PWA] Разрешение на уведомления:', permission);
  });
}

// События
elements.sendBtn.addEventListener('click', sendMessage);

elements.messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Предотвращение зума при двойном тапе
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  const now = (new Date()).getTime();
  if (now - lastTouchEnd <= 300) {
    event.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Обработка изменения ориентации
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }, 100);
});

console.log('[PWA] p2p-mas PWA загружен');
