const { ipcRenderer } = require('electron');

function isYTM() {
  return window.location.hostname.includes('music.youtube.com');
}

// 1. Sync track metadata and playback progress back to Host
function syncPlaybackState() {
  if (!isYTM()) return;
  const video = document.querySelector('video');
  if (!video) return;

  let title = navigator.mediaSession?.metadata?.title || '';
  if (!title) {
    const titleEl = document.querySelector('.ytmusic-player-bar .title');
    title = titleEl ? titleEl.innerText : '';
  }

  let artist = navigator.mediaSession?.metadata?.artist || '';
  if (!artist) {
    const artistEl = document.querySelector('.ytmusic-player-bar .byline');
    artist = artistEl ? artistEl.innerText : '';
  }

  let album = navigator.mediaSession?.metadata?.album || '';

  let art = '';
  if (navigator.mediaSession?.metadata?.artwork?.length > 0) {
    art = navigator.mediaSession.metadata.artwork[navigator.mediaSession.metadata.artwork.length - 1].src;
  }
  if (!art || art.startsWith('blob:')) {
    const imgEl = document.querySelector('img.ytmusic-player-bar') || document.querySelector('#player-bar-artwork img');
    if (imgEl && imgEl.src) art = imgEl.src;
  }

  const isPlaying = !video.paused;
  const progress = video.currentTime || 0;
  const duration = video.duration || 0;
  const volume = video.volume !== undefined ? Math.round(video.volume * 100) : 50;

  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v') || '';
  const playlistId = urlParams.get('list') || '';

  const shuffleBtn = document.querySelector('.shuffle-button') || document.querySelector('#left-controls .shuffle-button');
  const isShuffleActive = shuffleBtn ? shuffleBtn.getAttribute('aria-pressed') === 'true' || shuffleBtn.classList.contains('active') : false;

  const repeatBtn = document.querySelector('.repeat-button') || document.querySelector('#left-controls .repeat-button');
  let repeatMode = 'off';
  if (repeatBtn) {
    const repeatState = repeatBtn.getAttribute('aria-label');
    if (repeatState) {
      if (repeatState.includes('one')) repeatMode = 'one';
      else if (repeatState.includes('all') || repeatBtn.getAttribute('aria-pressed') === 'true') repeatMode = 'all';
    }
  }

  const likeBtn = document.querySelector('ytmusic-like-button-renderer #button-shape-like button');
  const dislikeBtn = document.querySelector('ytmusic-like-button-renderer #button-shape-dislike button');
  const isLiked = likeBtn ? likeBtn.getAttribute('aria-pressed') === 'true' : false;
  const isDisliked = dislikeBtn ? dislikeBtn.getAttribute('aria-pressed') === 'true' : false;

  ipcRenderer.sendToHost('playback-status', {
    title,
    artist,
    album,
    art,
    isPlaying,
    progress,
    duration,
    volume,
    videoId,
    playlistId,
    isShuffleActive,
    repeatMode,
    isLiked,
    isDisliked
  });
}

// 2. Receive commands from Host Renderer (Custom UI)
ipcRenderer.on('player-command', (event, { command, value }) => {
  const video = document.querySelector('video');
  
  switch (command) {
    case 'play-pause':
      if (video) {
        if (video.paused) video.play();
        else video.pause();
      }
      break;
    case 'play':
      if (video && video.paused) video.play();
      break;
    case 'pause':
      if (video && !video.paused) video.pause();
      break;
    case 'next': {
      const nextBtn = document.querySelector('.next-button') || document.querySelector('.ytp-next-button');
      if (nextBtn) nextBtn.click();
      break;
    }
    case 'previous': {
      const prevBtn = document.querySelector('.previous-button') || document.querySelector('.ytp-prev-button');
      if (prevBtn) prevBtn.click();
      break;
    }
    case 'volume':
      if (video) {
        video.volume = value / 100;
      }
      break;
    case 'seek':
      if (video && video.duration) {
        video.currentTime = value;
      }
      break;
    case 'shuffle': {
      const sBtn = document.querySelector('.shuffle-button') || document.querySelector('#left-controls .shuffle-button');
      if (sBtn) sBtn.click();
      break;
    }
    case 'repeat': {
      const rBtn = document.querySelector('.repeat-button') || document.querySelector('#left-controls .repeat-button');
      if (rBtn) rBtn.click();
      break;
    }
    case 'like': {
      const lBtn = document.querySelector('ytmusic-like-button-renderer #button-shape-like button') || document.querySelector('.like-button');
      if (lBtn) lBtn.click();
      break;
    }
    case 'dislike': {
      const dBtn = document.querySelector('ytmusic-like-button-renderer #button-shape-dislike button') || document.querySelector('.dislike-button');
      if (dBtn) dBtn.click();
      break;
    }
    case 'search':
      if (value) {
        window.location.href = `https://music.youtube.com/search?q=${encodeURIComponent(value)}`;
      }
      break;
    case 'navigate':
      if (value === 'home') {
        window.location.href = 'https://music.youtube.com/';
      } else if (value === 'explore') {
        window.location.href = 'https://music.youtube.com/explore';
      } else if (value === 'library') {
        window.location.href = 'https://music.youtube.com/library';
      }
      break;
    case 'load-lyrics':
      fetchLyricsAndSend();
      break;
  }
});

