const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class DownloadManager {
  constructor() {
    this.tasks = [];
    this.activeProcesses = new Map(); // taskId -> child_process
    this.storagePath = null;
    this.archivesDir = null;
    this.mainWindow = null;
    this.session = null;
    this.app = null;
    this.config = {
      downloadDir: 'D:\\Music\\YTM-Downloads',
      playlistsDir: 'D:\\Music\\YTM-Downloads\\Playlists',
      songsDir: 'D:\\Music\\YTM-Downloads\\Playlists\\Downloaded Songs',
      chromeUA: '',
      getYtDlpPath: null,
      getFfmpegDir: null,
      ensureSongCover: null
    };
  }

  init({ app, mainWindow, session, config }) {
    this.app = app;
    this.mainWindow = mainWindow;
    this.session = session;
    this.config = Object.assign(this.config, config);

    try {
      if (!fs.existsSync(this.config.downloadDir)) fs.mkdirSync(this.config.downloadDir, { recursive: true });
      if (!fs.existsSync(this.config.playlistsDir)) fs.mkdirSync(this.config.playlistsDir, { recursive: true });
      if (!fs.existsSync(this.config.songsDir)) fs.mkdirSync(this.config.songsDir, { recursive: true });

      this.archivesDir = path.join(this.config.downloadDir, '.archives');
      if (!fs.existsSync(this.archivesDir)) fs.mkdirSync(this.archivesDir, { recursive: true });

      this.storagePath = path.join(this.config.downloadDir, '.download_tasks.json');
      this.loadTasks();
    } catch (e) {
      console.error('[DownloadManager] Init error:', e);
    }
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  loadTasks() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const loaded = JSON.parse(raw);
        if (Array.isArray(loaded)) {
          this.tasks = loaded.map(t => {
            // If task was downloading when the app or laptop stopped, mark as paused
            if (t.status === 'downloading' || t.status === 'starting') {
              return {
                ...t,
                status: 'paused',
                statusMessage: 'Paused (Ready to resume)'
              };
            }
            return t;
          });
          this.saveTasks();
        }
      }
    } catch (e) {
      console.error('[DownloadManager] Failed to load tasks from storage:', e);
      this.tasks = [];
    }
  }

  saveTasks() {
    try {
      if (this.storagePath) {
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.storagePath, JSON.stringify(this.tasks, null, 2), 'utf8');
      }
    } catch (e) {
      console.error('[DownloadManager] Failed to save tasks:', e);
    }
  }

  broadcast(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  broadcastUpdate() {
    this.saveTasks();
    this.broadcast('download-tasks-updated', this.tasks);
  }

  getTasks() {
    return this.tasks;
  }

  async exportCookies() {
    try {
      const cookiesPath = path.join(this.app.getPath('userData'), 'yt-cookies.txt');
      if (!this.session) return cookiesPath;

      const allSessionCookies = await this.session.defaultSession.cookies.get({});
      const cookies = allSessionCookies.filter(c => 
        c.domain.includes('youtube.com') || 
        c.domain.includes('google.com')
      );

      let cookieContent = "# Netscape HTTP Cookie File\n";
      if (cookies && cookies.length > 0) {
        for (const c of cookies) {
          const domain = c.domain || '.youtube.com';
          const includeSubDomain = domain.startsWith('.') ? 'TRUE' : 'FALSE';
          const cPath = c.path || '/';
          const secure = c.secure ? 'TRUE' : 'FALSE';
          const expiration = c.expirationDate ? Math.floor(c.expirationDate) : 0;
          cookieContent += `${domain}\t${includeSubDomain}\t${cPath}\t${secure}\t${expiration}\t${c.name}\t${c.value}\n`;
        }
      }
      fs.writeFileSync(cookiesPath, cookieContent, 'utf8');
      return cookiesPath;
    } catch (e) {
      console.error('[DownloadManager] Error exporting cookies:', e);
      return path.join(this.app.getPath('userData'), 'yt-cookies.txt');
    }
  }

  // --- Start or Resume a Playlist Download Task ---
  async startPlaylistDownload({ playlistId, playlistTitle = '' }) {
    if (!playlistId) return { success: false, error: 'Missing playlistId' };

    const cleanPlaylistId = playlistId.replace(/^.*list=/, '').trim();
    const taskId = `playlist_${cleanPlaylistId}`;
    const archivePath = path.join(this.archivesDir, `${cleanPlaylistId}.txt`);
    const url = playlistId.startsWith('http') ? playlistId : `https://music.youtube.com/playlist?list=${cleanPlaylistId}`;

    let task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      task = {
        id: taskId,
        type: 'playlist',
        playlistId: cleanPlaylistId,
        url,
        title: playlistTitle || `Playlist (${cleanPlaylistId.substring(0, 8)}...)`,
        status: 'starting',
        statusMessage: 'Preparing download...',
        currentItem: 0,
        totalItems: 0,
        percent: 0,
        speed: '',
        eta: '',
        currentSongTitle: '',
        archivePath,
        error: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.tasks.unshift(task);
    } else {
      task.status = 'starting';
      task.statusMessage = 'Resuming download...';
      task.error = null;
      task.updatedAt = Date.now();
    }

    this.broadcastUpdate();
    this.runPlaylistProcess(task);
    return { success: true, taskId };
  }

  async runPlaylistProcess(task) {
    if (this.activeProcesses.has(task.id)) {
      return; // Already running
    }

    const cookiesPath = await this.exportCookies();
    const ytdlpPath = this.config.getYtDlpPath ? this.config.getYtDlpPath() : 'yt-dlp';
    const ffmpegDir = this.config.getFfmpegDir ? this.config.getFfmpegDir() : null;
    const outputPath = path.join(this.config.playlistsDir, '%(playlist_title,playlist)s', '%(title)s - %(artist,uploader,creator)s.%(ext)s');

    const ytdlpArgs = [
      '--remote-components', 'ejs:github',
      '--user-agent', this.config.chromeUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
      '--extractor-args', 'youtube:player_client=web,mweb,android',
      '--write-thumbnail',
      '--convert-thumbnails', 'jpg',
      '-i',
      '--no-overwrites',
      '--continue',
      '--download-archive', task.archivePath,
      '-f', 'ba/ba*',
      '-x',
      '--audio-format', 'mp3',
      '--cookies', cookiesPath,
      '--yes-playlist',
      '-o', outputPath
    ];

    if (ffmpegDir) {
      ytdlpArgs.push('--ffmpeg-location', ffmpegDir);
    }
    ytdlpArgs.push(task.url);

    task.status = 'downloading';
    task.statusMessage = 'Downloading tracks...';
    this.broadcastUpdate();

    const proc = spawn(ytdlpPath, ytdlpArgs);
    this.activeProcesses.set(task.id, proc);

    let stderrOutput = '';
    let lastBroadcastTime = 0;

    proc.stdout.on('data', (data) => {
      const output = data.toString();

      // Detect playlist title from yt-dlp output
      const plMatch = output.match(/\[download\]\s+Downloading\s+playlist:\s*(.+)/i);
      if (plMatch && plMatch[1]) {
        task.title = plMatch[1].trim();
      }

      // Detect current item out of total
      const itemMatch = output.match(/\[download\]\s+Downloading\s+item\s+(\d+)\s+of\s+(\d+)/i);
      if (itemMatch) {
        task.currentItem = parseInt(itemMatch[1], 10);
        task.totalItems = parseInt(itemMatch[2], 10);
      }

      // Detect current track name being downloaded
      const destMatch = output.match(/\[(?:download|ExtractAudio)\]\s+Destination:\s*.+[\\\/](.+?)\.(?:mp3|jpg|webp|webm|m4a)/i);
      if (destMatch && destMatch[1]) {
        task.currentSongTitle = destMatch[1].trim();
      }

      // Detect percentage, speed, and ETA
      const percentMatch = output.match(/\[download\]\s+(\d+\.\d+)%(?:\s+of\s+~?[\d\.]+[KMG]iB)?(?:\s+at\s+([\d\.]+[KMG]iB\/s))?(?:\s+ETA\s+([\d:]+))?/i);
      if (percentMatch) {
        task.percent = parseFloat(percentMatch[1]);
        if (percentMatch[2]) task.speed = percentMatch[2];
        if (percentMatch[3]) task.eta = percentMatch[3];
      }

      // Also forward to legacy download-progress for webview/bar compatibility
      this.broadcast('download-progress', {
        playlistId: task.playlistId,
        status: 'downloading',
        isPlaylist: true,
        currentItem: task.currentItem,
        totalItems: task.totalItems,
        percent: task.percent,
        speed: task.speed,
        eta: task.eta,
        currentSongTitle: task.currentSongTitle
      });

      // Throttle broadcast to renderer every 300ms to keep UI responsive
      const now = Date.now();
      if (now - lastBroadcastTime > 300) {
        lastBroadcastTime = now;
        task.updatedAt = now;
        this.broadcastUpdate();
      }
    });

    proc.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });

    proc.on('close', async (code) => {
      this.activeProcesses.delete(task.id);

      if (task.status === 'paused') {
        // Was paused intentionally by user
        task.statusMessage = 'Paused';
        this.broadcastUpdate();
        return;
      }

      if (code === 0) {
        task.status = 'completed';
        task.percent = 100;
        task.statusMessage = 'Download Completed';
        task.speed = '';
        task.eta = '';
        task.updatedAt = Date.now();

        // Auto ensure artwork for playlist folder
        try {
          if (fs.existsSync(this.config.playlistsDir)) {
            const subdirs = fs.readdirSync(this.config.playlistsDir, { withFileTypes: true }).filter(d => d.isDirectory());
            for (const sd of subdirs) {
              const pDir = path.join(this.config.playlistsDir, sd.name);
              const mp3s = fs.readdirSync(pDir).filter(f => f.endsWith('.mp3'));
              for (const mp3 of mp3s) {
                const baseName = path.basename(mp3, '.mp3');
                const parts = baseName.split(' - ');
                if (this.config.ensureSongCover) {
                  await this.config.ensureSongCover(pDir, baseName, parts[0] || baseName, parts[1] || '', '');
                }
              }
            }
          }
        } catch (e) {}

        this.broadcast('download-progress', { playlistId: task.playlistId, status: 'completed', isPlaylist: true });
      } else {
        console.error(`[DownloadManager] yt-dlp exited with code ${code}:`, stderrOutput);
        const cleanError = stderrOutput.split('\n').filter(l => l.includes('ERROR:')).join(' ') || `Exit code ${code}`;
        task.status = 'error';
        task.error = cleanError;
        task.statusMessage = `Failed: ${cleanError}`;
        task.speed = '';
        task.eta = '';
        task.updatedAt = Date.now();

        this.broadcast('download-progress', { playlistId: task.playlistId, status: 'error', isPlaylist: true, error: cleanError });
      }

      this.broadcastUpdate();
    });
  }

  // --- Start or Track a Single Song Download ---
  async startTrackDownload({ videoId, title = '', artist = '' }) {
    if (!videoId) return { success: false, error: 'Missing videoId' };

    const taskId = `track_${videoId}`;
    const safeTitle = (title || 'Track').replace(/[<>:"/\\|?*]+/g, '').trim();
    const safeArtist = (artist || 'Artist').replace(/[<>:"/\\|?*]+/g, '').trim();
    const baseFilename = `${safeTitle} - ${safeArtist}`;
    const filename = `${baseFilename}.mp3`;
    const outputPath = path.join(this.config.songsDir, filename);
    const outputTemplate = path.join(this.config.songsDir, `${baseFilename}.%(ext)s`);

    if (fs.existsSync(outputPath)) {
      if (this.config.ensureSongCover) {
        await this.config.ensureSongCover(this.config.songsDir, baseFilename, safeTitle, safeArtist, videoId);
      }
      this.broadcast('download-progress', { videoId, status: 'completed', filename });
      return { success: true, taskId, alreadyCompleted: true };
    }

    let task = this.tasks.find(t => t.id === taskId);
    if (!task) {
      task = {
        id: taskId,
        type: 'song',
        videoId,
        title: safeTitle,
        artist: safeArtist,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        status: 'starting',
        statusMessage: 'Starting download...',
        percent: 0,
        speed: '',
        eta: '',
        error: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.tasks.unshift(task);
    } else {
      task.status = 'starting';
      task.statusMessage = 'Starting download...';
      task.error = null;
      task.updatedAt = Date.now();
    }

    this.broadcastUpdate();
    this.runTrackProcess(task, outputTemplate, baseFilename, safeTitle, safeArtist, videoId, filename);
    return { success: true, taskId };
  }

  async runTrackProcess(task, outputTemplate, baseFilename, safeTitle, safeArtist, videoId, filename) {
    if (this.activeProcesses.has(task.id)) return;

    const cookiesPath = await this.exportCookies();
    const ytdlpPath = this.config.getYtDlpPath ? this.config.getYtDlpPath() : 'yt-dlp';
    const ffmpegDir = this.config.getFfmpegDir ? this.config.getFfmpegDir() : null;

    const ytdlpArgs = [
      '--remote-components', 'ejs:github',
      '--user-agent', this.config.chromeUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0 Safari/537.36',
      '--write-thumbnail',
      '--convert-thumbnails', 'jpg',
      '-f', 'ba/ba*',
      '-x',
      '--audio-format', 'mp3',
      '--cookies', cookiesPath,
      '-o', outputTemplate
    ];

    if (ffmpegDir) {
      ytdlpArgs.push('--ffmpeg-location', ffmpegDir);
    }
    ytdlpArgs.push(task.url);

    task.status = 'downloading';
    task.statusMessage = 'Downloading song...';
    this.broadcastUpdate();

    const proc = spawn(ytdlpPath, ytdlpArgs);
    this.activeProcesses.set(task.id, proc);

    let stderrOutput = '';
    let lastBroadcastTime = 0;

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      const percentMatch = output.match(/\[download\]\s+(\d+\.\d+)%(?:\s+of\s+~?[\d\.]+[KMG]iB)?(?:\s+at\s+([\d\.]+[KMG]iB\/s))?(?:\s+ETA\s+([\d:]+))?/i);
      if (percentMatch) {
        task.percent = parseFloat(percentMatch[1]);
        if (percentMatch[2]) task.speed = percentMatch[2];
        if (percentMatch[3]) task.eta = percentMatch[3];
      }

      this.broadcast('download-progress', { videoId, status: 'downloading', percent: task.percent, speed: task.speed, eta: task.eta });

      const now = Date.now();
      if (now - lastBroadcastTime > 300) {
        lastBroadcastTime = now;
        task.updatedAt = now;
        this.broadcastUpdate();
      }
    });

    proc.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });

    proc.on('close', async (code) => {
      this.activeProcesses.delete(task.id);

      if (task.status === 'paused') {
        task.statusMessage = 'Paused';
        this.broadcastUpdate();
        return;
      }

      if (code === 0) {
        task.status = 'completed';
        task.percent = 100;
        task.statusMessage = 'Downloaded';
        task.speed = '';
        task.eta = '';
        task.updatedAt = Date.now();

        if (this.config.ensureSongCover) {
          await this.config.ensureSongCover(this.config.songsDir, baseFilename, safeTitle, safeArtist, videoId);
        }

        this.broadcast('download-progress', { videoId, status: 'completed', filename });
      } else {
        const cleanError = stderrOutput.split('\n').filter(l => l.includes('ERROR:')).join(' ') || `Exit code ${code}`;
        task.status = 'error';
        task.error = cleanError;
        task.statusMessage = `Failed: ${cleanError}`;
        task.speed = '';
        task.eta = '';
        task.updatedAt = Date.now();

        this.broadcast('download-progress', { videoId, status: 'error', error: cleanError });
      }

      this.broadcastUpdate();
    });
  }

  // --- Pause an Active Download ---
  pauseTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    task.status = 'paused';
    task.statusMessage = 'Paused';
    task.speed = '';
    task.eta = '';
    task.updatedAt = Date.now();

    const proc = this.activeProcesses.get(taskId);
    if (proc && proc.pid) {
      this.killProcessTree(proc.pid);
      this.activeProcesses.delete(taskId);
    }

    this.broadcastUpdate();
    return { success: true, taskId };
  }

  // --- Resume a Paused Download ---
  resumeTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Task not found' };

    if (task.type === 'playlist') {
      task.status = 'starting';
      task.statusMessage = 'Resuming playlist...';
      task.error = null;
      task.updatedAt = Date.now();
      this.broadcastUpdate();
      this.runPlaylistProcess(task);
      return { success: true, taskId };
    } else if (task.type === 'song') {
      const safeTitle = (task.title || 'Track').replace(/[<>:"/\\|?*]+/g, '').trim();
      const safeArtist = (task.artist || 'Artist').replace(/[<>:"/\\|?*]+/g, '').trim();
      const baseFilename = `${safeTitle} - ${safeArtist}`;
      const filename = `${baseFilename}.mp3`;
      const outputTemplate = path.join(this.config.songsDir, `${baseFilename}.%(ext)s`);

      task.status = 'starting';
      task.statusMessage = 'Resuming song...';
      task.error = null;
      task.updatedAt = Date.now();
      this.broadcastUpdate();
      this.runTrackProcess(task, outputTemplate, baseFilename, safeTitle, safeArtist, task.videoId, filename);
      return { success: true, taskId };
    }

    return { success: false, error: 'Unknown task type' };
  }

  // --- Cancel / Delete a Task from Queue ---
  cancelTask(taskId) {
    const proc = this.activeProcesses.get(taskId);
    if (proc && proc.pid) {
      this.killProcessTree(proc.pid);
      this.activeProcesses.delete(taskId);
    }

    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.broadcastUpdate();
    return { success: true, taskId };
  }

  // --- Bulk Controls ---
  pauseAll() {
    this.tasks.forEach(t => {
      if (t.status === 'downloading' || t.status === 'starting') {
        this.pauseTask(t.id);
      }
    });
    return { success: true };
  }

  resumeAll() {
    this.tasks.forEach(t => {
      if (t.status === 'paused' || t.status === 'error') {
        this.resumeTask(t.id);
      }
    });
    return { success: true };
  }

  clearCompleted() {
    this.tasks = this.tasks.filter(t => t.status !== 'completed');
    this.broadcastUpdate();
    return { success: true };
  }

  // Cross-platform process tree termination
  killProcessTree(pid) {
    if (process.platform === 'win32') {
      try {
        exec(`taskkill /F /T /PID ${pid}`);
      } catch (e) {}
    } else {
      try {
        process.kill(-pid, 'SIGKILL');
      } catch (e) {
        try { process.kill(pid, 'SIGKILL'); } catch (e2) {}
      }
    }
  }
}

const downloadManager = new DownloadManager();
module.exports = downloadManager;
