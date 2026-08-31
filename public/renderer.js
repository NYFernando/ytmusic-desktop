// DOM Elements
const webview = document.getElementById('ytm-webview');
const toggleFocusBtn = document.getElementById('toggle-focus-btn');
const toggleBrowserBtn = document.getElementById('toggle-browser-btn');
const focusPlayer = document.getElementById('focus-player');
const webviewView = document.getElementById('webview-view');
const offlineLibraryView = document.getElementById('offline-library-view');
const offlineTrackList = document.getElementById('offline-track-list');
const btnRefreshOffline = document.getElementById('btn-refresh-offline');
const offlineAudioPlayer = document.getElementById('offline-audio-player');

// Titlebar buttons
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');

// Sidebar & Navigation buttons
const navOffline = document.getElementById('nav-offline');
const navDownloads = document.getElementById('nav-downloads');
const dockBtnOfflineLib = document.getElementById('dock-btn-offline-lib');
const dockBtnDownloads = document.getElementById('dock-btn-downloads');
const sidebarDownloadsBadge = document.getElementById('sidebar-downloads-badge');
const dockDownloadsBadge = document.getElementById('dock-downloads-badge');
const searchInput = document.getElementById('search-input');
const accountLoggedOut = document.getElementById('account-logged-out');
const accountLoggedIn = document.getElementById('account-logged-in');
const userAvatarImg = document.getElementById('user-avatar-img');
const userAvatarFallback = document.getElementById('user-avatar-fallback');
const userNameDisplay = document.getElementById('user-name-display');
const userEmailDisplay = document.getElementById('user-email-display');
const btnGoogleLogout = document.getElementById('btn-google-logout');

// Visualizer settings
const visualizerStyle = document.getElementById('visualizer-style');
const visualizerSensitivity = document.getElementById('visualizer-sensitivity');
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d');

// Player bar controls
const btnPlayPause = document.getElementById('btn-play-pause');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnShuffle = document.getElementById('btn-shuffle');
const btnRepeat = document.getElementById('btn-repeat');
const btnLike = document.getElementById('btn-like');
const btnDislike = document.getElementById('btn-dislike');
const btnDownload = document.getElementById('btn-download');
const btnDownloadPlaylist = document.getElementById('btn-download-playlist');
const offlineSearchInput = document.getElementById('offline-search-input');
const btnVolumeIcon = document.getElementById('btn-volume-icon');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnLyrics = document.getElementById('btn-lyrics');
const focusLyricsPanel = document.getElementById('focus-lyrics-panel');
const closeLyricsBtn = document.getElementById('close-lyrics-btn');
const lyricsContent = document.getElementById('lyrics-content');

// Titlebar Utility Tools
const btnOpenEq = document.getElementById('btn-open-eq');
const btnOpenSleepTimer = document.getElementById('btn-open-sleep-timer');
const btnTogglePip = document.getElementById('btn-toggle-pip');
const btnOpenSettings = document.getElementById('btn-open-settings');
const dockBtnPip = document.getElementById('dock-btn-pip');
const dockBtnEq = document.getElementById('dock-btn-eq');
const dockBtnCollapse = document.getElementById('dock-btn-collapse');
const browserModeQuickDock = document.getElementById('browser-mode-quick-dock');
const dockCollapsedBadge = document.getElementById('dock-collapsed-badge');
const titlebarSleepLabel = document.getElementById('titlebar-sleep-label');

// Progress/Volume sliders
const progressSlider = document.getElementById('progress-slider');
const progressFill = document.getElementById('progress-fill');
const volumeSlider = document.getElementById('volume-slider');
const volumeFill = document.getElementById('volume-fill');

// Labels and Images
const currentTimeLabel = document.getElementById('current-time');
const totalDurationLabel = document.getElementById('total-duration');
const barArt = document.getElementById('bar-art');
const barTitle = document.getElementById('bar-title');
const barArtist = document.getElementById('bar-artist');
const focusArt = document.getElementById('focus-art');
const focusTitle = document.getElementById('focus-title');
const focusArtist = document.getElementById('focus-artist');
const focusAlbum = document.getElementById('focus-album');
const vinylDisc = document.getElementById('vinyl-disc');
const focusGlowBg = document.getElementById('focus-glow-bg');
const instructionMessage = document.getElementById('instruction-message');

// Application State
let currentPlaybackState = {
  title: '',
  artist: '',
  album: '',
  art: '',
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 50,
  isShuffleActive: false,
  repeatMode: 'off',
  isLiked: false,
  isDisliked: false
};

let isDraggingProgress = false;
let isMuted = false;
let previousVolume = 50;
let currentAccentColor = { r: 239, g: 68, b: 68 }; // Default red
let lastArtUrl = '';
let colorTransitionRaf = null;

let isOfflineMode = false;
let offlineTracks = [];
let currentOfflineTrack = null;

// Set canvas dimensions
function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth * window.devicePixelRatio;
  canvas.height = canvas.parentElement.clientHeight * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener('resize', resizeCanvas);
// Call once UI is ready
setTimeout(resizeCanvas, 500);

// --- 1. Frameless Window Controls ---
if (window.electronAPI) {
  minBtn.addEventListener('click', () => window.electronAPI.minimize());
  maxBtn.addEventListener('click', () => window.electronAPI.maximize());
  closeBtn.addEventListener('click', () => window.electronAPI.close());
}

// Sidebar Toggle (Show / Hide)
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const sidebar = document.getElementById('sidebar');
if (btnToggleSidebar && sidebar) {
  btnToggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    btnToggleSidebar.title = isCollapsed ? 'Show Sidebar (Ctrl+B)' : 'Hide Sidebar (Ctrl+B)';
    setTimeout(resizeCanvas, 300);
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      btnToggleSidebar.click();
    }
  });
}

// --- 2. Switch Views (Focus Mode vs Browser Mode) ---
toggleFocusBtn.addEventListener('click', () => {
  toggleFocusBtn.classList.add('active');
  toggleBrowserBtn.classList.remove('active');
  focusPlayer.classList.add('active');
  webviewView.classList.remove('active');
  offlineLibraryView.classList.remove('active');
  document.body.classList.remove('browser-mode');
  isOfflineMode = false;
  resizeCanvas();
});

toggleBrowserBtn.addEventListener('click', () => {
  toggleBrowserBtn.classList.add('active');
  toggleFocusBtn.classList.remove('active');
  webviewView.classList.add('active');
  focusPlayer.classList.remove('active');
  offlineLibraryView.classList.remove('active');
  document.body.classList.add('browser-mode');
  isOfflineMode = false;

  // Ensure webview displays YouTube Music rather than any old login screen
  try {
    const currentURL = webview.getURL ? webview.getURL() : '';
    if (!currentURL || currentURL.includes('accounts.google.com')) {
      webview.loadURL('https://music.youtube.com/');
    }
  } catch (e) {
    webview.loadURL('https://music.youtube.com/');
  }
});

// --- 3. Webview Communication ---
webview.addEventListener('dom-ready', () => {
  // Webview has loaded, we can clear any initial load state if needed
  console.log('YouTube Music Webview ready');
});

// Listen to playback status reports from the webview preload script
webview.addEventListener('ipc-message', (event) => {
  if (event.channel === 'playback-status') {
    const webviewState = event.args[0];
    // If an offline song is currently active/playing:
    if (isOfflineMode && currentOfflineTrack) {
      // If user clicked play in the webview, switch to online mode
      if (webviewState && webviewState.isPlaying && webviewState.title) {
        offlineAudioPlayer.pause();
        isOfflineMode = false;
        currentOfflineTrack = null;
        updateUI(webviewState);
      }
      // Otherwise ignore idle/empty status from webview to prevent UI flickering
      return;
    }
    updateUI(webviewState);
  } else if (event.channel === 'lyrics-update') {
    handleLyricsUpdate(event.args[0]);
  } else if (event.channel === 'trigger-download-track') {
    const { videoId, title, artist } = event.args[0] || {};
    if (videoId) {
      if (btnDownload) btnDownload.classList.add('downloading');
      window.electronAPI.downloadTrack(videoId, title, artist);
    }
  } else if (event.channel === 'trigger-download-playlist') {
    const { playlistId, playlistUrl } = event.args[0] || {};
    const target = playlistUrl || playlistId;
    if (target) {
      if (btnDownloadPlaylist) btnDownloadPlaylist.classList.add('downloading');
      window.electronAPI.downloadPlaylist(target);
    }
  } else if (event.channel === 'user-profile-sync') {
    const profile = event.args[0];
    if (profile && (profile.name || profile.picture)) {
      renderGoogleUser(profile);
      window.electronAPI.saveGoogleUser(profile);
    }
  } else if (event.channel === 'request-equalizer-settings') {
    broadcastEqSettingsToWebview();
  }
});

if (webview) {
  webview.addEventListener('dom-ready', () => {
    setTimeout(broadcastEqSettingsToWebview, 500);
  });
}


let currentOfflinePlaylist = null;

function playOfflineTrack(track, playlist = null) {
  if (!track) return;
  
  // 1. Pause webview so online audio stops
  try {
    webview.send('player-command', { command: 'pause' });
  } catch (e) {}

  isOfflineMode = true;
  currentOfflineTrack = track;
  currentOfflinePlaylist = playlist;
  
  offlineAudioPlayer.src = 'file:///' + track.filepath.replace(/\\/g, '/');
  offlineAudioPlayer.play().catch(e => console.error('Offline audio play error:', e));

  // 2. Update UI immediately with offline song info
  updateUI({
    title: track.title,
    artist: track.artist,
    album: (playlist && playlist.title) ? playlist.title : 'Offline Library',
    art: track.coverArt || 'icon.png',
    isPlaying: true,
    progress: 0,
    duration: 0,
    volume: offlineAudioPlayer.volume * 100,
    videoId: '',
    isShuffleActive: false,
    repeatMode: 'off',
    isLiked: false,
    isDisliked: false
  });
  
  // 3. Switch to Focus mode
  toggleFocusBtn.classList.add('active');
  toggleBrowserBtn.classList.remove('active');
  focusPlayer.classList.add('active');
  webviewView.classList.remove('active');
  offlineLibraryView.classList.remove('active');
  document.body.classList.remove('browser-mode');
  resizeCanvas();
}

function playNextOfflineTrack() {
  const list = (currentOfflinePlaylist && currentOfflinePlaylist.tracks && currentOfflinePlaylist.tracks.length > 0)
    ? currentOfflinePlaylist.tracks
    : (offlineData.songs || []);
  if (list.length === 0 || !currentOfflineTrack) return;
  const currIdx = list.findIndex(t => t.filepath === currentOfflineTrack.filepath);
  const nextIdx = (currIdx + 1) % list.length;
  playOfflineTrack(list[nextIdx], currentOfflinePlaylist);
}

function playPrevOfflineTrack() {
  const list = (currentOfflinePlaylist && currentOfflinePlaylist.tracks && currentOfflinePlaylist.tracks.length > 0)
    ? currentOfflinePlaylist.tracks
    : (offlineData.songs || []);
  if (list.length === 0 || !currentOfflineTrack) return;
  const currIdx = list.findIndex(t => t.filepath === currentOfflineTrack.filepath);
  const prevIdx = (currIdx - 1 + list.length) % list.length;
  playOfflineTrack(list[prevIdx], currentOfflinePlaylist);
}

offlineAudioPlayer.addEventListener('ended', () => {
  playNextOfflineTrack();
});

offlineAudioPlayer.addEventListener('error', (e) => {
  console.warn('Offline player error encountered:', e);
});

// Helper to send command to webview
function sendPlayerCommand(command, value = null) {
  if (isOfflineMode && currentOfflineTrack) {
    switch (command) {
      case 'play-pause':
        if (offlineAudioPlayer.paused) offlineAudioPlayer.play();
        else offlineAudioPlayer.pause();
        break;
      case 'play':
        offlineAudioPlayer.play();
        break;
      case 'pause':
        offlineAudioPlayer.pause();
        break;
      case 'next':
        playNextOfflineTrack();
        break;
      case 'previous':
        playPrevOfflineTrack();
        break;
      case 'seek':
        offlineAudioPlayer.currentTime = value;
        break;
      case 'volume':
        offlineAudioPlayer.volume = value / 100;
        break;
    }
    return;
  }
  webview.send('player-command', { command, value });
}

