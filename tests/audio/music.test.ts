import { describe, expect, it } from 'vitest';
import { BEATS_PER_BAR, barEvents, chordFor } from '../../src/audio/music';
import { createRng } from '../../src/core/rng';

const C_MAJOR = new Set([0, 2, 4, 5, 7, 9, 11]);
const voices = (intensity: number) =>
  new Set(barEvents(3, intensity, createRng(1)).map((e) => e.voice));

describe('generative music', () => {
  it('cycles a four-chord progression, two bars per chord', () => {
    expect(chordFor(0)).toEqual(chordFor(1));
    expect(chordFor(0)).not.toEqual(chordFor(2));
    expect(chordFor(8)).toEqual(chordFor(0));
  });

  it('adds layers as intensity rises', () => {
    expect(voices(0)).toEqual(new Set(['pad']));
    expect(voices(1)).toEqual(new Set(['pad', 'bass']));
    expect(voices(2).has('pluck')).toBe(true);
    expect(voices(3).has('hat')).toBe(true);
    expect(voices(5).has('bell')).toBe(true);
  });

  it('keeps every note in key and every event inside the bar', () => {
    for (let bar = 0; bar < 16; bar++) {
      for (const e of barEvents(bar, 5, createRng(bar))) {
        expect(e.beat).toBeGreaterThanOrEqual(0);
        expect(e.beat).toBeLessThan(BEATS_PER_BAR);
        if (e.voice !== 'hat') expect(C_MAJOR.has(e.midi % 12)).toBe(true);
      }
    }
  });

  it('is deterministic for a seed', () => {
    expect(barEvents(5, 4, createRng(9))).toEqual(barEvents(5, 4, createRng(9)));
  });
});
