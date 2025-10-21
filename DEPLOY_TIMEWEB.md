# Деплой на Timeweb Cloud

Полная инструкция по деплою P2P Messenger на Timeweb Cloud с SSL.

## 📋 Что нужно

- ✅ Сервер на Timeweb Cloud (Ubuntu 20.04/22.04)
- ✅ Домен с SSL сертификатом (Let's Encrypt)
- ✅ SSH доступ к серверу

## 🔧 Шаг 1: Подключись к серверу

```bash
ssh root@твой-сервер.timeweb.cloud
# или
ssh root@твой-домен.com
```

## 📦 Шаг 2: Установка Node.js и PM2

```bash
# Обновляем систему
apt update && apt upgrade -y

# Устанавливаем Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Проверяем версию
node --version
npm --version

# Устанавливаем PM2 (менеджер процессов)
npm install -g pm2

# Проверяем PM2
pm2 --version
```

## 📂 Шаг 3: Загрузка кода на сервер

### Вариант A: Через Git (рекомендуется)

```bash
# На сервере
cd /var/www
git clone https://github.com/твой-username/p2p-mes.git
cd p2p-mes
npm install --production
```

### Вариант B: Через SCP (с локального Mac)

```bash
# На локальном Mac (в папке проекта)
scp -r server.js package.json package-lock.json root@твой-сервер:/var/www/p2p-mes/

# Затем на сервере
ssh root@твой-сервер
cd /var/www/p2p-mes
npm install --production
```

## 🔐 Шаг 4: Настройка SSL (Let's Encrypt)

```bash
# Устанавливаем Certbot
apt install -y certbot python3-certbot-nginx

# Получаем SSL сертификат
certbot certonly --standalone -d твой-домен.com

# Сертификаты будут в:
# /etc/letsencrypt/live/твой-домен.com/fullchain.pem
# /etc/letsencrypt/live/твой-домен.com/privkey.pem
```

## ⚙️ Шаг 5: Настройка Nginx

```bash
# Устанавливаем Nginx
apt install -y nginx

# Создаем конфиг
nano /etc/nginx/sites-available/p2p-messenger
```

Вставь этот конфиг (замени `твой-домен.com`):

```nginx
upstream websocket {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name твой-домен.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name твой-домен.com;

    ssl_certificate /etc/letsencrypt/live/твой-домен.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/твой-домен.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        
        # WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

Активируем конфиг:

```bash
# Создаем симлинк
ln -s /etc/nginx/sites-available/p2p-messenger /etc/nginx/sites-enabled/

# Удаляем дефолтный конфиг
rm /etc/nginx/sites-enabled/default

# Проверяем конфиг
nginx -t

# Перезапускаем Nginx
systemctl restart nginx
systemctl enable nginx
```

## 🚀 Шаг 6: Запуск сервера через PM2

```bash
cd /var/www/p2p-mes

# Запускаем сервер
pm2 start server.js --name p2p-messenger

# Сохраняем конфиг PM2
pm2 save

# Автозапуск при перезагрузке
pm2 startup

# Проверяем статус
pm2 status
pm2 logs p2p-messenger
```

## 🔥 Шаг 7: Настройка Firewall

```bash
# Устанавливаем UFW
apt install -y ufw

# Разрешаем SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Включаем firewall
ufw enable

# Проверяем статус
ufw status
```

## ✅ Шаг 8: Проверка

### На сервере:

```bash
# Проверяем что сервер работает
pm2 status
pm2 logs p2p-messenger --lines 50

# Проверяем Nginx
systemctl status nginx

# Проверяем порт 3000
netstat -tulpn | grep 3000
```

### С локального Mac:

```bash
# Проверяем WSS соединение
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  https://твой-домен.com
```

Должен вернуть `101 Switching Protocols`

## 🔧 Шаг 9: Обновление Electron приложения

На локальном Mac в `app.js` измени:

```javascript
const WS_URL = 'wss://твой-домен.com';
```

Пересобери и запусти:

```bash
npm start
```

## 📊 Мониторинг

```bash
# Логи PM2
pm2 logs p2p-messenger

# Логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Перезапуск сервера
pm2 restart p2p-messenger

# Остановка
pm2 stop p2p-messenger

# Удаление из PM2
pm2 delete p2p-messenger
```

## 🔄 Обновление кода

```bash
# На сервере
cd /var/www/p2p-mes
git pull
npm install --production
pm2 restart p2p-messenger
```

## 🆘 Troubleshooting

### WebSocket не подключается

```bash
# Проверь логи
pm2 logs p2p-messenger
tail -f /var/log/nginx/error.log

# Проверь firewall
ufw status

# Проверь SSL
openssl s_client -connect твой-домен.com:443
```

### Сервер падает

```bash
# Проверь логи
pm2 logs p2p-messenger --lines 100

# Увеличь лимиты
pm2 restart p2p-messenger --max-memory-restart 200M
```

### Порт 3000 занят

```bash
# Найди процесс
lsof -i:3000

# Убей процесс
kill -9 <PID>

# Перезапусти
pm2 restart p2p-messenger
```

## ✨ Готово!

Теперь твой P2P мессенджер работает на `wss://твой-домен.com` с SSL! 🎉

Клиенты могут подключаться с любого Mac через Electron приложение.

