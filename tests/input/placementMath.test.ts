import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/core/grid';
import { getOrientations } from '../../src/core/orientations';
import { fits } from '../../src/core/placement';
import {
  aimTarget,
  anchorFor,
  gridAxisFor,
  initialOrientation,
  rotateForView,
  stepFor,
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

describe('stepFor', () => {
  it('maps screen directions to grid steps at quarter 0', () => {
    expect(stepFor(0, 'right')).toEqual([1, 0]);
    expect(stepFor(0, 'left')).toEqual([-1, 0]);
    expect(stepFor(0, 'toward')).toEqual([0, 1]);
    expect(stepFor(0, 'away')).toEqual([0, -1]);
  });

  it('follows the board rotation', () => {
    expect(stepFor(1, 'right')).toEqual([0, 1]);
    expect(stepFor(1, 'toward')).toEqual([-1, 0]);
    expect(stepFor(2, 'right')).toEqual([-1, 0]);
    expect(stepFor(3, 'away')).toEqual([-1, 0]);
  });
});

describe('aimTarget', () => {
  it('centers on the column and finds the drop height for the given orientation', () => {
    const grid = new Grid(10, 10);
    const flatI = getOrientations('I')[0]!;
    expect(aimTarget(grid, flatI, [5, 2])).toEqual({ x: 4, y: 2, z: 0 });
  });

  it('reports z null where the orientation cannot be dropped', () => {
    const grid = new Grid(10, 4);
    for (let z = 0; z < 4; z++) grid.set(5, 2, z, 1); // full column
    const flatI = getOrientations('I')[0]!;
    expect(aimTarget(grid, flatI, [5, 2])).toEqual({ x: 4, y: 2, z: null });
  });

  it('re-aims the same column correctly after a rotation (regression)', () => {
    // A flat I fits at z=0 along row y=2, but the same spot turned along Y runs into a cube.
    const grid = new Grid(10, 10);
    grid.set(5, 4, 0, 1);
    const flatI = getOrientations('I')[0]!;
    const alongY = getOrientations('I').find((o) => o.extent.join() === '1,4,1')!;
    expect(aimTarget(grid, flatI, [6, 2])).toEqual({ x: 5, y: 2, z: 0 });
    // Re-aiming with the new orientation never yields a spot that overlaps cubes.
    for (const column of [
      [6, 2],
      [5, 2],
      [5, 4],
    ] as const) {
      const t = aimTarget(grid, alongY, column)!;
      expect(t.z).not.toBeNull();
      expect(fits(grid, alongY.cells, t.x, t.y, t.z!)).toBe(true);
    }
  });

  it('is null off the board', () => {
    expect(aimTarget(new Grid(10, 10), getOrientations('O')[0]!, [-1, 3])).toBeNull();
  });
});
