#!/bin/bash

# Скрипт быстрого деплоя на Timeweb Cloud

set -e

echo "🚀 Деплой P2P Messenger на Timeweb..."

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "${YELLOW}Node.js не установлен. Установка...${NC}"
    curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Установка зависимостей
echo "${YELLOW}Установка зависимостей...${NC}"
npm install

# Установка PM2 (если нет)
if ! command -v pm2 &> /dev/null; then
    echo "${YELLOW}Установка PM2...${NC}"
    npm install -g pm2
fi

# Остановка старого процесса (если есть)
pm2 delete p2p-messenger 2>/dev/null || true

# Запуск приложения
echo "${YELLOW}Запуск приложения...${NC}"
pm2 start server.js --name "p2p-messenger"

# Автозапуск при перезагрузке
pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
pm2 save

echo ""
echo "${GREEN}✅ Деплой завершен!${NC}"
echo ""
echo "📊 Команды управления:"
echo "  pm2 logs p2p-messenger    - Логи"
echo "  pm2 restart p2p-messenger - Перезапуск"
echo "  pm2 stop p2p-messenger    - Остановка"
echo "  pm2 status                - Статус"
echo ""
echo "🔧 Не забудь настроить Nginx для WSS (см. SETUP.md)"

