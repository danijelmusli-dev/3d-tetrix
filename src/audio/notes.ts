/** Pure pitch helpers. Everything is in C major / C major pentatonic so it all fits together. */

export const midiToFreq = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

const PENTATONIC = [0, 2, 4, 7, 9] as const;

/** MIDI note `degree` steps up the major pentatonic from `root` (negative goes down). */
export function pentatonic(root: number, degree: number): number {
  const octave = Math.floor(degree / PENTATONIC.length);
  const step = ((degree % PENTATONIC.length) + PENTATONIC.length) % PENTATONIC.length;
  return root + 12 * octave + PENTATONIC[step]!;
}

/** Highest combo level that still raises the clear pitch. */
const MAX_COMBO_RISE = 6;

/**
 * Arpeggio for a line clear: four rising pentatonic notes whose starting
 * pitch climbs two steps per combo level, so chains sound like they build.
 */
export function clearNotes(comboLevel: number): number[] {
  const base = Math.min(comboLevel, MAX_COMBO_RISE) * 2;
  return [0, 1, 2, 4].map((d) => pentatonic(72, base + d));
}

/** Little high notes for cleared cubes (one per cube, at most 12). */
export function sparkleNotes(count: number, rng: () => number): number[] {
  // C pentatonic from E5 (degree 2) upward, so sparkles stay in key with everything else.
  return Array.from({ length: Math.min(count, 12) }, () =>
    pentatonic(72, 2 + Math.floor(rng() * 8)),
  );
}
