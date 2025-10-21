#!/bin/bash
# Первоначальная настройка VPS на Timeweb Cloud для P2P Messenger

set -e

echo "🚀 Настройка VPS на Timeweb Cloud"
echo "=================================="
echo ""

# Проверяем что мы root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запусти скрипт от root: sudo bash setup-timeweb-server.sh"
    exit 1
fi

# Запрашиваем домен
read -p "Введи твой домен (например: chat.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "❌ Домен не может быть пустым"
    exit 1
fi

echo ""
echo "📋 Настройки:"
echo "  Домен: $DOMAIN"
echo ""
read -p "Продолжить? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "1️⃣ Обновление системы..."
apt update && apt upgrade -y

echo ""
echo "2️⃣ Установка Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "✅ Node.js $(node --version) установлен"

echo ""
echo "3️⃣ Установка PM2..."
npm install -g pm2
echo "✅ PM2 $(pm2 --version) установлен"

echo ""
echo "4️⃣ Установка Nginx..."
apt install -y nginx
systemctl enable nginx
echo "✅ Nginx установлен"

echo ""
echo "5️⃣ Установка Certbot (Let's Encrypt)..."
apt install -y certbot python3-certbot-nginx
echo "✅ Certbot установлен"

echo ""
echo "6️⃣ Получение SSL сертификата..."
echo "Это остановит Nginx на время получения сертификата"
systemctl stop nginx

certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email

if [ $? -eq 0 ]; then
    echo "✅ SSL сертификат получен"
else
    echo "❌ Ошибка получения SSL сертификата"
    echo "Возможные причины:"
    echo "  - DNS ещё не обновился (подожди 5-10 минут)"
    echo "  - Порты 80/443 заблокированы"
    echo "  - Домен неправильный"
    exit 1
fi

systemctl start nginx

echo ""
echo "7️⃣ Создание директории для приложения..."
mkdir -p /var/www/p2p-mes
chown -R www-data:www-data /var/www/p2p-mes

echo ""
echo "8️⃣ Настройка Firewall (UFW)..."
apt install -y ufw
ufw --force enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw status
echo "✅ Firewall настроен"

echo ""
echo "9️⃣ Создание Nginx конфига..."

cat > /etc/nginx/sites-available/p2p-messenger << 'NGINX_EOF'
upstream websocket {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }

    access_log /var/log/nginx/p2p-access.log;
    error_log /var/log/nginx/p2p-error.log;
}
NGINX_EOF

# Заменяем домен в конфиге
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/p2p-messenger

# Активируем конфиг
ln -sf /etc/nginx/sites-available/p2p-messenger /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Проверяем и перезапускаем
nginx -t
systemctl restart nginx

echo "✅ Nginx настроен"

echo ""
echo "🔟 Настройка автообновления SSL..."
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -
echo "✅ Автообновление SSL настроено"

echo ""
echo "🎉 Сервер настроен!"
echo ""
echo "📋 Информация:"
echo "  Домен: https://$DOMAIN"
echo "  Директория приложения: /var/www/p2p-mes"
echo "  Логи Nginx: /var/log/nginx/"
echo ""
echo "📦 Следующие шаги:"
echo ""
echo "1. Скопируй файлы на сервер:"
echo "   scp server.js package.json root@$DOMAIN:/var/www/p2p-mes/"
echo ""
echo "2. Установи зависимости:"
echo "   ssh root@$DOMAIN"
echo "   cd /var/www/p2p-mes"
echo "   npm install --production"
echo ""
echo "3. Запусти сервер:"
echo "   pm2 start server.js --name p2p-messenger"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. На локальном Mac измени WS_URL в app.js:"
echo "   const WS_URL = 'wss://$DOMAIN';"
echo ""

