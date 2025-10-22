// Renderer process - WebRTC P2P логика для Electron

// Автоматическое определение локального или продакшн сервера
const WS_URL = 'wss://confirm4you.com/ws';

const elements = {
  waiting: document.getElementById('waiting'),
  chat: document.getElementById('chat'),
  messages: document.getElementById('messages'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  connectionStatus: document.getElementById('connectionStatus')
};

let ws = null;
let pc = null;
let dataChannel = null;
let isOnline = false;
let clientId = null;
let shouldInitiate = false;

// Периодическая проверка соединения
let connectionCheckInterval = null;

function startConnectionCheck() {
  if (connectionCheckInterval) return;
  
  connectionCheckInterval = setInterval(() => {
    if (isOnline && shouldInitiate && (!pc || !dataChannel || dataChannel.readyState !== 'open')) {
      console.log('[App] Периодическая проверка: пересоздаем P2P соединение');
      if (pc) {
        pc.close();
        pc = null;
        dataChannel = null;
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        createPeerConnection(true);
      } else {
        console.log('[App] WebSocket не готов для периодической проверки');
      }
    }
  }, 2000); // Проверяем каждые 2 секунды (было 0.5 сек)
}

function stopConnectionCheck() {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
}

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Подключение к WebSocket
connectWebSocket();

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('[App] WebSocket подключен');
    elements.connectionStatus.textContent = 'Подключено к серверу';
  };

  ws.onpong = () => {
    console.log('[App] Получен pong от сервера');
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
      console.error('[App] Ошибка парсинга:', error);
      return;
    }

    console.log('[App] Получено:', data.type);

    switch (data.type) {
      case 'init':
        clientId = data.clientId;
        console.log('[App] Мой ID:', clientId);
        break;

      case 'status':
        isOnline = data.count === 2;
        shouldInitiate = data.shouldInitiate;
        const readyToConnect = data.readyToConnect;
        const connectionState = data.connectionState;
        
        console.log('[App] Статус:', { 
          count: data.count,
          isOnline, 
          shouldInitiate,
          readyToConnect,
          connectionState,
          hasPC: !!pc,
          channelOpen: dataChannel?.readyState === 'open'
        });
        updateUI();

        // Обновляем tray иконку
        if (window.electronAPI) {
          window.electronAPI.updateTrayIcon(isOnline && dataChannel?.readyState === 'open');
        }

        // Мгновенная логика создания P2P соединения
        if (isOnline && shouldInitiate && readyToConnect) {
          const needNewPeerConnection = !pc || !dataChannel || dataChannel.readyState !== 'open';
          
          if (needNewPeerConnection) {
            console.log('[App] МГНОВЕННО создаю P2P как инициатор');
            // Закрываем старое соединение если есть
            if (pc) {
              pc.close();
              pc = null;
              dataChannel = null;
            }
            // Небольшая задержка чтобы WebSocket успел подключиться
            setTimeout(() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                createPeerConnection(true);
              } else {
                console.log('[App] WebSocket не готов, пропускаем создание P2P');
              }
            }, 100);
            // Запускаем периодическую проверку
            startConnectionCheck();
          } else {
            console.log('[App] P2P уже работает, останавливаем проверку');
            stopConnectionCheck();
          }
        } else if (!isOnline) {
          // Если не онлайн, останавливаем проверку
          stopConnectionCheck();
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

      case 'error':
        console.log('[App] Получена ошибка от сервера:', data.message);
        // Останавливаем все проверки при ошибке
        stopConnectionCheck();
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('[App] WebSocket ошибка:', error);
  };

  ws.onclose = (event) => {
    console.log('[App] WebSocket закрыт:', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    elements.connectionStatus.textContent = 'Переподключение...';
    isOnline = false;
    closePeerConnection();
    updateUI();
    
    if (window.electronAPI) {
      window.electronAPI.updateTrayIcon(false);
    }
    
    setTimeout(connectWebSocket, 3000);
  };
}

