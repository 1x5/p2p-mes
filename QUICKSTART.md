# ⚡️ Quick Start - За 5 минут

## 1️⃣ Создай иконки (30 сек)

Открой → https://cloudconvert.com/svg-to-png

- Загрузи `icon.svg`
- Конвертируй в 128px → сохрани как `icons/icon128.png`
- Конвертируй в 48px → сохрани как `icons/icon48.png`  
- Конвертируй в 16px → сохрани как `icons/icon16.png`

## 2️⃣ Установи расширение (1 мин)

1. `chrome://extensions/`
2. Включи "Режим разработчика"
3. "Загрузить распакованное расширение"
4. Выбери эту папку

## 3️⃣ Запусти сервер локально (1 мин)

```bash
npm install
npm start
```

Увидишь: `🚀 Сигнальный сервер запущен на порту 3000`

## 4️⃣ Протестируй (1 мин)

1. Кликни на иконку расширения
2. Открой второе окно Chrome
3. Кликни на иконку там
4. **Обе точки стали зелеными?** ✅ Работает!

---

## 🚀 Production (Timeweb)

### 1. Измени домен в коде

`popup.js` строка 2:
```javascript
const WS_URL = 'wss://твой-домен.com';
```

### 2. Деплой на сервер

```bash
# Локально
git init
git add .
git commit -m "Initial"
git remote add origin https://github.com/1x5/p2p-mes.git
git push -u origin main

# На сервере Timeweb
git clone https://github.com/1x5/p2p-mes.git
cd p2p-mes
chmod +x deploy.sh
./deploy.sh
```

### 3. Настрой Nginx

```bash
# Скопируй конфиг
sudo cp nginx.conf /etc/nginx/sites-available/p2p-mes

# Измени домен
sudo nano /etc/nginx/sites-available/p2p-mes
# Замени "ваш-домен.com" на реальный

# Активируй
sudo ln -s /etc/nginx/sites-available/p2p-mes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Обнови расширение

1. `chrome://extensions/` → кнопка "Обновить"
2. Попроси друга установить расширение
3. Оба откройте → должны увидеть зеленые точки

---

## ✅ Готово!

Минималистичный P2P мессенджер работает.

**Документация:**
- `SETUP.md` — полная инструкция
- `TEST.md` — тестирование
- `CHECKLIST.md` — чеклист перед запуском
- `ICONS.md` — как сделать иконки

**Поддержка:**
Проблемы? Смотри раздел Troubleshooting в `SETUP.md`

