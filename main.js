// Electron main process - главный процесс приложения

const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } = require('electron');
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
    title: 'p2p-mas',
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

  tray.setToolTip('p2p-mas');
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

  // Создаем простую иконку из SVG
  const color = isOnline ? '#10b981' : '#ef4444';
  const svgIcon = `
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" fill="${color}" stroke="#ffffff" stroke-width="1"/>
    </svg>
  `;
  
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svgIcon).toString('base64')}`);
  tray.setImage(icon);
}

// Обработчик уведомлений
ipcMain.handle('show-notification', (event, title, body) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, 'icon.svg'),
      silent: false
    });
    
    notification.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    
    notification.show();
  }
});

// Обработчик обновления tray иконки
ipcMain.on('update-tray-icon', (event, isOnline) => {
  updateTrayIcon(isOnline);
});

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

