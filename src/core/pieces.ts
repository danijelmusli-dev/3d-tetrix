import type { Vec3 } from './grid';

export const PIECE_IDS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const;
export type PieceId = (typeof PIECE_IDS)[number];

export interface PieceDef {
  id: PieceId;
  /** 1-based; matches PIECE_COLORS[colorId - 1] in config. */
  colorId: number;
  /** Base shape, lying flat on z = 0. */
  cells: readonly Vec3[];
}

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
};

export const PIECES = {} as Record<PieceId, PieceDef>;
PIECE_IDS.forEach((id, i) => {
  PIECES[id] = { id, colorId: i + 1, cells: SHAPES[id] };
});
