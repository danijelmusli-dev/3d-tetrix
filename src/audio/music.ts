import type { AudioEngine } from './engine';
import { pentatonic } from './notes';

export const BEATS_PER_BAR = 4;
const BPM = 84;
const SECONDS_PER_BEAT = 60 / BPM;
/** How far ahead (s) notes are scheduled; the timer only needs to beat this. */
const LOOKAHEAD = 0.25;

export type Voice = 'pad' | 'bass' | 'pluck' | 'hat' | 'bell';

export interface MusicEvent {
  /** Beat offset inside the bar, 0..BEATS_PER_BAR. */
  beat: number;
  midi: number;
  voice: Voice;
  /** Length in beats. */
  dur: number;
  /** 0..1 loudness. */
  vel: number;
}

/** Cmaj7 – G6 – Am7 – Fmaj7, two bars each. Root first. */
const PROGRESSION: readonly (readonly number[])[] = [
  [48, 55, 59, 64],
  [43, 55, 59, 64],
  [45, 52, 55, 60],
  [41, 53, 57, 64],
];

export function chordFor(bar: number): readonly number[] {
  return PROGRESSION[Math.floor(bar / 2) % PROGRESSION.length]!;
}

/**
 * Notes for one bar. Layers join as `intensity` (the sky level, 0..5) rises:
 * 0 pad, 1 bass, 2 plucked arpeggio, 3 hats, 4+ bells.
 */
export function barEvents(bar: number, intensity: number, rng: () => number): MusicEvent[] {
  const chord = chordFor(bar);
  const [root] = chord as [number];
  const events: MusicEvent[] = chord
    .slice(1)
    .map((midi) => ({ beat: 0, midi, voice: 'pad' as const, dur: 4.4, vel: 0.5 }));

  if (intensity >= 1) {
    events.push({ beat: 0, midi: root - 12, voice: 'bass', dur: 1.6, vel: 0.8 });
    events.push({ beat: 2, midi: root - 12, voice: 'bass', dur: 1.4, vel: 0.6 });
  }
  if (intensity >= 2) {
    for (let i = 0; i < BEATS_PER_BAR * 2; i++) {
      if (rng() < 0.3) continue;
      const midi = chord[1 + Math.floor(rng() * 3)]! + 12;
      events.push({ beat: i / 2, midi, voice: 'pluck', dur: 0.5, vel: 0.35 + rng() * 0.3 });
    }
  }
  if (intensity >= 3) {
    for (let i = 0; i < BEATS_PER_BAR; i++)
      events.push({ beat: i + 0.5, midi: 0, voice: 'hat', dur: 0.1, vel: 0.5 + rng() * 0.3 });
  }
  if (intensity >= 4) {
    const count = intensity >= 5 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const beat = Math.floor(rng() * BEATS_PER_BAR * 2) / 2;
      events.push({
        beat,
        midi: pentatonic(72, Math.floor(rng() * 7)),
        voice: 'bell',
        dur: 2,
        vel: 0.4,
      });
    }
  }
  return events;
}

/** Plays `barEvents` on the engine with a lookahead scheduler. */
export class Music {
  private timer?: ReturnType<typeof setInterval>;
  private bar = 0;
  private nextBarTime = 0;
  intensity = 0;

  constructor(private readonly engine: AudioEngine) {}

  get playing(): boolean {
    return this.timer !== undefined;
  }

  start(): void {
    if (this.timer || !this.engine.ready) return;
    this.nextBarTime = this.engine.now + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
    this.schedule();
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private schedule(): void {
    while (this.nextBarTime < this.engine.now + LOOKAHEAD) {
      for (const e of barEvents(this.bar, this.intensity, Math.random))
        this.play(e, this.nextBarTime + e.beat * SECONDS_PER_BEAT);
      this.bar++;
      this.nextBarTime += BEATS_PER_BAR * SECONDS_PER_BEAT;
    }
  }

  private play(e: MusicEvent, start: number): void {
    const { engine } = this;
    const dur = e.dur * SECONDS_PER_BEAT;
    switch (e.voice) {
      case 'pad':
        for (const detune of [-7, 7])
          engine.tone('music', {
            midi: e.midi,
            type: 'triangle',
            start,
            attack: 1.2,
            hold: dur - 1.2,
            release: 1.6,
            gain: 0.045 * e.vel,
            detune,
            lowpass: 1400,
            reverb: 0.6,
          });
        break;
      case 'bass':
        engine.tone('music', {
          midi: e.midi,
          type: 'sine',
          start,
          attack: 0.02,
          hold: dur * 0.5,
          release: dur * 0.5,
          gain: 0.18 * e.vel,
        });
        break;
      case 'pluck':
        engine.tone('music', {
          midi: e.midi,
          type: 'triangle',
          start,
          attack: 0.005,
          release: 0.45,
          gain: 0.07 * e.vel,
          lowpass: 2600,
          reverb: 0.45,
        });
        break;
      case 'hat':
        engine.noise('music', { start, duration: 0.05, gain: 0.025 * e.vel, highpass: 7000 });
        break;
      case 'bell':
        engine.bell('music', e.midi, start, 0.05 * e.vel, 2.2);
        break;
    }
  }
}
