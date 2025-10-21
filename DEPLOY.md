# 🚀 Production Deploy - Timeweb Cloud

## ✅ Код готов на GitHub
https://github.com/1x5/p2p-mes.git

---

## 1️⃣ Подготовка сервера Timeweb

### Подключение по SSH
```bash
ssh user@твой-домен.com
```

### Установка Node.js (если нет)
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### Проверка версий
```bash
node --version  # должно быть v18+
npm --version
```

---

## 2️⃣ Деплой приложения

### Клонирование репозитория
```bash
git clone https://github.com/1x5/p2p-mes.git
cd p2p-mes
```

### Установка зависимостей
```bash
npm install
```

### Установка PM2 (автозапуск)
```bash
npm install -g pm2
```

### Запуск приложения
```bash
pm2 start server.js --name "p2p-messenger"
pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
pm2 save
```

### Проверка статуса
```bash
pm2 status
pm2 logs p2p-messenger
```

---

## 3️⃣ Настройка Nginx для WSS

### Создание конфига
```bash
sudo nano /etc/nginx/sites-available/p2p-mes
```

### Содержимое файла:
```nginx
server {
    listen 80;
    server_name твой-домен.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name твой-домен.com;

    # SSL сертификаты (Timeweb обычно автоматически)
    ssl_certificate /etc/letsencrypt/live/твой-домен.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/твой-домен.com/privkey.pem;

    # WebSocket проксирование
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
        
        # Таймауты для WebSocket
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

### Активация конфига
```bash
sudo ln -s /etc/nginx/sites-available/p2p-mes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4️⃣ Настройка SSL (если нужно)

### Let's Encrypt (если нет SSL)
```bash
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d твой-домен.com
```

---

## 5️⃣ Обновление расширения

### Изменить домен в коде
```bash
# На локальной машине
nano popup.js
# Замени "твой-домен.com" на реальный домен
```

### Коммит и пуш
```bash
git add popup.js
git commit -m "Update domain for production"
git push
```

### Обновление на сервере
```bash
# На сервере
cd p2p-mes
git pull
pm2 restart p2p-messenger
```

---

## 6️⃣ Установка расширения у пользователей

### У тебя:
1. `chrome://extensions/`
2. Включи "Режим разработчика"
3. "Загрузить распакованное расширение"
4. Выбери папку проекта

### У друга:
1. Скачай проект: `git clone https://github.com/1x5/p2p-mes.git`
2. Установи расширение как выше

---

## 7️⃣ Проверка

### Сервер работает:
```bash
curl -I https://твой-домен.com
# Должен вернуть HTTP/2 200
```

### WebSocket работает:
1. Открой расширение у себя → красная точка
2. Открой у друга → обе точки зеленые 🟢
3. Пиши сообщения → доставляются мгновенно

---

## 🔧 Команды управления

### PM2 команды:
```bash
pm2 status                # Статус
pm2 logs p2p-messenger    # Логи
pm2 restart p2p-messenger # Перезапуск
pm2 stop p2p-messenger    # Остановка
```

### Nginx команды:
```bash
sudo nginx -t             # Проверка конфига
sudo systemctl reload nginx # Перезагрузка
sudo systemctl status nginx # Статус
```

### Обновление кода:
```bash
git pull
pm2 restart p2p-messenger
```

---

## 🐛 Troubleshooting

### Сервер не стартует:
```bash
pm2 logs p2p-messenger
# Проверь что порт 3000 свободен
lsof -i :3000
```

### WebSocket не работает:
```bash
# Проверь nginx конфиг
sudo nginx -t
# Проверь что проксирует на localhost:3000
```

### SSL ошибки:
```bash
# Проверь сертификат
sudo certbot certificates
# Обнови если нужно
sudo certbot renew
```

### Расширение не подключается:
1. Проверь домен в popup.js
2. Проверь что используется WSS (не WS)
3. Проверь консоль браузера на ошибки

---

## ✅ Готово!

P2P мессенджер работает в production! 🎉

**Что работает:**
- ✅ Автоматическое подключение
- ✅ P2P через WebRTC
- ✅ Индикатор статуса (🔴/🟢)
- ✅ Мгновенная доставка сообщений
- ✅ Минималистичный дизайн
- ✅ Работает на мобильном

**Поддержка:**
- Логи: `pm2 logs p2p-messenger`
- Статус: `pm2 status`
- Обновления: `git pull && pm2 restart p2p-messenger`

