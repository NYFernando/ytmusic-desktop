# 🎵 YouTube Music Desktop

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-ef4444.svg?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows%2011%20%7C%2010-06b6d4.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-Personal-10b981.svg?style=for-the-badge)
![Electron](https://img.shields.io/badge/built%20with-Electron%20%26%20WebAudio-a855f7.svg?style=for-the-badge)

**A next-generation, high-performance desktop client for YouTube Music featuring a 10-band graphic equalizer, floating Picture-in-Picture mini player, resumable offline download manager, dynamic visualizers, bespoke theme studio, and Discord Rich Presence.**

*Developed & Created with passion by **Nethum Fernando***

---

</div>

## ✨ Key Features

### 🎛️ 10-Band Graphic Equalizer & Acoustic Studio
- **Dual-Engine Filtering:** Hooks real-time Web Audio `BiquadFilterNode` pipelines into **both** online YouTube streaming audio and offline local tracks.
- **10 Precision Frequency Bands:** `[32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz]`.
- **Preamp Gain & Bass Boost:** Dedicated Preamp control (-12dB to +12dB) and Low-Shelf Bass Boost knob (+0dB to +12dB).
- **8 Curated Presets:** *Flat*, *Bass Boost Extreme*, *Vocal Clarifier*, *Electronic / EDM*, *Rock*, *Hip Hop*, *Acoustic*, and *Jazz*.

### 🪟 Picture-in-Picture (PiP) Floating Mini Player
- **Always-on-Top Frameless Widget:** Compact acrylic glass mini-player (330x115px) for listening while gaming or working.
- **Live Two-Way Sync:** Instant real-time updates for song title, artist, album art, progress bar, play/pause, like, and skip controls.
- **Quick Expand:** 1-click restore to bring the main app into focus.

### 📥 High-Speed Resumable Offline Download Manager
- **Independent Downloads View:** Dedicated sidebar tab and floating quick dock button with animated download counter badges.
- **Resumable Queue:** Pause and resume single songs or entire playlists mid-download; tasks persist across application and system restarts.
- **Smart Song Deduplication:** Automatic scan and cleanup tools to find duplicate offline songs and save disk space.
- **Automatic High-Res Artwork Fetcher:** Auto-embeds metadata and high-res cover art from YouTube and iTunes Search APIs.

### 🎨 Theme Studio & Visualizer Engine
- **5 Bespoke Color Themes:**
  - 🔴 **Cyberpunk Crimson** (Default signature neon red)
  - 🔵 **Neon Tokyo Cyan** (Electric blue / cyan glow)
  - 🟢 **Matrix Emerald** (Cyber green glow)
  - 🟣 **Synthwave Sunset** (Deep magenta / purple glow)
  - ⚪ **OLED Pure Black** (High-contrast monochrome minimalist)
- **4 Real-Time Audio Visualizers:**
  - *Bottom Glow Wave (Smooth Acoustic)*
  - *Audio Frequency Bars (Studio Glow)*
  - *Circular Vinyl Ring (Vinyl Pulse)*
  - *Cyberpunk Starfield (Particle Explosion)*

### ⏳ Smart Sleep Timer
- Auto-pauses playback after 15, 30, 45, 60, 90 minutes, custom duration, or *End of Track*.
- Features a smooth **10-second volume fade-out** before pausing.
- Displays live countdown on the titlebar and inside the timer modal.

### 💬 Discord Rich Presence
- Broadcasts current playing song, artist, remaining time, and album artwork directly to your Discord profile status.

### 🔒 1-Click Cookie Account Sync
- Automatically detects the Windows **Default Browser** (Chrome, Edge, Opera GX, Brave, Vivaldi) and extracts YouTube login cookies via native Windows DPAPI.
- **Zero Python dependencies** and no browser extensions required.
- Full support for direct in-app Google Login inside Browser Mode.

---

## 🛠️ Architecture & Tech Stack

```
ytmusic-desktop/
├── main.js                  # Electron Main Process (Lifecycle, Shortcuts, Discord RPC, IPC)
├── preload.js               # Main Renderer Context Bridge
├── mini-preload.js          # Isolated PiP Mini Player Bridge
├── webview-preload.js       # Injected Webview Script (Equalizer DSP & DOM Sync)
├── download-manager.js      # Resumable yt-dlp Queue & Persistence Manager
├── cookie-importer.js       # Windows DPAPI + SQLite WebAssembly Cookie Decryptor
├── discord-presence.js      # Discord Rich Presence Client
├── bin/                     # Standalone Bundled Binaries (yt-dlp.exe, ffmpeg.exe)
├── public/
│   ├── index.html           # Main Application UI & Modals
│   ├── index.css            # Cyberpunk Design System & Theme Palettes
│   ├── renderer.js          # Visualizers, Player Bar & State Controller
│   ├── mini-player.html     # Floating PiP Window HTML
│   ├── mini-player.css      # Acrylic Glassmorphism Styles
│   └── mini-player.js       # PiP Mini Player UI Controller
└── package.json             # Build Configuration & Dependencies
```

---

## 🚀 Getting Started

### Prerequisites
- Windows 10 or Windows 11 (64-bit)
- [Node.js](https://nodejs.org/) (v18, v20, or v22 LTS)

### Clone & Run Locally
```bash
# Clone the repository
git clone https://github.com/NYFernando/ytmusic-desktop.git
cd ytmusic-desktop

# Install dependencies
npm install

# Start the application
npm start
```

### Build Windows Installer (.exe)
```bash
npm run dist
```
*The compiled setup executable (`YouTube-Music-Desktop-Setup-1.0.0.exe`) will be generated inside the `dist/` folder.*

---

## 👤 Author

**Nethum Fernando**
- GitHub: [@NYFernando](https://github.com/NYFernando)

---

## 📄 License

This project is created for personal use and entertainment. All YouTube and YouTube Music trademarks and brand logos belong to Google LLC.
