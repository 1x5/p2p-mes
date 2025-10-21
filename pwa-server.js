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

app.listen(PORT, () => {
  console.log(`🌐 PWA сервер запущен на http://localhost:${PORT}`);
  console.log(`📱 Открой в браузере и добавь на главный экран!`);
});
