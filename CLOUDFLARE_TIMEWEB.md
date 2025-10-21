# Подключение Cloudflare домена к Timeweb VPS

Быстрая инструкция по настройке.

## 📋 Что нужно

- ✅ VPS на Timeweb Cloud (Ubuntu 22.04)
- ✅ Домен на Cloudflare
- ✅ SSH доступ к серверу

## 🚀 Быстрая настройка (5 минут)

### 1. Узнай IP адрес VPS

Зайди в панель Timeweb → твой VPS → скопируй **IP адрес**

### 2. Настрой DNS в Cloudflare

1. Cloudflare → твой домен → **DNS**
2. Добавь A-запись:
   ```
   Type: A
   Name: @ (или chat для поддомена)
   Content: IP_АДРЕС_VPS
   Proxy: 🔴 OFF (DNS only) ⚠️ ВАЖНО!
   ```
3. **Сохрани**

⚠️ **ВАЖНО:** Proxy должен быть **ВЫКЛЮЧЕН** (серая тучка), иначе WebSocket не работает!

### 3. Подключись к серверу

```bash
ssh root@твой-домен.com
# или
ssh root@IP_АДРЕС
```

### 4. Скопируй и запусти скрипт установки

**На сервере** выполни:

```bash
# Скачай скрипт
curl -O https://raw.githubusercontent.com/твой-репо/p2p-mes/master/setup-timeweb-server.sh

# Или создай вручную
nano setup-timeweb-server.sh
# Вставь содержимое из файла setup-timeweb-server.sh

# Сделай исполняемым
chmod +x setup-timeweb-server.sh

# Запусти
sudo bash setup-timeweb-server.sh
```

Скрипт спросит домен - введи его (например: `chat.example.com`)

Скрипт автоматически:
- ✅ Установит Node.js, PM2, Nginx
- ✅ Получит SSL сертификат (Let's Encrypt)
- ✅ Настроит Nginx для WebSocket
- ✅ Настроит Firewall

### 5. Скопируй код на сервер

**С локального Mac:**

```bash
cd /Users/ff/Documents/cursor/p2p-mes

# Замени на свой домен или IP
scp server.js package.json root@твой-домен.com:/var/www/p2p-mes/
```

### 6. Запусти приложение на сервере

**На сервере:**

```bash
cd /var/www/p2p-mes

# Установи зависимости
npm install --production

# Запусти через PM2
pm2 start server.js --name p2p-messenger

# Сохрани конфиг PM2
pm2 save

# Автозапуск при перезагрузке
pm2 startup
```

### 7. Обнови клиент (app.js)

**На локальном Mac** в файле `app.js` измени:

```javascript
const WS_URL = 'wss://твой-домен.com';
// Например: const WS_URL = 'wss://chat.example.com';
```

Перезапусти приложение:

```bash
npm start
```

## ✅ Проверка

### Проверь что сервер работает:

```bash
ssh root@твой-домен.com

# Статус PM2
pm2 status

# Логи
pm2 logs p2p-messenger

# Nginx статус
systemctl status nginx

# Логи Nginx
tail -f /var/log/nginx/p2p-error.log
```

### Проверь WebSocket соединение:

```bash
# С локального Mac
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  https://твой-домен.com
```

Должен вернуть: `HTTP/1.1 101 Switching Protocols`

### Проверь в приложении:

Запусти `npm start` на двух Mac - должны подключиться через интернет! 🎉

## 🔧 Troubleshooting

### DNS не обновился

Подожди 5-10 минут после изменения DNS в Cloudflare.

Проверь DNS:
```bash
dig твой-домен.com
nslookup твой-домен.com
```

### SSL ошибка

```bash
# На сервере проверь сертификат
certbot certificates

# Обнови сертификат
certbot renew --force-renewal
systemctl reload nginx
```

### WebSocket не подключается

1. **Проверь Cloudflare Proxy** - должен быть **ВЫКЛЮЧЕН** (🔴 DNS only)
2. **Проверь firewall:**
   ```bash
   ufw status
   ufw allow 443/tcp
   ```
3. **Проверь Nginx логи:**
   ```bash
   tail -f /var/log/nginx/p2p-error.log
   ```

### Порт 3000 занят

```bash
# На сервере
lsof -i:3000
kill -9 <PID>
pm2 restart p2p-messenger
```

## 🔄 Обновление кода

```bash
# На локальном Mac
scp server.js root@твой-домен.com:/var/www/p2p-mes/

# На сервере
ssh root@твой-домен.com
cd /var/www/p2p-mes
pm2 restart p2p-messenger
```

## 📊 Полезные команды

```bash
# PM2
pm2 status                    # Статус процессов
pm2 logs p2p-messenger       # Логи
pm2 restart p2p-messenger    # Перезапуск
pm2 stop p2p-messenger       # Остановка
pm2 monit                    # Мониторинг

# Nginx
systemctl status nginx       # Статус
systemctl reload nginx       # Перезагрузка
nginx -t                     # Проверка конфига

# SSL
certbot certificates         # Список сертификатов
certbot renew               # Обновление
```

## 🎉 Готово!

Теперь у тебя работает P2P мессенджер на `wss://твой-домен.com` с SSL! 

Можно подключаться с любых Mac через интернет! 🚀

