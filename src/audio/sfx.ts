import type { AudioEngine } from './engine';
import { clearNotes, midiToFreq, pentatonic, sparkleNotes } from './notes';

/** Small random pitch wobble (cents) so repeated sounds don't feel robotic. */
const wobble = (cents = 25): number => (Math.random() * 2 - 1) * cents;

/** Game sound effects, synthesized on the fly. All no-ops until audio is unlocked. */
export class Sfx {
  constructor(private readonly engine: AudioEngine) {}

  private get t(): number {
    return this.engine.now + 0.005;
  }

  /** Picked a piece from the tray: soft rising blip. */
  pick(): void {
    const t = this.t;
    this.engine.tone('sfx', {
      midi: 79,
      type: 'triangle',
      start: t,
      release: 0.12,
      gain: 0.12,
      glideTo: midiToFreq(84),
      detune: wobble(),
    });
  }

  /** Rotated the held piece: crisp tick. */
  rotate(): void {
    const t = this.t;
    this.engine.tone('sfx', {
      midi: 88,
      type: 'square',
      start: t,
      release: 0.045,
      gain: 0.05,
      lowpass: 3200,
      detune: wobble(40),
    });
    this.engine.noise('sfx', { start: t, duration: 0.03, gain: 0.05, highpass: 4000 });
  }

  /** Stepped / raised the carried piece: tiny lower tick. */
  step(): void {
    this.engine.tone('sfx', {
      midi: 76,
      type: 'triangle',
      start: this.t,
      release: 0.05,
      gain: 0.07,
      detune: wobble(30),
    });
  }

  /** Something was refused (blocked rotation, invalid drop): soft dull bump. */
  blocked(): void {
    const t = this.t;
    this.engine.tone('sfx', {
      freq: 140,
      type: 'sawtooth',
      start: t,
      release: 0.14,
      gain: 0.08,
      lowpass: 600,
      glideTo: 90,
    });
  }

  /** Slide mode / view toggles: two-note blip, up for on, down for off. */
  toggle(on: boolean): void {
    const t = this.t;
    const [a, b] = on ? [72, 79] : [79, 72];
    this.engine.tone('sfx', { midi: a, type: 'sine', start: t, release: 0.08, gain: 0.1 });
    this.engine.tone('sfx', { midi: b, type: 'sine', start: t + 0.06, release: 0.12, gain: 0.1 });
  }

  /** Put the piece back. */
  cancel(): void {
    this.engine.tone('sfx', {
      midi: 74,
      type: 'triangle',
      start: this.t,
      release: 0.12,
      gain: 0.08,
      glideTo: midiToFreq(67),
    });
  }

  /** Piece landed: woody thump with a click. `delay` lines it up with the drop animation. */
  land(cubes: number, delay = 0): void {
    const t = this.t + delay;
    const weight = Math.min(cubes, 4) / 4;
    this.engine.tone('sfx', {
      freq: 170 - weight * 40,
      type: 'sine',
      start: t,
      release: 0.22,
      gain: 0.35,
      glideTo: 55,
    });
    this.engine.tone('sfx', {
      midi: 67 + Math.round(wobble(1) * 2),
      type: 'triangle',
      start: t,
      release: 0.08,
      gain: 0.08,
    });
    this.engine.noise('sfx', { start: t, duration: 0.05, gain: 0.12, lowpass: 2400 });
  }

  /**
   * Line clear: bright rising bell arpeggio whose pitch climbs with the combo
   * level, a shimmer, then a sparkle per cleared cube.
   */
  clear(comboLevel: number, cubes: number): void {
    const t = this.t;
    clearNotes(comboLevel).forEach((midi, i) =>
      this.engine.bell('sfx', midi, t + i * 0.055, 0.16, 1.1),
    );
    this.engine.noise('sfx', { start: t, duration: 0.5, gain: 0.05, highpass: 6000, reverb: 0.5 });
    if (comboLevel > 0) {
      // Combos also get a rising whoosh and a low punch.
      this.engine.noise('sfx', {
        start: t,
        duration: 0.45,
        gain: 0.08,
        lowpass: 400,
        sweepTo: 6000,
      });
      this.engine.tone('sfx', {
        freq: 110,
        type: 'sine',
        start: t,
        release: 0.3,
        gain: 0.25,
        glideTo: 70,
      });
    }
    sparkleNotes(cubes, Math.random).forEach((midi, i) =>
      this.engine.tone('sfx', {
        midi: midi + comboLevel * 2,
        type: 'sine',
        start: t + 0.15 + i * 0.03,
        release: 0.25,
        gain: 0.045,
        reverb: 0.4,
      }),
    );
  }

  /** Board turned: airy whoosh. */
  turn(): void {
    this.engine.noise('sfx', {
      start: this.t,
      duration: 0.28,
      gain: 0.06,
      lowpass: 500,
      sweepTo: 3000,
    });
  }

  /** New sky reached: shimmering glissando. */
  newSky(): void {
    const t = this.t;
    for (let i = 0; i < 8; i++) this.engine.bell('sfx', pentatonic(72, i), t + i * 0.07, 0.06, 1.4);
  }

  /** Beat the best score: short fanfare. */
  newBest(): void {
    const t = this.t;
    [72, 76, 79, 84].forEach((midi, i) => {
      this.engine.tone('sfx', {
        midi,
        type: 'triangle',
        start: t + i * 0.09,
        hold: i === 3 ? 0.25 : 0,
        release: 0.35,
        gain: 0.12,
        reverb: 0.4,
      });
      this.engine.tone('sfx', {
        midi: midi + 12,
        type: 'sine',
        start: t + i * 0.09,
        release: 0.3,
        gain: 0.04,
      });
    });
  }

  /** No moves left: slow falling minor arpeggio. */
  gameOver(): void {
    const t = this.t;
    [69, 64, 60, 57, 52].forEach((midi, i) =>
      this.engine.tone('sfx', {
        midi,
        type: 'triangle',
        start: t + i * 0.18,
        release: 0.7,
        gain: 0.12,
        lowpass: 1800,
        reverb: 0.6,
      }),
    );
  }
}
