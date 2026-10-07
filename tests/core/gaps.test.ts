import { describe, expect, it } from 'vitest';
import { hiddenGaps } from '../../src/core/gaps';
import { Grid } from '../../src/core/grid';

const keys = (cells: readonly (readonly number[])[]) => cells.map((c) => c.join()).sort();

describe('hiddenGaps', () => {
  it('is empty for an empty or solid-from-floor board', () => {
    const g = new Grid(4, 4);
    expect(hiddenGaps(g)).toEqual([]);
    g.set(1, 1, 0, 1);
    g.set(1, 1, 1, 1);
    expect(hiddenGaps(g)).toEqual([]);
  });

  it('finds empty cells under a cube in the same column', () => {
    const g = new Grid(4, 6);
    g.set(2, 3, 3, 1); // floating cube: z=0..2 below it are hidden
    g.set(0, 0, 1, 1); // z=0 below it is hidden
    expect(keys(hiddenGaps(g))).toEqual(
      keys([
        [2, 3, 0],
        [2, 3, 1],
        [2, 3, 2],
        [0, 0, 0],
      ]),
    );
  });

  it('only counts gaps below the highest cube of each column', () => {
    const g = new Grid(4, 6);
    g.set(1, 0, 0, 1);
    g.set(1, 0, 2, 1); // gap at z=1; z=3..5 above are open air, not gaps
    expect(keys(hiddenGaps(g))).toEqual(['1,0,1']);
  });
});
