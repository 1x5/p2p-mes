// Offscreen document для WebRTC (Service Worker не поддерживает WebRTC)

let pc = null;
let dataChannel = null;
let ws = null;
let clientId = null;

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Слушаем сообщения от background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] Получено:', message.type);

  switch (message.type) {
    case 'ws-connect':
      connectWebSocket(message.url);
      sendResponse({ success: true });
      break;

    case 'ws-send':
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message.data));
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'WebSocket не подключен' });
      }
      break;

    case 'create-peer':
      createPeerConnection(message.isInitiator);
      sendResponse({ success: true });
      break;

    case 'send-message':
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(message.data));
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Data channel не открыт' });
      }
      break;
  }

  return true; // Асинхронный ответ
});

// WebSocket соединение
function connectWebSocket(url) {
  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('[Offscreen] WebSocket подключен');
    notifyBackground({ type: 'ws-open' });
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
      console.error('[Offscreen] Ошибка парсинга:', error);
      return;
    }

    console.log('[Offscreen] WebSocket получил:', data.type);

    switch (data.type) {
      case 'init':
        clientId = data.clientId;
        notifyBackground({ type: 'init', clientId: data.clientId });
        break;

      case 'status':
        notifyBackground({ 
          type: 'status', 
          online: data.count === 2, 
          count: data.count,
          shouldInitiate: data.shouldInitiate,
          clientId: clientId
        });
        
        // Создаем P2P если нужно
        if (data.shouldInitiate && !pc && data.count === 2 && clientId === 1) {
          console.log('[Offscreen] Создаю P2P как инициатор');
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
    console.error('[Offscreen] WebSocket ошибка:', error);
    notifyBackground({ type: 'ws-error', error: error.message });
  };

  ws.onclose = () => {
    console.log('[Offscreen] WebSocket закрыт');
    notifyBackground({ type: 'ws-close' });
    closePeerConnection();
    setTimeout(() => connectWebSocket(url), 3000);
  };
}

// Создание WebRTC соединения
function createPeerConnection(isInitiator) {
  console.log('[Offscreen] Создаю PeerConnection, isInitiator:', isInitiator);
  pc = new RTCPeerConnection(iceServers);

  pc.onicecandidate = (event) => {
    if (event.candidate && ws && ws.readyState === WebSocket.OPEN) {
      console.log('[Offscreen] Отправляю ICE candidate');
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        candidate: event.candidate
      }));
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('[Offscreen] Connection state:', pc.connectionState);
    if (pc.connectionState === 'connected') {
      console.log('[Offscreen] P2P соединение установлено!');
    }
  };

  if (isInitiator) {
    dataChannel = pc.createDataChannel('chat');
    setupDataChannel();
    
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        console.log('[Offscreen] Отправляю offer');
        ws.send(JSON.stringify({
          type: 'offer',
          offer: pc.localDescription
        }));
      })
      .catch(err => console.error('[Offscreen] Ошибка создания offer:', err));
  } else {
    pc.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel();
    };
  }
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    console.log('[Offscreen] Data channel открыт');
    notifyBackground({ type: 'channel-open' });
  };

  dataChannel.onclose = () => {
    console.log('[Offscreen] Data channel закрыт');
    notifyBackground({ type: 'channel-close' });
  };

  dataChannel.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[Offscreen] Получено сообщение:', data);
      notifyBackground({ type: 'message', data: data });
    } catch (error) {
      console.error('[Offscreen] Ошибка парсинга сообщения:', error);
    }
  };
}

async function handleOffer(offer) {
  console.log('[Offscreen] Обработка offer');
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
  console.log('[Offscreen] Обработка answer');
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
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

function notifyBackground(message) {
  chrome.runtime.sendMessage(message).catch(err => {
    console.error('[Offscreen] Ошибка отправки в background:', err);
  });
}

console.log('[Offscreen] Offscreen document загружен');

