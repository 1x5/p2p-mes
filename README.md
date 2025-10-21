# P2P Мессенджер

Минималистичный P2P мессенджер для общения между двумя людьми через расширение Chrome.

## Возможности

- ✅ P2P соединение через WebRTC
- ✅ Автоматическое подключение
- ✅ Индикатор статуса (красная/зеленая точка на иконке расширения)
- ✅ Мгновенная доставка сообщений
- ✅ Минималистичный дизайн

## Установка

### 1. Сигнальный сервер (Timeweb Cloud)

```bash
# Установка зависимостей
npm install

# Запуск
npm start
```

Сервер будет слушать порт из переменной окружения `PORT` (на Timeweb автоматически) или 3000 по умолчанию.

### 2. Расширение Chrome

1. Открой `popup.js`
2. Измени строку 2 на свой домен:
   ```javascript
   const WS_URL = window.location.protocol === 'https:' 
     ? 'wss://ваш-домен.com' 
     : 'ws://localhost:3000';
   ```

3. Создай иконки в папке `icons/`:
   - `icon16.png` (16×16)
   - `icon48.png` (48×48)
   - `icon128.png` (128×128)

4. Загрузи расширение в Chrome:
   - Открой `chrome://extensions/`
   - Включи "Режим разработчика"
   - Нажми "Загрузить распакованное расширение"
   - Выбери папку проекта

## Использование

1. Запусти сигнальный сервер на Timeweb
2. Установи расширение в Chrome у обоих пользователей
3. Кликни на иконку расширения
4. Когда оба онлайн — точка станет зеленой и откроется чат

## Технологии

- **Backend**: Node.js, Express, WebSocket
- **Frontend**: Vanilla JavaScript, WebRTC
- **Chrome Extension**: Manifest V3

## Структура файлов

```
/
├── server.js          # Сигнальный сервер
├── package.json       # Зависимости
├── manifest.json      # Манифест расширения Chrome
├── popup.html         # UI расширения
├── popup.js           # Логика клиента
├── background.js      # Service worker для badge
└── icons/             # Иконки (создай вручную)
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Деплой на Timeweb

1. Загрузи код на сервер
2. Установи Node.js
3. Запусти `npm install && npm start`
4. Настрой reverse proxy (nginx) для WSS

Пример nginx config:
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

