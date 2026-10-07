import { describe, expect, it } from 'vitest';
import { getOrientations } from '../../src/core/orientations';
import {
  anchorFor,
  gridAxisFor,
  initialOrientation,
  rotateForView,
} from '../../src/input/placementMath';

describe('anchorFor', () => {
  it('centers the piece footprint on the cursor cell', () => {
    expect(anchorFor([5, 5], [4, 1, 1], 10)).toEqual([4, 5]);
    expect(anchorFor([5, 5], [3, 2, 1], 10)).toEqual([4, 5]);
    expect(anchorFor([5, 5], [1, 1, 4], 10)).toEqual([5, 5]);
  });

  it('clamps so the footprint stays on the board', () => {
    expect(anchorFor([0, 0], [4, 1, 1], 10)).toEqual([0, 0]);
    expect(anchorFor([9, 9], [4, 2, 1], 10)).toEqual([6, 8]);
  });

  it('returns null when the cursor is off the board', () => {
    expect(anchorFor([-1, 3], [1, 1, 1], 10)).toBeNull();
    expect(anchorFor([3, 10], [1, 1, 1], 10)).toBeNull();
  });
});

describe('gridAxisFor', () => {
  it('maps screen-right through each board quarter', () => {
    expect([0, 1, 2, 3].map((q) => gridAxisFor(q, 'right'))).toEqual([
      { axis: 'x', sign: 1 },
      { axis: 'y', sign: 1 },
      { axis: 'x', sign: -1 },
      { axis: 'y', sign: -1 },
    ]);
  });

  it('maps toward-viewer through each board quarter', () => {
    expect([0, 1, 2, 3].map((q) => gridAxisFor(q, 'toward'))).toEqual([
      { axis: 'y', sign: 1 },
      { axis: 'x', sign: -1 },
      { axis: 'y', sign: -1 },
      { axis: 'x', sign: 1 },
    ]);
  });
});

describe('initialOrientation', () => {
  it('is the base shape when the board is not rotated', () => {
    expect(initialOrientation('L', 0)).toBe(0);
  });

  it('counter-rotates so the piece looks like its thumbnail', () => {
    const extentAt = (q: number) => getOrientations('I')[initialOrientation('I', q)]!.extent;
    expect(extentAt(1)).toEqual([1, 4, 1]);
    expect(extentAt(2)).toEqual([4, 1, 1]);
    expect(extentAt(3)).toEqual([1, 4, 1]);
  });
});

describe('rotateForView', () => {
  it('spin keeps a flat piece flat', () => {
    const i = rotateForView('I', 0, 'spin', 0, 1);
    expect(getOrientations('I')[i]!.extent).toEqual([1, 4, 1]);
  });

  it('tip stands flat I upright when it lies across the screen', () => {
    // At quarter 0, I lies along grid x = screen-right; tipping around the toward axis stands it up.
    const i = rotateForView('I', 0, 'roll', 0, 1);
    expect(getOrientations('I')[i]!.extent).toEqual([1, 1, 4]);
  });

  it('every rotation kind is undone by its reverse at any quarter', () => {
    for (const kind of ['spin', 'tip', 'roll'] as const)
      for (let q = 0; q < 4; q++) {
        const there = rotateForView('J', 7, kind, q, 1);
        expect(rotateForView('J', there, kind, q, -1)).toBe(7);
      }
  });
});
