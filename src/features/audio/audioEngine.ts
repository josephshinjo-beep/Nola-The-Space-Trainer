/**
 * NOLA's sound: background music for each part of the app and footsteps in
 * the station game, built on the Web Audio API.
 *
 * Mixing (following the audio-design skill):
 *   music tracks → fade (per track) → Music bus → Duck bus ┐
 *   footsteps ───────────────────────────────→ SFX bus ────┴→ Master → speakers
 * The settings sliders set bus gains only, never per-clip volumes. Each
 * slider is squared before use, so the change feels even along its travel,
 * and 0 is true silence. Ducking uses its own bus, so it never overwrites
 * the player's music setting. The files are levelled to about -18 LUFS
 * (true peak -1.5 dB), a good target for laptops, tablets and phones.
 *
 * Browsers only allow sound after the player interacts with the page, so
 * nothing plays until the first click, tap or key press.
 */

export type MusicId = 'lobby' | 'module' | 'simulation';

/** Each kind of music, in play order. A single track loops; several play one after another. */
export const MUSIC: Record<MusicId, string[]> = {
  lobby: ['/audio/lobby.mp3'],
  module: ['/audio/module-theme.mp3'],
  simulation: ['/audio/simulation-1.mp3', '/audio/simulation-2.mp3'],
};
export const FOOTSTEPS = '/audio/footsteps.mp3';

/** Which music belongs to a page: the Academy has its theme, the station game its simulation music, everything else the lobby music. */
export function musicForPath(pathname: string): MusicId {
  if (pathname === '/academy' || pathname.startsWith('/academy/')) return 'module';
  if (pathname === '/mission' || pathname === '/mission2d') return 'simulation';
  return 'lobby';
}

/** A 0-1 slider to a gain: squared, so the change is spread over the whole slider. */
export const sliderToGain = (slider: number) => {
  const value = Math.min(1, Math.max(0, Number.isFinite(slider) ? slider : 0));
  return value * value;
};

const FADE_SECONDS = 1.2;
const DUCK_GAIN = 0.3;

interface Playing {
  id: MusicId;
  index: number;
  element: HTMLAudioElement;
  fade: GainNode;
}

class AudioEngine {
  private context: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private duckBus!: GainNode;
  private sfx!: GainNode;
  private wanted: MusicId | null = null;
  private playing: Playing | null = null;
  private footsteps: HTMLAudioElement | null = null;
  private walking = false;
  private volumes = { music: 0.45, sfx: 0.7, muted: false };

  /** True once the browser has allowed sound (after the first interaction). */
  get unlocked(): boolean {
    return this.context !== null;
  }

  /** Call from a user gesture. Creates the audio graph and starts the music that is wanted. */
  unlock(): void {
    if (this.context || typeof window === 'undefined') return;
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    this.context = context;
    this.master = context.createGain();
    this.music = context.createGain();
    this.duckBus = context.createGain();
    this.sfx = context.createGain();
    this.music.connect(this.duckBus).connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(context.destination);
    this.applyVolumes(true);
    void context.resume();
    // Rest when the tab is hidden; carry on when it comes back.
    document.addEventListener('visibilitychange', () => {
      if (!this.context) return;
      if (document.hidden) void this.context.suspend();
      else void this.context.resume();
    });
    if (this.wanted) this.startMusic(this.wanted, 0);
  }

  setVolumes(music: number, sfx: number, muted: boolean): void {
    this.volumes = { music, sfx, muted };
    this.applyVolumes(false);
    // Music turned off: stop downloading and playing it. Turned back on: start again.
    if (this.context && this.wanted && this.musicAudible() && !this.playing) this.startMusic(this.wanted, 0);
    if (this.playing && !this.musicAudible()) this.stopMusic();
  }

  private musicAudible(): boolean {
    return !this.volumes.muted && sliderToGain(this.volumes.music) > 0;
  }

  private applyVolumes(instant: boolean): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    const set = (node: GainNode, value: number) => (instant ? node.gain.setValueAtTime(value, now) : node.gain.setTargetAtTime(value, now, 0.08));
    set(this.master, this.volumes.muted ? 0 : 1);
    set(this.music, sliderToGain(this.volumes.music));
    set(this.sfx, sliderToGain(this.volumes.sfx));
  }

  /** Asks for the music of the current page. It fades over from whatever is playing. */
  playMusic(id: MusicId): void {
    if (this.wanted === id) return;
    this.wanted = id;
    if (this.context && this.musicAudible()) this.startMusic(id, 0);
  }

  private startMusic(id: MusicId, index: number): void {
    const context = this.context;
    if (!context) return;
    const tracks = MUSIC[id];
    const src = tracks[index % tracks.length]!;
    const element = new Audio(src);
    element.preload = 'auto';
    element.loop = tracks.length === 1;
    const fade = context.createGain();
    fade.gain.setValueAtTime(0, context.currentTime);
    fade.gain.linearRampToValueAtTime(1, context.currentTime + FADE_SECONDS);
    context.createMediaElementSource(element).connect(fade).connect(this.music);
    // A playlist moves on to the next track when one ends.
    element.addEventListener('ended', () => {
      if (this.playing?.element === element && this.wanted === id) this.startMusic(id, index + 1);
    });
    this.fadeOut(this.playing);
    this.playing = { id, index, element, fade };
    void element.play().catch(() => {
      // Autoplay refused or the file failed: stay silent rather than break the page.
    });
  }

  private fadeOut(playing: Playing | null): void {
    if (!playing || !this.context) return;
    const now = this.context.currentTime;
    playing.fade.gain.cancelScheduledValues(now);
    playing.fade.gain.setValueAtTime(playing.fade.gain.value, now);
    playing.fade.gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
    window.setTimeout(() => {
      playing.element.pause();
      playing.element.removeAttribute('src');
      playing.element.load();
      playing.fade.disconnect();
    }, FADE_SECONDS * 1000 + 100);
  }

  private stopMusic(): void {
    this.fadeOut(this.playing);
    this.playing = null;
  }

  /** Lowers the music while NOLA reads aloud, through the duck bus (the music slider is untouched). */
  duck(active: boolean): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.duckBus.gain.setTargetAtTime(active ? DUCK_GAIN : 1, now, active ? 0.08 : 0.3);
  }

  /**
   * Footsteps while the astronaut walks. Each pass of the loop gets a slightly
   * different speed, so the steps do not sound like a machine.
   */
  setWalking(walking: boolean): void {
    if (walking === this.walking) return;
    this.walking = walking;
    const context = this.context;
    if (!context) return;
    if (!this.footsteps) {
      const element = new Audio(FOOTSTEPS);
      element.preload = 'auto';
      context.createMediaElementSource(element).connect(this.sfx);
      element.addEventListener('ended', () => {
        if (!this.walking) return;
        element.playbackRate = 0.95 + Math.random() * 0.1;
        element.currentTime = 0;
        void element.play().catch(() => undefined);
      });
      this.footsteps = element;
    }
    const element = this.footsteps;
    if (walking) {
      element.playbackRate = 0.95 + Math.random() * 0.1;
      void element.play().catch(() => undefined);
    } else {
      element.pause();
    }
  }
}

/** The one sound system for the whole app. */
export const audio = new AudioEngine();
// Lets browser tests check what is playing, in development builds only.
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __audio?: AudioEngine }).__audio = audio;
