// Preload script - мост между main и renderer процессами

const { contextBridge, ipcRenderer } = require('electron');

// Безопасный API для renderer процесса
contextBridge.exposeInMainWorld('electronAPI', {
  updateTrayIcon: (isOnline) => {
    ipcRenderer.send('update-tray-icon', isOnline);
  },
  
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  }
});

console.log('[Preload] Preload script загружен');

