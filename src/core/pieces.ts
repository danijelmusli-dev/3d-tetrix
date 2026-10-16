import type { Vec3 } from './grid';

/**
 * 7 tetrominoes, plus D (domino, 2 cubes), M (mono, 1 cube) and B (2x2x2 box, 8 cubes), and the
 * bigger bricks: E (flat bar of 3), U (cup, 5), G (long L, 5), N (long zigzag, 5),
 * R (flat 2x3 slab, 6) and C (2x3x2 block, 12), then A (corner, 3), P (plus, 5),
 * F (staircase, 6), H (upright 2x1x3 tower, 6), W (screw, 4), Y (tripod, 4),
 * Q (3x3 ring, 8) and V (long T, 5).
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
  'A',
  'P',
  'F',
  'H',
  'W',
  'Y',
  'Q',
  'V',
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
  /** Score at which this brick starts being dealt; 0 = from the first hand. */
  unlockScore: number;
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
  A: 0.8,
  P: 0.6,
  F: 0.5,
  H: 0.5,
  W: 0.7,
  Y: 0.7,
  Q: 0.3,
  V: 0.6,
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
  A: flat([
    [0, 0],
    [1, 0],
    [0, 1],
  ]),
  P: flat([
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 2],
  ]),
  // Steps of height 3, 2 and 1.
  F: [
    [0, 0, 0],
    [0, 0, 1],
    [0, 0, 2],
    [1, 0, 0],
    [1, 0, 1],
    [2, 0, 0],
  ],
  // Thin pillar standing 3 high.
  H: [0, 1, 2].flatMap((z): Vec3[] => [
    [0, 0, z],
    [1, 0, z],
  ]),
  // Twisted: one step along each axis in turn (not flat, not mirror-symmetric).
  W: [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 1],
  ],
  // Corner cube with a leg along each axis.
  Y: [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  Q: flat(
    [0, 1, 2]
      .flatMap((y) => [0, 1, 2].map((x): [number, number] => [x, y]))
      .filter(([x, y]) => x !== 1 || y !== 1),
  ),
  V: flat([
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
    [1, 2],
  ]),
};

/**
 * The classic tetrominoes, domino, single cube and bar of 3 are dealt from the start;
 * the odd shapes arrive as the score climbs, the biggest last.
 */
const UNLOCK_SCORES: Partial<Record<PieceId, number>> = {
  B: 250,
  A: 300,
  P: 500,
  U: 500,
  V: 800,
  G: 800,
  N: 1000,
  R: 1000,
  F: 1300,
  W: 1600,
  Y: 1600,
  H: 2000,
  Q: 2500,
  C: 3000,
};

export const PIECES = {} as Record<PieceId, PieceDef>;
PIECE_IDS.forEach((id, i) => {
  PIECES[id] = {
    id,
    colorId: i + 1,
    cells: SHAPES[id],
    weight: WEIGHTS[id] ?? 1,
    unlockScore: UNLOCK_SCORES[id] ?? 0,
  };
});
