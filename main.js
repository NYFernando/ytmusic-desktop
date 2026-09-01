const { app, BrowserWindow, ipcMain, session, desktopCapturer, dialog, powerSaveBlocker, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { extractAllCookies, exportNetscapeCookiesFile } = require('./cookie-importer');
const downloadManager = require('./download-manager');
const discordPresence = require('./discord-presence');

// Prevent background power suspension and audio throttling
try {
  powerSaveBlocker.start('prevent-app-suspension');
} catch (e) {}

app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('enable-features', 'MediaSessionService,HardwareMediaKeyHandling');


// Register custom protocol client
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('ytmusic-desktop', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('ytmusic-desktop');
}

// User Agents
const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

app.userAgentFallback = chromeUA;

// Global Paths (D: Drive preferred)
const DOWNLOAD_DIR = 'D:\\Music\\YTM-Downloads';
const PLAYLISTS_DIR = path.join(DOWNLOAD_DIR, 'Playlists');
const SONGS_DIR = path.join(PLAYLISTS_DIR, 'Downloaded Songs');

let mainWindow;

function createWindow() {
  // Apply clean Chrome User-Agent across all requests
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = chromeUA;
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Network Ad-Blocker
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url.toLowerCase();
    
    // Never block Google Authentication, captcha, or account verification requests
    if (
      url.includes('accounts.google.') || 
      url.includes('accounts.youtube.') || 
      url.includes('gstatic.com') || 
      url.includes('google.com/recaptcha') ||
      url.includes('ytmusic-desktop://') || 
      url.includes('127.0.0.1') || 
      url.includes('localhost')
    ) {
      return callback({ cancel: false });
    }

    // Check if the URL contains ad, tracker, or telemetry keywords
    const isAdOrTracker = 
      url.includes('doubleclick.net') ||
      url.includes('googleadservices.com') ||
      url.includes('googlesyndication.com') ||
      url.includes('/pagead/') ||
      url.includes('/ptracking/') ||
      url.includes('googleads') ||
      url.includes('telemetry');
      
    if (isAdOrTracker) {
      callback({ cancel: true });
    } else {
      callback({ cancel: false });
    }
  });

  mainWindow = new BrowserWindow({
    width: 1250,
    height: 850,
    minWidth: 950,
    minHeight: 650,
    frame: false, // Frameless window for custom styling
    backgroundColor: '#09090b',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable <webview> tag
      backgroundThrottling: false, // Prevent audio/timer throttling in background
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

  // Initialize Persistent Resumable Download Manager
  downloadManager.init({
    app,
    mainWindow,
    session: session.defaultSession,
    config: {
      downloadDir: DOWNLOAD_DIR,
      playlistsDir: PLAYLISTS_DIR,
      songsDir: SONGS_DIR,
      chromeUA,
      getYtDlpPath,
      getFfmpegDir,
      ensureSongCover
    }
  });

  // IPC Event Handlers for Titlebar Window Controls
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.close();
    }
  });

  registerGlobalMediaShortcuts();
  discordPresence.init({ enabled: true });
}

// --- Global Media Shortcuts ---
function registerGlobalMediaShortcuts() {
  try {
    globalShortcut.unregisterAll();
    
    globalShortcut.register('MediaPlayPause', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-shortcut-command', { command: 'play-pause' });
      }
    });

    globalShortcut.register('MediaNextTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-shortcut-command', { command: 'next' });
      }
    });

    globalShortcut.register('MediaPreviousTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-shortcut-command', { command: 'previous' });
      }
    });

    globalShortcut.register('MediaStop', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-shortcut-command', { command: 'pause' });
      }
    });

    // Custom secondary hotkeys (Ctrl+Alt+Space, etc.)
    globalShortcut.register('CommandOrControl+Alt+Space', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-shortcut-command', { command: 'play-pause' });
      }
    });

    globalShortcut.register('CommandOrControl+Alt+Right', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-shortcut-command', { command: 'next' });
      }
    });

    globalShortcut.register('CommandOrControl+Alt+Left', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('global-shortcut-command', { command: 'previous' });
      }
    });
  } catch (err) {
    console.warn('[Shortcuts] Global shortcut warning:', err);
  }
}

// --- Mini Picture-in-Picture Floating Player Window ---
let miniWindow = null;
let lastPlaybackState = {
  title: 'No Track Playing',
  artist: 'YouTube Music',
  album: 'YouTube Music',
  art: 'https://music.youtube.com/img/on_platform_logo_dark.svg',
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 50,
  isLiked: false
};

function createMiniPlayerWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show();
    miniWindow.focus();
    return miniWindow;
  }

  miniWindow = new BrowserWindow({
    width: 330,
    height: 115,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    resizable: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'mini-preload.js')
    }
  });

  miniWindow.loadFile(path.join(__dirname, 'public', 'mini-player.html'));

  miniWindow.webContents.on('did-finish-load', () => {
    if (lastPlaybackState && miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send('mini-player-state', lastPlaybackState);
    }
  });

  miniWindow.on('closed', () => {
    miniWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pip-mode-changed', false);
    }
  });

  return miniWindow;
}

ipcMain.on('toggle-pip-mode', (event, forceState) => {
  if (forceState === true) {
    createMiniPlayerWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pip-mode-changed', true);
    }
  } else if (forceState === false) {
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.close();
    }
  } else {
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.close();
    } else {
      createMiniPlayerWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pip-mode-changed', true);
      }
    }
  }
});

ipcMain.on('mini-player-command', (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('player-command-from-mini', data);
  }
});

ipcMain.on('mini-player-close', () => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close();
  }
});

ipcMain.on('mini-player-restore-main', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.close();
  }
});

ipcMain.handle('get-current-playback-state', () => lastPlaybackState);

ipcMain.on('sync-playback-to-pip-and-discord', (event, state) => {
  if (state && state.title) {
    lastPlaybackState = state;
  }
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('mini-player-state', state);
  }
  discordPresence.updateActivity(state);
});

// --- App Settings Persistence ---
const SETTINGS_PATH = path.join(DOWNLOAD_DIR, '.settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
  } catch (e) {}
  return {
    theme: 'crimson',
    downloadQuality: 'best',
    discordRpc: true,
    eqEnabled: false,
    eqPreset: 'flat',
    eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    preampGain: 0,
    bassBoost: 0,
    crossfadeSeconds: 0
  };
}