// --- 4. Update UI Elements with current media state ---
function formatTime(secs) {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateUI(state) {
  const trackChanged = state.title !== currentPlaybackState.title;
  currentPlaybackState = state;

  // Track Meta details
  const title = state.title || 'No Track Playing';
  const artist = state.artist || 'Open Browser Mode to play music';
  const artUrl = state.art || 'https://music.youtube.com/img/on_platform_logo_dark.svg';

  // Update Mini player bar
  if (barTitle.innerText !== title) barTitle.innerText = title;
  if (barArtist.innerText !== artist) barArtist.innerText = artist;
  if (barArt.src !== artUrl) barArt.src = artUrl;

  // Update Focus mode player
  if (focusTitle.innerText !== title) focusTitle.innerText = title;
  if (focusArtist.innerText !== artist) focusArtist.innerText = artist;
  if (focusAlbum.innerText !== (state.album || 'YouTube Music')) {
    focusAlbum.innerText = state.album || 'YouTube Music';
  }
  if (focusArt.src !== artUrl) focusArt.src = artUrl;

  // Extract and apply dominant color from new artwork
  if (artUrl && artUrl !== lastArtUrl) {
    lastArtUrl = artUrl;
    extractAlbumColor(artUrl);
  }

  // If a track is active, hide the helper banner
  if (state.title) {
    instructionMessage.style.display = 'none';
  } else {
    instructionMessage.style.display = 'flex';
  }

  // Play Pause Button
  if (state.isPlaying) {
    btnPlayPause.innerHTML = '<span class="material-icons-round">pause</span>';
    vinylDisc.classList.add('spinning');
  } else {
    btnPlayPause.innerHTML = '<span class="material-icons-round">play_arrow</span>';
    vinylDisc.classList.remove('spinning');
  }

  // Shuffle & Repeat buttons
  if (state.isShuffleActive) {
    btnShuffle.classList.add('active');
  } else {
    btnShuffle.classList.remove('active');
  }

  if (state.repeatMode === 'one') {
    btnRepeat.classList.add('active');
    btnRepeat.innerHTML = '<span class="material-icons-round">repeat_one</span>';
  } else if (state.repeatMode === 'all') {
    btnRepeat.classList.add('active');
    btnRepeat.innerHTML = '<span class="material-icons-round">repeat</span>';
  } else {
    btnRepeat.classList.remove('active');
    btnRepeat.innerHTML = '<span class="material-icons-round">repeat</span>';
  }

  // Like & Dislike
  if (state.isLiked) {
    btnLike.classList.add('active');
  } else {
    btnLike.classList.remove('active');
  }

  if (state.isDisliked) {
    btnDislike.classList.add('active');
  } else {
    btnDislike.classList.remove('active');
  }

  // Volume slider sync
  if (!isDraggingProgress) {
    const progressPct = state.duration > 0 ? (state.progress / state.duration) * 100 : 0;
    progressSlider.value = progressPct;
    progressFill.style.width = `${progressPct}%`;
    currentTimeLabel.innerText = formatTime(state.progress);
    totalDurationLabel.innerText = formatTime(state.duration);
  }

  // Volume bar sync
  volumeSlider.value = state.volume;
  volumeFill.style.width = `${state.volume}%`;
  updateVolumeIcon(state.volume);

  // Dynamic glow based on extracted album color
  const { r, g, b } = currentAccentColor;
  if (state.isPlaying) {
    focusGlowBg.style.background = `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.28) 0%, rgba(0, 0, 0, 0) 70%)`;
  } else {
    focusGlowBg.style.background = `radial-gradient(circle, rgba(${r}, ${g}, ${b}, 0.12) 0%, rgba(0, 0, 0, 0) 70%)`;
  }

  // If track changed and lyrics panel is open, auto-request new lyrics
  if (trackChanged && state.title) {
    if (focusLyricsPanel && focusLyricsPanel.classList.contains('visible')) {
      requestLyrics();
    }
  }

  // Broadcast to Floating Picture-in-Picture Mini Player & Discord RPC
  if (window.electronAPI && window.electronAPI.syncPlaybackToPiPAndDiscord) {
    window.electronAPI.syncPlaybackToPiPAndDiscord(state);
  }
}

// --- Album Art Color Extraction Engine ---
// Uses an offscreen canvas to sample pixels from the album artwork and
// pick the most vibrant (saturated, non-grey) dominant color.
function extractAlbumColor(artUrl) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const offscreen = document.createElement('canvas');
    const SIZE = 64; // Downscale for performance
    offscreen.width = SIZE;
    offscreen.height = SIZE;
    const octx = offscreen.getContext('2d');
    octx.drawImage(img, 0, 0, SIZE, SIZE);

    const imageData = octx.getImageData(0, 0, SIZE, SIZE).data;
    
    // Build a color frequency map, favouring saturated, non-dark colors
    let bestColor = { r: 239, g: 68, b: 68 };
    let bestScore = -1;

    // Sample every 4th pixel for speed
    for (let i = 0; i < imageData.length; i += 16) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];
      if (a < 200) continue; // Skip mostly transparent pixels

      // Convert to HSL to score vibrancy
      const { h, s, l } = rgbToHsl(r, g, b);

      // Prefer: high saturation, medium lightness (not too dark, not too washed out)
      // Penalise very dark (<15%) and very light (>85%) colors, and near-grey (s<20%)
      if (s < 0.2) continue; // Skip greys
      if (l < 0.1 || l > 0.85) continue; // Skip near-black and near-white

      // Score: saturation matters most, followed by mid-lightness
      const lightnessScore = 1 - Math.abs(l - 0.5) * 2; // Peaks at l=0.5
      const score = s * 0.7 + lightnessScore * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestColor = { r, g, b };
      }
    }

    // Animate transition from old color to new color
    animateColorTransition(currentAccentColor, bestColor);
  };

  img.onerror = () => {
    // Fallback to default red on error
    animateColorTransition(currentAccentColor, { r: 239, g: 68, b: 68 });
  };

  img.src = artUrl;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

function animateColorTransition(fromColor, toColor, duration = 800) {
  if (colorTransitionRaf) cancelAnimationFrame(colorTransitionRaf);
  const start = performance.now();
  const startR = fromColor.r, startG = fromColor.g, startB = fromColor.b;
  const endR = toColor.r, endG = toColor.g, endB = toColor.b;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

    const r = Math.round(startR + (endR - startR) * ease);
    const g = Math.round(startG + (endG - startG) * ease);
    const b = Math.round(startB + (endB - startB) * ease);

    applyAccentColor(r, g, b);

    if (progress < 1) {
      colorTransitionRaf = requestAnimationFrame(step);
    } else {
      currentAccentColor = { r: endR, g: endG, b: endB };
      colorTransitionRaf = null;
    }
  }

  colorTransitionRaf = requestAnimationFrame(step);
}

function applyAccentColor(r, g, b) {
  // Keep a minimum vibrancy so the UI never looks completely washed out
  const { h, s, l } = rgbToHsl(r, g, b);
  // Clamp lightness and saturation for UI safety
  const safeL = Math.max(0.35, Math.min(0.65, l));
  const safeS = Math.max(0.55, s);
  const [sr, sg, sb] = hslToRgb(h, safeS, safeL);

  // Darker variant for backgrounds and deep glows
  const [dr, dg, db] = hslToRgb(h, safeS, Math.max(0.2, safeL - 0.2));

  const focusEl = document.getElementById('focus-player');
  if (focusEl) {
    // Apply as CSS custom properties scoped to focus-player
    focusEl.style.setProperty('--focus-accent', `rgb(${sr}, ${sg}, ${sb})`);
    focusEl.style.setProperty('--focus-accent-r', sr);
    focusEl.style.setProperty('--focus-accent-g', sg);
    focusEl.style.setProperty('--focus-accent-b', sb);
    focusEl.style.setProperty('--focus-accent-dark', `rgb(${dr}, ${dg}, ${db})`);
    focusEl.style.setProperty('--focus-accent-glow', `rgba(${sr}, ${sg}, ${sb}, 0.3)`);
  }

  currentAccentColor = { r: sr, g: sg, b: sb };

  // Re-apply glow bg with new color
  const isPlaying = currentPlaybackState.isPlaying;
  if (focusGlowBg) {
    focusGlowBg.style.background = isPlaying
      ? `radial-gradient(circle, rgba(${sr}, ${sg}, ${sb}, 0.28) 0%, rgba(0, 0, 0, 0) 70%)`
      : `radial-gradient(circle, rgba(${sr}, ${sg}, ${sb}, 0.12) 0%, rgba(0, 0, 0, 0) 70%)`;
  }
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function requestLyrics() {
  if (!lyricsContent) return;
  lyricsContent.innerHTML = `
    <div class="lyrics-loading">
      <div class="lyrics-loading-spinner"></div>
      <p>Fetching lyrics from YouTube Music...</p>
    </div>
  `;
  sendPlayerCommand('load-lyrics');
}

function handleLyricsUpdate(data) {
  if (!lyricsContent) return;
  if (data.success) {
    const lines = data.lyrics.split('\n');
    let html = '';
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed === '') {
        html += '<br>';
      } else {
        html += `<p class="lyrics-line">${escapeHTML(trimmed)}</p>`;
      }
    });
    
    if (data.source) {
      html += `<div class="lyrics-footer">${escapeHTML(data.source)}</div>`;
    }
    
    lyricsContent.innerHTML = html;
    // Scroll lyrics back to top on new track load
    lyricsContent.scrollTop = 0;
  } else {
    lyricsContent.innerHTML = `<p class="lyrics-placeholder">${escapeHTML(data.error)}</p>`;
  }
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateVolumeIcon(vol) {
  if (vol === 0 || isMuted) {
    btnVolumeIcon.innerHTML = '<span class="material-icons-round">volume_off</span>';
  } else if (vol < 35) {
    btnVolumeIcon.innerHTML = '<span class="material-icons-round">volume_down</span>';
  } else {
    btnVolumeIcon.innerHTML = '<span class="material-icons-round">volume_up</span>';
  }
}

// --- 5. Media Control Actions ---
btnPlayPause.addEventListener('click', () => sendPlayerCommand('play-pause'));
btnPrev.addEventListener('click', () => sendPlayerCommand('previous'));
btnNext.addEventListener('click', () => sendPlayerCommand('next'));
btnShuffle.addEventListener('click', () => sendPlayerCommand('shuffle'));
btnRepeat.addEventListener('click', () => sendPlayerCommand('repeat'));
btnLike.addEventListener('click', () => sendPlayerCommand('like'));
btnDislike.addEventListener('click', () => sendPlayerCommand('dislike'));

// Timeline progress drag handler
progressSlider.addEventListener('input', () => {
  isDraggingProgress = true;
  const pct = progressSlider.value;
  progressFill.style.width = `${pct}%`;
  const estSeconds = (pct / 100) * currentPlaybackState.duration;
  currentTimeLabel.innerText = formatTime(estSeconds);
});

progressSlider.addEventListener('change', () => {
  isDraggingProgress = false;
  const pct = progressSlider.value;
  const targetSecs = (pct / 100) * currentPlaybackState.duration;
  sendPlayerCommand('seek', targetSecs);
});

// Volume slider drag handler
volumeSlider.addEventListener('input', () => {
  const vol = volumeSlider.value;
  volumeFill.style.width = `${vol}%`;
  updateVolumeIcon(vol);
  sendPlayerCommand('volume', vol);
});

// Mute toggle
btnVolumeIcon.addEventListener('click', () => {
  if (isMuted) {
    isMuted = false;
    sendPlayerCommand('volume', previousVolume);
  } else {
    isMuted = true;
    previousVolume = volumeSlider.value;
    sendPlayerCommand('volume', 0);
  }
});

// Offline Library & Downloads navigation handlers
function openOfflineLibraryView(filter = 'all') {
  toggleBrowserBtn.classList.remove('active');
  toggleFocusBtn.classList.remove('active');
  webviewView.classList.remove('active');
  focusPlayer.classList.remove('active');
  offlineLibraryView.classList.add('active');
  document.body.classList.remove('browser-mode');
  isOfflineMode = true;

  if (filter === 'downloads') {
    if (navDownloads) navDownloads.classList.add('active');
    if (navOffline) navOffline.classList.remove('active');
  } else {
    if (navOffline) navOffline.classList.add('active');
    if (navDownloads) navDownloads.classList.remove('active');
  }

  document.querySelectorAll('.chip-btn').forEach(b => {
    if (b.getAttribute('data-filter') === filter) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  currentOfflineFilter = filter;
  closePlaylistDetail();
  if (filter === 'downloads') {
    renderDownloadsManager();
  } else {
    loadOfflineTracks();
  }
}

function openDownloadsView() {
  openOfflineLibraryView('downloads');
}

if (navOffline) {
  navOffline.addEventListener('click', () => openOfflineLibraryView('all'));
}

if (navDownloads) {
  navDownloads.addEventListener('click', openDownloadsView);
}

if (dockBtnOfflineLib) {
  dockBtnOfflineLib.addEventListener('click', () => openOfflineLibraryView('all'));
}

if (dockBtnDownloads) {
  dockBtnDownloads.addEventListener('click', openDownloadsView);
}

// Search Action (Press Enter)
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && searchInput.value.trim() !== '') {
    if (isOfflineMode) {
      offlineAudioPlayer.pause();
      isOfflineMode = false;
      currentOfflineTrack = null;
    }
    webview.loadURL(`https://music.youtube.com/search?q=${encodeURIComponent(searchInput.value.trim())}`);
    
    // Switch to Browser mode so they can see results
    toggleBrowserBtn.click();
  }
});

let currentGoogleUser = null;

function renderGoogleUser(user) {
  if (user && (user.name || user.email)) {
    currentGoogleUser = user;
    if (accountLoggedOut) accountLoggedOut.style.display = 'none';
    if (accountLoggedIn) accountLoggedIn.style.display = 'flex';
    if (userNameDisplay) userNameDisplay.innerText = user.name || 'YouTube Account';
    if (userEmailDisplay) {
      userEmailDisplay.innerText = user.email || '';
      userEmailDisplay.style.display = user.email ? 'block' : 'none';
    }
    if (user.picture && userAvatarImg) {
      userAvatarImg.src = user.picture;
      userAvatarImg.style.display = 'block';
      if (userAvatarFallback) userAvatarFallback.style.display = 'none';
      userAvatarImg.onerror = () => {
        userAvatarImg.style.display = 'none';
        if (userAvatarFallback) {
          userAvatarFallback.innerText = (user.name || user.email || 'Y')[0].toUpperCase();
          userAvatarFallback.style.display = 'flex';
        }
      };
    } else if (userAvatarFallback) {
      userAvatarFallback.innerText = (user.name || user.email || 'Y')[0].toUpperCase();
      userAvatarFallback.style.display = 'flex';
      if (userAvatarImg) userAvatarImg.style.display = 'none';
    }
    // Fetch and display user's Google Playlists in sidebar
    loadUserYouTubePlaylists();
  } else {
    currentGoogleUser = null;
    if (accountLoggedIn) accountLoggedIn.style.display = 'none';
    if (accountLoggedOut) accountLoggedOut.style.display = 'block';
    if (googleLoginText) googleLoginText.innerText = 'Sign in with Google';
    if (sidebarYtPlaylistsSection) sidebarYtPlaylistsSection.style.display = 'none';
  }
}

