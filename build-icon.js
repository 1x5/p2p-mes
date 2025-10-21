const fs = require('fs');
const path = require('path');

// Создаем простую SVG иконку для P2P мессенджера
const iconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
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
  <circle cx="256" cy="256" r="240" fill="url(#bg)" stroke="#1e40af" stroke-width="8"/>
  
  <!-- P2P connection lines -->
  <path d="M 150 200 Q 256 150 362 200" stroke="url(#msg)" stroke-width="6" fill="none" opacity="0.8"/>
  <path d="M 150 312 Q 256 362 362 312" stroke="url(#msg)" stroke-width="6" fill="none" opacity="0.8"/>
  
  <!-- Message bubbles -->
  <circle cx="180" cy="200" r="25" fill="url(#msg)" opacity="0.9"/>
  <circle cx="332" cy="200" r="25" fill="url(#msg)" opacity="0.9"/>
  <circle cx="180" cy="312" r="25" fill="url(#msg)" opacity="0.9"/>
  <circle cx="332" cy="312" r="25" fill="url(#msg)" opacity="0.9"/>
  
  <!-- Central connection point -->
  <circle cx="256" cy="256" r="35" fill="url(#msg)" stroke="#3b82f6" stroke-width="4"/>
  
  <!-- Text "P2P" -->
  <text x="256" y="270" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#3b82f6">P2P</text>
</svg>`;

// Сохраняем SVG
fs.writeFileSync('icon.svg', iconSvg);
console.log('✅ Создана иконка icon.svg');