// --- Web Audio 10-Band Graphic Equalizer Engine for YouTube Music Webview ---
let webAudioCtx = null;
let webVideoSource = null;
let webEqFilters = [];
let webPreampGain = null;
let webBassFilter = null;
let webEqEnabled = true;
let lastReceivedEqSettings = null;

const WEB_EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

function hookWebviewEqualizer() {
  const video = document.querySelector('video');
  if (!video || webVideoSource) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    webAudioCtx = new AudioContextClass();
    webPreampGain = webAudioCtx.createGain();
    webPreampGain.gain.value = 1.0;

    webBassFilter = webAudioCtx.createBiquadFilter();
    webBassFilter.type = 'lowshelf';
    webBassFilter.frequency.value = 80;
    webBassFilter.gain.value = 0;

    webEqFilters = WEB_EQ_FREQS.map((freq, idx) => {
      const f = webAudioCtx.createBiquadFilter();
      if (idx === 0) f.type = 'lowshelf';
      else if (idx === WEB_EQ_FREQS.length - 1) f.type = 'highshelf';
      else {
        f.type = 'peaking';
        f.Q.value = 1.4;
      }
      f.frequency.value = freq;
      f.gain.value = 0;
      return f;
    });

    // Create media element source from YouTube video element
    webVideoSource = webAudioCtx.createMediaElementSource(video);

    let prev = webVideoSource;
    prev.connect(webPreampGain);
    prev = webPreampGain;
    prev.connect(webBassFilter);
    prev = webBassFilter;

    webEqFilters.forEach(f => {
      prev.connect(f);
      prev = f;
    });

    prev.connect(webAudioCtx.destination);
    console.log('[YTM Webview] 10-Band Equalizer attached to YouTube video audio stream!');

    if (lastReceivedEqSettings) {
      applySettingsToWebEq(lastReceivedEqSettings);
    }
  } catch (e) {
    console.warn('[YTM Webview] Equalizer attachment note:', e);
  }
}

function applySettingsToWebEq(settings) {
  lastReceivedEqSettings = settings;
  const { enabled, gains, preamp, bass } = settings || {};
  webEqEnabled = enabled !== undefined ? !!enabled : true;

  if (webEqFilters && webEqFilters.length > 0 && Array.isArray(gains)) {
    gains.forEach((gain, idx) => {
      if (webEqFilters[idx]) {
        webEqFilters[idx].gain.value = webEqEnabled ? gain : 0;
      }
    });
  }

  if (webPreampGain) {
    webPreampGain.gain.value = webEqEnabled && preamp !== undefined ? Math.pow(10, preamp / 20) : 1.0;
  }

  if (webBassFilter) {
    webBassFilter.gain.value = webEqEnabled && bass !== undefined ? bass : 0;
  }
}

// Hook on video events
document.addEventListener('play', (e) => {
  if (e.target && e.target.tagName === 'VIDEO') {
    hookWebviewEqualizer();
    if (webAudioCtx && webAudioCtx.state === 'suspended') {
      webAudioCtx.resume();
    }
  }
}, true);

document.addEventListener('loadeddata', (e) => {
  if (e.target && e.target.tagName === 'VIDEO') {
    hookWebviewEqualizer();
  }
}, true);

// Listen to Equalizer settings broadcast from Host window
ipcRenderer.on('set-equalizer-settings', (event, settings) => {
  if (!webAudioCtx) hookWebviewEqualizer();
  applySettingsToWebEq(settings);
});

// Request initial EQ state from host on ready
setTimeout(() => {
  ipcRenderer.sendToHost('request-equalizer-settings');
}, 1000);