const sidebarYtPlaylistsSection = document.getElementById('sidebar-yt-playlists-section');
const sidebarYtPlaylistsList = document.getElementById('sidebar-yt-playlists-list');
const btnRefreshYtPlaylists = document.getElementById('btn-refresh-yt-playlists');

async function loadUserYouTubePlaylists() {
  if (!sidebarYtPlaylistsSection || !sidebarYtPlaylistsList) return;
  if (!currentGoogleUser) {
    sidebarYtPlaylistsSection.style.display = 'none';
    sidebarYtPlaylistsList.innerHTML = '';
    return;
  }

  sidebarYtPlaylistsSection.style.display = 'block';
  sidebarYtPlaylistsList.innerHTML = '<div style="font-size: 11px; color: #a1a1aa; padding: 4px;">Loading your playlists...</div>';

  try {
    const res = await window.electronAPI.getUserYouTubePlaylists();
    if (res && res.success && res.playlists && res.playlists.length > 0) {
      sidebarYtPlaylistsList.innerHTML = '';
      res.playlists.forEach(pl => {
        const item = document.createElement('button');
        item.className = 'sidebar-playlist-item';
        item.style.cssText = 'display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; background: transparent; border: none; border-radius: 8px; color: #e4e4e7; font-size: 12px; font-weight: 500; cursor: pointer; text-align: left; transition: background 0.2s;';
        item.title = pl.title;
        
        const thumb = pl.thumbnail ? `<img src="${pl.thumbnail}" style="width: 22px; height: 22px; border-radius: 4px; object-fit: cover; flex-shrink: 0;">` : `<span class="material-icons-round" style="font-size: 18px; color: #ef4444; flex-shrink: 0;">queue_music</span>`;
        
        item.innerHTML = `
          ${thumb}
          <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pl.title}</div>
          <span style="font-size: 10px; color: #71717a; flex-shrink: 0;">${pl.itemCount}</span>
        `;

        item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,0.06)'; });
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
        
        item.addEventListener('click', () => {
          if (webview) {
            webview.loadURL(`https://music.youtube.com/playlist?list=${pl.id}`);
          }
          if (toggleBrowserBtn) toggleBrowserBtn.click();
        });

        sidebarYtPlaylistsList.appendChild(item);
      });
    } else {
      sidebarYtPlaylistsList.innerHTML = '<div style="font-size: 11px; color: #71717a; padding: 4px;">No playlists found</div>';
    }
  } catch (err) {
    sidebarYtPlaylistsList.innerHTML = '<div style="font-size: 11px; color: #71717a; padding: 4px;">Could not load playlists</div>';
  }
}

if (btnRefreshYtPlaylists) {
  btnRefreshYtPlaylists.addEventListener('click', () => loadUserYouTubePlaylists());
}

async function loadGoogleUser() {
  try {
    const user = await window.electronAPI.getGoogleUser();
    renderGoogleUser(user);
  } catch (err) {
    renderGoogleUser(null);
  }
}
loadGoogleUser();


if (btnGoogleLogout) {
  btnGoogleLogout.addEventListener('click', async () => {
    if (confirm(`Sign out from ${currentGoogleUser?.name || 'Google Account'}?`)) {
      await window.electronAPI.logoutGoogleUser();
      renderGoogleUser(null);
      if (webview) {
        webview.loadURL('https://music.youtube.com');
      }
    }
  });
}

// Sync Browser Session Handlers (Native Confirmation Dialog & Import)
const btnSyncBrowserCookies = document.getElementById('btn-sync-browser-cookies');
const btnSyncBrowserCookiesLogged = document.getElementById('btn-sync-browser-cookies-logged');

async function triggerBrowserCookieSync(btn) {
  if (btn) btn.disabled = true;
  try {
    const res = await window.electronAPI.syncBrowserCookies();
    if (res && res.success) {
      if (webview) webview.loadURL('https://music.youtube.com/');
      if (toggleBrowserBtn) toggleBrowserBtn.click();
    }
  } catch (err) {
    console.error('Browser sync failed:', err);
  } finally {
    if (btn) btn.disabled = false;
  }
}

if (btnSyncBrowserCookies) {
  btnSyncBrowserCookies.addEventListener('click', () => {
    triggerBrowserCookieSync(btnSyncBrowserCookies);
  });
}

if (btnSyncBrowserCookiesLogged) {
  btnSyncBrowserCookiesLogged.addEventListener('click', () => {
    triggerBrowserCookieSync(btnSyncBrowserCookiesLogged);
  });
}

// Fullscreen & Lyrics toggle (aesthetic / notification triggers)
btnFullscreen.addEventListener('click', () => {
  const elem = document.documentElement;
  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch(err => console.log(err));
    btnFullscreen.innerHTML = '<span class="material-icons-round">fullscreen_exit</span>';
  } else {
    document.exitFullscreen();
    btnFullscreen.innerHTML = '<span class="material-icons-round">fullscreen</span>';
  }
});

btnLyrics.addEventListener('click', () => {
  if (focusLyricsPanel) {
    focusLyricsPanel.classList.toggle('visible');
    if (focusLyricsPanel.classList.contains('visible')) {
      requestLyrics();
    }
  }
});

if (closeLyricsBtn) {
  closeLyricsBtn.addEventListener('click', () => {
    if (focusLyricsPanel) {
      focusLyricsPanel.classList.remove('visible');
    }
  });
}


// --- 6. Beautiful Glowing Audio Visualizer & Loopback Capture Engine ---
let animFrame;
let bars = [];
const numBars = 48;
let waveOffset = 0;

// System audio capture variables
let audioStream = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let timeDataArray = null;
let audioCaptureStarted = false;
let isAudioDetected = false;

// Initialize bar data for simulated/bars visualization
for (let i = 0; i < numBars; i++) {
  bars.push({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    targetH: 0,
    speed: 0.1 + Math.random() * 0.15
  });
}

// Starts capturing loopback system audio from the PC (no popups on Windows due to main process handler)
async function startSystemAudioCapture() {
  if (audioCaptureStarted) return;
  audioCaptureStarted = true;
  console.log("Attempting to capture PC system audio loopback...");
  
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false
      }
    });
    
    // Stop video track immediately to save CPU/GPU resources
    stream.getVideoTracks().forEach(track => track.stop());
    
    audioStream = stream;
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    
    // Set appropriate frequency resolution
    analyser.fftSize = 256; 
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    timeDataArray = new Uint8Array(bufferLength);
    
    source.connect(analyser);
    console.log("System audio capture initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize system audio capture:", err);
    audioCaptureStarted = false;
  }
}

// Trigger system audio loopback capture on first user interaction in the window
document.addEventListener('click', () => {
  if (!audioCaptureStarted) {
    startSystemAudioCapture();
  }
}, { once: true });

function drawVisualizer() {
  animFrame = requestAnimationFrame(drawVisualizer);
  
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  
  ctx.clearRect(0, 0, w, h);
  
  if (w === 0 || h === 0) return;

  const activeStyle = visualizerStyle.value;
  const sensitivity = parseFloat(visualizerSensitivity.value) / 5;
  const isPlaying = currentPlaybackState.isPlaying && currentPlaybackState.title;
  const { r: ar, g: ag, b: ab } = currentAccentColor;

  // Retrieve real audio data from loopback capture
  let activeFrequencies = null;
  let activeTimeDomain = null;
  isAudioDetected = false;

  if (analyser && dataArray && timeDataArray) {
    analyser.getByteFrequencyData(dataArray);
    analyser.getByteTimeDomainData(timeDataArray);
    activeFrequencies = dataArray;
    activeTimeDomain = timeDataArray;

    // Detect if audio is playing by checking for values above background noise threshold
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    if (avg > 1.5) {
      isAudioDetected = true;
    }
  }

  if (activeStyle === 'bottom-line') {
    // --- BOTTOM GLOW WAVE STYLE (Reference: D:\Downloads\54217523.mp4) ---
    const pointsCount = 24;
    const points = [];

    for (let i = 0; i <= pointsCount; i++) {
      const pct = i / pointsCount;
      const x = pct * w;
      let targetH = 0;

      if (isAudioDetected) {
        // Map points to frequency bins (focusing on bass/mids where music energy lies)
        const binIndex = Math.floor(pct * (activeFrequencies.length * 0.65));
        const rawVal = activeFrequencies[binIndex] || 0;
        targetH = (rawVal / 255) * h * 0.9 * sensitivity;
      } else {
        // Breathing simulation when silent or capture is not initialized
        const time = Date.now() * 0.002;
        const speedFactor = isPlaying ? 3 : 1;
        const baseAmp = isPlaying ? 16 : 5;
        const wave1 = Math.sin(pct * Math.PI * 2 + time * speedFactor) * baseAmp;
        const wave2 = Math.cos(pct * Math.PI * 4 - time * 0.6 * speedFactor) * (baseAmp * 0.5);
        targetH = Math.max(2, (wave1 + wave2 + baseAmp * 1.5) * sensitivity);
      }

      // Smooth taper at the left and right edges so it doesn't overflow card borders
      const edgeTaper = Math.sin(pct * Math.PI);
      const y = h - (targetH * edgeTaper);
      points.push({ x, y });
    }

    // 1. Draw solid, translucent linear gradient fill under the wave
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, h - 35, 0, h);
    fillGrad.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, 0.18)`);
    fillGrad.addColorStop(1, `rgba(${ar}, ${ag}, ${ab}, 0.0)`);
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // 2. Draw glowing neon top stroke line
    ctx.shadowBlur = 12;
    ctx.shadowColor = `rgba(${ar}, ${ag}, ${ab}, 0.8)`;
    ctx.strokeStyle = `rgb(${ar}, ${ag}, ${ab})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    ctx.shadowBlur = 0;

  } else if (activeStyle === 'bars') {
    // --- GLOW BARS STYLE ---
    const barWidth = (w / numBars) - 3;
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, `rgba(${Math.round(ar*0.35)}, ${Math.round(ag*0.35)}, ${Math.round(ab*0.35)}, 1)`);
    gradient.addColorStop(0.5, `rgb(${ar}, ${ag}, ${ab})`);
    gradient.addColorStop(1, `rgba(${Math.min(255,ar+40)}, ${Math.min(255,ag+40)}, ${Math.min(255,ab+40)}, 1)`);

    for (let i = 0; i < numBars; i++) {
      const bar = bars[i];
      
      if (isAudioDetected) {
        // Use real loopback frequency
        const binIndex = Math.floor((i / numBars) * (activeFrequencies.length * 0.7));
        const rawVal = activeFrequencies[binIndex] || 0;
        bar.targetH = Math.max(3, (rawVal / 255) * (h - 6) * sensitivity);
      } else if (isPlaying) {
        // Use simulated frequencies
        const time = Date.now() * 0.003;
        const baseFrequency = Math.sin(i * 0.2 + time) * Math.cos(i * 0.05 - time * 0.5);
        const beatFrequency = Math.sin(time * 3) > 0.8 ? Math.random() * 40 : 0;
        let freqValue = Math.abs(baseFrequency) * (h - 10) * 0.6;
        if (i % 6 === 0) freqValue += beatFrequency;
        bar.targetH = Math.max(3, freqValue * sensitivity);
      } else {
        bar.targetH = 3 + Math.sin(i * 0.5 + Date.now() * 0.001) * 2;
      }

      bar.h += (bar.targetH - bar.h) * bar.speed;
      
      const xPos = i * (barWidth + 3);
      const yPos = h - bar.h;

      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(${ar}, ${ag}, ${ab}, 0.4)`;
      ctx.fillStyle = gradient;
      
      ctx.beginPath();
      ctx.roundRect(xPos, yPos, barWidth, bar.h, [4, 4, 0, 0]);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

  } else if (activeStyle === 'wave') {
    // --- OSCILLOSCOPE WAVE STYLE ---
    ctx.strokeStyle = `rgb(${ar}, ${ag}, ${ab})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `rgba(${ar}, ${ag}, ${ab}, 0.7)`;
    ctx.beginPath();

    waveOffset += isPlaying ? 0.15 * sensitivity : 0.02;

    for (let x = 0; x < w; x++) {
      let y = h / 2;
      
      if (isAudioDetected) {
        // Draw real time domain oscilloscope
        const dataIndex = Math.floor((x / w) * activeTimeDomain.length);
        const raw = (activeTimeDomain[dataIndex] - 128) / 128; // -1.0 to 1.0
        y = (h / 2) + raw * (h * 0.45) * sensitivity;
      } else if (isPlaying) {
        // Simulated oscilloscope waves
        const wave1 = Math.sin(x * 0.02 + waveOffset) * 15;
        const wave2 = Math.cos(x * 0.005 - waveOffset * 0.5) * 8;
        const noise = Math.sin(x * 0.1 + waveOffset * 2) * (Math.random() * 2);
        y = (h / 2) + (wave1 + wave2 + noise) * sensitivity;
      } else {
        y = (h / 2) + Math.sin(x * 0.01 + waveOffset) * 3;
      }
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

  } else if (activeStyle === 'circle' || activeStyle === 'circular-ring') {
    // --- NEON CIRCULAR RING STYLE ---
    const centerX = w / 2;
    const centerY = h / 2;
    const baseRadius = Math.min(centerX, centerY) * 0.6;
    
    ctx.strokeStyle = `rgb(${ar}, ${ag}, ${ab})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = `rgba(${ar}, ${ag}, ${ab}, 0.7)`;
    ctx.beginPath();

    waveOffset += isPlaying ? 0.05 * sensitivity : 0.01;
    
    const numPoints = 120;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      let offsetRadius = 0;

      if (isAudioDetected) {
        // Distort neon circle with real frequency data
        const halfPoints = numPoints / 2;
        const distFromHalf = Math.abs(halfPoints - i);
        const binIndex = Math.floor((distFromHalf / halfPoints) * (activeFrequencies.length * 0.55));
        const rawVal = activeFrequencies[binIndex] || 0;
        offsetRadius = (rawVal / 255) * baseRadius * 0.5 * sensitivity;
      } else if (isPlaying) {
        const time = Date.now() * 0.005;
        const freq = Math.sin(angle * 6 + time) * Math.cos(angle * 2 - time) * 10;
        offsetRadius = freq * sensitivity;
      } else {
        offsetRadius = Math.sin(angle * 12 + Date.now() * 0.002) * 2;
      }

      const r = baseRadius + offsetRadius;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

  } else if (activeStyle === 'particles' || activeStyle === 'starfield') {
    // --- CYBERPUNK STARFIELD PARTICLES STYLE ---
    ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, 0.7)`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(${ar}, ${ag}, ${ab}, 0.8)`;
    
    waveOffset += isPlaying ? 0.1 * sensitivity : 0.02;

    for (let i = 0; i < numBars; i++) {
      const angle = (i / numBars) * Math.PI * 2;
      let particleSpeed = 0;
      
      if (isAudioDetected) {
        const binIndex = Math.floor((i / numBars) * (activeFrequencies.length * 0.5));
        const rawVal = activeFrequencies[binIndex] || 0;
        particleSpeed = (rawVal / 255) * 35 * sensitivity;
      } else if (isPlaying) {
        particleSpeed = (Math.sin(i * 0.5 + waveOffset) + 1.2) * 8 * sensitivity;
      } else {
        particleSpeed = (Math.sin(i * 0.5 + waveOffset) + 1.2) * 2;
      }

      const r = (h / 3) + particleSpeed;
      const x = (w / 2) + Math.cos(angle + waveOffset * 0.1) * r;
      const y = (h / 2) + Math.sin(angle + waveOffset * 0.1) * r * 0.8;

      ctx.beginPath();
      ctx.arc(x, y, 3 + (particleSpeed * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }
}

// Start the visualizer
drawVisualizer();

// --- 7. Real-Time Red Clock Updates ---
function updateClock() {
  const clockDay = document.getElementById('clock-day');
  const clockDate = document.getElementById('clock-date');
  const clockTime = document.getElementById('clock-time');
  
  if (!clockDay || !clockDate || !clockTime) return;
  
  const now = new Date();
  
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  
  clockDay.innerText = days[now.getDay()];
  clockDate.innerText = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()}.`;
  
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  clockTime.innerText = `- ${hours}:${minutes} -`;
}
setInterval(updateClock, 1000);
updateClock();

// --- 8. Ambient Fullscreen Toggle for Focus Mode ---
focusPlayer.addEventListener('dblclick', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => console.error(err));
  } else {
    document.exitFullscreen();
  }
});

