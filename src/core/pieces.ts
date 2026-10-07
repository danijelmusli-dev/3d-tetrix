import type { Vec3 } from './grid';

/** 7 tetrominoes, plus D (domino, 2 cubes), M (mono, 1 cube) and B (2x2x2 box, 8 cubes). */
export const PIECE_IDS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'D', 'M', 'B'] as const;
export type PieceId = (typeof PIECE_IDS)[number];

export interface PieceDef {
  id: PieceId;
  /** 1-based; matches PIECE_COLORS[colorId - 1] in config. */
  colorId: number;
  /** Base shape, resting on z = 0 (all flat except the box). */
  cells: readonly Vec3[];
  /** Relative chance of being dealt. Small pieces are rarer so they stay a treat. */
  weight: number;
}

const WEIGHTS: Partial<Record<PieceId, number>> = { D: 0.6, M: 0.4, B: 0.4 };

const flat = (points: [number, number][]): Vec3[] => points.map(([x, y]) => [x, y, 0]);

const SHAPES: Record<PieceId, Vec3[]> = {
  I: flat([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ]),
  O: flat([
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]),
  T: flat([
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ]),
  S: flat([
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ]),
  Z: flat([
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ]),
  J: flat([
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ]),
  L: flat([
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ]),
  D: flat([
    [0, 0],
    [1, 0],
  ]),
  M: flat([[0, 0]]),
  // The O square with a second layer on top.
  B: [0, 1].flatMap((z) =>
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ].map(([x, y]): Vec3 => [x!, y!, z]),
  ),
};

export const PIECES = {} as Record<PieceId, PieceDef>;
PIECE_IDS.forEach((id, i) => {
  PIECES[id] = { id, colorId: i + 1, cells: SHAPES[id], weight: WEIGHTS[id] ?? 1 };
});