// 3. Inject Download Playlist Buttons into YT Music Header
function injectPlaylistDownloadButtons() {
  if (!isYTM()) return;
  const urlParams = new URLSearchParams(window.location.search);
  const playlistId = urlParams.get('list');
  if (!playlistId) return;

  const headerActionButtons = 
    document.querySelector('ytmusic-playlist-header-renderer #buttons') ||
    document.querySelector('ytmusic-detail-header-renderer #buttons') ||
    document.querySelector('ytmusic-responsive-header-renderer #buttons') ||
    document.querySelector('.action-buttons');

  if (headerActionButtons && !document.getElementById('custom-ytm-download-playlist-btn')) {
    const btn = document.createElement('button');
    btn.id = 'custom-ytm-download-playlist-btn';
    btn.title = 'Download Playlist to Offline Library';
    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #ef4444;
      color: #ffffff;
      border: none;
      border-radius: 20px;
      padding: 8px 16px;
      margin-left: 10px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      transition: all 0.2s ease;
      z-index: 9999;
    `;
    btn.innerHTML = `
      <span style="font-family: sans-serif; margin-right: 6px; font-size: 16px;">⬇️</span>
      <span>Download Playlist</span>
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.background = '#dc2626';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.background = '#ef4444';
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btn.style.opacity = '0.7';
      ipcRenderer.sendToHost('trigger-download-playlist', { playlistId, playlistUrl: window.location.href });
      setTimeout(() => {
        btn.style.opacity = '1';
      }, 3000);
    });

    headerActionButtons.appendChild(btn);
  }
}

