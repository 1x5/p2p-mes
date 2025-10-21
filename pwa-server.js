const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Статические файлы
app.use(express.static('.'));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Обработка всех остальных маршрутов (для SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 PWA сервер запущен на http://localhost:${PORT}`);
  console.log(`📱 Для iPhone открой: http://192.168.3.83:${PORT}`);
  console.log(`📱 Открой в браузере и добавь на главный экран!`);
  console.log(`🔌 WebSocket сервер должен работать на порту 3000`);
});
