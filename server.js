const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const MAX_CLIENTS = 2;

let clients = new Set();

wss.on('connection', (ws) => {
  console.log('Новое подключение');

  // Проверка лимита клиентов
  if (clients.size >= MAX_CLIENTS) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Достигнут лимит подключений (макс. 2)'
    }));
    ws.close();
    return;
  }

  // Назначаем ID: первый = 1, второй = 2
  ws.clientId = clients.size + 1;
  clients.add(ws);
  
  // Отправляем клиенту его ID
  ws.send(JSON.stringify({
    type: 'init',
    clientId: ws.clientId
  }));
  
  // Отправка статуса всем клиентам
  broadcastStatus();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Получено:', data.type);

      // Пересылка сигналов WebRTC другому клиенту
      clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error);
    }
  });

  ws.on('close', () => {
    console.log('Клиент отключился');
    clients.delete(ws);
    broadcastStatus();
  });

  ws.on('error', (error) => {
    console.error('WebSocket ошибка:', error);
    clients.delete(ws);
    broadcastStatus();
  });
});

// Отправка статуса всем клиентам
function broadcastStatus() {
  const online = clients.size === MAX_CLIENTS;
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const status = {
        type: 'status',
        online: online,
        count: clients.size,
        shouldInitiate: client.clientId === 1 && online // Только первый клиент инициирует
      };
      client.send(JSON.stringify(status));
    }
  });

  console.log(`Статус: ${clients.size}/${MAX_CLIENTS} клиентов`);
}

server.listen(PORT, () => {
  console.log(`🚀 Сигнальный сервер запущен на порту ${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
});

