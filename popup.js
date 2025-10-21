// Popup - WebRTC соединение и UI

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

let port = null;
let pc = null;
let dataChannel = null;
let isOnline = false;
let clientId = null;
let shouldInitiate = false;

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Подключение к background через long-lived connection
port = chrome.runtime.connect({ name: 'popup' });

port.onMessage.addListener((message) => {
  console.log('[Popup] Получено от background:', message.type);

  switch (message.type) {
    case 'init-state':
      clientId = message.clientId;
      isOnline = message.online;
      console.log('[Popup] Начальное состояние:', { clientId, isOnline });
      updateUI();
      break;

    case 'init':
      clientId = message.clientId;
      console.log('[Popup] Мой ID:', clientId);
      break;

    case 'status':
      isOnline = message.online;
      shouldInitiate = message.shouldInitiate;
      console.log('[Popup] Статус:', { isOnline, shouldInitiate });
      updateUI();

      // Создаем P2P если нужно
      if (isOnline && shouldInitiate && !pc) {
        console.log('[Popup] Создаю P2P как инициатор');
        createPeerConnection(true);
      }
      break;

    case 'webrtc-signal':
      handleSignal(message.signal);
      break;

    case 'ws-connected':
      elements.connectionStatus.textContent = 'Подключено к серверу';
      break;

    case 'ws-disconnected':
      elements.connectionStatus.textContent = 'Переподключение...';
      isOnline = false;
      closePeerConnection();
      port.postMessage({ type: 'p2p-disconnected' });
      updateUI();
      break;
  }
});

// Обработка WebRTC сигналов
async function handleSignal(signal) {
  console.log('[Popup] WebRTC сигнал:', signal.type);

  switch (signal.type) {
    case 'offer':
      await handleOffer(signal.offer);
      break;

    case 'answer':
      await handleAnswer(signal.answer);
      break;

    case 'ice-candidate':
      await handleIceCandidate(signal.candidate);
      break;
  }
}

// WebRTC соединение
function createPeerConnection(isInitiator) {
  console.log('[Popup] Создаю PeerConnection, isInitiator:', isInitiator);
  pc = new RTCPeerConnection(iceServers);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('[Popup] Отправляю ICE candidate');
      port.postMessage({
        type: 'ws-send',
        data: {
          type: 'ice-candidate',
          candidate: event.candidate
        }
      });
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('[Popup] Connection state:', pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log('[Popup] P2P соединение установлено!');
    }
  };

  if (isInitiator) {
    dataChannel = pc.createDataChannel('chat');
    setupDataChannel();

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        console.log('[Popup] Отправляю offer');
        port.postMessage({
          type: 'ws-send',
          data: {
            type: 'offer',
            offer: pc.localDescription
          }
        });
      })
      .catch(err => console.error('[Popup] Ошибка создания offer:', err));
  } else {
    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel();
    };
  }
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    console.log('[Popup] Data channel открыт');
    // Сообщаем background что P2P подключен
    port.postMessage({ type: 'p2p-connected' });
    updateUI();
  };

  dataChannel.onclose = () => {
    console.log('[Popup] Data channel закрыт');
    // Сообщаем background что P2P отключен
    port.postMessage({ type: 'p2p-disconnected' });
    updateUI();
  };

  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[Popup] Получено сообщение:', data);
      addMessage(data.text, data.time, false);
    } catch (error) {
      console.error('[Popup] Ошибка парсинга сообщения:', error);
    }
  };
}

async function handleOffer(offer) {
  console.log('[Popup] Обработка offer');
  if (!pc) {
    createPeerConnection(false);
  }

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  port.postMessage({
    type: 'ws-send',
    data: {
      type: 'answer',
      answer: pc.localDescription
    }
  });
}

async function handleAnswer(answer) {
  console.log('[Popup] Обработка answer');
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
  
  console.log('[Popup] Обновление UI:', { isOnline, channelOpen });

  elements.statusDot.classList.toggle('online', isOnline);
  elements.statusText.textContent = isOnline ? 'Онлайн' : 'Офлайн';

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

// События
elements.sendBtn.addEventListener('click', sendMessage);
elements.messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

console.log('[Popup] Popup загружен');
