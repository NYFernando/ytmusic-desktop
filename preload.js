const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Account / User profile management (100% API-free)
  getGoogleUser: () => ipcRenderer.invoke('get-google-user'),
  saveGoogleUser: (userData) => ipcRenderer.invoke('save-google-user', userData),
  logoutGoogleUser: () => ipcRenderer.invoke('logout-google-user'),

  // In-App Direct Google Sign-In Window (shares session with webview)
  startGoogleSignin: () => ipcRenderer.invoke('start-google-signin'),
  onGoogleSigninComplete: (cb) => {
    ipcRenderer.removeAllListeners('google-signin-complete');
    ipcRenderer.on('google-signin-complete', () => cb());
  },

  // Google OAuth 2.0 Loopback Sign-In (optional fallback)
  startGoogleOAuth: () => ipcRenderer.invoke('start-google-oauth'),
  onGoogleOAuthSuccess: (cb) => {
    ipcRenderer.removeAllListeners('google-oauth-success');
    ipcRenderer.on('google-oauth-success', (event, user) => cb(user));
  },
  getUserYouTubePlaylists: () => ipcRenderer.invoke('get-user-youtube-playlists'),
  syncBrowserCookies: () => ipcRenderer.invoke('sync-browser-cookies'),
  onBrowserCookiesSynced: (cb) => {
    ipcRenderer.removeAllListeners('browser-cookies-synced');
    ipcRenderer.on('browser-cookies-synced', cb);
  },

  downloadTrack: (videoId, title, artist) => ipcRenderer.send('download-track', { videoId, title, artist }),
  downloadPlaylist: (playlistId) => ipcRenderer.send('download-playlist', { playlistId }),
  onDownloadProgress: (callback) => {
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  getOfflineTracks: () => ipcRenderer.invoke('get-offline-tracks'),
  createPlaylist: (name) => ipcRenderer.invoke('create-playlist', name),
  renamePlaylist: (oldName, newName) => ipcRenderer.invoke('rename-playlist', { oldName, newName }),
  addSongToPlaylist: (songFilepath, playlistName) => ipcRenderer.invoke('add-song-to-playlist', { songFilepath, playlistName }),
  removeSongFromPlaylist: (songFilename, playlistName) => ipcRenderer.invoke('remove-song-from-playlist', { songFilename, playlistName }),
  setPlaylistCoverFile: (playlistName) => ipcRenderer.invoke('set-playlist-cover-file', playlistName),
  autoFetchMissingCovers: () => ipcRenderer.invoke('auto-fetch-missing-covers'),

  // Persistent Resumable Download Manager APIs
  getDownloadTasks: () => ipcRenderer.invoke('get-download-tasks'),
  pauseDownload: (taskId) => ipcRenderer.invoke('pause-download', taskId),
  resumeDownload: (taskId) => ipcRenderer.invoke('resume-download', taskId),
  cancelDownload: (taskId) => ipcRenderer.invoke('cancel-download', taskId),
  pauseAllDownloads: () => ipcRenderer.invoke('pause-all-downloads'),
  resumeAllDownloads: () => ipcRenderer.invoke('resume-all-downloads'),
  clearCompletedDownloads: () => ipcRenderer.invoke('clear-completed-downloads'),
  onDownloadTasksUpdated: (cb) => {
    ipcRenderer.removeAllListeners('download-tasks-updated');
    ipcRenderer.on('download-tasks-updated', (event, tasks) => cb(tasks));
  },

  // Picture-in-Picture Mini Player & Desktop Features
  togglePiP: (force) => ipcRenderer.send('toggle-pip-mode', force),
  onPiPModeChanged: (cb) => {
    ipcRenderer.removeAllListeners('pip-mode-changed');
    ipcRenderer.on('pip-mode-changed', (event, isPiP) => cb(isPiP));
  },
  onPlayerCommandFromMini: (cb) => {
    ipcRenderer.removeAllListeners('player-command-from-mini');
    ipcRenderer.on('player-command-from-mini', (event, data) => cb(data));
  },
  syncPlaybackToPiPAndDiscord: (state) => ipcRenderer.send('sync-playback-to-pip-and-discord', state),
  onGlobalShortcutCommand: (cb) => {
    ipcRenderer.removeAllListeners('global-shortcut-command');
    ipcRenderer.on('global-shortcut-command', (event, data) => cb(data));
  },

  // App Settings & Preferences
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  saveAppSettings: (settings) => ipcRenderer.invoke('save-app-settings', settings)
});
