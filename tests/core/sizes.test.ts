import { describe, expect, it } from 'vitest';
import { Game } from '../../src/core/game';
import { Grid } from '../../src/core/grid';
import { getOrientations } from '../../src/core/orientations';
import { createRng } from '../../src/core/rng';
import { Tray } from '../../src/core/tray';
import { countFilled, fillRowX, fillRowY } from './helpers';

const FLAT = 0; // I lies along X
const ALONG_Y = getOrientations('I').findIndex((o) => o.extent.join() === '1,4,1');

describe.each([
  [6, 6],
  [8, 12],
  [10, 10],
  [14, 7],
])('board %ix%i', (size, height) => {
  const game = (grid = new Grid(size, height)): Game =>
    new Game({ grid, tray: new Tray(createRng(1), ['I', 'I', 'I']) });

  it('starts empty with moves available', () => {
    const g = game();
    expect(g.grid.size).toBe(size);
    expect(g.grid.height).toBe(height);
    expect(g.hasAnyMove()).toBe(true);
    expect(g.gameOver).toBe(false);
  });

  it('clears an X-line of length N', () => {
    const grid = new Grid(size, height);
    fillRowX(grid, 0, 0, [0, 1, 2, 3]);
    const res = game(grid).place(0, FLAT, 0, 0)!;
    expect(res.steps[0]!.cleared).toHaveLength(size);
    expect(countFilled(grid)).toBe(0);
  });

  it('clears a Y-line on the top layer', () => {
    const grid = new Grid(size, height);
    // Support column under the I so it lands on the top layer.
    for (let z = 0; z < height - 1; z++)
      for (let y = size - 4; y < size; y++) grid.set(size - 1, y, z, 2);
    fillRowY(grid, size - 1, height - 1, [size - 4, size - 3, size - 2, size - 1]);
    const res = game(grid).place(0, ALONG_Y, size - 1, size - 4)!;
    expect(res.placed[0]![2]).toBe(height - 1);
    expect(res.steps[0]!.cleared).toHaveLength(size);
  });

  it('rejects placements off the board edge', () => {
    expect(game().place(0, FLAT, size - 3, 0)).toBeNull();
    expect(game().place(0, FLAT, size - 4, size - 1)).not.toBeNull();
  });

  it('detects game over when every column is full', () => {
    const grid = new Grid(size, height);
    // Fill with a pattern that leaves one hole per line on each layer, but no room anywhere.
    for (let z = 0; z < height; z++)
      for (let x = 0; x < size; x++)
        for (let y = 0; y < size; y++) if (y !== (x + z) % size) grid.set(x, y, z, 1);
    // Top layer holes are single cells, reachable but too small; lower holes are covered.
    expect(game(grid).hasAnyMove()).toBe(false);
  });
});

describe('Game.reset with a new size', () => {
  it('replaces the grid with the requested dimensions', () => {
    const g = new Game({ seed: 1 });
    g.placeFree('O', 0, 0, 0);
    g.reset(2, 7, 9);
    expect([g.grid.size, g.grid.height]).toEqual([7, 9]);
    expect(countFilled(g.grid)).toBe(0);
    expect(g.score).toBe(0);
  });

  it('keeps the size when none is given', () => {
    const g = new Game({ size: 8, height: 6, seed: 1 });
    g.reset(3);
    expect([g.grid.size, g.grid.height]).toEqual([8, 6]);
  });
});
