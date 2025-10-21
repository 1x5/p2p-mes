#!/bin/bash
# Скрипт для деплоя сервера на Timeweb Cloud

set -e

echo "🚀 Деплой P2P Messenger на Timeweb Cloud"
echo ""

# Переменные (ИЗМЕНИ ИХ!)
SERVER_USER="root"
SERVER_HOST="ВАШ-СЕРВЕР.timeweb.cloud"  # или IP адрес
DOMAIN="ВАШ-ДОМЕН.com"
DEPLOY_PATH="/var/www/p2p-mes"

echo "📋 Настройки:"
echo "  Сервер: $SERVER_USER@$SERVER_HOST"
echo "  Домен: $DOMAIN"
echo "  Путь: $DEPLOY_PATH"
echo ""

# Проверка что переменные изменены
if [[ "$SERVER_HOST" == "ВАШ-СЕРВЕР.timeweb.cloud" ]]; then
    echo "❌ ОШИБКА: Измени SERVER_HOST в скрипте!"
    exit 1
fi

if [[ "$DOMAIN" == "ВАШ-ДОМЕН.com" ]]; then
    echo "❌ ОШИБКА: Измени DOMAIN в скрипте!"
    exit 1
fi

read -p "Продолжить деплой? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo "1️⃣ Копирование файлов на сервер..."

# Создаем директорию на сервере
ssh $SERVER_USER@$SERVER_HOST "mkdir -p $DEPLOY_PATH"

# Копируем файлы
scp server.js package.json $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/

echo "✅ Файлы скопированы"
echo ""

echo "2️⃣ Установка зависимостей..."
ssh $SERVER_USER@$SERVER_HOST "cd $DEPLOY_PATH && npm install --production"
echo "✅ Зависимости установлены"
echo ""

echo "3️⃣ Настройка PM2..."
ssh $SERVER_USER@$SERVER_HOST << EOF
cd $DEPLOY_PATH

# Останавливаем старый процесс если есть
pm2 delete p2p-messenger 2>/dev/null || true

# Запускаем новый
pm2 start server.js --name p2p-messenger

# Сохраняем конфиг
pm2 save

# Показываем статус
pm2 status
EOF

echo "✅ PM2 настроен"
echo ""

echo "4️⃣ Копирование Nginx конфига..."
# Заменяем домен в конфиге
sed "s/ВАШ-ДОМЕН.com/$DOMAIN/g" nginx-timeweb.conf > /tmp/nginx-p2p.conf

# Копируем на сервер
scp /tmp/nginx-p2p.conf $SERVER_USER@$SERVER_HOST:/etc/nginx/sites-available/p2p-messenger

# Активируем конфиг
ssh $SERVER_USER@$SERVER_HOST << EOF
ln -sf /etc/nginx/sites-available/p2p-messenger /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
EOF

rm /tmp/nginx-p2p.conf
echo "✅ Nginx настроен"
echo ""

echo "🎉 Деплой завершен!"
echo ""
echo "📊 Проверка:"
echo "  Логи сервера: ssh $SERVER_USER@$SERVER_HOST 'pm2 logs p2p-messenger'"
echo "  Статус PM2: ssh $SERVER_USER@$SERVER_HOST 'pm2 status'"
echo "  WebSocket URL: wss://$DOMAIN"
echo ""
echo "🔧 Следующие шаги:"
echo "  1. Убедись что SSL сертификат установлен (certbot)"
echo "  2. Измени WS_URL в app.js на: wss://$DOMAIN"
echo "  3. Перезапусти Electron приложение"
echo ""