function saveSettings(settings) {
  try {
    if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
    if (settings.discordRpc !== undefined) {
      discordPresence.setEnabled(settings.discordRpc);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

ipcMain.handle('get-app-settings', () => loadSettings());
ipcMain.handle('save-app-settings', (event, settings) => saveSettings(settings));

// --- User Account & Session Management (100% Native, No APIs/Keys Required) ---
const GOOGLE_USER_PATH = path.join(app.getPath('userData'), 'google_user.json');

ipcMain.handle('get-google-user', () => {
  if (fs.existsSync(GOOGLE_USER_PATH)) {
    try { return JSON.parse(fs.readFileSync(GOOGLE_USER_PATH, 'utf8')); } catch (e) {}
  }
  return null;
});

ipcMain.handle('save-google-user', (event, userData) => {
  try {
    fs.writeFileSync(GOOGLE_USER_PATH, JSON.stringify(userData, null, 2));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('logout-google-user', async () => {
  try {
    if (fs.existsSync(GOOGLE_USER_PATH)) fs.unlinkSync(GOOGLE_USER_PATH);
    const cookies = await session.defaultSession.cookies.get({ domain: '.google.com' });
    for (const c of cookies) {
      await session.defaultSession.cookies.remove(`https://${c.domain.replace(/^\./, '')}`, c.name).catch(() => {});
    }
    const ytCookies = await session.defaultSession.cookies.get({ domain: '.youtube.com' });
    for (const c of ytCookies) {
      await session.defaultSession.cookies.remove(`https://${c.domain.replace(/^\./, '')}`, c.name).catch(() => {});
    }
    await session.defaultSession.clearStorageData({ storages: ['cookies'] }).catch(() => {});
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// --- Google OAuth 2.0 Loopback Flow (Official Desktop App Flow) ---
const GOOGLE_CLIENT_ID = '526500983476-bc2t746i13sbbvurgs5l19ebfdtsdskb.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';

function exchangeCodeForTokens(code, redirectUri) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      code: code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString();

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error_description || parsed.error));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function fetchGoogleUserInfo(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: '/oauth2/v3/userinfo',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'YouTube-Music-Desktop'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

let oauthServer = null;

ipcMain.handle('start-google-oauth', async () => {
  const PORT = 5506;
  const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;

  if (oauthServer) {
    try { oauthServer.close(); } catch (e) {}
    oauthServer = null;
  }

  return new Promise((resolve) => {
    let resolved = false;

    oauthServer = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
        if (reqUrl.pathname === '/callback') {
          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!DOCTYPE html><html><head><title>Authentication Cancelled</title>
            <style>
              * { margin:0; padding:0; box-sizing:border-box; }
              body { background:#09090b; color:#fff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; }
              .card { background:#18181b; padding:36px; border-radius:20px; text-align:center; border:1px solid rgba(255,255,255,0.08); max-width:400px; }
              .icon { font-size:36px; margin-bottom:14px; color:#ef4444; }
              h2 { font-size:20px; margin-bottom:8px; }
              p { font-size:14px; color:#a1a1aa; }
            </style></head><body>
              <div class="card">
                <div class="icon">✕</div>
                <h2>Sign-in Cancelled</h2>
                <p>${error}</p>
              </div>
            </body></html>`);
            if (!resolved) { resolved = true; resolve({ success: false, error }); }
            setTimeout(() => { try { if (oauthServer) oauthServer.close(); } catch (e) {} }, 1000);
            return;
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing code parameter');
            return;
          }

          // Exchange code for tokens & fetch user profile
          const tokens = await exchangeCodeForTokens(code, REDIRECT_URI);
          const userInfo = await fetchGoogleUserInfo(tokens.access_token);

          const userData = {
            id: userInfo.sub,
            name: userInfo.name || userInfo.email.split('@')[0],
            email: userInfo.email,
            avatar: userInfo.picture,
            tokens: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expiry_date: Date.now() + (tokens.expires_in * 1000)
            }
          };

          fs.writeFileSync(GOOGLE_USER_PATH, JSON.stringify(userData, null, 2));

          // Success HTML page
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<!DOCTYPE html><html><head><title>Signed In - YouTube Music Desktop</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { background:#09090b; color:#fff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; }
            .card { background:#18181b; padding:40px 36px; border-radius:24px; text-align:center; border:1px solid rgba(255,255,255,0.08); max-width:420px; box-shadow:0 24px 64px rgba(0,0,0,0.8); }
            .icon { width:56px; height:56px; background:rgba(34,197,94,0.15); color:#22c55e; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:16px; font-weight:bold; }
            h2 { font-size:22px; font-weight:700; margin-bottom:8px; }
            p { font-size:14px; color:#a1a1aa; line-height:1.6; }
            .badge { display:inline-block; margin-top:16px; padding:6px 14px; background:rgba(255,255,255,0.06); border-radius:20px; font-size:13px; color:#e4e4e7; }
          </style></head><body>
            <div class="card">
              <div class="icon">✓</div>
              <h2>Signed In Successfully!</h2>
              <p>Welcome, <strong>${userData.name}</strong>.<br>You are now connected to YouTube Music Desktop.<br>You can close this tab and return to the app.</p>
              <div class="badge">${userData.email}</div>
            </div>
            <script>setTimeout(() => window.close(), 2500);</script>
          </body></html>`);

          setTimeout(() => { try { if (oauthServer) oauthServer.close(); } catch (e) {} }, 1500);

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
            mainWindow.webContents.send('google-oauth-success', userData);
          }

          if (!resolved) { resolved = true; resolve({ success: true, user: userData }); }
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      } catch (err) {
        console.error('OAuth callback error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Authentication failed: ' + err.message);
        if (!resolved) { resolved = true; resolve({ success: false, error: err.message }); }
      }
    });

    oauthServer.listen(PORT, '127.0.0.1', () => {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&access_type=offline` +
        `&prompt=select_account`;

      shell.openExternal(authUrl);
    });

    oauthServer.on('error', (err) => {
      if (!resolved) { resolved = true; resolve({ success: false, error: err.message }); }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { if (oauthServer) oauthServer.close(); } catch (e) {}
        resolve({ success: false, error: 'Sign in timed out' });
      }
    }, 300000);
  });
});

// --- Dedicated In-App Google Sign-In Window (Direct Session Login) ---
let loginWin = null;

ipcMain.handle('start-google-signin', () => {
  if (loginWin && !loginWin.isDestroyed()) {
    loginWin.focus();
    return;
  }

  loginWin = new BrowserWindow({
    width: 520,
    height: 700,
    resizable: true,
    title: 'Sign In - YouTube Music',
    parent: mainWindow,
    modal: false,
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    webPreferences: {
      session: session.defaultSession,
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  loginWin.setMenuBarVisibility(false);
  loginWin.webContents.setUserAgent(chromeUA);

  const injectStealth = () => {
    loginWin.webContents.executeJavaScript(`
      try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        if (!window.chrome) window.chrome = {};
        if (!window.chrome.runtime) window.chrome.runtime = {};
      } catch(e) {}
    `).catch(() => {});
  };

  loginWin.webContents.on('dom-ready', injectStealth);
  loginWin.webContents.on('did-navigate', injectStealth);

  const loginUrl = 'https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue=https%3A%2F%2Fmusic.youtube.com%2F';
  loginWin.loadURL(loginUrl);

  const handleRedirect = (event, url) => {
    if (url && url.startsWith('https://music.youtube.com') && !url.includes('accounts.google')) {
      // Successfully authenticated!
      setTimeout(() => {
        try {
          if (loginWin && !loginWin.isDestroyed()) loginWin.close();
        } catch (e) {}
      }, 500);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        mainWindow.webContents.send('google-signin-complete');
      }
    }
  };

  loginWin.webContents.on('will-navigate', handleRedirect);
  loginWin.webContents.on('did-navigate', (e, url) => handleRedirect(null, url));
  loginWin.webContents.on('did-redirect-navigation', (e, url) => handleRedirect(null, url));

  loginWin.on('closed', () => { loginWin = null; });
});

// --- Fetch User's Google / YouTube Playlists via API ---
ipcMain.handle('get-user-youtube-playlists', async () => {
  if (!fs.existsSync(GOOGLE_USER_PATH)) return { success: false, error: 'Not signed in' };
  try {
    const userData = JSON.parse(fs.readFileSync(GOOGLE_USER_PATH, 'utf8'));
    let accessToken = userData.tokens?.access_token;
    
    // Check if token expired and refresh if possible
    if (userData.tokens?.expiry_date && Date.now() > userData.tokens.expiry_date - 60000 && userData.tokens.refresh_token) {
      try {
        const refreshData = new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: userData.tokens.refresh_token,
          grant_type: 'refresh_token'
        }).toString();
        
        const refreshed = await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: 'oauth2.googleapis.com',
            path: '/token',
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
          });
          req.on('error', reject);
          req.write(refreshData);
          req.end();
        });
        if (refreshed.access_token) {
          accessToken = refreshed.access_token;
          userData.tokens.access_token = accessToken;
          if (refreshed.expires_in) userData.tokens.expiry_date = Date.now() + (refreshed.expires_in * 1000);
          fs.writeFileSync(GOOGLE_USER_PATH, JSON.stringify(userData, null, 2));
        }
      } catch (e) {}
    }

    if (!accessToken) return { success: false, error: 'No access token' };

    // Fetch user playlists from YouTube Data API
    const apiRes = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'www.googleapis.com',
        path: '/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'YouTube-Music-Desktop' }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve(JSON.parse(d)); } catch(e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.end();
    });

    if (apiRes.items) {
      const playlists = apiRes.items.map(item => ({
        id: item.id,
        title: item.snippet?.title || 'Untitled Playlist',
        description: item.snippet?.description || '',
        thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
        itemCount: item.contentDetails?.itemCount || 0
      }));
      return { success: true, playlists };
    }
    return { success: false, error: apiRes.error?.message || 'No playlists found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Extract & Inject Browser Session Cookies (Opera GX / Chrome / Edge / Brave) ---
ipcMain.handle('sync-browser-cookies', async () => {
  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  try {
    const cookiesPath = path.join(app.getPath('userData'), 'yt-cookies.txt');
    const dlCookiesPath = path.join(DOWNLOAD_DIR, 'yt-cookies.txt');
    
    const res = await extractAllCookies();
    if (!res.success) {
      if (win) {
        dialog.showMessageBox(win, {
          type: 'error',
          title: 'No Session Found',
          message: 'No signed-in YouTube session found',
          detail: res.message || 'Please log in to YouTube in Opera GX, Chrome, or Edge, and try again.'
        });
      }
      return res;
    }

    // Export Netscape format cookies file for yt-dlp
    await exportNetscapeCookiesFile(cookiesPath);
    try {
      await exportNetscapeCookiesFile(dlCookiesPath);
    } catch (e) {}

    if (res.cookies && res.cookies.length > 0) {
      let count = 0;
      for (const c of res.cookies) {
        try {
          const isHostCookie = c.name.startsWith('__Host-');
          const cookieObj = {
            url: `https://${c.domain.replace(/^\./, '')}${c.path || '/'}`,
            name: c.name,
            value: c.value,
            path: c.path || '/',
            secure: c.name.startsWith('__Secure-') || isHostCookie ? true : c.secure,
            httpOnly: c.httpOnly
          };
          if (!isHostCookie) {
            cookieObj.domain = c.domain.startsWith('.') ? c.domain : '.' + c.domain;
          }
          await session.defaultSession.cookies.set(cookieObj);
          count++;
        } catch (err) {
          try {
            await session.defaultSession.cookies.set({
              url: `https://${c.domain.replace(/^\./, '')}${c.path || '/'}`,
              name: c.name,
              value: c.value,
              path: c.path || '/',
              secure: true,
              httpOnly: c.httpOnly
            });
            count++;
          } catch (e) {}
        }
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('browser-cookies-synced');
      }

      if (win) {
        dialog.showMessageBox(win, {
          type: 'info',
          title: 'Sync Complete',
          message: 'Signed in successfully!',
          detail: `Successfully imported ${count} session cookies from ${res.browser || 'your browser'}. Both YouTube Music and the offline downloader are now authenticated.`
        });
      }

      return { success: true, count, browser: res.browser };
    }

    return { success: false, error: 'NoCookies', message: 'No valid YouTube cookies found.' };
  } catch (err) {
    if (win) {
      dialog.showMessageBox(win, {
        type: 'error',
        title: 'Sync Error',
        message: 'Could not extract cookies.',
        detail: err.message
      });
    }
    return { success: false, error: 'ExtractError', message: err.message };
  }
});

// Helper to ensure cover artwork exists for every downloaded song
async function ensureSongCover(dir, baseFilename, title, artist, videoId = '') {
  const possibleArt = ['.jpg', '.jpeg', '.png', '.webp'];
  
  // 1. Check if an image file already exists
  for (const ext of possibleArt) {
    if (fs.existsSync(path.join(dir, `${baseFilename}${ext}`))) return true;
  }

  // 2. Check if yt-dlp created baseFilename.mp3.jpg or baseFilename.mp3.webp
  const mp3Jpg = path.join(dir, `${baseFilename}.mp3.jpg`);
  if (fs.existsSync(mp3Jpg)) {
    try {
      fs.renameSync(mp3Jpg, path.join(dir, `${baseFilename}.jpg`));
      return true;
    } catch (e) {}
  }
  const mp3Webp = path.join(dir, `${baseFilename}.mp3.webp`);
  if (fs.existsSync(mp3Webp)) {
    try {
      fs.renameSync(mp3Webp, path.join(dir, `${baseFilename}.webp`));
      return true;
    } catch (e) {}
  }

  // 3. Try fetching YouTube HQ Thumbnail if videoId is provided
  if (videoId) {
    const ytUrls = [
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    ];
    for (const u of ytUrls) {
      try {
        const success = await new Promise((resolve) => {
          https.get(u, (res) => {
            if (res.statusCode === 200) {
              const chunks = [];
              res.on('data', c => chunks.push(c));
              res.on('end', () => {
                const buf = Buffer.concat(chunks);
                if (buf.length > 2500) {
                  fs.writeFileSync(path.join(dir, `${baseFilename}.jpg`), buf);
                  resolve(true);
                  return;
                }
                resolve(false);
              });
            } else {
              resolve(false);
            }
          }).on('error', () => resolve(false));
        });
        if (success) return true;
      } catch (e) {}
    }
  }

  // 4. Fallback: Query iTunes Search API for official 600x600 artwork
  try {
    const query = `${title} ${artist}`.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    const apiUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    return await new Promise((resolve) => {
      https.get(apiUrl, (res) => {
        let raw = '';
        res.on('data', d => raw += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
              const hqUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
              https.get(hqUrl, (imgRes) => {
                const chunks = [];
                imgRes.on('data', c => chunks.push(c));
                imgRes.on('end', () => {
                  fs.writeFileSync(path.join(dir, `${baseFilename}.jpg`), Buffer.concat(chunks));
                  resolve(true);
                });
              }).on('error', () => resolve(false));
            } else {
              resolve(false);
            }
          } catch (e) {
            resolve(false);
          }
        });
      }).on('error', () => resolve(false));
    });
  } catch (e) {
    return false;
  }
}

function getYtDlpPath() {
  const isPackaged = app.isPackaged;
  const bundled = isPackaged 
    ? path.join(process.resourcesPath, 'bin', 'yt-dlp.exe')
    : path.join(__dirname, 'bin', 'yt-dlp.exe');
    
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return 'yt-dlp';
}

function getFfmpegDir() {
  const isPackaged = app.isPackaged;
  const bundled = isPackaged
    ? path.join(process.resourcesPath, 'bin')
    : path.join(__dirname, 'bin');

  if (fs.existsSync(path.join(bundled, 'ffmpeg.exe'))) {
    return bundled;
  }
  return null;
}

// Initialize Download Manager Handlers
ipcMain.on('download-track', (event, { videoId, title, artist }) => {
  downloadManager.startTrackDownload({ videoId, title, artist });
});

ipcMain.on('download-playlist', (event, { playlistId }) => {
  downloadManager.startPlaylistDownload({ playlistId });
});

ipcMain.handle('get-download-tasks', () => downloadManager.getTasks());
ipcMain.handle('pause-download', (event, taskId) => downloadManager.pauseTask(taskId));
ipcMain.handle('resume-download', (event, taskId) => downloadManager.resumeTask(taskId));
ipcMain.handle('cancel-download', (event, taskId) => downloadManager.cancelTask(taskId));
ipcMain.handle('pause-all-downloads', () => downloadManager.pauseAll());
ipcMain.handle('resume-all-downloads', () => downloadManager.resumeAll());
ipcMain.handle('clear-completed-downloads', () => downloadManager.clearCompleted());

ipcMain.handle('get-offline-tracks', () => {
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    return { songs: [], playlists: [] };
  }
  
  try {
    if (!fs.existsSync(PLAYLISTS_DIR)) fs.mkdirSync(PLAYLISTS_DIR, { recursive: true });
    if (!fs.existsSync(SONGS_DIR)) fs.mkdirSync(SONGS_DIR, { recursive: true });

    // Auto-migrate loose songs from root DOWNLOAD_DIR, legacy Songs/, and legacy Downloaded Playlist into Playlists/Downloaded Songs
    const legacyFolders = [
      DOWNLOAD_DIR,
      path.join(DOWNLOAD_DIR, 'Songs'),
      path.join(PLAYLISTS_DIR, 'Downloaded Playlist')
    ];

    for (const sourceFolder of legacyFolders) {
      if (fs.existsSync(sourceFolder) && sourceFolder !== SONGS_DIR && sourceFolder !== PLAYLISTS_DIR) {
        try {
          const files = fs.readdirSync(sourceFolder);
          for (const file of files) {
            const fullOld = path.join(sourceFolder, file);
            if (fs.statSync(fullOld).isFile()) {
              const fullNew = path.join(SONGS_DIR, file);
              if (!fs.existsSync(fullNew)) {
                try { fs.renameSync(fullOld, fullNew); } catch (e) {
                  try { fs.copyFileSync(fullOld, fullNew); } catch (e2) {}
                }
              }
            }
          }
          // If legacy folder is empty, clean it up
          if (sourceFolder === path.join(DOWNLOAD_DIR, 'Songs') || sourceFolder === path.join(PLAYLISTS_DIR, 'Downloaded Playlist')) {
            try {
              const rem = fs.readdirSync(sourceFolder);
              if (rem.length === 0) fs.rmdirSync(sourceFolder);
            } catch (e) {}
          }
        } catch (e) {}
      }
    }

    const songs = [];
    const playlists = [];

    // Helper to extract embedded cover art or external file
    const getCoverArt = (dir, file) => {
      const nameWithoutExt = path.basename(file, '.mp3');
      const possibleExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      for (const ext of possibleExtensions) {
        const artPath = path.join(dir, `${nameWithoutExt}${ext}`);
        if (fs.existsSync(artPath)) {
          return 'file:///' + artPath.replace(/\\/g, '/');
        }
      }

      // Read embedded ID3 APIC JPEG cover art
      try {
        const fullPath = path.join(dir, file);
        const data = fs.readFileSync(fullPath);
        const jpgStart = data.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
        if (jpgStart !== -1) {
          const jpgEnd = data.indexOf(Buffer.from([0xff, 0xd9]), jpgStart);
          if (jpgEnd !== -1) {
            const imgBuffer = data.subarray(jpgStart, jpgEnd + 2);
            return `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
          }
        }
      } catch (e) {}
      return null;
    };

    // Helper to parse song object
    const parseSongFile = (dir, file) => {
      const nameWithoutExt = path.basename(file, '.mp3');
      const parts = nameWithoutExt.split(' - ');
      let title = nameWithoutExt;
      let artist = 'Unknown';
      if (parts.length > 1) {
        title = parts[0].trim();
        artist = parts.slice(1).join(' - ').trim();
      }

      const coverArt = getCoverArt(dir, file);

      return {
        type: 'song',
        filename: file,
        filepath: path.join(dir, file),
        title,
        artist,
        coverArt
      };
    };

    // Scan all Playlists inside PLAYLISTS_DIR (including "Downloaded Songs")
    if (fs.existsSync(PLAYLISTS_DIR)) {
      const items = fs.readdirSync(PLAYLISTS_DIR, { withFileTypes: true });
      items.filter(item => item.isDirectory()).forEach(folder => {
        const folderPath = path.join(PLAYLISTS_DIR, folder.name);
        const folderFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.mp3'));
        const playlistTracks = folderFiles.map(f => parseSongFile(folderPath, f));

        // 1. Check for dedicated playlist cover file (cover.jpg, cover.png, etc.)
        let playlistCover = null;
        const coverExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        for (const ext of coverExtensions) {
          const coverPath = path.join(folderPath, `cover${ext}`);
          if (fs.existsSync(coverPath)) {
            try {
              const stat = fs.statSync(coverPath);
              playlistCover = 'file:///' + coverPath.replace(/\\/g, '/') + '?t=' + stat.mtimeMs;
              break;
            } catch (e) {
              playlistCover = 'file:///' + coverPath.replace(/\\/g, '/') + '?t=' + Date.now();
              break;
            }
          }
        }

        // 2. Fallback to first track's cover
        if (!playlistCover) {
          playlistCover = playlistTracks.find(t => t.coverArt)?.coverArt || null;
        }

        playlists.push({
          type: 'playlist',
          title: folder.name,
          trackCount: playlistTracks.length,
          coverArt: playlistCover,
          tracks: playlistTracks
        });

        // Add to global songs collection
        playlistTracks.forEach(t => {
          if (!songs.some(s => s.filepath === t.filepath)) {
            songs.push(t);
          }
        });
      });
    }

    // Sort playlists so "Downloaded Songs" is always pinned at the top
    playlists.sort((a, b) => {
      if (a.title === 'Downloaded Songs') return -1;
      if (b.title === 'Downloaded Songs') return 1;
      return a.title.localeCompare(b.title);
    });

    return { songs, playlists };
  } catch (err) {
    console.error('Failed to read offline tracks:', err);
    return { songs: [], playlists: [] };
  }
});

// Create New Playlist
ipcMain.handle('create-playlist', (event, name) => {
  const safeName = (name || '').replace(/[<>:"/\\|?*]+/g, '').trim();
  if (!safeName) return { success: false, error: 'Invalid playlist name' };
  if (!fs.existsSync(PLAYLISTS_DIR)) fs.mkdirSync(PLAYLISTS_DIR, { recursive: true });
  const targetDir = path.join(PLAYLISTS_DIR, safeName);
  if (fs.existsSync(targetDir)) return { success: false, error: 'Playlist already exists' };
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    return { success: true, name: safeName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Rename Playlist
ipcMain.handle('rename-playlist', (event, { oldName, newName }) => {
  const safeOld = (oldName || '').replace(/[<>:"/\\|?*]+/g, '').trim();
  const safeNew = (newName || '').replace(/[<>:"/\\|?*]+/g, '').trim();
  if (!safeOld || !safeNew) return { success: false, error: 'Invalid playlist names' };
  const oldDir = path.join(PLAYLISTS_DIR, safeOld);
  const newDir = path.join(PLAYLISTS_DIR, safeNew);
  if (!fs.existsSync(oldDir)) return { success: false, error: 'Playlist does not exist' };
  if (fs.existsSync(newDir) && oldDir.toLowerCase() !== newDir.toLowerCase()) {
    return { success: false, error: 'Target playlist name already exists' };
  }
  try {
    fs.renameSync(oldDir, newDir);
    return { success: true, oldName: safeOld, newName: safeNew };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Add Downloaded Song to Playlist
ipcMain.handle('add-song-to-playlist', (event, { songFilepath, playlistName }) => {
  const safePlaylist = (playlistName || '').replace(/[<>:"/\\|?*]+/g, '').trim();
  if (!safePlaylist || !fs.existsSync(songFilepath)) return { success: false, error: 'Invalid file or playlist' };
  const playlistDir = path.join(PLAYLISTS_DIR, safePlaylist);
  if (!fs.existsSync(playlistDir)) fs.mkdirSync(playlistDir, { recursive: true });
  
  const filename = path.basename(songFilepath);
  const destMp3 = path.join(playlistDir, filename);
  try {
    fs.copyFileSync(songFilepath, destMp3);
    // Also copy matching cover art if exists
    const srcDir = path.dirname(songFilepath);
    const nameWithoutExt = path.basename(filename, '.mp3');
    ['.jpg', '.jpeg', '.png', '.webp'].forEach(ext => {
      const artSrc = path.join(srcDir, `${nameWithoutExt}${ext}`);
      if (fs.existsSync(artSrc)) {
        try { fs.copyFileSync(artSrc, path.join(playlistDir, `${nameWithoutExt}${ext}`)); } catch (e) {}
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Remove Song from Playlist
ipcMain.handle('remove-song-from-playlist', (event, { songFilename, playlistName }) => {
  const safePlaylist = (playlistName || '').replace(/[<>:"/\\|?*]+/g, '').trim();
  const playlistDir = path.join(PLAYLISTS_DIR, safePlaylist);
  const targetMp3 = path.join(playlistDir, songFilename);
  if (fs.existsSync(targetMp3)) {
    try {
      fs.unlinkSync(targetMp3);
      const nameWithoutExt = path.basename(songFilename, '.mp3');
      ['.jpg', '.jpeg', '.png', '.webp'].forEach(ext => {
        const art = path.join(playlistDir, `${nameWithoutExt}${ext}`);
        if (fs.existsSync(art)) {
          try { fs.unlinkSync(art); } catch (e) {}
        }
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'Track not found in playlist' };
});

// Set Playlist Cover from File Picker
ipcMain.handle('set-playlist-cover-file', async (event, playlistName) => {
  const safePlaylist = (playlistName || '').replace(/[<>:"/\\|?*]+/g, '').trim();
  const playlistDir = path.join(PLAYLISTS_DIR, safePlaylist);
  if (!fs.existsSync(playlistDir)) return { success: false, error: 'Playlist folder not found' };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `Select Cover Image for "${safePlaylist}"`,
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
    properties: ['openFile']
  });
  
  if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
  
  try {
    // Clean up old cover files
    ['.jpg', '.jpeg', '.png', '.webp'].forEach(ext => {
      const p = path.join(playlistDir, `cover${ext}`);
      if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) {}
    });

    const selectedFile = result.filePaths[0];
    const ext = path.extname(selectedFile).toLowerCase() || '.jpg';
    const destPath = path.join(playlistDir, `cover${ext}`);
    fs.copyFileSync(selectedFile, destPath);
    const ts = Date.now();
    return { success: true, coverArt: 'file:///' + destPath.replace(/\\/g, '/') + '?t=' + ts };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Generate Playlist Cover with AI
ipcMain.handle('generate-playlist-cover-ai', async (event, { playlistName, prompt }) => {
  const safePlaylist = (playlistName || '').replace(/[<>:"/\\|?*]+/g, '').trim();
  const playlistDir = path.join(PLAYLISTS_DIR, safePlaylist);
  if (!fs.existsSync(playlistDir)) fs.mkdirSync(playlistDir, { recursive: true });

  const aiPrompt = (prompt || safePlaylist || 'Neon futuristic album cover').trim();
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(aiPrompt)}?width=512&height=512&nologo=true&seed=${seed}`;

  return new Promise((resolve) => {
    const downloadImage = (url) => {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadImage(res.headers.location);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            // Clean up old cover files
            ['.jpg', '.jpeg', '.png', '.webp'].forEach(ext => {
              const p = path.join(playlistDir, `cover${ext}`);
              if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (e) {}
            });

            const buffer = Buffer.concat(chunks);
            const destPath = path.join(playlistDir, 'cover.jpg');
            fs.writeFileSync(destPath, buffer);
            const ts = Date.now();
            const coverArt = 'file:///' + destPath.replace(/\\/g, '/') + '?t=' + ts;
            resolve({ success: true, coverArt });
          } catch (err) {
            resolve({ success: false, error: err.message });
          }
        });
        res.on('error', (e) => resolve({ success: false, error: e.message }));
      }).on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    };

    downloadImage(imageUrl);
  });
});

// Auto-Fetch Missing Covers for Songs via iTunes Search API
ipcMain.handle('auto-fetch-missing-covers', async () => {
  const searchAndDownloadCover = (trackPath, title, artist) => {
    return new Promise((resolve) => {
      const query = `${title} ${artist}`.replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
      const apiUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
      https.get(apiUrl, (res) => {
        let raw = '';
        res.on('data', (d) => raw += d);
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (data.results && data.results.length > 0 && data.results[0].artworkUrl100) {
              const hqUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
              https.get(hqUrl, (imgRes) => {
                const chunks = [];
                imgRes.on('data', (c) => chunks.push(c));
                imgRes.on('end', () => {
                  const dir = path.dirname(trackPath);
                  const nameWithoutExt = path.basename(trackPath, '.mp3');
                  const dest = path.join(dir, `${nameWithoutExt}.jpg`);
                  fs.writeFileSync(dest, Buffer.concat(chunks));
                  resolve(true);
                });
              }).on('error', () => resolve(false));
            } else {
              resolve(false);
            }
          } catch (e) {
            resolve(false);
          }
        });
      }).on('error', () => resolve(false));
    });
  };

  try {
    const missingTracks = [];
    const findMp3s = (dir) => {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          findMp3s(full);
        } else if (item.name.endsWith('.mp3')) {
          const nameWithoutExt = path.basename(item.name, '.mp3');
          const hasImage = ['.jpg', '.jpeg', '.png', '.webp'].some(ext => fs.existsSync(path.join(dir, `${nameWithoutExt}${ext}`)));
          if (!hasImage) missingTracks.push(full);
        }
      }
    };
    findMp3s(DOWNLOAD_DIR);

    let updated = 0;
    for (const f of missingTracks) {
      const nameWithoutExt = path.basename(f, '.mp3');
      const parts = nameWithoutExt.split(' - ');
      const title = parts[0] || nameWithoutExt;
      const artist = parts[1] || '';
      const ok = await searchAndDownloadCover(f, title, artist);
      if (ok) updated++;
    }
    return { success: true, updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Set standard Chrome User-Agent on all webviews
  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.setUserAgent(chromeUA);
      contents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        details.requestHeaders['User-Agent'] = chromeUA;
        callback({ cancel: false, requestHeaders: details.requestHeaders });
      });
    }
  });

  app.whenReady().then(() => {
    // Intercept display media requests to enable audio loopback capture
    session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen'] });
        if (sources && sources.length > 0) {
          callback({ video: sources[0], audio: 'loopback' });
        } else {
          callback({ video: null, audio: null });
        }
      } catch (err) {
        console.error('Failed to get sources for display media:', err);
        callback({ video: null, audio: null });
      }
    });

    createWindow();

    // Auto-sync browser session cookies in the background so downloader is authenticated
    setTimeout(async () => {
      try {
        const cookiesPath = path.join(app.getPath('userData'), 'yt-cookies.txt');
        await exportNetscapeCookiesFile(cookiesPath);
        await exportNetscapeCookiesFile(path.join(DOWNLOAD_DIR, 'yt-cookies.txt'));
      } catch (e) {}
    }, 2000);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
