import { describe, expect, it } from 'vitest';
import { Grid, type Vec3 } from '../../src/core/grid';
import { canReach, dropZ, fallZ, fits, restingZ, slideToward } from '../../src/core/placement';

const flatI: Vec3[] = [
  [0, 0, 0],
  [1, 0, 0],
  [2, 0, 0],
  [3, 0, 0],
];
const uprightI: Vec3[] = [
  [0, 0, 0],
  [0, 0, 1],
  [0, 0, 2],
  [0, 0, 3],
];
// Upright L in the XZ plane: stem up at x=0, foot sticking out at (1,0,0).
const uprightL: Vec3[] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 0, 1],
  [0, 0, 2],
];
// Same L flipped: foot at the top, so (1,0,2) overhangs empty space below.
const hangingL: Vec3[] = [
  [0, 0, 0],
  [0, 0, 1],
  [0, 0, 2],
  [1, 0, 2],
];

describe('fits', () => {
  it('accepts empty in-bounds cells', () => {
    expect(fits(new Grid(10, 10), flatI, 0, 0, 0)).toBe(true);
  });

  it('rejects out of bounds or occupied cells', () => {
    const g = new Grid(10, 10);
    expect(fits(g, flatI, 7, 0, 0)).toBe(false);
    g.set(2, 0, 0, 1);
    expect(fits(g, flatI, 0, 0, 0)).toBe(false);
  });
});

describe('restingZ', () => {
  it('matches dropZ when the piece fits under the cap', () => {
    const g = new Grid(10, 10);
    for (let z = 0; z < 3; z++) g.set(0, 0, z, 1);
    expect(restingZ(g, uprightI, 0, 0)).toBe(3);
    expect(dropZ(g, uprightI, 0, 0)).toBe(3);
  });

  it('still reports where the piece rests when it pokes above the cap', () => {
    const g = new Grid(10, 10);
    for (let z = 0; z < 8; z++) g.set(0, 0, z, 1);
    expect(dropZ(g, uprightI, 0, 0)).toBeNull();
    expect(restingZ(g, uprightI, 0, 0)).toBe(8);
  });

  it('is null only when the footprint leaves the board', () => {
    expect(restingZ(new Grid(10, 10), flatI, 7, 0)).toBeNull();
  });
});

describe('dropZ', () => {
  it('lands on the floor of an empty board', () => {
    expect(dropZ(new Grid(10, 10), flatI, 3, 4)).toBe(0);
  });

  it('lands on top of the highest cell under the footprint', () => {
    const g = new Grid(10, 10);
    for (let z = 0; z < 3; z++) g.set(5, 4, z, 1);
    expect(dropZ(g, flatI, 3, 4)).toBe(3);
  });

  it('rejects footprints hanging off the board', () => {
    const g = new Grid(10, 10);
    expect(dropZ(g, flatI, 7, 0)).toBeNull();
    expect(dropZ(g, flatI, -1, 0)).toBeNull();
    expect(dropZ(g, flatI, 0, 10)).toBeNull();
  });

  it('rejects placements that would exceed the height cap', () => {
    const g = new Grid(10, 10);
    for (let z = 0; z < 7; z++) g.set(0, 0, z, 1);
    expect(dropZ(g, uprightI, 0, 0)).toBeNull();
    g.set(0, 0, 6, 0);
    expect(dropZ(g, uprightI, 0, 0)).toBe(6);
  });

  it('rejects a full column', () => {
    const g = new Grid(4, 3);
    for (let z = 0; z < 3; z++) g.set(0, 0, z, 1);
    expect(dropZ(g, flatI, 0, 0)).toBeNull();
  });

  it('cannot tunnel under an overhang', () => {
    const g = new Grid(10, 10);
    g.set(1, 0, 3, 1); // roof over (1,0); floor beneath it is empty
    // Upright L's foot at (1,0) hits the roof on the way down.
    expect(dropZ(g, uprightL, 0, 0)).toBe(4);
  });

  it('a piece with an overhang can rest above empty cells', () => {
    const g = new Grid(10, 10);
    // Hanging L at (0,0): stem lands on floor, top foot hangs over empty (1,0,0..1).
    expect(dropZ(g, hangingL, 0, 0)).toBe(0);
    // Block under the foot at z=2 stops the whole piece higher.
    g.set(1, 0, 2, 1);
    expect(dropZ(g, hangingL, 0, 0)).toBe(1);
  });
});

describe('fallZ', () => {
  it('falls until supported', () => {
    const g = new Grid(10, 10);
    g.set(0, 0, 0, 1);
    expect(fallZ(g, flatI, 0, 0, 6)).toBe(1);
    expect(fallZ(g, flatI, 4, 0, 6)).toBe(0);
  });

  it('is null when the start position is blocked', () => {
    const g = new Grid(10, 10);
    g.set(1, 0, 3, 1);
    expect(fallZ(g, flatI, 0, 0, 3)).toBeNull();
  });
});

// I lying along Y: 1 wide in x, so it fits through the 2-wide cave mouth.
const alongYI: Vec3[] = [
  [0, 0, 0],
  [0, 1, 0],
  [0, 2, 0],
  [0, 3, 0],
];

/** Roof over x=2..9, y=0..9 at z=1, leaving the cave beneath (z=0) open at x=0..1. */
function cave(): Grid {
  const g = new Grid(10, 10);
  for (let x = 2; x < 10; x++) for (let y = 0; y < 10; y++) g.set(x, y, 1, 1);
  return g;
}

describe('canReach', () => {
  it('reaches open positions from above', () => {
    expect(canReach(new Grid(10, 10), flatI, 3, 3, 0)).toBe(true);
  });

  it('reaches under an overhang through a side opening', () => {
    expect(canReach(cave(), alongYI, 4, 5, 0)).toBe(true);
  });

  it('rejects positions the piece is too wide to get into', () => {
    expect(canReach(cave(), flatI, 4, 5, 0)).toBe(false);
  });

  it('rejects a sealed cavity', () => {
    const g = cave();
    for (let y = 0; y < 10; y++) g.set(1, y, 0, 1); // wall off the cave mouth
    for (let y = 0; y < 10; y++) g.set(1, y, 1, 1);
    expect(canReach(g, alongYI, 4, 5, 0)).toBe(false);
  });

  it('rejects blocked or out-of-bounds positions', () => {
    const g = cave();
    expect(canReach(g, flatI, 4, 5, 1)).toBe(false);
    expect(canReach(g, flatI, 7, 0, 0)).toBe(false);
    expect(canReach(g, uprightI, 0, 0, 7)).toBe(false);
  });
});

describe('slideToward', () => {
  it('moves straight to a reachable target in the layer', () => {
    expect(slideToward(cave(), alongYI, [0, 5], 0, [5, 5])).toEqual([5, 5]);
  });

  it('stops at the closest reachable spot when walled off', () => {
    const g = new Grid(10, 10);
    for (let y = 0; y < 10; y++) g.set(5, y, 0, 1); // wall at x=5
    // Flat I (4 long) can reach x=0..1 left of the wall; target is past it.
    expect(slideToward(g, flatI, [0, 3], 0, [7, 3])).toEqual([1, 3]);
  });

  it('stays put when the start does not fit', () => {
    const g = new Grid(10, 10);
    g.set(0, 3, 0, 1);
    expect(slideToward(g, flatI, [0, 3], 0, [4, 3])).toEqual([0, 3]);
  });
});
