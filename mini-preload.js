const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('miniAPI', {
  sendPlayerCommand: (command, value = null) => ipcRenderer.send('mini-player-command', { command, value }),
  closeMiniPlayer: () => ipcRenderer.send('mini-player-close'),
  restoreMainWindow: () => ipcRenderer.send('mini-player-restore-main'),
  getCurrentState: () => ipcRenderer.invoke('get-current-playback-state'),
  onPlaybackState: (callback) => {
    ipcRenderer.on('mini-player-state', (event, data) => callback(data));
  }
});

