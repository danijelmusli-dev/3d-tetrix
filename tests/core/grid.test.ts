import { describe, expect, it } from 'vitest';
import { Grid } from '../../src/core/grid';

describe('Grid', () => {
  it('starts empty', () => {
    const g = new Grid(10, 10);
    expect(g.cells).toHaveLength(1000);
    expect(g.get(0, 0, 0)).toBe(0);
    expect(g.isEmpty(9, 9, 9)).toBe(true);
  });

  it('stores values per cell', () => {
    const g = new Grid(4, 3);
    g.set(1, 2, 2, 5);
    expect(g.get(1, 2, 2)).toBe(5);
    expect(g.get(2, 1, 2)).toBe(0);
    expect(g.isEmpty(1, 2, 2)).toBe(false);
  });

  it('checks bounds', () => {
    const g = new Grid(4, 3);
    expect(g.inBounds(0, 0, 0)).toBe(true);
    expect(g.inBounds(3, 3, 2)).toBe(true);
    expect(g.inBounds(4, 0, 0)).toBe(false);
    expect(g.inBounds(0, -1, 0)).toBe(false);
    expect(g.inBounds(0, 0, 3)).toBe(false);
    expect(() => g.get(4, 0, 0)).toThrow(RangeError);
    expect(() => g.set(0, 0, 3, 1)).toThrow(RangeError);
  });

  it('clones independently', () => {
    const g = new Grid(4, 3);
    g.set(0, 0, 0, 1);
    const c = g.clone();
    c.set(0, 0, 0, 2);
    expect(g.get(0, 0, 0)).toBe(1);
    expect(c.get(0, 0, 0)).toBe(2);
  });

  it('rejects cell buffers of the wrong length', () => {
    expect(() => new Grid(4, 3, new Uint8Array(5))).toThrow();
  });

  it('reports stack height (highest filled layer + 1)', () => {
    const g = new Grid(4, 6);
    expect(g.stackHeight()).toBe(0);
    g.set(0, 0, 0, 1);
    expect(g.stackHeight()).toBe(1);
    g.set(3, 3, 4, 1); // floating cube still counts
    expect(g.stackHeight()).toBe(5);
  });

  it('lists filled cells', () => {
    const g = new Grid(4, 3);
    g.set(1, 2, 0, 3);
    g.set(0, 0, 2, 1);
    expect([...g.filled()]).toEqual([
      { pos: [1, 2, 0], colorId: 3 },
      { pos: [0, 0, 2], colorId: 1 },
    ]);
  });
});
