import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/core/grid';
import { clearAndDrop, findFullLines, resolveCascade } from '../../src/core/clearing';
import { countFilled, fillRowX, fillRowY } from './helpers';

describe('findFullLines', () => {
  it('finds nothing on an empty or partial board', () => {
    const g = new Grid(10, 10);
    expect(findFullLines(g).lines).toBe(0);
    fillRowX(g, 0, 0, [5]);
    expect(findFullLines(g).lines).toBe(0);
  });

  it('finds a full line along X', () => {
    const g = new Grid(10, 10);
    fillRowX(g, 3, 0);
    const res = findFullLines(g);
    expect(res.lines).toBe(1);
    expect(res.cells).toHaveLength(10);
    expect(res.cells.every(([, y, z]) => y === 3 && z === 0)).toBe(true);
  });

  it('finds a full line along Y', () => {
    const g = new Grid(10, 10);
    fillRowY(g, 6, 0);
    const res = findFullLines(g);
    expect(res.lines).toBe(1);
    expect(res.cells.every(([x]) => x === 6)).toBe(true);
  });

  it('merges crossing lines without double-counting the shared cell', () => {
    const g = new Grid(10, 10);
    fillRowX(g, 2, 0);
    fillRowY(g, 4, 0);
    const res = findFullLines(g);
    expect(res.lines).toBe(2);
    expect(res.cells).toHaveLength(19);
  });

  it('finds lines on upper layers', () => {
    const g = new Grid(10, 10);
    fillRowX(g, 0, 5);
    const res = findFullLines(g);
    expect(res.lines).toBe(1);
    expect(res.cells.every(([, , z]) => z === 5)).toBe(true);
  });
});

describe('clearAndDrop', () => {
  it('removes cleared cells and drops cubes above by the cleared count below them', () => {
    const g = new Grid(4, 6);
    // Column (0,0): z0 cleared, z1 cube 2, z2 cleared, z3 cube 3.
    g.set(0, 0, 0, 1);
    g.set(0, 0, 1, 2);
    g.set(0, 0, 2, 1);
    g.set(0, 0, 3, 3);
    const moves = clearAndDrop(g, [
      [0, 0, 0],
      [0, 0, 2],
    ]);
    expect([0, 1, 2, 3].map((z) => g.get(0, 0, z))).toEqual([2, 3, 0, 0]);
    expect(moves).toEqual([
      { from: [0, 0, 1], to: [0, 0, 0] },
      { from: [0, 0, 3], to: [0, 0, 1] },
    ]);
  });

  it('keeps pre-existing gaps', () => {
    const g = new Grid(4, 6);
    g.set(0, 0, 0, 1); // cleared
    // z1 is an existing gap
    g.set(0, 0, 2, 2);
    clearAndDrop(g, [[0, 0, 0]]);
    expect([0, 1, 2].map((z) => g.get(0, 0, z))).toEqual([0, 2, 0]);
  });

  it('leaves untouched columns alone', () => {
    const g = new Grid(4, 6);
    g.set(1, 1, 3, 4); // floating cube elsewhere
    g.set(0, 0, 0, 1);
    clearAndDrop(g, [[0, 0, 0]]);
    expect(g.get(1, 1, 3)).toBe(4);
  });
});

describe('resolveCascade', () => {
  it('returns no steps when nothing is full', () => {
    expect(resolveCascade(new Grid(10, 10))).toEqual([]);
  });

  it('clears a line and drops cubes above it', () => {
    const g = new Grid(10, 10);
    fillRowX(g, 0, 0);
    g.set(4, 0, 1, 7);
    const steps = resolveCascade(g);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.lines).toBe(1);
    expect(steps[0]!.moves).toEqual([{ from: [4, 0, 1], to: [4, 0, 0] }]);
    expect(g.get(4, 0, 0)).toBe(7);
    expect(countFilled(g)).toBe(1);
  });

  it('chains a cascade when a dropped cube completes a new line', () => {
    const g = new Grid(10, 10);
    fillRowX(g, 0, 0); // step 1 clears this
    fillRowY(g, 0, 1, [0]); // layer-1 Y-line at x=0, missing (0,0,1)
    g.set(0, 0, 2, 3); // falls 1 into (0,0,1) after step 1, completing the Y-line
    const steps = resolveCascade(g);
    expect(steps).toHaveLength(2);
    expect(steps[0]!.cleared).toHaveLength(10);
    expect(steps[1]!.lines).toBe(1);
    expect(countFilled(g)).toBe(0);
  });
});