// WebRTC соединение
function createPeerConnection(isInitiator) {
  console.log('[App] Создаю PeerConnection, isInitiator:', isInitiator);
  pc = new RTCPeerConnection(iceServers);

  pc.onicecandidate = (event) => {
    if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
      console.log('[App] Отправляю ICE candidate');
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('[App] Connection state:', pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log('[App] P2P соединение установлено!');
    }
  };

  if (isInitiator) {
    dataChannel = pc.createDataChannel('chat');
    setupDataChannel();

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        console.log('[App] Отправляю offer');
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'offer',
            offer: pc.localDescription
          }));
        } else {
          console.log('[App] WebSocket не готов для отправки offer');
        }
      })
      .catch(err => console.error('[App] Ошибка создания offer:', err));
  } else {
    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel();
    };
  }
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    console.log('[App] Data channel открыт');
    // Останавливаем периодическую проверку когда соединение установлено
    stopConnectionCheck();
    updateUI();
    
    // Обновляем tray иконку на зеленую
    if (window.electronAPI) {
      window.electronAPI.updateTrayIcon(true);
    }
  };

  dataChannel.onclose = () => {
    console.log('[App] Data channel закрыт');
    updateUI();
    
    // Обновляем tray иконку на красную
    if (window.electronAPI) {
      window.electronAPI.updateTrayIcon(false);
    }
  };

  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[App] Получено сообщение:', data);
      addMessage(data.text, data.time, false);
      
      // Показываем нативное уведомление
      if (window.electronAPI) {
        window.electronAPI.showNotification('Новое сообщение', data.text);
      }
    } catch (error) {
      console.error('[App] Ошибка парсинга сообщения:', error);
    }
  };
}

async function handleOffer(offer) {
  console.log('[App] Обработка offer');
  if (!pc) {
    createPeerConnection(false);
  }

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'answer',
      answer: pc.localDescription
    }));
  } else {
    console.log('[App] WebSocket не готов для отправки answer');
  }
}

async function handleAnswer(answer) {
  console.log('[App] Обработка answer');
  if (pc) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
}

async function handleIceCandidate(candidate) {
  if (pc && candidate) {
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
  
  console.log('[App] Обновление UI:', { isOnline, channelOpen });

  elements.statusDot.classList.toggle('online', isOnline && channelOpen);
  elements.statusText.textContent = (isOnline && channelOpen) ? 'Онлайн' : 'Офлайн';

  if (isOnline && channelOpen) {
    elements.waiting.style.display = 'none';
    elements.chat.classList.add('active');
    elements.messageInput.focus();
  } else {
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

// Автопереподключение при возврате в приложение
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('[App] Приложение стало активным');
    
    // Переподключаемся если потеряли соединение
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('[App] WebSocket не подключен, переподключаемся...');
      connectWebSocket();
    } else {
      console.log('[App] WebSocket уже подключен');
      // Проверяем P2P соединение
      if (!dataChannel || dataChannel.readyState !== 'open') {
        console.log('[App] P2P не активен, пересоздаем соединение...', {
          isOnline,
          shouldInitiate,
          clientId
        });
        // Закрываем старое P2P если есть
        if (pc) {
          pc.close();
          pc = null;
          dataChannel = null;
        }
        
        // Пересоздаем P2P если мы инициатор и оба онлайн
        if (isOnline && shouldInitiate) {
          console.log('[App] Пересоздаем P2P соединение...');
          createPeerConnection(true);
          // Запускаем периодическую проверку
          startConnectionCheck();
        } else {
          console.log('[App] НЕ пересоздаем P2P, причина:', {
            isOnline: isOnline ? 'ОК' : 'ОФЛАЙН',
            shouldInitiate: shouldInitiate ? 'ОК' : 'НЕ ИНИЦИАТОР'
          });
        }
      }
    }
  } else {
    console.log('[App] Приложение ушло в фон');
  }
});

// События
elements.sendBtn.addEventListener('click', sendMessage);
elements.messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

console.log('[App] Приложение загружено');