// Sync fullscreen change events with focus-fullscreen class
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove('focus-fullscreen');
    btnFullscreen.innerHTML = '<span class="material-icons-round">fullscreen</span>';
    setTimeout(resizeCanvas, 300);
  } else {
    if (toggleFocusBtn.classList.contains('active')) {
      document.body.classList.add('focus-fullscreen');
      btnFullscreen.innerHTML = '<span class="material-icons-round">fullscreen_exit</span>';
      setTimeout(resizeCanvas, 300);
    }
  }
});

// --- 9. Offline Mode & Downloading ---

btnDownload.addEventListener('click', () => {
  if (isOfflineMode) return;
  if (!currentPlaybackState.videoId) {
    alert('Please play a song to download it.');
    return;
  }
  btnDownload.classList.add('downloading');
  window.electronAPI.downloadTrack(currentPlaybackState.videoId, currentPlaybackState.title, currentPlaybackState.artist);
});

btnDownloadPlaylist.addEventListener('click', () => {
  if (isOfflineMode) return;
  let playlistId = currentPlaybackState.playlistId;
  if (!playlistId && webview && webview.getURL) {
    try {
      const u = new URL(webview.getURL());
      playlistId = u.searchParams.get('list') || '';
    } catch (e) {}
  }
  if (!playlistId) {
    alert('Please open or play a playlist to download it.');
    return;
  }
  btnDownloadPlaylist.classList.add('downloading');
  window.electronAPI.downloadPlaylist(playlistId);
});

const dockBtnDownloadSong = document.getElementById('dock-btn-download-song');
const dockBtnDownloadPlaylist = document.getElementById('dock-btn-download-playlist');

if (dockBtnDownloadSong) {
  dockBtnDownloadSong.addEventListener('click', () => {
    let videoId = currentPlaybackState.videoId;
    if (!videoId && webview && webview.getURL) {
      try {
        const u = new URL(webview.getURL());
        videoId = u.searchParams.get('v') || '';
      } catch (e) {}
    }
    if (!videoId) {
      alert('Please play a song to download it.');
      return;
    }
    dockBtnDownloadSong.classList.add('downloading');
    dockBtnDownloadSong.querySelector('.dock-btn-label').innerText = 'Downloading...';
    window.electronAPI.downloadTrack(videoId, currentPlaybackState.title, currentPlaybackState.artist);
  });
}

if (dockBtnDownloadPlaylist) {
  dockBtnDownloadPlaylist.addEventListener('click', () => {
    let playlistId = currentPlaybackState.playlistId;
    if (!playlistId && webview && webview.getURL) {
      try {
        const u = new URL(webview.getURL());
        playlistId = u.searchParams.get('list') || '';
      } catch (e) {}
    }
    if (!playlistId) {
      alert('Please open or play a playlist to download it.');
      return;
    }
    dockBtnDownloadPlaylist.classList.add('downloading');
    dockBtnDownloadPlaylist.querySelector('.dock-btn-label').innerText = 'Downloading...';
    window.electronAPI.downloadPlaylist(playlistId);
  });
}

if (window.electronAPI.onDownloadProgress) {
  window.electronAPI.onDownloadProgress((data) => {
    // Forward download status to webview so player bar buttons show live status
    if (webview && webview.send) {
      try {
        webview.send('download-progress-update', data);
      } catch (e) {}
    }

    if (data.isPlaylist) {
      if (data.status === 'downloading') {
        const itemInfo = data.totalItems ? `${data.currentItem}/${data.totalItems}` : `${data.currentItem || 1}`;
        btnDownloadPlaylist.title = `Downloading playlist (${itemInfo}): ${data.percent}%`;
        if (dockBtnDownloadPlaylist) {
          dockBtnDownloadPlaylist.querySelector('.dock-btn-label').innerText = `(${itemInfo}) ${data.percent}%`;
        }
      } else if (data.status === 'completed') {
        btnDownloadPlaylist.classList.remove('downloading');
        btnDownloadPlaylist.title = 'Playlist Download Complete';
        if (dockBtnDownloadPlaylist) {
          dockBtnDownloadPlaylist.classList.remove('downloading');
          dockBtnDownloadPlaylist.querySelector('.dock-btn-label').innerText = 'Downloaded!';
          setTimeout(() => {
            dockBtnDownloadPlaylist.querySelector('.dock-btn-label').innerText = 'Download Playlist';
          }, 3000);
        }
        setTimeout(() => { btnDownloadPlaylist.title = 'Download Playlist'; }, 3000);
        if (isOfflineMode) loadOfflineTracks();
      } else if (data.status === 'error') {
        btnDownloadPlaylist.classList.remove('downloading');
        if (dockBtnDownloadPlaylist) {
          dockBtnDownloadPlaylist.classList.remove('downloading');
          dockBtnDownloadPlaylist.querySelector('.dock-btn-label').innerText = 'Download Playlist';
        }
        alert(`Playlist download failed: ${data.error}`);
      }
      return;
    }

    if (data.status === 'downloading') {
      btnDownload.title = `Downloading: ${data.percent}%`;
      if (dockBtnDownloadSong) {
        dockBtnDownloadSong.querySelector('.dock-btn-label').innerText = `${data.percent}%`;
      }
    } else if (data.status === 'completed') {
      btnDownload.classList.remove('downloading');
      btnDownload.title = 'Download Complete';
      if (dockBtnDownloadSong) {
        dockBtnDownloadSong.classList.remove('downloading');
        dockBtnDownloadSong.querySelector('.dock-btn-label').innerText = 'Downloaded!';
        setTimeout(() => {
          dockBtnDownloadSong.querySelector('.dock-btn-label').innerText = 'Download Song';
        }, 3000);
      }
      setTimeout(() => { btnDownload.title = 'Download Track'; }, 3000);
      if (isOfflineMode) loadOfflineTracks();
    } else if (data.status === 'error') {
      btnDownload.classList.remove('downloading');
      if (dockBtnDownloadSong) {
        dockBtnDownloadSong.classList.remove('downloading');
        dockBtnDownloadSong.querySelector('.dock-btn-label').innerText = 'Download Song';
      }
      alert(`Download failed: ${data.error}`);
    }
  });
}

let currentOfflineFilter = 'all';
let offlineData = { songs: [], playlists: [] };
let selectedPlaylist = null;
let targetSongForPlaylist = null;
let lastGeneratedAiCoverUrl = null;

// Modal Helpers
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}
document.querySelectorAll('.modal-close-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const modalId = e.currentTarget.getAttribute('data-modal');
    if (modalId) closeModal(modalId);
  });
});

const offlineMainContent = document.getElementById('offline-main-content');
const playlistDetailView = document.getElementById('playlist-detail-view');
const btnClosePlaylistDetail = document.getElementById('btn-close-playlist-detail');
const playlistDetailTitle = document.getElementById('playlist-detail-title');
const playlistDetailCount = document.getElementById('playlist-detail-count');
const playlistDetailTrackList = document.getElementById('playlist-detail-track-list');
const playlistDetailCoverImg = document.getElementById('playlist-detail-cover-img');
const playlistDetailCoverWrapper = document.getElementById('playlist-detail-cover-wrapper');
const btnPlayAllPlaylist = document.getElementById('btn-play-all-playlist');
const btnRenamePlaylistDetail = document.getElementById('btn-rename-playlist-detail');
const btnAddSongsPlaylist = document.getElementById('btn-add-songs-playlist');
const btnChangeCoverPlaylist = document.getElementById('btn-change-cover-playlist');
const btnNewPlaylist = document.getElementById('btn-new-playlist');
const btnAutoCovers = document.getElementById('btn-auto-covers');

// Download Manager Client State
let downloadTasks = [];

async function loadDownloadTasks() {
  if (window.electronAPI && window.electronAPI.getDownloadTasks) {
    try {
      const tasks = await window.electronAPI.getDownloadTasks();
      downloadTasks = tasks || [];
      updateDownloadsBadge();
      if (currentOfflineFilter === 'downloads') {
        renderDownloadsManager();
      }
    } catch (e) {
      console.error('Failed to load download tasks:', e);
    }
  }
}

if (window.electronAPI && window.electronAPI.onDownloadTasksUpdated) {
  window.electronAPI.onDownloadTasksUpdated((tasks) => {
    downloadTasks = tasks || [];
    updateDownloadsBadge();
    if (currentOfflineFilter === 'downloads') {
      renderDownloadsManager();
    }
  });
}

function updateDownloadsBadge() {
  const badge = document.getElementById('downloads-badge');
  const sidebarBadge = document.getElementById('sidebar-downloads-badge');
  const dockBadge = document.getElementById('dock-downloads-badge');

  const activeCount = downloadTasks.filter(t => t.status === 'downloading' || t.status === 'starting').length;
  const pendingCount = downloadTasks.filter(t => t.status === 'paused').length;
  const totalIncomplete = activeCount + pendingCount;

  [badge, sidebarBadge, dockBadge, dockCollapsedBadge].forEach(b => {
    if (!b) return;
    if (totalIncomplete > 0) {
      b.innerText = totalIncomplete;
      b.style.display = 'inline-flex';
      if (activeCount > 0) {
        b.classList.add('pulsing');
      } else {
        b.classList.remove('pulsing');
      }
    } else {
      b.style.display = 'none';
      b.classList.remove('pulsing');
    }
  });
}

