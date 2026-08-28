let RPC = null;
try {
  RPC = require('discord-rpc');
} catch (e) {}

const CLIENT_ID = '123456789012345678'; // Standard generic application ID or local fallback

class DiscordPresence {
  constructor() {
    this.client = null;
    this.connected = false;
    this.enabled = true;
    this.currentTrack = null;
    this.startTimestamp = null;
    this.reconnectTimer = null;
  }

  init(options = {}) {
    if (options.enabled !== undefined) this.enabled = options.enabled;
    if (this.enabled) {
      this.connect();
    }
  }

  connect() {
    if (!RPC || this.connected || !this.enabled) return;

    try {
      this.client = new RPC.Client({ transport: 'ipc' });

      this.client.on('ready', () => {
        console.log('[DiscordPresence] Connected to Discord RPC');
        this.connected = true;
        if (this.currentTrack) {
          this.updateActivity(this.currentTrack);
        }
      });

      this.client.on('disconnected', () => {
        this.connected = false;
        this.scheduleReconnect();
      });

      this.client.login({ clientId: '1343605893321588807' }).catch((err) => {
        // Discord is likely not open; ignore and retry silently later
        this.connected = false;
        this.scheduleReconnect();
      });
    } catch (err) {
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer || !this.enabled) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.enabled && !this.connected) {
        this.connect();
      }
    }, 30000); // Try reconnecting every 30 seconds if Discord opens
  }

  updateActivity(state) {
    this.currentTrack = state;
    if (!this.connected || !this.client || !this.enabled) return;

    try {
      if (!state || !state.title) {
        this.client.clearActivity().catch(() => {});
        return;
      }

      if (state.isPlaying) {
        const remainingSecs = Math.max(0, (state.duration || 0) - (state.progress || 0));
        const endTimestamp = state.duration > 0 ? Date.now() + (remainingSecs * 1000) : undefined;

        this.client.setActivity({
          details: state.title.slice(0, 128),
          state: (state.artist ? `by ${state.artist}` : 'Listening on YouTube Music').slice(0, 128),
          largeImageKey: 'ytmusic_logo',
          largeImageText: 'YouTube Music Desktop',
          smallImageKey: state.isPlaying ? 'play' : 'pause',
          smallImageText: state.isPlaying ? 'Playing' : 'Paused',
          endTimestamp: endTimestamp,
          instance: false
        }).catch(() => {});
      } else {
        this.client.setActivity({
          details: state.title.slice(0, 128),
          state: 'Paused',
          largeImageKey: 'ytmusic_logo',
          largeImageText: 'YouTube Music Desktop',
          smallImageKey: 'pause',
          smallImageText: 'Paused',
          instance: false
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[DiscordPresence] Update error:', e);
    }
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (!this.enabled && this.client) {
      try {
        this.client.clearActivity().catch(() => {});
        this.client.destroy().catch(() => {});
      } catch (e) {}
      this.connected = false;
    } else if (this.enabled && !this.connected) {
      this.connect();
    }
  }
}

module.exports = new DiscordPresence();
