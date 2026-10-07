import { describe, expect, it } from 'vitest';
import { PIECE_IDS, PIECES } from '../../src/core/pieces';
import {
  getOrientations,
  normalize,
  orientationKey,
  rotateOrientation,
} from '../../src/core/orientations';

describe('pieces', () => {
  it('defines 7 flat tetrominoes with unique colors', () => {
    expect(PIECE_IDS).toHaveLength(7);
    const colors = new Set(PIECE_IDS.map((id) => PIECES[id].colorId));
    expect(colors.size).toBe(7);
    for (const id of PIECE_IDS) {
      expect(PIECES[id].cells).toHaveLength(4);
      expect(PIECES[id].cells.every(([, , z]) => z === 0)).toBe(true);
    }
  });
});

describe('normalize', () => {
  it('shifts cells so each axis starts at 0 and sorts them', () => {
    expect(
      normalize([
        [3, 5, 2],
        [2, 5, 2],
      ]),
    ).toEqual([
      [0, 0, 0],
      [1, 0, 0],
    ]);
  });
});

describe('getOrientations', () => {
  // In 3D, S flipped over is Z and J flipped over is L, so those have no mirror symmetry.
  const expected = { I: 3, O: 3, T: 12, S: 12, Z: 12, J: 24, L: 24 } as const;

  for (const id of PIECE_IDS) {
    it(`${id} has ${expected[id]} distinct 3D orientations`, () => {
      const list = getOrientations(id);
      expect(list).toHaveLength(expected[id]);
      expect(new Set(list.map((o) => orientationKey(o.cells))).size).toBe(expected[id]);
    });
  }

  it('keeps the flat base shape as orientation 0', () => {
    expect(getOrientations('I')[0]!.cells).toEqual(normalize(PIECES.I.cells));
    expect(getOrientations('I')[0]!.extent).toEqual([4, 1, 1]);
  });

  it('includes upright I (4 tall)', () => {
    expect(getOrientations('I').some((o) => o.extent[2] === 4)).toBe(true);
  });

  it('every orientation is normalized with 4 cells', () => {
    for (const id of PIECE_IDS) {
      for (const o of getOrientations(id)) {
        expect(o.cells).toHaveLength(4);
        for (const axis of [0, 1, 2] as const) {
          expect(Math.min(...o.cells.map((c) => c[axis]))).toBe(0);
          expect(Math.max(...o.cells.map((c) => c[axis])) + 1).toBe(o.extent[axis]);
        }
      }
    }
  });
});

describe('rotateOrientation', () => {
  it('rotating flat I around Z gives I along Y', () => {
    const i = rotateOrientation('I', 0, 'z', 1);
    expect(getOrientations('I')[i]!.extent).toEqual([1, 4, 1]);
  });

  it('rotating flat I around Y stands it upright', () => {
    const i = rotateOrientation('I', 0, 'y', 1);
    expect(getOrientations('I')[i]!.extent).toEqual([1, 1, 4]);
  });

  it('rotation then inverse returns to start', () => {
    for (const axis of ['x', 'y', 'z'] as const) {
      for (let start = 0; start < 24; start++) {
        const there = rotateOrientation('L', start, axis, 1);
        expect(rotateOrientation('L', there, axis, -1)).toBe(start);
      }
    }
  });

  it('four quarter turns return to start', () => {
    let i = 5;
    for (let n = 0; n < 4; n++) i = rotateOrientation('T', i, 'x', 1);
    expect(i).toBe(5);
  });

  it('rejects an unknown orientation index', () => {
    expect(() => rotateOrientation('O', 99, 'x', 1)).toThrow(RangeError);
  });
});
