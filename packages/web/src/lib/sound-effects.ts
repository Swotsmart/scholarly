'use client';

export type SoundEffect =
  | 'tap'
  | 'correct'
  | 'incorrect'
  | 'celebrate'
  | 'levelUp'
  | 'pop'
  | 'whoosh'
  | 'chime';

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;
  private volume = 0.5;

  /**
   * Lazily initialize AudioContext on first interaction.
   * This satisfies browser autoplay policies that require a user gesture
   * before audio can be produced.
   */
  private ensureContext(): { ctx: AudioContext; master: GainNode } {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    return { ctx: this.ctx, master: this.masterGain! };
  }

  play(effect: SoundEffect): void {
    if (!this.enabled) return;

    const { ctx, master } = this.ensureContext();

    // Resume context if it was suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    switch (effect) {
      case 'tap':
        this.playTap(ctx, master);
        break;
      case 'correct':
        this.playCorrect(ctx, master);
        break;
      case 'incorrect':
        this.playIncorrect(ctx, master);
        break;
      case 'celebrate':
        this.playCelebrate(ctx, master);
        break;
      case 'levelUp':
        this.playLevelUp(ctx, master);
        break;
      case 'pop':
        this.playPop(ctx, master);
        break;
      case 'whoosh':
        this.playWhoosh(ctx, master);
        break;
      case 'chime':
        this.playChime(ctx, master);
        break;
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // ---- Individual effect synthesizers ----

  /** Short 440Hz sine wave, 50ms duration, quick exponential decay */
  private playTap(ctx: AudioContext, master: GainNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 440;

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + 0.05);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  /** Ascending two-note: C5 (523Hz) then E5 (659Hz), 100ms each, sine wave */
  private playCorrect(ctx: AudioContext, master: GainNode): void {
    const now = ctx.currentTime;
    const notes = [523, 659];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.1;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.35, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(start + 0.1);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  /** Descending two-note: E4 (330Hz) then C4 (262Hz), 150ms each, gentler volume */
  private playIncorrect(ctx: AudioContext, master: GainNode): void {
    const now = ctx.currentTime;
    const notes = [330, 262];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.15;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(start + 0.15);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  /** Fast arpeggio C5-E5-G5-C6 (523, 659, 784, 1047Hz), 125ms each, bright */
  private playCelebrate(ctx: AudioContext, master: GainNode): void {
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.125;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.3, start);
      gain.gain.setValueAtTime(0.3, start + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.125);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(start + 0.125);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  }

  /** Ascending chromatic run of 6 notes from C5, 100ms each, triangle wave */
  private playLevelUp(ctx: AudioContext, master: GainNode): void {
    const now = ctx.currentTime;
    // C5, C#5, D5, D#5, E5, F5 — semitone steps from 523Hz
    const semitoneRatio = Math.pow(2, 1 / 12);
    const baseFreq = 523;

    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + i * 0.1;
      const freq = baseFreq * Math.pow(semitoneRatio, i);

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

      osc.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(start + 0.1);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    }
  }

  /** Very short noise burst (30ms) with bandpass filter centered at 800Hz */
  private playPop(ctx: AudioContext, master: GainNode): void {
    const now = ctx.currentTime;
    const duration = 0.03;

    // Generate a short buffer of white noise
    const sampleRate = ctx.sampleRate;
    const bufferLength = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 800;
    bandpass.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(master);

    source.start(now);
    source.stop(now + duration);
    source.onended = () => {
      source.disconnect();
      bandpass.disconnect();
      gain.disconnect();
    };
  }

  /** White noise with sweeping bandpass filter (200 -> 2000Hz) over 200ms */
  private playWhoosh(ctx: AudioContext, master: GainNode): void {
    const now = ctx.currentTime;
    const duration = 0.2;

    // Generate white noise buffer
    const sampleRate = ctx.sampleRate;
    const bufferLength = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(200, now);
    bandpass.frequency.exponentialRampToValueAtTime(2000, now + duration);
    bandpass.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.setValueAtTime(0.3, now + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(master);

    source.start(now);
    source.stop(now + duration);
    source.onended = () => {
      source.disconnect();
      bandpass.disconnect();
      gain.disconnect();
    };
  }

  /** Bell-like: sine at 880Hz + quieter overtone at 2640Hz, 400ms with long decay */
  private playChime(ctx: AudioContext, master: GainNode): void {
    const now = ctx.currentTime;
    const duration = 0.4;

    // Fundamental tone at 880Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 880;
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc1.connect(gain1);
    gain1.connect(master);

    // Quieter overtone at 2640Hz (3rd harmonic) for bell shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 2640;
    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.75);
    osc2.connect(gain2);
    gain2.connect(master);

    osc1.start(now);
    osc1.stop(now + duration);
    osc2.start(now);
    osc2.stop(now + duration * 0.75);

    osc1.onended = () => { osc1.disconnect(); gain1.disconnect(); };
    osc2.onended = () => { osc2.disconnect(); gain2.disconnect(); };
  }
}

export const soundEffects = new SoundEffectsEngine();
