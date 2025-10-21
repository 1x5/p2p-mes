const fs = require('fs');
const path = require('path');

// Создаем простую SVG иконку для PWA
const createIconSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1d4ed8;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="msg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 4}" fill="url(#bg)" stroke="#1e40af" stroke-width="2"/>
  
  <!-- P2P connection lines -->
  <path d="M ${size*0.3} ${size*0.4} Q ${size/2} ${size*0.3} ${size*0.7} ${size*0.4}" stroke="url(#msg)" stroke-width="${size/50}" fill="none" opacity="0.8"/>
  <path d="M ${size*0.3} ${size*0.6} Q ${size/2} ${size*0.7} ${size*0.7} ${size*0.6}" stroke="url(#msg)" stroke-width="${size/50}" fill="none" opacity="0.8"/>
  
  <!-- Message bubbles -->
  <circle cx="${size*0.35}" cy="${size*0.4}" r="${size/20}" fill="url(#msg)" opacity="0.9"/>
  <circle cx="${size*0.65}" cy="${size*0.4}" r="${size/20}" fill="url(#msg)" opacity="0.9"/>
  <circle cx="${size*0.35}" cy="${size*0.6}" r="${size/20}" fill="url(#msg)" opacity="0.9"/>
  <circle cx="${size*0.65}" cy="${size*0.6}" r="${size/20}" fill="url(#msg)" opacity="0.9"/>
  
  <!-- Central connection point -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/15}" fill="url(#msg)" stroke="#3b82f6" stroke-width="${size/100}"/>
  
  <!-- Text "P2P" -->
  <text x="${size/2}" y="${size/2 + size/40}" font-family="Arial, sans-serif" font-size="${size/20}" font-weight="bold" text-anchor="middle" fill="#3b82f6">P2P</text>
</svg>`;

// Размеры иконок для PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

console.log('🎨 Создаю иконки для PWA...');

iconSizes.forEach(size => {
  const svg = createIconSVG(size);
  const filename = `icons/icon-${size}x${size}.png`;
  
  // Сохраняем SVG (для конвертации в PNG нужен внешний инструмент)
  const svgFilename = `icons/icon-${size}x${size}.svg`;
  fs.writeFileSync(svgFilename, svg);
  
  console.log(`✅ Создана иконка ${size}x${size}`);
});

console.log('🎉 Все иконки созданы!');
console.log('📝 Для PNG версий используй онлайн конвертер SVG→PNG или ImageMagick');
