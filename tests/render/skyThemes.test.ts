import { describe, expect, it } from 'vitest';
import { MOONS, SKY_THEMES, pickMoon, themeIndexFor } from '../../src/render/skyThemes';

describe('sky themes', () => {
  it('start at score 0 and climb strictly', () => {
    expect(SKY_THEMES[0]!.minScore).toBe(0);
    for (let i = 1; i < SKY_THEMES.length; i++)
      expect(SKY_THEMES[i]!.minScore).toBeGreaterThan(SKY_THEMES[i - 1]!.minScore);
  });

  it('picks the last theme whose threshold the score reached', () => {
    expect(themeIndexFor(0)).toBe(0);
    expect(themeIndexFor(399)).toBe(0);
    expect(themeIndexFor(400)).toBe(1);
    expect(themeIndexFor(1_000_000)).toBe(SKY_THEMES.length - 1);
  });

  it('keeps scene lighting bright enough to read the cubes at every sky', () => {
    for (const t of SKY_THEMES) {
      expect(t.hemiIntensity).toBeGreaterThanOrEqual(1.3);
      expect(t.sunIntensity).toBeGreaterThanOrEqual(1.3);
    }
  });

  it('shows the sun by day and only the moon at night', () => {
    const byName = Object.fromEntries(SKY_THEMES.map((t) => [t.name, t]));
    for (const day of ['Dawn', 'Day', 'Sunset']) {
      expect(byName[day]!.sunStrength).toBeGreaterThan(0.5);
      expect(byName[day]!.moon).toBe(0);
    }
    for (const night of ['Night', 'Aurora']) {
      expect(byName[night]!.sunStrength).toBe(0);
      expect(byName[night]!.moon).toBe(1);
    }
    expect(byName.Dusk!.sunStrength).toBeLessThan(0.3);
    expect(byName.Dusk!.moon).toBeGreaterThan(0);
  });

  it('keeps the sun on screen', () => {
    for (const t of SKY_THEMES) {
      expect(t.sunY).toBeGreaterThan(0);
      expect(t.sunY).toBeLessThan(1);
    }
  });
});

describe('moons', () => {
  it('offers several distinct looks', () => {
    expect(new Set(MOONS.map((m) => m.name)).size).toBe(MOONS.length);
    expect(MOONS.length).toBeGreaterThanOrEqual(6);
    for (const m of MOONS) {
      expect(m.phase).toBeGreaterThan(0);
      expect(m.phase).toBeLessThanOrEqual(0.5);
    }
  });

  it('can reach every moon but never repeats the previous one', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(pickMoon(() => i / 100).name);
    expect(seen.size).toBe(MOONS.length);
    for (const previous of MOONS)
      for (const r of [0, 0.5, 0.999999]) expect(pickMoon(() => r, previous)).not.toBe(previous);
  });

  it('copes with an rng that returns 1', () => {
    expect(MOONS).toContain(pickMoon(() => 1));
  });
});
