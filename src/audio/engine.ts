import { midiToFreq } from './notes';

export type Bus = 'music' | 'sfx';

export interface ToneOptions {
  /** Pitch as MIDI note (or give `freq`). */
  midi?: number;
  freq?: number;
  type?: OscillatorType;
  /** Absolute AudioContext time. */
  start: number;
  attack?: number;
  /** Time at full level between attack and release. */
  hold?: number;
  release: number;
  gain: number;
  detune?: number;
  /** Slide pitch to this frequency over the note. */
  glideTo?: number;
  lowpass?: number;
  /** 0..1 send to the shared reverb. */
  reverb?: number;
}

export interface NoiseOptions {
  start: number;
  duration: number;
  gain: number;
  highpass?: number;
  lowpass?: number;
  /** Sweep the lowpass to this frequency (whooshes). */
  sweepTo?: number;
  reverb?: number;
}

const MUSIC_LEVEL = 0.32;
const SFX_LEVEL = 0.9;

/**
 * Web Audio graph: music and sfx buses -> (dry + shared reverb) -> compressor
 * -> speakers. The context is created on the first user gesture (browser
 * autoplay rules) and suspended while the tab is hidden.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buses!: Record<Bus, GainNode>;
  private reverbIn!: GainNode;
  private noiseBuffer!: AudioBuffer;
  /** Last node before the speakers. */
  private master?: AudioNode;
  private analyser?: AnalyserNode;
  private enabled: Record<Bus, boolean>;
  /** Called once the context exists (e.g. to start the music). */
  onReady?: () => void;

  constructor(musicOn: boolean, sfxOn: boolean) {
    this.enabled = { music: musicOn, sfx: sfxOn };
    const unlock = (): void => this.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    });
  }

  get ready(): boolean {
    return this.ctx?.state === 'running';
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  isOn(bus: Bus): boolean {
    return this.enabled[bus];
  }

  setOn(bus: Bus, on: boolean): void {
    this.enabled[bus] = on;
    if (!this.ctx) return;
    const level = on ? (bus === 'music' ? MUSIC_LEVEL : SFX_LEVEL) : 0;
    this.buses[bus].gain.setTargetAtTime(level, this.ctx.currentTime, 0.08);
  }

  /** Create / resume the context. Safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {});
      return;
    }
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.ratio.value = 4;
    compressor.connect(ctx.destination);
    this.master = compressor;

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(ctx, 2.6);
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 0.5;
    this.reverbIn.connect(reverb).connect(compressor);

    this.buses = { music: ctx.createGain(), sfx: ctx.createGain() };
    for (const bus of ['music', 'sfx'] as const) {
      this.buses[bus].gain.value = this.enabled[bus]
        ? bus === 'music'
          ? MUSIC_LEVEL
          : SFX_LEVEL
        : 0;
      this.buses[bus].connect(compressor);
    }

    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const ready = (): void => this.onReady?.();
    if (ctx.state === 'running') ready();
    else ctx.resume().then(ready, () => {}); // blocked by the browser: the next gesture retries
  }

  /** Current output loudness (RMS, 0..1) — used by debug checks. The meter is created on first use. */
  level(): number {
    if (!this.ctx || !this.master) return 0;
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.master.connect(this.analyser);
    }
    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
  }

  /** One enveloped oscillator note. No-op until unlocked or when the bus is off. */
  tone(bus: Bus, o: ToneOptions): void {
    const { ctx } = this;
    if (!ctx || !this.enabled[bus]) return;
    const attack = o.attack ?? 0.005;
    const hold = Math.max(o.hold ?? 0, 0);
    const end = o.start + attack + hold + o.release;

    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    const freq = o.freq ?? midiToFreq(o.midi ?? 69);
    osc.frequency.setValueAtTime(freq, o.start);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, end);
    if (o.detune) osc.detune.value = o.detune;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, o.start);
    env.gain.exponentialRampToValueAtTime(o.gain, o.start + attack);
    env.gain.setValueAtTime(o.gain, o.start + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    let node: AudioNode = osc.connect(env);
    if (o.lowpass) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = o.lowpass;
      node = node.connect(filter);
    }
    this.route(node, bus, o.reverb);
    osc.start(o.start);
    osc.stop(end + 0.05);
  }

  /** Filtered white-noise burst (clicks, hats, whooshes, shimmer). */
  noise(bus: Bus, o: NoiseOptions): void {
    const { ctx } = this;
    if (!ctx || !this.enabled[bus]) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const env = ctx.createGain();
    const end = o.start + o.duration;
    env.gain.setValueAtTime(0.0001, o.start);
    env.gain.exponentialRampToValueAtTime(o.gain, o.start + Math.min(0.01, o.duration / 3));
    env.gain.exponentialRampToValueAtTime(0.0001, end);

    let node: AudioNode = src.connect(env);
    if (o.highpass) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = o.highpass;
      node = node.connect(hp);
    }
    if (o.lowpass) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 4;
      lp.frequency.setValueAtTime(o.lowpass, o.start);
      if (o.sweepTo) lp.frequency.exponentialRampToValueAtTime(o.sweepTo, end);
      node = node.connect(lp);
    }
    this.route(node, bus, o.reverb);
    src.start(o.start, Math.random() * 1.5);
    src.stop(end + 0.05);
  }

  /** Bell: a fundamental plus an inharmonic partial, long decay, a bit of reverb. */
  bell(bus: Bus, midi: number, start: number, gain: number, decay = 1.2): void {
    this.tone(bus, { midi, start, release: decay, gain, reverb: 0.5 });
    this.tone(bus, {
      freq: midiToFreq(midi) * 2.76,
      start,
      release: decay * 0.5,
      gain: gain * 0.35,
    });
  }

  private route(node: AudioNode, bus: Bus, reverb = 0): void {
    node.connect(this.buses[bus]);
    if (reverb > 0 && this.ctx) {
      const send = this.ctx.createGain();
      send.gain.value = reverb;
      node.connect(send).connect(this.reverbIn);
    }
  }

  /** Stereo exponential-decay noise as a reverb impulse response. */
  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    return buffer;
  }
}
