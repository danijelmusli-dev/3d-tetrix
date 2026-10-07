import { describe, expect, it } from 'vitest';
import { SKY_THEMES, themeIndexFor } from '../../src/render/skyThemes';

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
});
