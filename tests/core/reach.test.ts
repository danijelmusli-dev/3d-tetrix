import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/core/grid';
import { getOrientations } from '../../src/core/orientations';
import { canReachWithRotations } from '../../src/core/reach';
import { canReach } from '../../src/core/placement';

const FLAT_I = 0;
const ALONG_Y_I = getOrientations('I').findIndex((o) => o.extent.join() === '1,4,1');

/** Roof at z=1 over x>=2 (all y); the cave below opens only at x=0..1 (2 wide). */
function cave(): Grid {
  const g = new Grid(10, 10);
  for (let x = 2; x < 10; x++) for (let y = 0; y < 10; y++) g.set(x, y, 1, 1);
  return g;
}

describe('canReachWithRotations', () => {
  it('agrees with plain reachability for open positions', () => {
    expect(canReachWithRotations(new Grid(10, 10), 'I', FLAT_I, 3, 3, 0)).toBe(true);
  });

  it('reaches a spot only accessible by rotating inside a cave', () => {
    const g = cave();
    const flat = getOrientations('I')[FLAT_I]!.cells;
    // A flat I is too wide for the 2-wide mouth: unreachable without rotating...
    expect(canReach(g, flat, 5, 4, 0)).toBe(false);
    // ...but an along-Y I can enter, and turn flat once inside.
    expect(canReach(g, getOrientations('I')[ALONG_Y_I]!.cells, 5, 4, 0)).toBe(true);
    expect(canReachWithRotations(g, 'I', FLAT_I, 5, 4, 0)).toBe(true);
  });

  it('rejects a cavity with no way in at all', () => {
    const g = new Grid(10, 4);
    g.cells.fill(1);
    for (let x = 3; x < 7; x++) g.set(x, 5, 0, 0); // sealed 4-long pocket
    expect(canReachWithRotations(g, 'I', FLAT_I, 3, 5, 0)).toBe(false);
  });

  it('rejects positions that do not fit', () => {
    const g = cave();
    expect(canReachWithRotations(g, 'I', FLAT_I, 5, 4, 1)).toBe(false);
    expect(canReachWithRotations(g, 'I', 99, 0, 0, 0)).toBe(false);
  });
});
