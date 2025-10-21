// Упрощенная версия popup.js с исправленной логикой инициатора

// WebSocket URL - автоматическое определение
const WS_URL = window.location.protocol === 'https:' 
  ? 'wss://твой-домен.com' 
  : 'ws://localhost:3000';

let ws = null;
let pc = null;
let dataChannel = null;
let clientId = null;
let isOnline = false;

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

// STUN серверы Google
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Подключение к WebSocket серверу
function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket подключен');
    elements.connectionStatus.textContent = 'Подключено к серверу';
  };

  ws.onmessage = async (event) => {
    let data;
    try {
      // Проверяем тип данных
      if (event.data instanceof Blob) {
        data = JSON.parse(await event.data.text());
      } else {
        data = JSON.parse(event.data);
      }
    } catch (error) {
      console.error('Ошибка парсинга сообщения:', error, event.data);
      return;
    }
    
    console.log('Получено сообщение:', data);

    switch (data.type) {
      case 'init':
        clientId = data.clientId;
        console.log('Мой ID:', clientId);
        break;

      case 'status':
        updateStatus(data.online, data.count);
        console.log('Status:', { 
          online: data.online, 
          count: data.count, 
          shouldInitiate: data.shouldInitiate,
          clientId: clientId,
          hasPC: !!pc
        });
        
        // Только первый клиент создает offer, и только если еще нет соединения
        if (data.shouldInitiate && !pc && clientId === 1) {
          console.log('Создаю P2P соединение как инициатор...');
          createPeerConnection(true);
        }
        break;

      case 'offer':
        console.log('Получен offer от другого клиента');
        await handleOffer(data.offer);
        break;

      case 'answer':
        console.log('Получен answer от другого клиента');
        await handleAnswer(data.answer);
        break;

      case 'ice-candidate':
        await handleIceCandidate(data.candidate);
        break;

      case 'error':
        console.error('Ошибка сервера:', data.message);
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket ошибка:', error);
    elements.connectionStatus.textContent = 'Ошибка подключения';
  };

  ws.onclose = () => {
    console.log('WebSocket отключен');
    elements.connectionStatus.textContent = 'Переподключение...';
    updateStatus(false, 0);
    closePeerConnection();
    
    // Переподключение через 3 секунды
    setTimeout(connectWebSocket, 3000);
  };
}

// Обновление статуса
function updateStatus(online, count) {
  isOnline = online && count === 2;
  
  elements.statusDot.classList.toggle('online', isOnline);
  elements.statusText.textContent = isOnline ? 'Онлайн' : 'Офлайн';
  
  // Обновление badge расширения
  chrome.runtime.sendMessage({ 
    type: 'updateBadge', 
    online: isOnline 
  });

  if (!isOnline) {
    elements.waiting.style.display = 'flex';
    elements.chat.classList.remove('active');
  }
}

// Создание P2P соединения
function createPeerConnection(isInitiator) {
  console.log('Создание RTCPeerConnection, initiator:', isInitiator);
  
  pc = new RTCPeerConnection(iceServers);

  // ICE кандидаты
  pc.onicecandidate = (event) => {
    if (event.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    }
  };

  // Состояние подключения
  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log('P2P соединение установлено!');
    }
  };

  if (isInitiator) {
    // Создаем data channel
    dataChannel = pc.createDataChannel('chat');
    setupDataChannel();
    
    // Создаем offer
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        console.log('Отправляю offer...');
        ws.send(JSON.stringify({
          type: 'offer',
          offer: pc.localDescription
        }));
      })
      .catch(err => console.error('Ошибка создания offer:', err));
  } else {
    // Ждем data channel от инициатора
    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel();
    };
  }
}

// Настройка data channel
function setupDataChannel() {
  dataChannel.onopen = () => {
    console.log('Data channel открыт');
    elements.waiting.style.display = 'none';
    elements.chat.classList.add('active');
    elements.messageInput.focus();
  };

  dataChannel.onclose = () => {
    console.log('Data channel закрыт');
    elements.waiting.style.display = 'flex';
    elements.chat.classList.remove('active');
  };

  dataChannel.onmessage = (event) => {
    const message = JSON.parse(event.data);
    addMessage(message.text, message.time, false);
  };
}

// Обработка offer
async function handleOffer(offer) {
  console.log('Обрабатываю offer...', offer);
  try {
    if (!pc) {
      console.log('Создаю новое P2P соединение для ответа...');
      createPeerConnection(false);
    }

    console.log('Устанавливаю remote description...');
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    console.log('Создаю answer...');
    const answer = await pc.createAnswer();
    
    console.log('Устанавливаю local description...');
    await pc.setLocalDescription(answer);

    console.log('Отправляю answer...', answer);
    ws.send(JSON.stringify({
      type: 'answer',
      answer: pc.localDescription
    }));
    console.log('Answer отправлен успешно!');
  } catch (error) {
    console.error('Ошибка обработки offer:', error);
  }
}

// Обработка answer
async function handleAnswer(answer) {
  console.log('Обрабатываю answer...');
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

// Обработка ICE candidate
async function handleIceCandidate(candidate) {
  if (pc) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

// Закрытие P2P соединения
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

// Отправка сообщения
function sendMessage() {
  const text = elements.messageInput.value.trim();
  if (!text || !dataChannel || dataChannel.readyState !== 'open') return;

  const time = new Date().toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const message = { text, time };
  
  dataChannel.send(JSON.stringify(message));
  addMessage(text, time, true);
  
  elements.messageInput.value = '';
  elements.messageInput.focus();
}

// Добавление сообщения в UI
function addMessage(text, time, isMine) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isMine ? 'mine' : 'theirs'}`;
  
  messageDiv.innerHTML = `
    <div class="message-content">${escapeHtml(text)}</div>
    <div class="message-time">${time}</div>
  `;
  
  elements.messages.appendChild(messageDiv);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

// Экранирование HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// События
elements.sendBtn.addEventListener('click', sendMessage);
elements.messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Запуск при открытии popup
connectWebSocket();
