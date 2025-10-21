# Как создать иконки для расширения

## Быстрый способ (2 минуты)

### Вариант 1: Онлайн конвертер (рекомендуется)
1. Открой https://cloudconvert.com/svg-to-png
2. Загрузи файл `icon.svg`
3. Установи размер 128x128 → скачай как `icon128.png`
4. Повтори для 48x48 → `icon48.png`
5. Повтори для 16x16 → `icon16.png`
6. Перемести все в папку `icons/`

### Вариант 2: Favicon Generator
1. Открой https://favicon.io/favicon-converter/
2. Загрузи любую квадратную картинку (128×128 или больше)
3. Скачай zip
4. Из архива возьми:
   - `android-chrome-192x192.png` → переименуй в `icon128.png`
   - `favicon-32x32.png` → переименуй в `icon48.png` (ресайзни до 48)
   - `favicon-16x16.png` → переименуй в `icon16.png`

### Вариант 3: Если есть ImageMagick
```bash
# Установка (если нет)
brew install imagemagick

# Конвертация
convert icon.svg -resize 128x128 icons/icon128.png
convert icon.svg -resize 48x48 icons/icon48.png
convert icon.svg -resize 16x16 icons/icon16.png
```

## Готовый набор (если лень)
Можно просто использовать эмодзи 💬:
1. Открой https://emojipng.com/
2. Найди 💬 (speech balloon)
3. Скачай в разных размерах

