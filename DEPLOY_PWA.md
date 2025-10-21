# Деплой PWA на продакшн (confirm4you.com)

## 1. Подключиться к серверу

```bash
ssh root@94.198.218.231
```

## 2. Обновить код

```bash
cd /var/www/p2p-mes
git pull origin master
```

## 3. Обновить Nginx конфиг

```bash
# Скопировать новый конфиг
cp nginx-pwa.conf /etc/nginx/sites-available/p2p-messenger

# Проверить конфиг
nginx -t

# Если OK, перезагрузить Nginx
systemctl reload nginx
```

## 4. Перезапустить WebSocket сервер

```bash
pm2 restart server
pm2 logs server  # Проверить логи
```

## 5. Проверить что все работает

### На компьютере:
1. Открой https://confirm4you.com в браузере
2. Должна загрузиться PWA
3. Статус должен быть "Офлайн"

### На iPhone:
1. Открой https://confirm4you.com в Safari
2. Нажми кнопку "Поделиться" → "На экран «Домой»"
3. Открой приложение с главного экрана
4. Статус должен стать "Онлайн" когда оба клиента запущены

## Troubleshooting

### Если WebSocket не подключается:

```bash
# Проверь что сервер запущен
pm2 list

# Проверь логи
pm2 logs server

# Проверь порт
netstat -tulpn | grep 3000

# Проверь Nginx логи
tail -f /var/log/nginx/p2p-messenger-error.log
```

### Если PWA файлы не загружаются:

```bash
# Проверь права на файлы
ls -la /var/www/p2p-mes/

# Должны быть readable
chmod 644 /var/www/p2p-mes/*.html
chmod 644 /var/www/p2p-mes/*.js
chmod 644 /var/www/p2p-mes/*.json
```

## SSL сертификат

Если SSL сертификат еще не установлен:

```bash
certbot --nginx -d confirm4you.com -d www.confirm4you.com
```

## Автообновление SSL

Certbot автоматически добавляет cron job для обновления.
Проверить:

```bash
certbot renew --dry-run
```

