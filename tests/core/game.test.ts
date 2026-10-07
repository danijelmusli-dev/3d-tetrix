import { describe, expect, it } from 'vitest';
import { Game, scoreFor } from '../../src/core/game';
import { Grid } from '../../src/core/grid';
import { PIECES } from '../../src/core/pieces';
import { createRng } from '../../src/core/rng';
import { Tray } from '../../src/core/tray';
import { countFilled, fillRowX } from './helpers';

const FLAT = 0; // orientation 0 = flat base shape (I lies along X)

function gameWith(pieces: ('I' | 'O' | 'T')[], grid?: Grid): Game {
  return new Game({ seed: 1, grid, tray: new Tray(createRng(1), pieces) });
}

describe('Game', () => {
  it('starts empty with a full tray', () => {
    const game = new Game({ seed: 3 });
    expect(game.score).toBe(0);
    expect(game.gameOver).toBe(false);
    expect(game.tray.pieces.every((p) => p !== null)).toBe(true);
    expect(countFilled(game.grid)).toBe(0);
  });

  it('reports landing height for a preview', () => {
    const game = gameWith(['I', 'O', 'T']);
    expect(game.landingZ(0, FLAT, 0, 0)).toBe(0);
    expect(game.landingZ(0, FLAT, 7, 0)).toBeNull();
    expect(game.landingZ(0, 99, 0, 0)).toBeNull();
  });

  it('places a piece, scores it and empties the slot', () => {
    const game = gameWith(['I', 'O', 'T']);
    const res = game.place(0, FLAT, 2, 3);
    expect(res).not.toBeNull();
    expect(res!.placed).toEqual([
      [2, 3, 0],
      [3, 3, 0],
      [4, 3, 0],
      [5, 3, 0],
    ]);
    expect(game.grid.get(2, 3, 0)).toBe(PIECES.I.colorId);
    expect(res!.scoreDelta).toBe(4);
    expect(game.score).toBe(4);
    expect(game.tray.pieces[0]).toBeNull();
  });

  it('rejects invalid placements without changing state', () => {
    const game = gameWith(['I', 'O', 'T']);
    expect(game.place(0, FLAT, 8, 0)).toBeNull();
    expect(game.place(5, FLAT, 0, 0)).toBeNull();
    expect(game.score).toBe(0);
    expect(game.tray.pieces[0]).toBe('I');
    game.place(0, FLAT, 0, 0);
    expect(game.place(0, FLAT, 0, 5)).toBeNull(); // slot already used
  });

  it('clears a completed line and scores it', () => {
    const grid = new Grid(10, 10);
    fillRowX(grid, 0, 0, [0, 1, 2, 3]);
    const game = gameWith(['I', 'O', 'T'], grid);
    const res = game.place(0, FLAT, 0, 0)!;
    expect(res.steps).toHaveLength(1);
    expect(res.scoreDelta).toBe(4 + 10 * 10);
    expect(countFilled(game.grid)).toBe(0);
  });

  it('refills the tray after the third placement', () => {
    const game = gameWith(['O', 'O', 'O']);
    expect(game.place(0, FLAT, 0, 0)!.trayRefilled).toBe(false);
    expect(game.place(1, FLAT, 3, 0)!.trayRefilled).toBe(false);
    expect(game.place(2, FLAT, 6, 0)!.trayRefilled).toBe(true);
    expect(game.tray.pieces.every((p) => p !== null)).toBe(true);
  });

  it('placeFree drops any piece without touching the tray', () => {
    const game = gameWith(['I', 'O', 'T']);
    const res = game.placeFree('L', 0, 0, 0)!;
    expect(res.pieceId).toBe('L');
    expect(res.trayRefilled).toBe(false);
    expect(game.tray.pieces).toEqual(['I', 'O', 'T']);
    expect(game.score).toBe(4);
    expect(game.placeFree('I', 0, 8, 0)).toBeNull();
    expect(game.placeFree('I', 99, 0, 0)).toBeNull();
  });

  it('detects game over when no tray piece fits', () => {
    const size = 10;
    const height = 4;
    const grid = new Grid(size, height);
    // Lower layers: one hole per row/column (never full), all covered by the top layer.
    for (let z = 0; z < height - 1; z++)
      for (let x = 0; x < size; x++)
        for (let y = 0; y < size; y++) if (y !== (x + 1) % size) grid.set(x, y, z, 1);
    // Top layer: isolated diagonal pits plus one 4-wide slot at (5..8, 0).
    for (let x = 0; x < size; x++)
      for (let y = 0; y < size; y++) {
        const pit = x === y;
        const slot = y === 0 && x >= 5 && x <= 8;
        if (!pit && !slot) grid.set(x, y, height - 1, 1);
      }

    const game = new Game({ grid, tray: new Tray(createRng(1), ['I', 'O', 'O']) });
    expect(game.hasAnyMove()).toBe(true);
    const res = game.place(0, FLAT, 5, 0)!;
    expect(res.steps).toHaveLength(0);
    expect(res.gameOver).toBe(true);
    expect(game.gameOver).toBe(true);
    expect(game.place(1, FLAT, 0, 0)).toBeNull();
  });
});

describe('scoreFor', () => {
  it('multiplies each cascade step by its combo level', () => {
    const step = (n: number) => ({
      cleared: Array.from({ length: n }, () => [0, 0, 0] as const),
      lines: 1,
      moves: [],
    });
    expect(scoreFor(4, [])).toBe(4);
    expect(scoreFor(4, [step(10), step(10)])).toBe(4 + 100 + 200);
  });
});