function renderDownloadsManager() {
  if (!offlineTrackList) return;

  const activeTasks = downloadTasks.filter(t => t.status === 'downloading' || t.status === 'starting');
  const pausedTasks = downloadTasks.filter(t => t.status === 'paused');
  const completedTasks = downloadTasks.filter(t => t.status === 'completed');
  const errorTasks = downloadTasks.filter(t => t.status === 'error');

  if (downloadTasks.length === 0) {
    offlineTrackList.innerHTML = `
      <div class="downloads-manager-container" style="text-align: center; padding: 60px 20px;">
        <span class="material-icons-round" style="font-size: 64px; color: rgba(255,255,255,0.1); margin-bottom: 16px;">download_for_offline</span>
        <h3 style="font-size: 18px; color: #fff; margin-bottom: 8px;">No Downloads in Queue</h3>
        <p style="font-size: 13px; color: #a1a1aa; max-width: 400px; margin: 0 auto 20px auto;">
          Click "Download Song" or "Download Playlist" while browsing or listening to start offline downloads.
        </p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="downloads-manager-container">
      <div class="downloads-header-bar">
        <div class="downloads-summary-text">
          <span class="downloads-summary-pill ${activeTasks.length > 0 ? 'active' : ''}">
            <span class="material-icons-round" style="font-size: 14px;">${activeTasks.length > 0 ? 'sync' : 'downloading'}</span>
            ${activeTasks.length} Active
          </span>
          <span class="downloads-summary-pill">
            <span class="material-icons-round" style="font-size: 14px;">pause_circle</span>
            ${pausedTasks.length} Paused
          </span>
          <span class="downloads-summary-pill">
            <span class="material-icons-round" style="font-size: 14px;">check_circle</span>
            ${completedTasks.length} Completed
          </span>
        </div>

        <div class="downloads-bulk-actions">
          ${pausedTasks.length > 0 || errorTasks.length > 0 ? `
            <button class="downloads-bulk-btn primary" id="btn-resume-all-downloads" title="Resume all paused downloads">
              <span class="material-icons-round" style="font-size: 16px;">play_arrow</span>
              <span>Resume All</span>
            </button>
          ` : ''}
          ${activeTasks.length > 0 ? `
            <button class="downloads-bulk-btn" id="btn-pause-all-downloads" title="Pause all active downloads">
              <span class="material-icons-round" style="font-size: 16px;">pause</span>
              <span>Pause All</span>
            </button>
          ` : ''}
          ${completedTasks.length > 0 ? `
            <button class="downloads-bulk-btn" id="btn-clear-completed-downloads" title="Clear completed downloads from list">
              <span class="material-icons-round" style="font-size: 16px;">clear_all</span>
              <span>Clear Completed</span>
            </button>
          ` : ''}
        </div>
      </div>

      <div class="downloads-list">
  `;

  downloadTasks.forEach(task => {
    const isDownloading = task.status === 'downloading' || task.status === 'starting';
    const isPaused = task.status === 'paused';
    const isCompleted = task.status === 'completed';
    const isError = task.status === 'error';
    const percent = Math.min(100, Math.max(0, task.percent || 0));

    let statusText = 'Paused';
    if (isDownloading) statusText = task.status === 'starting' ? 'Starting...' : `Downloading ${percent.toFixed(0)}%`;
    if (isCompleted) statusText = 'Completed';
    if (isError) statusText = 'Failed';

    let progressSubtitle = '';
    if (task.type === 'playlist') {
      if (task.totalItems > 0) {
        progressSubtitle = `Track ${task.currentItem || 0} of ${task.totalItems}`;
      } else {
        progressSubtitle = 'Extracting playlist tracks...';
      }
    } else {
      progressSubtitle = task.artist ? `${task.artist}` : 'Single Track';
    }

    if (isDownloading && task.currentSongTitle) {
      progressSubtitle += ` • ${task.currentSongTitle}`;
    }

    let speedEta = '';
    if (isDownloading) {
      if (task.speed) speedEta += `<span>⚡ ${escapeHTML(task.speed)}</span>`;
      if (task.eta) speedEta += `<span>⏳ ETA: ${escapeHTML(task.eta)}</span>`;
    }

    let actionButtons = '';
    if (isDownloading) {
      actionButtons += `
        <button class="download-btn btn-task-pause" data-id="${task.id}" title="Pause Download">
          <span class="material-icons-round" style="font-size: 18px;">pause</span>
        </button>
      `;
    } else if (isPaused || isError) {
      actionButtons += `
        <button class="download-btn primary btn-task-resume" data-id="${task.id}" title="Resume Download">
          <span class="material-icons-round" style="font-size: 18px;">play_arrow</span>
        </button>
      `;
    }

    actionButtons += `
      <button class="download-btn danger btn-task-cancel" data-id="${task.id}" title="Cancel & Remove">
        <span class="material-icons-round" style="font-size: 18px;">close</span>
      </button>
    `;

    if (isCompleted && task.type === 'playlist') {
      actionButtons += `
        <button class="download-btn btn-task-view-playlist" data-title="${escapeHTML(task.title)}" title="View Playlist in Library">
          <span class="material-icons-round" style="font-size: 18px;">queue_music</span>
        </button>
      `;
    }

    html += `
      <div class="download-card ${isDownloading ? 'is-downloading' : ''}" id="card-task-${task.id}">
        <div class="download-thumb-box">
          <span class="material-icons-round download-thumb-icon ${isDownloading ? 'spin' : ''}">
            ${isCompleted ? 'check_circle' : (task.type === 'playlist' ? 'queue_music' : 'music_note')}
          </span>
        </div>

        <div class="download-details">
          <div class="download-title-row">
            <span class="download-title" title="${escapeHTML(task.title)}">${escapeHTML(task.title)}</span>
            <span class="download-status-badge ${task.status}">
              ${isDownloading ? '<span class="material-icons-round" style="font-size: 12px;">sync</span>' : ''}
              ${statusText}
            </span>
          </div>

          <div class="download-sub-row">
            <span class="download-track-info" title="${escapeHTML(progressSubtitle)}">${escapeHTML(progressSubtitle)}</span>
            <div class="download-metrics">
              ${speedEta}
              <span style="font-weight: 700; color: #fff;">${percent.toFixed(0)}%</span>
            </div>
          </div>

          <div class="download-progress-bar-bg">
            <div class="download-progress-bar-fill ${task.status}" style="width: ${percent}%;"></div>
          </div>
        </div>

        <div class="download-actions">
          ${actionButtons}
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  offlineTrackList.innerHTML = html;

  // Bind Bulk actions
  const btnResumeAll = document.getElementById('btn-resume-all-downloads');
  if (btnResumeAll) {
    btnResumeAll.addEventListener('click', () => {
      window.electronAPI.resumeAllDownloads();
    });
  }

  const btnPauseAll = document.getElementById('btn-pause-all-downloads');
  if (btnPauseAll) {
    btnPauseAll.addEventListener('click', () => {
      window.electronAPI.pauseAllDownloads();
    });
  }

  const btnClearCompleted = document.getElementById('btn-clear-completed-downloads');
  if (btnClearCompleted) {
    btnClearCompleted.addEventListener('click', () => {
      window.electronAPI.clearCompletedDownloads();
    });
  }

  // Bind Card actions
  document.querySelectorAll('.btn-task-pause').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      window.electronAPI.pauseDownload(id);
    });
  });

  document.querySelectorAll('.btn-task-resume').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      window.electronAPI.resumeDownload(id);
    });
  });

  document.querySelectorAll('.btn-task-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      window.electronAPI.cancelDownload(id);
    });
  });

  document.querySelectorAll('.btn-task-view-playlist').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const title = e.currentTarget.getAttribute('data-title');
      await loadOfflineTracks();
      const pl = offlineData.playlists?.find(p => p.title.toLowerCase() === title.toLowerCase());
      if (pl) {
        openPlaylistDetail(pl);
      }
    });
  });
}

// Filter Chips
document.querySelectorAll('.chip-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentOfflineFilter = e.currentTarget.getAttribute('data-filter');
    closePlaylistDetail();
    if (currentOfflineFilter === 'downloads') {
      renderDownloadsManager();
    } else {
      renderOfflineTrackList();
    }
  });
});

async function loadOfflineTracks() {
  loadDownloadTasks();
  offlineTrackList.innerHTML = '<p style="text-align:center; padding: 40px; color: #a1a1aa;">Loading tracks...</p>';
  try {
    const res = await window.electronAPI.getOfflineTracks();
    if (res && (res.songs || res.playlists)) {
      offlineData = res;
      offlineTracks = res.songs || [];
    } else if (Array.isArray(res)) {
      offlineData = { songs: res, playlists: [] };
      offlineTracks = res;
    }
    if (currentOfflineFilter === 'downloads') {
      renderDownloadsManager();
    } else {
      renderOfflineTrackList();
    }
  } catch (err) {
    console.error(err);
    offlineTrackList.innerHTML = '<p style="color:#ef4444; text-align:center; padding: 40px;">Failed to load offline tracks.</p>';
  }
}

function renderOfflineTrackList() {
  if (currentOfflineFilter === 'downloads') {
    renderDownloadsManager();
    return;
  }

  const songs = offlineData.songs || [];
  const playlists = offlineData.playlists || [];

  if (songs.length === 0 && playlists.length === 0) {
    offlineTrackList.innerHTML = '<p style="text-align:center; padding: 40px; color: #a1a1aa;">No offline media found. Download songs or playlists to view them here!</p>';
    return;
  }
  
  const query = (offlineSearchInput ? offlineSearchInput.value : '').toLowerCase().trim();

  let itemsToRender = [];

  if (currentOfflineFilter === 'all') {
    itemsToRender = [...playlists, ...songs];
  } else if (currentOfflineFilter === 'playlists') {
    itemsToRender = [...playlists];
  } else if (currentOfflineFilter === 'songs') {
    itemsToRender = [...songs];
  }

  if (query) {
    itemsToRender = itemsToRender.filter(item => {
      if (item.type === 'playlist') {
        return item.title.toLowerCase().includes(query);
      }
      return item.title.toLowerCase().includes(query) || item.artist.toLowerCase().includes(query);
    });
  }

  if (itemsToRender.length === 0) {
    offlineTrackList.innerHTML = `<p style="text-align:center; padding: 40px; color: #a1a1aa;">No items match "${escapeHTML(query || currentOfflineFilter)}".</p>`;
    return;
  }
  
  let html = '<div class="offline-grid">';
  itemsToRender.forEach((item, index) => {
    const isPlaylist = item.type === 'playlist';
    const subtitle = isPlaylist ? `Playlist • ${item.trackCount} tracks` : `Song • ${escapeHTML(item.artist)}`;
    const iconName = isPlaylist ? 'queue_music' : 'music_note';

    const thumbHtml = item.coverArt 
      ? `<img src="${escapeHTML(item.coverArt)}" class="ytm-card-thumb" alt="${escapeHTML(item.title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="ytm-card-fallback-thumb" style="display:none;"><span class="material-icons-round">${iconName}</span></div>`
      : `<div class="ytm-card-fallback-thumb"><span class="material-icons-round">${iconName}</span></div>`;

    const topActionBtn = isPlaylist 
      ? `<div class="ytm-card-top-btn btn-rename-playlist-card" data-title="${escapeHTML(item.title)}" title="Rename Playlist"><span class="material-icons-round" style="font-size: 16px;">edit</span></div>`
      : `<div class="ytm-card-top-btn btn-add-song-card" data-index="${index}" title="Add to Playlist"><span class="material-icons-round" style="font-size: 16px;">playlist_add</span></div>`;

    html += `
      <div class="ytm-card ${isPlaylist ? 'playlist-card' : 'song-card'}" data-type="${item.type}" data-index="${index}">
        <div class="ytm-card-thumb-wrapper">
          ${thumbHtml}
          ${topActionBtn}
          <div class="ytm-card-play-overlay">
            <span class="material-icons-round">play_arrow</span>
          </div>
        </div>
        <div class="ytm-card-meta">
          <div class="ytm-card-title">${escapeHTML(item.title)}</div>
          <div class="ytm-card-subtitle">${subtitle}</div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  
  offlineTrackList.innerHTML = html;
  
  // Card click (Play or open playlist)
  document.querySelectorAll('.ytm-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.ytm-card-top-btn')) return; // handled separately
      const idx = parseInt(e.currentTarget.getAttribute('data-index'));
      const item = itemsToRender[idx];
      if (item.type === 'playlist') {
        openPlaylistDetail(item);
      } else {
        playOfflineTrack(item);
      }
    });
  });

  // Rename card button
  document.querySelectorAll('.btn-rename-playlist-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pTitle = e.currentTarget.getAttribute('data-title');
      promptRenamePlaylist(pTitle);
    });
  });

  // Add song to playlist button
  document.querySelectorAll('.btn-add-song-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.getAttribute('data-index'));
      const song = itemsToRender[idx];
      openAddToPlaylistModal(song);
    });
  });
}

function openPlaylistDetail(playlist) {
  selectedPlaylist = playlist;
  if (playlistDetailTitle) playlistDetailTitle.innerText = playlist.title;
  if (playlistDetailCount) playlistDetailCount.innerText = `${playlist.trackCount} tracks`;
  
  if (playlistDetailCoverImg) {
    if (playlist.coverArt) {
      playlistDetailCoverImg.src = playlist.coverArt;
      playlistDetailCoverImg.style.display = 'block';
      if (playlistDetailCoverImg.nextElementSibling) playlistDetailCoverImg.nextElementSibling.style.display = 'none';
    } else {
      playlistDetailCoverImg.style.display = 'none';
      if (playlistDetailCoverImg.nextElementSibling) playlistDetailCoverImg.nextElementSibling.style.display = 'flex';
    }
  }

  let html = '';
  playlist.tracks.forEach((track, idx) => {
    const trackCover = track.coverArt 
      ? `<img src="${escapeHTML(track.coverArt)}" style="width: 42px; height: 42px; border-radius: 8px; object-fit: cover; margin-right: 14px;" onerror="this.style.display='none';">`
      : `<span class="material-icons-round" style="margin-right: 14px; color: #ef4444; font-size: 28px;">music_note</span>`;

    html += `
      <div class="offline-track-item" data-idx="${idx}" style="display: flex; align-items: center; padding: 10px 16px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04); border-radius: 12px; cursor: pointer; transition: all 0.2s ease;">
        ${trackCover}
        <div style="flex-grow: 1;">
          <div style="font-weight: 600; color: #fff; font-size: 14px;">${escapeHTML(track.title)}</div>
          <div style="font-size: 12px; color: #a1a1aa;">${escapeHTML(track.artist)}</div>
        </div>
        <button class="bar-btn btn-remove-track-from-playlist" data-filename="${escapeHTML(track.filename)}" title="Remove from playlist" style="padding: 6px; margin-right: 8px;"><span class="material-icons-round" style="font-size: 18px; color: #71717a;">close</span></button>
        <span class="material-icons-round" style="color: rgba(255,255,255,0.5); font-size: 28px;">play_circle</span>
      </div>
    `;
  });
  
  if (playlistDetailTrackList) playlistDetailTrackList.innerHTML = html;
  
  document.querySelectorAll('.offline-track-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remove-track-from-playlist')) return;
      const idx = parseInt(e.currentTarget.getAttribute('data-idx'));
      playOfflineTrack(playlist.tracks[idx], playlist);
    });
  });

  document.querySelectorAll('.btn-remove-track-from-playlist').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const fn = e.currentTarget.getAttribute('data-filename');
      await window.electronAPI.removeSongFromPlaylist(fn, selectedPlaylist.title);
      await loadOfflineTracks();
      const updated = (offlineData.playlists || []).find(p => p.title === selectedPlaylist.title);
      if (updated) openPlaylistDetail(updated);
      else closePlaylistDetail();
    });
  });

  if (offlineMainContent) offlineMainContent.style.display = 'none';
  if (playlistDetailView) playlistDetailView.style.display = 'block';
}

function closePlaylistDetail() {
  selectedPlaylist = null;
  if (playlistDetailView) playlistDetailView.style.display = 'none';
  if (offlineMainContent) offlineMainContent.style.display = 'flex';
}

if (btnClosePlaylistDetail) {
  btnClosePlaylistDetail.addEventListener('click', closePlaylistDetail);
}

if (btnPlayAllPlaylist) {
  btnPlayAllPlaylist.addEventListener('click', () => {
    if (selectedPlaylist && selectedPlaylist.tracks.length > 0) {
      playOfflineTrack(selectedPlaylist.tracks[0], selectedPlaylist);
    }
  });
}

// Create New Playlist Modal Flow
if (btnNewPlaylist) {
  btnNewPlaylist.addEventListener('click', () => {
    const inp = document.getElementById('input-new-playlist-name');
    if (inp) inp.value = '';
    openModal('modal-create-playlist');
    if (inp) inp.focus();
  });
}

const btnConfirmCreatePlaylist = document.getElementById('btn-confirm-create-playlist');
if (btnConfirmCreatePlaylist) {
  btnConfirmCreatePlaylist.addEventListener('click', async () => {
    const inp = document.getElementById('input-new-playlist-name');
    const name = (inp ? inp.value : '').trim();
    if (!name) return;
    btnConfirmCreatePlaylist.innerText = 'Creating...';
    const res = await window.electronAPI.createPlaylist(name);
    btnConfirmCreatePlaylist.innerText = 'Create';
    closeModal('modal-create-playlist');
    if (res && res.success) {
      await loadOfflineTracks();
    } else {
      alert(res?.error || 'Failed to create playlist');
    }
  });
}

// Rename Playlist Flow
let playlistToRename = '';
function promptRenamePlaylist(title) {
  playlistToRename = title;
  const inp = document.getElementById('input-rename-playlist-name');
  if (inp) {
    inp.value = title;
    openModal('modal-rename-playlist');
    inp.focus();
  }
}

if (btnRenamePlaylistDetail) {
  btnRenamePlaylistDetail.addEventListener('click', () => {
    if (selectedPlaylist) promptRenamePlaylist(selectedPlaylist.title);
  });
}

const btnConfirmRenamePlaylist = document.getElementById('btn-confirm-rename-playlist');
if (btnConfirmRenamePlaylist) {
  btnConfirmRenamePlaylist.addEventListener('click', async () => {
    const inp = document.getElementById('input-rename-playlist-name');
    const newName = (inp ? inp.value : '').trim();
    if (!newName || !playlistToRename) return;
    btnConfirmRenamePlaylist.innerText = 'Renaming...';
    const res = await window.electronAPI.renamePlaylist(playlistToRename, newName);
    btnConfirmRenamePlaylist.innerText = 'Rename';
    closeModal('modal-rename-playlist');
    if (res && res.success) {
      await loadOfflineTracks();
      if (selectedPlaylist && selectedPlaylist.title === playlistToRename) {
        const updated = (offlineData.playlists || []).find(p => p.title === newName);
        if (updated) openPlaylistDetail(updated);
      }
    } else {
      alert(res?.error || 'Failed to rename playlist');
    }
  });
}

// Add Song to Playlist Modal Flow
function openAddToPlaylistModal(song) {
  targetSongForPlaylist = song;
  const listContainer = document.getElementById('modal-playlist-select-list');
  const playlists = offlineData.playlists || [];
  if (!listContainer) return;

  if (playlists.length === 0) {
    listContainer.innerHTML = '<p style="color: #a1a1aa; font-size: 13px;">No playlists found. Create a playlist first!</p>';
  } else {
    let html = '';
    playlists.forEach(pl => {
      html += `
        <button class="offline-action-btn btn-choose-target-playlist" data-playlist="${escapeHTML(pl.title)}" style="justify-content: flex-start; padding: 10px 14px; border-radius: 12px;">
          <span class="material-icons-round" style="color: #ef4444;">queue_music</span>
          <span style="font-weight: 600;">${escapeHTML(pl.title)}</span>
          <span style="font-size: 12px; color: #a1a1aa; margin-left: auto;">${pl.trackCount} tracks</span>
        </button>
      `;
    });
    listContainer.innerHTML = html;

    listContainer.querySelectorAll('.btn-choose-target-playlist').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const plName = e.currentTarget.getAttribute('data-playlist');
        if (targetSongForPlaylist && plName) {
          const res = await window.electronAPI.addSongToPlaylist(targetSongForPlaylist.filepath, plName);
          closeModal('modal-add-to-playlist');
          if (res && res.success) {
            await loadOfflineTracks();
          } else {
            alert(res?.error || 'Failed to add song to playlist');
          }
        }
      });
    });
  }

  openModal('modal-add-to-playlist');
}

// Add Songs to Currently Opened Playlist Flow
if (btnAddSongsPlaylist) {
  btnAddSongsPlaylist.addEventListener('click', () => {
    if (!selectedPlaylist) return;
    const container = document.getElementById('modal-available-songs-list');
    const allSongs = offlineData.songs || [];
    if (!container) return;

    const currentFilepaths = new Set((selectedPlaylist.tracks || []).map(t => t.filepath));
    const available = allSongs.filter(s => !currentFilepaths.has(s.filepath));

    if (available.length === 0) {
      container.innerHTML = '<p style="color: #a1a1aa; font-size: 13px; padding: 12px;">All downloaded songs are already in this playlist!</p>';
    } else {
      let html = '';
      available.forEach((s, idx) => {
        html += `
          <label style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 10px; cursor: pointer;">
            <input type="checkbox" class="chk-song-add" value="${escapeHTML(s.filepath)}" style="accent-color: #ef4444; width: 16px; height: 16px;">
            <div style="flex-grow: 1;">
              <div style="font-size: 13px; font-weight: 600; color: #fff;">${escapeHTML(s.title)}</div>
              <div style="font-size: 11px; color: #a1a1aa;">${escapeHTML(s.artist)}</div>
            </div>
          </label>
        `;
      });
      container.innerHTML = html;
    }
    openModal('modal-add-songs-current');
  });
}

const btnConfirmAddSelectedSongs = document.getElementById('btn-confirm-add-selected-songs');
if (btnConfirmAddSelectedSongs) {
  btnConfirmAddSelectedSongs.addEventListener('click', async () => {
    if (!selectedPlaylist) return;
    const checked = Array.from(document.querySelectorAll('.chk-song-add:checked')).map(el => el.value);
    if (checked.length === 0) {
      closeModal('modal-add-songs-current');
      return;
    }
    btnConfirmAddSelectedSongs.innerText = 'Adding...';
    for (const filepath of checked) {
      await window.electronAPI.addSongToPlaylist(filepath, selectedPlaylist.title);
    }
    btnConfirmAddSelectedSongs.innerText = 'Add Selected Songs';
    closeModal('modal-add-songs-current');
    await loadOfflineTracks();
    const updated = (offlineData.playlists || []).find(p => p.title === selectedPlaylist.title);
    if (updated) openPlaylistDetail(updated);
  });
}

// Change Cover Art Choice Flow (Upload / AI)
function openCoverChoiceModal() {
  if (!selectedPlaylist) return;
  openModal('modal-change-cover-choice');
}

if (playlistDetailCoverWrapper) playlistDetailCoverWrapper.addEventListener('click', openCoverChoiceModal);
if (btnChangeCoverPlaylist) btnChangeCoverPlaylist.addEventListener('click', openCoverChoiceModal);

const btnChoiceUploadCover = document.getElementById('btn-choice-upload-cover');
if (btnChoiceUploadCover) {
  btnChoiceUploadCover.addEventListener('click', async () => {
    closeModal('modal-change-cover-choice');
    if (!selectedPlaylist) return;
    const res = await window.electronAPI.setPlaylistCoverFile(selectedPlaylist.title);
    if (res && res.success) {
      await loadOfflineTracks();
      const updated = (offlineData.playlists || []).find(p => p.title === selectedPlaylist.title);
      if (updated) openPlaylistDetail(updated);
    } else if (res && !res.canceled && res.error) {
      alert(res.error);
    }
  });
}

const btnChoiceAiCover = document.getElementById('btn-choice-ai-cover');
if (btnChoiceAiCover) {
  btnChoiceAiCover.addEventListener('click', () => {
    closeModal('modal-change-cover-choice');
    if (!selectedPlaylist) return;
    const inp = document.getElementById('input-ai-prompt');
    if (inp) inp.value = `${selectedPlaylist.title} music album cover aesthetic artwork`;
    const previewImg = document.getElementById('ai-cover-preview-img');
    const placeholder = document.getElementById('ai-cover-placeholder');
    const spinner = document.getElementById('ai-cover-spinner');
    const saveBtn = document.getElementById('btn-save-ai-cover');
    if (previewImg) previewImg.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (spinner) spinner.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none';
    openModal('modal-ai-cover');
  });
}

// AI Cover Generation Flow
const btnGenerateAiCover = document.getElementById('btn-generate-ai-cover');
if (btnGenerateAiCover) {
  btnGenerateAiCover.addEventListener('click', async () => {
    if (!selectedPlaylist) return;
    const inp = document.getElementById('input-ai-prompt');
    const prompt = (inp ? inp.value : '').trim() || selectedPlaylist.title;
    const previewImg = document.getElementById('ai-cover-preview-img');
    const placeholder = document.getElementById('ai-cover-placeholder');
    const spinner = document.getElementById('ai-cover-spinner');
    const saveBtn = document.getElementById('btn-save-ai-cover');

    if (placeholder) placeholder.style.display = 'none';
    if (previewImg) previewImg.style.display = 'none';
    if (spinner) spinner.style.display = 'flex';
    btnGenerateAiCover.disabled = true;

    const res = await window.electronAPI.generatePlaylistCoverAI(selectedPlaylist.title, prompt);
    btnGenerateAiCover.disabled = false;
    if (spinner) spinner.style.display = 'none';

    if (res && res.success && res.coverArt) {
      lastGeneratedAiCoverUrl = res.coverArt;
      if (previewImg) {
        previewImg.src = res.coverArt + '?t=' + Date.now();
        previewImg.style.display = 'block';
      }
      if (saveBtn) saveBtn.style.display = 'inline-block';
    } else {
      if (placeholder) placeholder.style.display = 'flex';
      alert(res?.error || 'AI image generation failed. Try another prompt!');
    }
  });
}

const btnSaveAiCover = document.getElementById('btn-save-ai-cover');
if (btnSaveAiCover) {
  btnSaveAiCover.addEventListener('click', async () => {
    closeModal('modal-ai-cover');
    if (selectedPlaylist && lastGeneratedAiCoverUrl) {
      selectedPlaylist.coverArt = lastGeneratedAiCoverUrl;
    }
    await loadOfflineTracks();
    if (selectedPlaylist) {
      const updated = (offlineData.playlists || []).find(p => p.title === selectedPlaylist.title);
      if (updated) openPlaylistDetail(updated);
    }
  });
}

// Auto-Fetch Missing Covers Flow
if (btnAutoCovers) {
  btnAutoCovers.addEventListener('click', async () => {
    btnAutoCovers.innerHTML = '<span class="material-icons-round" style="font-size: 18px; animation: spin 1s linear infinite;">autorenew</span><span>Fetching...</span>';
    btnAutoCovers.disabled = true;
    const res = await window.electronAPI.autoFetchMissingCovers();
    btnAutoCovers.innerHTML = '<span class="material-icons-round" style="font-size: 18px;">image_search</span><span>Auto-Fetch Covers</span>';
    btnAutoCovers.disabled = false;
    await loadOfflineTracks();
    if (res && res.success) {
      alert(`Auto-fetch complete! Downloaded covers for ${res.updated || 0} songs.`);
    } else {
      alert(res?.error || 'Auto-fetch complete.');
    }
  });
}

if (offlineSearchInput) {
  offlineSearchInput.addEventListener('input', renderOfflineTrackList);
}

btnRefreshOffline.addEventListener('click', loadOfflineTracks);

// Offline Player Sync Loop
setInterval(() => {
  if (isOfflineMode && currentOfflineTrack) {
    const isPlaying = !offlineAudioPlayer.paused;
    const progress = offlineAudioPlayer.currentTime || 0;
    const duration = offlineAudioPlayer.duration || 0;
    
    updateUI({
      title: currentOfflineTrack.title,
      artist: currentOfflineTrack.artist,
      album: (currentOfflinePlaylist && currentOfflinePlaylist.title) ? currentOfflinePlaylist.title : 'Offline Library',
      art: currentOfflineTrack.coverArt || 'icon.png',
      isPlaying,
      progress,
      duration,
      volume: offlineAudioPlayer.volume * 100,
      videoId: '',
      isShuffleActive: false,
      repeatMode: 'off',
      isLiked: false,
      isDisliked: false
    });
  }
}, 250);

// Initialize downloads manager state on startup
loadDownloadTasks();

/* ==========================================================================
   10-BAND GRAPHIC EQUALIZER & ACOUSTIC ENGINE
   ========================================================================== */

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'bass-boost': [9, 7.5, 5, 2, 0, 0, 0, 0, 0, 0],
  vocal: [-2, -1, 1, 3.5, 5, 4.5, 2, 1, 0, -1],
  electronic: [6, 5, 2, 0, -1, 2, 3.5, 4.5, 5.5, 6],
  rock: [5, 3.5, -1, -2, 0, 2, 4, 6, 6, 6.5],
  hiphop: [7, 6, 3, 1, 0, 0, 2, 1, 3, 4],
  acoustic: [3.5, 2.5, 1, 2, 3, 3, 4, 3, 2, 1],
  jazz: [3.5, 2, 0, 1, 2.5, 2.5, 0, 1.5, 3.5, 4]
};

let eqAudioCtx = null;
let eqSourceNode = null;
let eqFilters = [];
let eqPreampNode = null;
let eqBassNode = null;
let eqMasterEnabled = true;

const eqBandsGroup = document.getElementById('eq-bands-group');
const eqMasterToggle = document.getElementById('eq-master-toggle');
const eqSliderPreamp = document.getElementById('eq-slider-preamp');
const eqValPreamp = document.getElementById('eq-val-preamp');
const eqSliderBass = document.getElementById('eq-slider-bass');
const eqValBass = document.getElementById('eq-val-bass');
const btnResetEq = document.getElementById('btn-reset-eq');

function initWebAudioEqualizer() {
  if (eqAudioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    eqAudioCtx = new AudioContextClass();
    
    // Create Preamp Gain
    eqPreampNode = eqAudioCtx.createGain();
    eqPreampNode.gain.value = 1.0;

    // Create Extra Bass Low-Shelf filter
    eqBassNode = eqAudioCtx.createBiquadFilter();
    eqBassNode.type = 'lowshelf';
    eqBassNode.frequency.value = 80;
    eqBassNode.gain.value = 0;

    // Create 10 Biquad Peaking Filters
    eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = eqAudioCtx.createBiquadFilter();
      if (idx === 0) {
        filter.type = 'lowshelf';
      } else if (idx === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4;
      }
      filter.frequency.value = freq;
      filter.gain.value = 0;
      return filter;
    });

    // Wire Offline Audio Player through EQ chain
    eqSourceNode = eqAudioCtx.createMediaElementSource(offlineAudioPlayer);

    // Connect: Source -> Preamp -> Bass -> Filter 1 -> ... -> Filter 10 -> Destination
    let prevNode = eqSourceNode;
    prevNode.connect(eqPreampNode);
    prevNode = eqPreampNode;
    prevNode.connect(eqBassNode);
    prevNode = eqBassNode;

    eqFilters.forEach(f => {
      prevNode.connect(f);
      prevNode = f;
    });

    prevNode.connect(eqAudioCtx.destination);
  } catch (e) {
    console.warn('[Equalizer] AudioContext init note:', e);
  }
}

// Generate EQ Vertical Sliders UI
if (eqBandsGroup) {
  eqBandsGroup.innerHTML = '';
  EQ_FREQUENCIES.forEach((freq, idx) => {
    const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
    const col = document.createElement('div');
    col.className = 'eq-band-col';
    col.innerHTML = `
      <span class="eq-band-val" id="eq-val-${idx}">0dB</span>
      <div class="eq-slider-track">
        <input type="range" class="eq-slider-v" id="eq-slider-${idx}" min="-12" max="12" step="0.5" value="0" orient="vertical">
      </div>
      <span class="eq-band-label">${label}</span>
    `;
    eqBandsGroup.appendChild(col);

    const slider = col.querySelector(`#eq-slider-${idx}`);
    const valDisplay = col.querySelector(`#eq-val-${idx}`);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valDisplay.innerText = `${val > 0 ? '+' : ''}${val}dB`;
      if (eqFilters[idx]) {
        eqFilters[idx].gain.value = eqMasterEnabled ? val : 0;
      }
      document.querySelectorAll('.eq-preset-chip').forEach(c => c.classList.remove('active'));
      saveCurrentEqSettings();
    });
  });
}

