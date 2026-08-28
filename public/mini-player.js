const miniArt = document.getElementById('mini-art');
const miniTitle = document.getElementById('mini-title');
const miniArtist = document.getElementById('mini-artist');
const miniBtnPlay = document.getElementById('mini-btn-play');
const miniBtnPrev = document.getElementById('mini-btn-prev');
const miniBtnNext = document.getElementById('mini-btn-next');
const miniBtnLike = document.getElementById('mini-btn-like');
const miniBtnRestore = document.getElementById('mini-btn-restore');
const miniBtnClose = document.getElementById('mini-btn-close');
const miniProgressFill = document.getElementById('mini-progress-fill');

function updateMiniUI(state) {
  if (!state) return;

  miniTitle.innerText = state.title || 'No Track Playing';
  miniArtist.innerText = state.artist || 'YouTube Music';

  const artUrl = state.art || 'https://music.youtube.com/img/on_platform_logo_dark.svg';
  if (miniArt.src !== artUrl) {
    miniArt.src = artUrl;
  }

  if (state.isPlaying) {
    miniBtnPlay.innerHTML = '<span class="material-icons-round">pause</span>';
  } else {
    miniBtnPlay.innerHTML = '<span class="material-icons-round">play_arrow</span>';
  }

  if (state.isLiked) {
    miniBtnLike.classList.add('active');
  } else {
    miniBtnLike.classList.remove('active');
  }

  if (state.duration > 0) {
    const pct = Math.min(100, Math.max(0, (state.progress / state.duration) * 100));
    miniProgressFill.style.width = `${pct}%`;
  } else {
    miniProgressFill.style.width = '0%';
  }
}

if (window.miniAPI) {
  miniBtnPlay.addEventListener('click', () => {
    window.miniAPI.sendPlayerCommand('play-pause');
  });

  miniBtnPrev.addEventListener('click', () => {
    window.miniAPI.sendPlayerCommand('previous');
  });

  miniBtnNext.addEventListener('click', () => {
    window.miniAPI.sendPlayerCommand('next');
  });

  miniBtnLike.addEventListener('click', () => {
    window.miniAPI.sendPlayerCommand('like');
  });

  miniBtnRestore.addEventListener('click', () => {
    window.miniAPI.restoreMainWindow();
  });

  miniBtnClose.addEventListener('click', () => {
    window.miniAPI.closeMiniPlayer();
  });

  // Fetch initial state immediately
  if (window.miniAPI.getCurrentState) {
    window.miniAPI.getCurrentState().then(updateMiniUI).catch(() => {});
  }

  // Subscribe to live state updates
  window.miniAPI.onPlaybackState(updateMiniUI);
}

