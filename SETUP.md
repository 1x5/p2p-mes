# 🚀 Пошаговая настройка

## 1. Создай иконки (см. ICONS.md)

Быстро: https://cloudconvert.com/svg-to-png
- Загрузи `icon.svg`
- Конвертируй в 128px, 48px, 16px
- Положи в папку `icons/`

---

## 2. Настрой домен в коде

Открой **popup.js**, строка 2-4:

```javascript
// ЗАМЕНИ на свой домен:
const WS_URL = 'wss://твой-домен.com';
```

Для локального теста оставь:
```javascript
const WS_URL = 'ws://localhost:3000';
```

---

## 3. Установи расширение в Chrome

1. Открой `chrome://extensions/`
2. Включи **"Режим разработчика"** (справа вверху)
3. Нажми **"Загрузить распакованное расширение"**
4. Выбери папку `/Users/ff/Documents/cursor/p2p-mes`
5. Готово! Иконка появится в панели

---

## 4. Запусти сервер локально (для теста)

```bash
cd /Users/ff/Documents/cursor/p2p-mes
npm install
npm start
```

Увидишь:
```
🚀 Сигнальный сервер запущен на порту 3000
   WebSocket: ws://localhost:3000
```

---

## 5. Протестируй

1. Открой расширение (клик на иконку)
2. Открой второе окно Chrome (или Incognito)
3. Открой расширение там же
4. **Обе иконки станут зелеными** 🟢
5. Пиши сообщения — должны мгновенно доставляться

---

## 6. Деплой на Timeweb Cloud

### 6.1 Загрузи код на сервер

```bash
# На локальной машине
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/1x5/p2p-mes.git
git push -u origin main
```

### 6.2 На сервере Timeweb

```bash
# Подключись по SSH
ssh user@твой-сервер.com

# Клонируй репозиторий
git clone https://github.com/1x5/p2p-mes.git
cd p2p-mes

# Установи зависимости
npm install

# Запусти (или используй PM2)
npm start
```

### 6.3 Настрой PM2 (автозапуск)

```bash
# Установи PM2
npm install -g pm2

# Запусти приложение
pm2 start server.js --name "p2p-messenger"

# Автозапуск при перезагрузке
pm2 startup
pm2 save
```

### 6.4 Настрой Nginx (для WSS)

Создай `/etc/nginx/sites-available/p2p-mes`:

```nginx
server {
    listen 80;
    server_name твой-домен.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name твой-домен.com;

    # SSL сертификаты (Timeweb автоматически добавляет)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймауты
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Активируй:
```bash
ln -s /etc/nginx/sites-available/p2p-mes /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 7. Финальная настройка расширения

В **popup.js** измени на продакшн:

```javascript
const WS_URL = 'wss://твой-домен.com';
```

Обнови расширение в Chrome:
- `chrome://extensions/` → кнопка "Обновить" у расширения

---

## ✅ Проверка

- [ ] Иконки загружены
- [ ] Домен настроен в popup.js
- [ ] Сервер работает на Timeweb
- [ ] Nginx настроен для WSS
- [ ] Расширение установлено у обоих пользователей
- [ ] При открытии обоих расширений — зеленые точки
- [ ] Сообщения доставляются мгновенно
- [ ] При закрытии одного — у второго красная точка

---

## 🐛 Troubleshooting

**Красная точка не становится зеленой:**
- Проверь консоль браузера (F12 в popup)
- Проверь логи сервера: `pm2 logs p2p-messenger`
- Проверь WebSocket в DevTools → Network → WS

**Соединение не устанавливается:**
- Убедись что nginx корректно проксирует WebSocket
- Проверь firewall: порты 80, 443 открыты
- Проверь SSL сертификат

**Сообщения не доставляются:**
- Открой консоль обоих расширений
- Проверь статус P2P: `Connection state: connected`
- Проверь что STUN серверы доступны