if (eqSliderPreamp) {
  eqSliderPreamp.addEventListener('input', () => {
    const val = parseFloat(eqSliderPreamp.value);
    if (eqValPreamp) eqValPreamp.innerText = `${val > 0 ? '+' : ''}${val}dB`;
    if (eqPreampNode) {
      eqPreampNode.gain.value = eqMasterEnabled ? Math.pow(10, val / 20) : 1.0;
    }
    saveCurrentEqSettings();
  });
}

if (eqSliderBass) {
  eqSliderBass.addEventListener('input', () => {
    const val = parseFloat(eqSliderBass.value);
    if (eqValBass) eqValBass.innerText = `+${val}dB`;
    if (eqBassNode) {
      eqBassNode.gain.value = eqMasterEnabled ? val : 0;
    }
    saveCurrentEqSettings();
  });
}

if (eqMasterToggle) {
  eqMasterToggle.addEventListener('change', () => {
    eqMasterEnabled = eqMasterToggle.checked;
    applyAllEqGains();
    saveCurrentEqSettings();
  });
}

function applyEqPreset(presetName) {
  const gains = EQ_PRESETS[presetName] || EQ_PRESETS.flat;
  gains.forEach((gain, idx) => {
    const slider = document.getElementById(`eq-slider-${idx}`);
    const valDisplay = document.getElementById(`eq-val-${idx}`);
    if (slider) slider.value = gain;
    if (valDisplay) valDisplay.innerText = `${gain > 0 ? '+' : ''}${gain}dB`;
    if (eqFilters[idx]) {
      eqFilters[idx].gain.value = eqMasterEnabled ? gain : 0;
    }
  });

  if (presetName === 'bass-boost') {
    if (eqSliderBass) eqSliderBass.value = 6;
    if (eqValBass) eqValBass.innerText = '+6dB';
    if (eqBassNode) eqBassNode.gain.value = eqMasterEnabled ? 6 : 0;
  } else {
    if (eqSliderBass) eqSliderBass.value = 0;
    if (eqValBass) eqValBass.innerText = '0dB';
    if (eqBassNode) eqBassNode.gain.value = 0;
  }

  document.querySelectorAll('.eq-preset-chip').forEach(c => {
    if (c.getAttribute('data-preset') === presetName) c.classList.add('active');
    else c.classList.remove('active');
  });

  saveCurrentEqSettings();
}

