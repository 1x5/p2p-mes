// Popup UI - только отображение, вся логика в background.js

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

let isOnline = false;
let channelOpen = false;

// Получение статуса при открытии popup
chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
  if (response) {
    console.log('Получен статус от background:', response);
    updateUI(response.online, response.channelOpen);
  } else {
    console.log('Нет ответа от background, показываю офлайн');
    updateUI(false, false);
  }
});

// Слушаем обновления от background
chrome.runtime.onMessage.addListener((message) => {
  console.log('Popup получил сообщение от background:', message);

  switch (message.type) {
    case 'status':
      updateUI(message.online, channelOpen);
      break;

    case 'channel':
      channelOpen = message.status === 'open';
      updateUI(isOnline, channelOpen);
      break;

    case 'message':
      addMessage(message.data.text, message.data.time, false);
      break;

    case 'connection':
      elements.connectionStatus.textContent = 
        message.status === 'connected' ? 'Подключено к серверу' : 'Переподключение...';
      break;
  }
});

// Обновление UI
function updateUI(online, channelReady) {
  console.log('Обновление UI:', { online, channelReady });
  
  isOnline = online;
  channelOpen = channelReady;

  elements.statusDot.classList.toggle('online', online);
  elements.statusText.textContent = online ? 'Онлайн' : 'Офлайн';

  if (online && channelReady) {
    elements.waiting.style.display = 'none';
    elements.chat.classList.add('active');
    elements.messageInput.focus();
  } else {
    elements.waiting.style.display = 'flex';
    elements.chat.classList.remove('active');
  }
}

// Отправка сообщения
function sendMessage() {
  const text = elements.messageInput.value.trim();
  if (!text) return;

  chrome.runtime.sendMessage({ 
    type: 'sendMessage', 
    text: text 
  }, (response) => {
    if (response && response.success) {
      addMessage(response.message.text, response.message.time, true);
      elements.messageInput.value = '';
      elements.messageInput.focus();
    } else {
      console.log('Не удалось отправить сообщение:', response);
    }
  });
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