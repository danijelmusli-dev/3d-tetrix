import type { Vec3 } from './grid';

/**
 * 7 tetrominoes, plus D (domino, 2 cubes), M (mono, 1 cube) and B (2x2x2 box, 8 cubes), and the
 * bigger bricks: E (flat bar of 3), U (cup, 5), G (long L, 5), N (long zigzag, 5),
 * R (flat 2x3 slab, 6) and C (2x3x2 block, 12).
 */
export const PIECE_IDS = [
  'I',
  'O',
  'T',
  'S',
  'Z',
  'J',
  'L',
  'D',
  'M',
  'B',
  'E',
  'U',
  'G',
  'N',
  'R',
  'C',
] as const;
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

const WEIGHTS: Partial<Record<PieceId, number>> = {
  D: 0.6,
  M: 0.4,
  B: 0.4,
  E: 0.8,
  U: 0.6,
  G: 0.6,
  N: 0.6,
  R: 0.5,
  C: 0.25,
};

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
  E: flat([
    [0, 0],
    [1, 0],
    [2, 0],
  ]),
  // Cup: three in a row with both ends raised.
  U: flat([
    [0, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ]),
  // L with the long arm doubled.
  G: flat([
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 3],
  ]),
  // Long zigzag, like the letter S.
  N: flat([
    [0, 0],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 2],
  ]),
  R: flat([0, 1].flatMap((y) => [0, 1, 2].map((x): [number, number] => [x, y]))),
  C: [0, 1].flatMap((z) => [0, 1].flatMap((y) => [0, 1, 2].map((x): Vec3 => [x, y, z]))),
};

export const PIECES = {} as Record<PieceId, PieceDef>;
PIECE_IDS.forEach((id, i) => {
  PIECES[id] = { id, colorId: i + 1, cells: SHAPES[id], weight: WEIGHTS[id] ?? 1 };
});
