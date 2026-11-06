export class SoundManager {
  private audioCtx: AudioContext | null = null;
  private bgMusic: HTMLAudioElement | null = null;
  private pool: Record<string, HTMLAudioElement> = {};
  public enabled = true;
  public musicStarted = false;
  private hiddenPaused = false;

  initMusic() {
    if (typeof window === 'undefined') return;
    if (!this.bgMusic) {
      const audio = new Audio('/flip.mp3');
      audio.loop = true;
      audio.volume = 0.28;
      this.bgMusic = audio;
    }
  }

  destroy() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!this.bgMusic) return;
    if (enabled && !this.hiddenPaused) {
      this.bgMusic.play().then(() => {
        this.musicStarted = true;
      }).catch(() => {});
    } else {
      this.bgMusic.pause();
    }
  }

  tryStartMusic() {
    if (!this.enabled || this.hiddenPaused || !this.bgMusic) return;
    if (!this.musicStarted || this.bgMusic.paused) {
      this.bgMusic.play().then(() => {
        this.musicStarted = true;
      }).catch(() => {});
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  onVisibilityChange(hidden: boolean) {
    this.hiddenPaused = hidden;
    if (hidden) {
      if (this.bgMusic && !this.bgMusic.paused) {
        this.bgMusic.pause();
      }
      if (this.audioCtx && this.audioCtx.state === 'running') {
        this.audioCtx.suspend().catch(() => {});
      }
    } else if (this.enabled && this.musicStarted) {
      this.bgMusic?.play().catch(() => {});
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    }
  }

  private getPooled(src: string, volume: number): HTMLAudioElement {
    if (!this.pool[src]) {
      this.pool[src] = new Audio(src);
    }
    const el = this.pool[src];
    el.volume = volume;
    el.currentTime = 0;
    return el;
  }

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.audioCtx = new AC();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  play(type: string, combo = 1) {
    if (!this.enabled || this.hiddenPaused) return;

    if (type === 'death') {
      this.getPooled('/bro.mp3', 0.5).play().catch(() => {});
      return;
    }
    if (type === 'fart') {
      this.getPooled('/fart.mp3', 0.55).play().catch(() => {});
      return;
    }
    if (type === 'huh') {
      this.getPooled('/huh.mp3', 0.65).play().catch(() => {});
      return;
    }

    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const tone = (
      freqStart: number,
      freqEnd: number,
      dur: number,
      vol = 0.25,
      wave: OscillatorType = 'square',
      delay = 0
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freqStart, now + delay);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + delay + dur);
      }
      gain.gain.setValueAtTime(vol, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.008, now + delay + dur);
      osc.start(now + delay);
      osc.stop(now + delay + dur);
    };

    switch (type) {
      case 'jump':
        tone(210, 440, 0.13, 0.22, 'square');
        break;
      case 'doubleJump':
        tone(320, 680, 0.14, 0.22, 'triangle');
        break;
      case 'bounce':
        tone(180, 720, 0.22, 0.28, 'sine');
        break;
      case 'land':
        tone(140, 50, 0.08, 0.25, 'triangle');
        break;
      case 'coin': {
        const pitchMult = Math.min(1.6, 1 + (combo - 1) * 0.05);
        tone(820 * pitchMult, 1240 * pitchMult, 0.14, 0.22, 'square');
        break;
      }
      case 'stomp':
        tone(320, 65, 0.14, 0.35, 'sawtooth');
        break;
      case 'break':
        tone(210, 48, 0.18, 0.32, 'sawtooth');
        break;
      case 'powerup':
        tone(440, 660, 0.09, 0.24, 'square', 0);
        tone(660, 880, 0.09, 0.24, 'square', 0.08);
        tone(880, 1320, 0.16, 0.26, 'square', 0.16);
        break;
      case 'checkpoint':
        tone(523, 523, 0.08, 0.25, 'square', 0);
        tone(784, 1046, 0.2, 0.28, 'square', 0.08);
        break;
      case 'flip':
        tone(620, 260, 0.14, 0.22, 'sine');
        break;
      case 'shoot':
        tone(580, 240, 0.09, 0.18, 'triangle');
        break;
      case 'bossWarning':
        tone(220, 190, 0.22, 0.3, 'sawtooth', 0);
        tone(220, 190, 0.22, 0.3, 'sawtooth', 0.28);
        break;
      case 'bossRoar':
        tone(160, 55, 0.45, 0.38, 'sawtooth', 0);
        tone(110, 42, 0.45, 0.32, 'square', 0.05);
        break;
      case 'bossHit':
        tone(420, 110, 0.18, 0.36, 'sawtooth', 0);
        tone(680, 340, 0.12, 0.25, 'square', 0.05);
        break;
      case 'bossExplosion':
        for (let i = 0; i < 5; i++) {
          tone(240 - i * 25, 38, 0.22, 0.32, 'sawtooth', i * 0.14);
        }
        break;
      case 'flagSlide':
        tone(330, 880, 0.42, 0.24, 'triangle', 0);
        break;
      case 'firework':
        tone(680, 180, 0.14, 0.18, 'sawtooth', 0);
        tone(1040, 520, 0.11, 0.14, 'square', 0.03);
        break;
      case 'celebration':
        tone(523, 523, 0.11, 0.28, 'square', 0);
        tone(659, 659, 0.11, 0.28, 'square', 0.11);
        tone(784, 784, 0.11, 0.28, 'square', 0.22);
        tone(1047, 1047, 0.22, 0.3, 'square', 0.33);
        tone(784, 784, 0.11, 0.28, 'square', 0.56);
        tone(1047, 1047, 0.35, 0.32, 'square', 0.68);
        break;
    }
  }
}
