// Background service worker с постоянным WebSocket соединением

const WS_URL = window.location.protocol === 'https:' 
  ? 'wss://твой-домен.com' 
  : 'ws://localhost:3000';

let ws = null;
let pc = null;
let dataChannel = null;
let clientId = null;
let isOnline = false;

// WebRTC конфиг
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Подключение к WebSocket при старте
connectWebSocket();

function connectWebSocket() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket подключен');
    notifyPopup({ type: 'connection', status: 'connected' });
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
    
    console.log('Получено:', data.type, data);

    switch (data.type) {
      case 'init':
        clientId = data.clientId;
        console.log('Мой ID:', clientId);
        break;

      case 'status':
        isOnline = data.online && data.count === 2;
        updateBadge(isOnline);
        notifyPopup({ type: 'status', online: isOnline, count: data.count });
        
        console.log('Status received:', { 
          shouldInitiate: data.shouldInitiate, 
          hasPC: !!pc, 
          online: isOnline,
          clientId: clientId
        });
        
        if (data.shouldInitiate && !pc && isOnline && clientId === 1) {
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
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket ошибка:', error);
  };

  ws.onclose = () => {
    console.log('WebSocket отключен, переподключение через 3 сек...');
    isOnline = false;
    updateBadge(false);
    closePeerConnection();
    setTimeout(connectWebSocket, 3000);
  };
}

// WebRTC P2P соединение
function createPeerConnection(isInitiator) {
  pc = new RTCPeerConnection(iceServers);

  pc.onicecandidate = (event) => {
    if (event.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log('P2P соединение установлено!');
    }
  };

  if (isInitiator) {
    dataChannel = pc.createDataChannel('chat');
    setupDataChannel();
    
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        console.log('Отправляю offer...');
        ws.send(JSON.stringify({
          type: 'offer',
          offer: pc.localDescription
        }));
      });
  } else {
    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel();
    };
  }
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    console.log('Data channel открыт');
    notifyPopup({ type: 'channel', status: 'open' });
  };

  dataChannel.onclose = () => {
    console.log('Data channel закрыт');
    notifyPopup({ type: 'channel', status: 'closed' });
  };

  dataChannel.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Получено сообщение:', message);
    notifyPopup({ type: 'message', data: message });
  };
}

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

async function handleAnswer(answer) {
  console.log('Обрабатываю answer...');
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleIceCandidate(candidate) {
  if (pc) {
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

// Отправка сообщения
function sendMessage(text) {
  if (dataChannel && dataChannel.readyState === 'open') {
    const time = new Date().toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const message = { text, time };
    dataChannel.send(JSON.stringify(message));
    return message;
  }
  return null;
}

// Уведомление popup
function notifyPopup(data) {
  chrome.runtime.sendMessage(data).catch(() => {
    // Popup может быть закрыт
  });
}

// Обновление badge
function updateBadge(online) {
  const color = online ? '#10b981' : '#ef4444';
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text: '●' });
}

// Обработка сообщений от popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'sendMessage') {
    const sent = sendMessage(message.text);
    sendResponse({ success: !!sent, message: sent });
  } else if (message.type === 'getStatus') {
    sendResponse({ 
      online: isOnline, 
      channelOpen: dataChannel?.readyState === 'open' 
    });
  }
  return true; // Асинхронный ответ
});

// При установке
chrome.runtime.onInstalled.addListener(() => {
  updateBadge(false);
});
