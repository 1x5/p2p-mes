# P2P Messenger - Electron (macOS App)

Нативное приложение для macOS вместо расширения Chrome.

## Преимущества

✅ WebRTC работает **всегда в фоне** (даже когда окно закрыто)
✅ Нет ограничений Chrome Extensions
✅ Иконка в menu bar (красная/зеленая)
✅ Нативные уведомления macOS
✅ Быстрее и стабильнее

## Запуск

### 1. Запусти сервер (в отдельном терминале):
```bash
npm run server
```

### 2. Запусти приложение:
```bash
npm start
```

### 3. Для отладки:
```bash
npm run dev
```

## Как использовать

1. **Запусти сервер** на порту 3000
2. **Запусти приложение** на **двух Mac** (или в двух копиях)
3. **Иконка станет зеленой** когда оба подключатся
4. **Окно можно закрыть** - приложение продолжит работать в фоне
5. **Клик по иконке** в menu bar откроет чат

## Структура

- `main.js` - главный процесс Electron (управление окном, tray)
- `preload.js` - мост между main и renderer
- `app.html` - UI приложения
- `app.js` - WebRTC логика (renderer process)
- `server.js` - WebSocket сервер (сигналинг)

## Production

### Для production измени в `app.js`:
```javascript
const WS_URL = 'wss://твой-домен.com';
```

### Сборка .app для macOS:
```bash
npm install --save-dev electron-builder
npx electron-builder --mac
```

Готовый `.app` будет в папке `dist/`

## Сравнение с Chrome Extension

| Фича | Chrome Extension | Electron App |
|------|------------------|--------------|
| WebRTC в фоне | ❌ Нет | ✅ Да |
| Работа при закрытом окне | ❌ Нет | ✅ Да |
| Menu bar иконка | ❌ Только badge | ✅ Tray icon |
| Нативные уведомления | ⚠️ Ограничены | ✅ Полные |
| Установка | Легко | Требует .app |
| Кроссплатформенность | Везде где Chrome | macOS/Windows/Linux |

## Отладка

### Логи:
- Main process: `npm run dev` (в терминале)
- Renderer process: DevTools в окне приложения

### Проблемы:

**Не подключается:**
- Проверь что сервер запущен (`npm run server`)
- Проверь `WS_URL` в `app.js`

**Иконка не меняется:**
- Установи `canvas`: `npm install canvas`
- Проверь логи main process

**Нет уведомлений:**
- Дай права в System Settings → Notifications