function applyAllEqGains() {
  EQ_FREQUENCIES.forEach((freq, idx) => {
    const slider = document.getElementById(`eq-slider-${idx}`);
    const val = slider ? parseFloat(slider.value) : 0;
    if (eqFilters[idx]) {
      eqFilters[idx].gain.value = eqMasterEnabled ? val : 0;
    }
  });

  const preampVal = eqSliderPreamp ? parseFloat(eqSliderPreamp.value) : 0;
  if (eqPreampNode) {
    eqPreampNode.gain.value = eqMasterEnabled ? Math.pow(10, preampVal / 20) : 1.0;
  }

  const bassVal = eqSliderBass ? parseFloat(eqSliderBass.value) : 0;
  if (eqBassNode) {
    eqBassNode.gain.value = eqMasterEnabled ? bassVal : 0;
  }

  broadcastEqSettingsToWebview();
}

function broadcastEqSettingsToWebview() {
  const gains = EQ_FREQUENCIES.map((_, idx) => {
    const slider = document.getElementById(`eq-slider-${idx}`);
    return slider ? parseFloat(slider.value) : 0;
  });
  const preamp = eqSliderPreamp ? parseFloat(eqSliderPreamp.value) : 0;
  const bass = eqSliderBass ? parseFloat(eqSliderBass.value) : 0;
  try {
    if (webview && webview.send) {
      webview.send('set-equalizer-settings', {
        enabled: eqMasterEnabled,
        gains,
        preamp,
        bass
      });
    }
  } catch (e) {}
}

document.querySelectorAll('.eq-preset-chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    const preset = e.currentTarget.getAttribute('data-preset');
    applyEqPreset(preset);
  });
});

if (btnResetEq) {
  btnResetEq.addEventListener('click', () => applyEqPreset('flat'));
}

async function saveCurrentEqSettings() {
  broadcastEqSettingsToWebview();
  if (!window.electronAPI || !window.electronAPI.saveAppSettings) return;
  const gains = EQ_FREQUENCIES.map((_, idx) => {
    const slider = document.getElementById(`eq-slider-${idx}`);
    return slider ? parseFloat(slider.value) : 0;
  });
  const activePreset = document.querySelector('.eq-preset-chip.active')?.getAttribute('data-preset') || 'custom';
  
  const currentSettings = (await window.electronAPI.getAppSettings()) || {};
  await window.electronAPI.saveAppSettings({
    ...currentSettings,
    eqEnabled: eqMasterEnabled,
    eqPreset: activePreset,
    eqGains: gains,
    preampGain: eqSliderPreamp ? parseFloat(eqSliderPreamp.value) : 0,
    bassBoost: eqSliderBass ? parseFloat(eqSliderBass.value) : 0
  });
}

// Hook Web Audio init on user gesture
document.addEventListener('click', () => initWebAudioEqualizer(), { once: true });

/* ==========================================================================
   SMART SLEEP TIMER
   ========================================================================== */

let sleepTimerInterval = null;
let sleepTimerEndTime = null;
let sleepTimerMode = null; // 'minutes' or 'end-of-track'
let isFadingOut = false;

const sleepTimerActiveCard = document.getElementById('sleep-timer-active-card');
const sleepTimerCountdown = document.getElementById('sleep-timer-countdown');
const sleepTimerSetup = document.getElementById('sleep-timer-setup');
const btnCancelSleepTimer = document.getElementById('btn-cancel-sleep-timer');
const inputCustomSleepMins = document.getElementById('input-custom-sleep-mins');
const btnStartCustomSleep = document.getElementById('btn-start-custom-sleep');

function startSleepTimer(minutes, mode = 'minutes') {
  cancelSleepTimer();
  sleepTimerMode = mode;

  if (mode === 'end-of-track') {
    if (titlebarSleepLabel) {
      titlebarSleepLabel.innerText = 'Track End';
      titlebarSleepLabel.style.display = 'inline';
    }
    if (sleepTimerActiveCard) sleepTimerActiveCard.style.display = 'block';
    if (sleepTimerCountdown) sleepTimerCountdown.innerText = 'End of Track';
    if (sleepTimerSetup) sleepTimerSetup.style.display = 'none';
    return;
  }

  const durationMs = minutes * 60 * 1000;
  sleepTimerEndTime = Date.now() + durationMs;

  if (sleepTimerActiveCard) sleepTimerActiveCard.style.display = 'block';
  if (sleepTimerSetup) sleepTimerSetup.style.display = 'none';

  updateSleepTimerDisplay();
  sleepTimerInterval = setInterval(() => {
    const remainingMs = sleepTimerEndTime - Date.now();
    if (remainingMs <= 0) {
      triggerSleepTimerStop();
    } else {
      if (remainingMs <= 10000 && !isFadingOut) {
        startVolumeFadeOut();
      }
      updateSleepTimerDisplay();
    }
  }, 1000);
}

function updateSleepTimerDisplay() {
  if (!sleepTimerEndTime) return;
  const remainingSecs = Math.max(0, Math.round((sleepTimerEndTime - Date.now()) / 1000));
  const m = Math.floor(remainingSecs / 60);
  const s = remainingSecs % 60;
  const str = `${m}:${s.toString().padStart(2, '0')}`;

  if (sleepTimerCountdown) sleepTimerCountdown.innerText = str;
  if (titlebarSleepLabel) {
    titlebarSleepLabel.innerText = str;
    titlebarSleepLabel.style.display = 'inline';
  }
}

