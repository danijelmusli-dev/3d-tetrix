import { describe, expect, it } from 'vitest';
import { clearNotes, midiToFreq, pentatonic, sparkleNotes } from '../../src/audio/notes';

const C_MAJOR = new Set([0, 2, 4, 5, 7, 9, 11]);
const inKey = (midi: number): boolean => C_MAJOR.has(((midi % 12) + 12) % 12);

describe('notes', () => {
  it('converts MIDI to frequency (A4 = 440 Hz, octaves double)', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    expect(midiToFreq(81)).toBeCloseTo(880);
    expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
  });

  it('walks the major pentatonic across octaves', () => {
    expect([0, 1, 2, 3, 4, 5].map((d) => pentatonic(60, d))).toEqual([60, 62, 64, 67, 69, 72]);
    expect(pentatonic(60, -1)).toBe(57);
  });

  it('clear arpeggios rise with the combo level and stay in key', () => {
    const first = clearNotes(0);
    const combo = clearNotes(2);
    expect(first.length).toBeGreaterThanOrEqual(3);
    expect(combo[0]!).toBeGreaterThan(first[0]!);
    for (const n of [...first, ...combo]) expect(inKey(n)).toBe(true);
    expect(clearNotes(50)[0]).toBe(clearNotes(10)[0]); // capped so it never gets shrill
  });

  it('sparkles are in key, high, and capped in number', () => {
    const notes = sparkleNotes(40, () => 0.5);
    expect(notes.length).toBeLessThanOrEqual(12);
    for (const n of notes) {
      expect(inKey(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(76);
    }
    expect(sparkleNotes(3, Math.random)).toHaveLength(3);
  });
});
