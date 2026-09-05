# 🎵 YouTube Music Desktop

A custom desktop client for YouTube Music built for Windows. It gives you a real 10-band equalizer, a picture-in-picture mini player that floats above your games, offline downloads that you can pause and resume, and full Discord status sync.

Built by **Nethum Fernando**.

---

## Why I Built This

The default web app works fine in a browser tab, but it misses the desktop features you actually want when working or gaming. I wanted quick audio controls, heavy bass whenever I need it, offline playback for plane trips, and a mini player that stays pinned on top without getting in the way.

So I put this together.

---

## What's Inside

### 10-Band Graphic Equalizer
Fine-tune your sound across ten frequency bands from 32Hz to 16kHz. You get a dedicated preamp slider, a heavy bass boost knob, and quick presets for Rock, Hip Hop, Acoustic, and EDM. It runs on the Web Audio API and works on both live streams and your offline tracks.

### Picture-in-Picture Mini Player
A clean, compact window (330x115) that pins to the corner of your screen. You can skip tracks, hit like, check cover art, and jump back to the full app in one click. Perfect while gaming or coding.

### Movable Floating Dock
When you're browsing inside the app, a little dock floats right over the page. Drag it anywhere you like. If it blocks something, click collapse and it tucks away into a tiny pill while still showing live download badges.

### Offline Download Manager
Save individual songs or entire playlists directly as MP3s with auto-tagged metadata and high-res cover art. Downloads are fully resumable, so if your laptop sleeps or your Wi-Fi drops, they pick right back up when you're back online.

### Custom Themes & Audio Visualizers
Switch between neon red, cyan, emerald, purple, and pure OLED black. When music plays, turn on real-time visualizers like glowing bottom waves, frequency bars, or spinning vinyl rings.

### Discord Rich Presence & Sleep Timer
Shows whatever you're listening to directly on your Discord profile with album art and track progress. Plus, if you fall asleep listening to music, the sleep timer fades out your volume smoothly before pausing.

### Browser Cookie Sync
Log in directly inside the app, or sync your existing YouTube session from Chrome, Opera GX, Edge, or Brave in seconds with zero extra extensions needed.

---

## How It's Structured

```
ytmusic-desktop/
├── main.js                  # App lifecycle, shortcuts, Discord RPC, and window management
├── preload.js               # Secure context bridge between renderer and main process
├── mini-preload.js          # Dedicated bridge for the floating mini player
├── webview-preload.js       # Audio filter taps and YouTube Music DOM hooks
├── download-manager.js      # Resumable download queue running yt-dlp & ffmpeg
├── cookie-importer.js       # Windows DPAPI cookie decryptor
├── discord-presence.js      # Discord Rich Presence integration
├── bin/                     # Bundled yt-dlp and ffmpeg binaries
├── public/
│   ├── index.html           # Main user interface
│   ├── index.css            # Dark theme styles and animations
│   ├── renderer.js          # Player controls, visualizers, and dock physics
│   ├── mini-player.html     # Floating mini player layout
│   ├── mini-player.css      # Mini player styles
│   └── mini-player.js       # Mini player logic
└── package.json             # App metadata and build scripts
```

---

## Quick Start

### What you need
- Windows 10 or 11 (64-bit)
- [Node.js](https://nodejs.org/) (v18 or higher if running from source)

### Running locally
```bash
# Clone the repo
git clone https://github.com/NYFernando/ytmusic-desktop.git
cd ytmusic-desktop

# Install packages
npm install

# Launch the app
npm start
```

### Packaging into a Windows Setup (.exe)
```bash
npm run dist
```
The installer will be placed in your `dist/` directory as `YouTube-Music-Desktop-Setup-1.0.0.exe`.

---

## Author

Created by **Nethum Fernando**
- GitHub: [@NYFernando](https://github.com/NYFernando)

---

## License & Notes

Personal project. YouTube and YouTube Music are trademarks of Google LLC.