// 4. Inject Download Song & Playlist into Bottom Player Bar
function injectPlayerBarDownloadButtons() {
  if (!isYTM()) return;
  if (document.getElementById('ytm-playerbar-custom-buttons')) return;

  const playerBar = document.querySelector('ytmusic-player-bar');
  if (!playerBar) return;

  const middleControls = playerBar.querySelector('.middle-controls') || 
                         playerBar.querySelector('#middle-controls') || 
                         playerBar.querySelector('.middle-controls-buttons') ||
                         playerBar.querySelector('ytmusic-like-button-renderer') ||
                         playerBar.querySelector('.right-controls-buttons') ||
                         playerBar;

  const container = document.createElement('div');
  container.id = 'ytm-playerbar-custom-buttons';
  container.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-left: 12px;
    margin-right: 8px;
    vertical-align: middle;
    z-index: 1000;
  `;

  // Download Song Button
  const btnDownloadSong = document.createElement('button');
  btnDownloadSong.id = 'ytm-btn-custom-download-song';
  btnDownloadSong.title = 'Download Song to Offline Library (MP3 + Artwork)';
  btnDownloadSong.style.cssText = `
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: #ffffff;
    transition: all 0.2s ease;
    padding: 0;
  `;
  btnDownloadSong.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
    </svg>
  `;

  btnDownloadSong.addEventListener('mouseenter', () => {
    btnDownloadSong.style.background = 'rgba(255, 255, 255, 0.12)';
    btnDownloadSong.style.color = '#ef4444';
  });
  btnDownloadSong.addEventListener('mouseleave', () => {
    if (!btnDownloadSong.classList.contains('downloading')) {
      btnDownloadSong.style.background = 'transparent';
      btnDownloadSong.style.color = '#ffffff';
    }
  });

  btnDownloadSong.addEventListener('click', (e) => {
    e.stopPropagation();
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || (navigator.mediaSession?.metadata?.videoId || '');
    
    let title = navigator.mediaSession?.metadata?.title || '';
    if (!title) {
      const tEl = document.querySelector('.ytmusic-player-bar .title');
      title = tEl ? tEl.innerText : '';
    }

    let artist = navigator.mediaSession?.metadata?.artist || '';
    if (!artist) {
      const aEl = document.querySelector('.ytmusic-player-bar .byline');
      artist = aEl ? aEl.innerText : '';
    }

    if (!videoId) {
      alert('Please play a track to download.');
      return;
    }

    btnDownloadSong.classList.add('downloading');
    btnDownloadSong.style.color = '#ef4444';
    btnDownloadSong.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
      </svg>
    `;

    ipcRenderer.sendToHost('trigger-download-track', { videoId, title, artist });
  });

  // Download Playlist Button
  const btnDownloadPlaylist = document.createElement('button');
  btnDownloadPlaylist.id = 'ytm-btn-custom-download-playlist';
  btnDownloadPlaylist.title = 'Download Entire Playlist / Queue to Offline Library';
  btnDownloadPlaylist.style.cssText = `
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: #ffffff;
    transition: all 0.2s ease;
    padding: 0;
  `;
  btnDownloadPlaylist.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
    </svg>
  `;

  btnDownloadPlaylist.addEventListener('mouseenter', () => {
    btnDownloadPlaylist.style.background = 'rgba(255, 255, 255, 0.12)';
    btnDownloadPlaylist.style.color = '#ef4444';
  });
  btnDownloadPlaylist.addEventListener('mouseleave', () => {
    if (!btnDownloadPlaylist.classList.contains('downloading')) {
      btnDownloadPlaylist.style.background = 'transparent';
      btnDownloadPlaylist.style.color = '#ffffff';
    }
  });

  btnDownloadPlaylist.addEventListener('click', (e) => {
    e.stopPropagation();
    const urlParams = new URLSearchParams(window.location.search);
    const playlistId = urlParams.get('list') || '';

    if (!playlistId) {
      alert('Please open or play a playlist to download.');
      return;
    }

    btnDownloadPlaylist.classList.add('downloading');
    btnDownloadPlaylist.style.color = '#ef4444';
    btnDownloadPlaylist.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
        <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
      </svg>
    `;

    ipcRenderer.sendToHost('trigger-download-playlist', { playlistId });
  });

  container.appendChild(btnDownloadSong);
  container.appendChild(btnDownloadPlaylist);

  if (middleControls) {
    middleControls.appendChild(container);
  }
}

// 5. Listen to download progress updates from host
ipcRenderer.on('download-progress-update', (event, data) => {
  const btnSong = document.getElementById('ytm-btn-custom-download-song');
  const btnPlaylist = document.getElementById('ytm-btn-custom-download-playlist');

  if (data.isPlaylist && btnPlaylist) {
    if (data.status === 'completed') {
      btnPlaylist.classList.remove('downloading');
      btnPlaylist.style.color = '#22c55e';
      btnPlaylist.title = 'Playlist Downloaded to Offline Library!';
      btnPlaylist.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>
      `;
      setTimeout(() => {
        btnPlaylist.style.color = '#ffffff';
        btnPlaylist.title = 'Download Entire Playlist / Queue to Offline Library';
        btnPlaylist.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
          </svg>
        `;
      }, 4000);
    } else if (data.status === 'error') {
      btnPlaylist.classList.remove('downloading');
      btnPlaylist.style.color = '#ef4444';
      btnPlaylist.title = 'Download failed: ' + (data.error || 'Unknown error');
    }
  } else if (!data.isPlaylist && btnSong) {
    if (data.status === 'completed') {
      btnSong.classList.remove('downloading');
      btnSong.style.color = '#22c55e';
      btnSong.title = 'Song Downloaded to Offline Library!';
      btnSong.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>
      `;
      setTimeout(() => {
        btnSong.style.color = '#ffffff';
        btnSong.title = 'Download Song to Offline Library (MP3 + Artwork)';
        btnSong.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
          </svg>
        `;
      }, 4000);
    } else if (data.status === 'error') {
      btnSong.classList.remove('downloading');
      btnSong.style.color = '#ef4444';
      btnSong.title = 'Download failed: ' + (data.error || 'Unknown error');
    }
  }
});

// 6. Sync Google profile info
function syncUserProfile() {
  if (!isYTM()) return;
  try {
    let name = '';
    let picture = '';
    let email = '';
    let isLoggedIn = false;

    if (typeof ytcfg !== 'undefined' && ytcfg.get('LOGGED_IN') === true) {
      isLoggedIn = true;
      const loggedInData = ytcfg.get('LOGGED_IN_USER_DATA');
      if (loggedInData) {
        name = loggedInData.name || loggedInData.userName || '';
        picture = loggedInData.photoUrl || '';
        email = loggedInData.email || '';
      }
      if (!name) {
        name = ytcfg.get('ACCOUNT_NAME') || '';
      }
    }

    if (!name || !picture) {
      const avatarBtn = document.querySelector('yt-icon-button#avatar-btn button, #avatar-btn button, ytmusic-settings-button button');
      const avatarImg = document.querySelector('yt-icon-button#avatar-btn yt-img-shadow img, #avatar-btn img, ytmusic-settings-button img');
      if (avatarBtn) {
        const aria = avatarBtn.getAttribute('aria-label') || '';
        const cleanName = aria.replace(/^(Your profile,?\s*|Account,?\s*|Settings,?\s*)/i, '').trim();
        if (cleanName && cleanName.toLowerCase() !== 'settings') {
          name = cleanName;
          isLoggedIn = true;
        }
      }
      if (avatarImg && avatarImg.src && !avatarImg.src.includes('data:') && !avatarImg.src.includes('undefined')) {
        picture = avatarImg.src;
        isLoggedIn = true;
      }
    }

    if (isLoggedIn && (name || picture)) {
      ipcRenderer.sendToHost('user-profile-sync', {
        name: name || 'Google Account',
        picture: picture || '',
        email: email || ''
      });
    }
  } catch (e) {}
}

// 7. Video Ad-Blocker Fast-Forward
let wasAdPlaying = false;
let originalMutedState = false;

function runAdBlocker() {
  if (!isYTM()) return;
  const player = document.querySelector('.html5-video-player');
  const video = document.querySelector('video');
  const isAd = player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));
  
  if (isAd) {
    if (video) {
      if (!wasAdPlaying) {
        originalMutedState = video.muted;
        wasAdPlaying = true;
      }
      if (video.playbackRate !== 16) {
        video.playbackRate = 16;
      }
      if (!video.muted) {
        video.muted = true;
      }
    }
    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot, .ytp-ad-skip-button-text');
    if (skipButton) skipButton.click();
  } else {
    if (wasAdPlaying) {
      if (video) {
        if (video.playbackRate === 16) video.playbackRate = 1;
        video.muted = originalMutedState;
      }
      wasAdPlaying = false;
    }
  }
}

// 8. Auto-dismiss inactivity pauses
function dismissInactivityPrompts() {
  if (!isYTM()) return;
  const confirmBtns = document.querySelectorAll(
    'ytmusic-you-there-renderer button, ' +
    'yt-confirm-dialog-renderer #confirm-button button, ' +
    'tp-yt-paper-dialog #confirm-button, ' +
    'yt-button-renderer#confirm-button button, ' +
    '.ytmusic-you-there-renderer button'
  );
  confirmBtns.forEach(btn => {
    if (btn && btn.offsetParent !== null) btn.click();
  });
}

// 9. Lyrics Scraping
let lyricsPollInterval = null;

function fetchLyricsAndSend() {
  if (lyricsPollInterval) clearInterval(lyricsPollInterval);

  const tabs = document.querySelectorAll('tp-yt-paper-tab');
  let lyricsTab = null;
  for (const tab of tabs) {
    if (tab.textContent && tab.textContent.toUpperCase().includes('LYRICS')) {
      lyricsTab = tab;
      break;
    }
  }

  if (!lyricsTab) {
    ipcRenderer.sendToHost('lyrics-update', { success: false, error: 'Lyrics tab not found. Make sure a song is playing.' });
    return;
  }

  if (lyricsTab.getAttribute('aria-selected') !== 'true') {
    lyricsTab.click();
  }

  let attempts = 0;
  lyricsPollInterval = setInterval(() => {
    attempts++;
    const descriptionShelf = document.querySelector('ytmusic-description-shelf-renderer');
    const descriptionEl = document.querySelector('ytmusic-description-shelf-renderer .description');

    if (descriptionEl && descriptionEl.innerText.trim()) {
      const lyricsText = descriptionEl.innerText.trim();
      clearInterval(lyricsPollInterval);
      lyricsPollInterval = null;
      const footerEl = document.querySelector('ytmusic-description-shelf-renderer .footer');
      const footerText = footerEl ? footerEl.innerText.trim() : '';
      ipcRenderer.sendToHost('lyrics-update', {
        success: true,
        lyrics: lyricsText,
        source: footerText
      });
      return;
    }

    const messageEl = document.querySelector('ytmusic-message-renderer');
    if (messageEl && messageEl.innerText.includes('Lyrics not available')) {
      clearInterval(lyricsPollInterval);
      lyricsPollInterval = null;
      ipcRenderer.sendToHost('lyrics-update', { success: false, error: 'Lyrics not available for this song.' });
      return;
    }

    if (attempts > 24) {
      clearInterval(lyricsPollInterval);
      lyricsPollInterval = null;
      ipcRenderer.sendToHost('lyrics-update', { success: false, error: 'Lyrics failed to load.' });
    }
  }, 250);
}

// Global intervals
setInterval(syncPlaybackState, 250);
setInterval(injectPlaylistDownloadButtons, 500);
setInterval(injectPlayerBarDownloadButtons, 500);
setInterval(syncUserProfile, 2000);
setInterval(runAdBlocker, 100);
setInterval(dismissInactivityPrompts, 1000);

setTimeout(syncUserProfile, 1000);
setTimeout(syncUserProfile, 3000);
