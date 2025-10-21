// Electron main process - главный процесс приложения

const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

// Создание главного окна
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'P2P Messenger',
    show: false // Не показываем сразу, покажем когда загрузится
  });

  mainWindow.loadFile('app.html');

  // Показываем окно когда загрузится
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Вместо закрытия - скрываем в tray
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Открываем DevTools в режиме разработки
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Создание tray иконки
function createTray() {
  // Создаем простую иконку (16x16 красный круг для начала)
  const icon = nativeImage.createEmpty();
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Показать',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Выход',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('P2P Messenger');
  tray.setContextMenu(contextMenu);

  // Клик по иконке показывает окно
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

// Обновление tray иконки (красная/зеленая)
function updateTrayIcon(isOnline) {
  if (!tray) return;

  // Создаем canvas для иконки
  const size = 16;
  const canvas = require('canvas').createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Рисуем круг
  ctx.fillStyle = isOnline ? '#10b981' : '#ef4444';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
  ctx.fill();

  const icon = nativeImage.createFromBuffer(canvas.toBuffer());
  tray.setImage(icon);
}

// Запуск приложения
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// Выход из приложения
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// Экспорт функции для обновления иконки из renderer
exports.updateTrayIcon = updateTrayIcon;

console.log('[Main] Electron приложение запущено');