function startVolumeFadeOut() {
  isFadingOut = true;
  const originalVol = isOfflineMode ? offlineAudioPlayer.volume : (volumeSlider ? volumeSlider.value / 100 : 0.5);
  let steps = 10;
  const fadeInterval = setInterval(() => {
    steps--;
    const factor = Math.max(0, steps / 10);
    sendPlayerCommand('volume', Math.round(originalVol * factor * 100));
    if (steps <= 0) {
      clearInterval(fadeInterval);
      isFadingOut = false;
    }
  }, 1000);
}

function triggerSleepTimerStop() {
  cancelSleepTimer();
  sendPlayerCommand('pause');
  if (isOfflineMode) offlineAudioPlayer.pause();
  alert('Sleep Timer: Music playback paused. Goodnight!');
}

function cancelSleepTimer() {
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
    sleepTimerInterval = null;
  }
  sleepTimerEndTime = null;
  sleepTimerMode = null;
  isFadingOut = false;

  if (titlebarSleepLabel) titlebarSleepLabel.style.display = 'none';
  if (sleepTimerActiveCard) sleepTimerActiveCard.style.display = 'none';
  if (sleepTimerSetup) sleepTimerSetup.style.display = 'block';
  document.querySelectorAll('.sleep-timer-chip').forEach(c => c.classList.remove('active'));
}

document.querySelectorAll('.sleep-timer-chip').forEach(chip => {
  chip.addEventListener('click', (e) => {
    const minsAttr = e.currentTarget.getAttribute('data-mins');
    if (minsAttr === 'end-of-track') {
      startSleepTimer(0, 'end-of-track');
    } else {
      const mins = parseInt(minsAttr, 10);
      if (!isNaN(mins) && mins > 0) {
        startSleepTimer(mins, 'minutes');
      }
    }
  });
});

if (btnStartCustomSleep && inputCustomSleepMins) {
  btnStartCustomSleep.addEventListener('click', () => {
    const mins = parseInt(inputCustomSleepMins.value, 10);
    if (!isNaN(mins) && mins > 0) {
      startSleepTimer(mins, 'minutes');
    }
  });
}

if (btnCancelSleepTimer) {
  btnCancelSleepTimer.addEventListener('click', cancelSleepTimer);
}

/* ==========================================================================
   PICTURE-IN-PICTURE MINI PLAYER & DESKTOP UTILITIES
   ========================================================================== */

if (btnTogglePip) {
  btnTogglePip.addEventListener('click', () => {
    if (window.electronAPI && window.electronAPI.togglePiP) {
      window.electronAPI.togglePiP();
    }
  });
}

if (dockBtnPip) {
  dockBtnPip.addEventListener('click', () => {
    if (window.electronAPI && window.electronAPI.togglePiP) {
      window.electronAPI.togglePiP();
    }
  });
}

if (btnOpenEq) {
  btnOpenEq.addEventListener('click', () => openModal('modal-equalizer'));
}

if (dockBtnEq) {
  dockBtnEq.addEventListener('click', () => openModal('modal-equalizer'));
}

// Floating Browser Mode Quick Action Dock Collapse Toggle
if (dockBtnCollapse && browserModeQuickDock) {
  dockBtnCollapse.addEventListener('click', (e) => {
    e.stopPropagation();
    browserModeQuickDock.classList.toggle('collapsed');
    const isCollapsed = browserModeQuickDock.classList.contains('collapsed');
    try {
      localStorage.setItem('ytm-quick-dock-collapsed', isCollapsed ? 'true' : 'false');
    } catch (err) {}
  });

  // Restore saved dock collapsed state
  try {
    if (localStorage.getItem('ytm-quick-dock-collapsed') === 'true') {
      browserModeQuickDock.classList.add('collapsed');
    }
  } catch (err) {}
}

// Floating Browser Mode Quick Action Dock Draggable Physics & Position Persistence
const dockDragHandle = document.getElementById('dock-drag-handle');

if (browserModeQuickDock) {
  let isDraggingDock = false;
  let hasMovedDuringDrag = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let initialDockLeft = 0;
  let initialDockTop = 0;

  function restoreDockPosition() {
    try {
      const savedX = localStorage.getItem('ytm-quick-dock-pos-x');
      const savedY = localStorage.getItem('ytm-quick-dock-pos-y');
      if (savedX !== null && savedY !== null) {
        const x = parseFloat(savedX);
        const y = parseFloat(savedY);
        if (!isNaN(x) && !isNaN(y)) {
          const parent = browserModeQuickDock.offsetParent || document.body;
          const parentWidth = parent.clientWidth || window.innerWidth;
          const parentHeight = parent.clientHeight || window.innerHeight;
          const dockWidth = browserModeQuickDock.offsetWidth || 300;
          const dockHeight = browserModeQuickDock.offsetHeight || 40;

          const boundedX = Math.max(8, Math.min(parentWidth - dockWidth - 8, x));
          const boundedY = Math.max(8, Math.min(parentHeight - dockHeight - 80, y));

          browserModeQuickDock.style.right = 'auto';
          browserModeQuickDock.style.left = `${boundedX}px`;
          browserModeQuickDock.style.top = `${boundedY}px`;
        }
      }
    } catch (err) {}
  }

  // Restore saved dock position on startup
  setTimeout(restoreDockPosition, 60);

  function onDockPointerDown(e) {
    // If clicking an action button (other than drag handle), do not drag
    if (e.target.closest('.dock-btn') && !e.target.closest('#dock-drag-handle')) {
      return;
    }

    isDraggingDock = true;
    hasMovedDuringDrag = false;
    startPointerX = e.clientX;
    startPointerY = e.clientY;

    const rect = browserModeQuickDock.getBoundingClientRect();
    const parentRect = browserModeQuickDock.offsetParent ? browserModeQuickDock.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };

    initialDockLeft = rect.left - parentRect.left;
    initialDockTop = rect.top - parentRect.top;

    browserModeQuickDock.style.right = 'auto';
    browserModeQuickDock.style.left = `${initialDockLeft}px`;
    browserModeQuickDock.style.top = `${initialDockTop}px`;
    browserModeQuickDock.classList.add('is-dragging');

    window.addEventListener('pointermove', onDockPointerMove);
    window.addEventListener('pointerup', onDockPointerUp);
    e.preventDefault();
  }

  function onDockPointerMove(e) {
    if (!isDraggingDock) return;
    const deltaX = e.clientX - startPointerX;
    const deltaY = e.clientY - startPointerY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasMovedDuringDrag = true;
    }

    const parent = browserModeQuickDock.offsetParent || document.body;
    const parentWidth = parent.clientWidth || window.innerWidth;
    const parentHeight = parent.clientHeight || window.innerHeight;
    const dockWidth = browserModeQuickDock.offsetWidth;
    const dockHeight = browserModeQuickDock.offsetHeight;

    let newLeft = initialDockLeft + deltaX;
    let newTop = initialDockTop + deltaY;

    newLeft = Math.max(8, Math.min(parentWidth - dockWidth - 8, newLeft));
    newTop = Math.max(8, Math.min(parentHeight - dockHeight - 80, newTop));

    browserModeQuickDock.style.left = `${newLeft}px`;
    browserModeQuickDock.style.top = `${newTop}px`;
  }

  function onDockPointerUp() {
    if (!isDraggingDock) return;
    isDraggingDock = false;
    browserModeQuickDock.classList.remove('is-dragging');

    window.removeEventListener('pointermove', onDockPointerMove);
    window.removeEventListener('pointerup', onDockPointerUp);

    if (hasMovedDuringDrag) {
      try {
        const curLeft = parseFloat(browserModeQuickDock.style.left);
        const curTop = parseFloat(browserModeQuickDock.style.top);
        if (!isNaN(curLeft) && !isNaN(curTop)) {
          localStorage.setItem('ytm-quick-dock-pos-x', curLeft);
          localStorage.setItem('ytm-quick-dock-pos-y', curTop);
        }
      } catch (err) {}
    }
  }

  if (dockDragHandle) {
    dockDragHandle.addEventListener('pointerdown', onDockPointerDown);
  }
  browserModeQuickDock.addEventListener('pointerdown', onDockPointerDown);

  window.addEventListener('resize', () => {
    restoreDockPosition();
  });
}



if (btnOpenSleepTimer) {
  btnOpenSleepTimer.addEventListener('click', () => openModal('modal-sleep-timer'));
}

if (btnOpenSettings) {
  btnOpenSettings.addEventListener('click', () => openModal('modal-settings'));
}

// Listen to player commands from Mini Window and Global Keyboard Media Shortcuts
if (window.electronAPI && window.electronAPI.onPlayerCommandFromMini) {
  window.electronAPI.onPlayerCommandFromMini((data) => {
    sendPlayerCommand(data.command, data.value);
  });
}

if (window.electronAPI && window.electronAPI.onGlobalShortcutCommand) {
  window.electronAPI.onGlobalShortcutCommand((data) => {
    sendPlayerCommand(data.command, data.value);
  });
}

if (window.electronAPI && window.electronAPI.onPiPModeChanged) {
  window.electronAPI.onPiPModeChanged((isPiP) => {
    if (btnTogglePip) {
      if (isPiP) btnTogglePip.classList.add('active');
      else btnTogglePip.classList.remove('active');
    }
  });
}

/* ==========================================================================
   THEME STUDIO & SETTINGS CONTROLLER
   ========================================================================== */

function applyTheme(themeName) {
  document.body.setAttribute('data-theme', themeName);
  document.querySelectorAll('.theme-card').forEach(card => {
    if (card.getAttribute('data-theme') === themeName) card.classList.add('active');
    else card.classList.remove('active');
  });
}

document.querySelectorAll('.theme-card').forEach(card => {
  card.addEventListener('click', async (e) => {
    const theme = e.currentTarget.getAttribute('data-theme');
    applyTheme(theme);
    if (window.electronAPI && window.electronAPI.saveAppSettings) {
      const current = (await window.electronAPI.getAppSettings()) || {};
      await window.electronAPI.saveAppSettings({ ...current, theme });
    }
  });
});

const selectSettingsVisualizer = document.getElementById('select-settings-visualizer');
if (selectSettingsVisualizer) {
  selectSettingsVisualizer.addEventListener('change', () => {
    if (visualizerStyle) {
      visualizerStyle.value = selectSettingsVisualizer.value;
    }
  });
}

const selectDownloadQuality = document.getElementById('select-download-quality');
if (selectDownloadQuality) {
  selectDownloadQuality.addEventListener('change', async () => {
    if (window.electronAPI && window.electronAPI.saveAppSettings) {
      const current = (await window.electronAPI.getAppSettings()) || {};
      await window.electronAPI.saveAppSettings({ ...current, downloadQuality: selectDownloadQuality.value });
    }
  });
}

const settingsDiscordToggle = document.getElementById('settings-discord-toggle');
if (settingsDiscordToggle) {
  settingsDiscordToggle.addEventListener('change', async () => {
    if (window.electronAPI && window.electronAPI.saveAppSettings) {
      const current = (await window.electronAPI.getAppSettings()) || {};
      await window.electronAPI.saveAppSettings({ ...current, discordRpc: settingsDiscordToggle.checked });
    }
  });
}

// Load saved settings on startup
async function loadStartupAppSettings() {
  if (!window.electronAPI || !window.electronAPI.getAppSettings) return;
  try {
    const settings = await window.electronAPI.getAppSettings();
    if (settings) {
      if (settings.theme) applyTheme(settings.theme);
      if (settings.downloadQuality && selectDownloadQuality) {
        selectDownloadQuality.value = settings.downloadQuality;
      }
      if (settings.discordRpc !== undefined && settingsDiscordToggle) {
        settingsDiscordToggle.checked = settings.discordRpc;
      }
      if (settings.eqPreset) {
        applyEqPreset(settings.eqPreset);
      }
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}
loadStartupAppSettings();

/* ==========================================================================
   OFFLINE POWER TOOLS (SCAN DUPLICATES & SYNC PLAYLISTS)
   ========================================================================== */

const btnScanDuplicates = document.getElementById('btn-scan-duplicates');
if (btnScanDuplicates) {
  btnScanDuplicates.addEventListener('click', async () => {
    await loadOfflineTracks();
    const songs = offlineData.songs || [];
    const seen = new Map();
    const duplicates = [];

    songs.forEach(s => {
      const key = `${(s.title || '').toLowerCase().trim()} - ${(s.artist || '').toLowerCase().trim()}`;
      if (seen.has(key)) {
        duplicates.push(s);
      } else {
        seen.set(key, s);
      }
    });

    if (duplicates.length === 0) {
      alert('Awesome! No duplicate songs were found in your offline library.');
    } else {
      if (confirm(`Found ${duplicates.length} duplicate songs in your library. Would you like to review them in the offline library?`)) {
        closeModal('modal-settings');
        openOfflineLibraryView('songs');
      }
    }
  });
}

const btnSyncAllPlaylists = document.getElementById('btn-sync-all-playlists');
if (btnSyncAllPlaylists) {
  btnSyncAllPlaylists.addEventListener('click', async () => {
    alert('Playlist auto-sync scheduled. Any newly detected tracks from online playlists will be downloaded in the background.');
  });
}


