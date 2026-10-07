import type { Vec3 } from './grid';
import { PIECES, type PieceId } from './pieces';

export type Axis = 'x' | 'y' | 'z';

export interface Orientation {
  /** Normalized cells: min 0 on every axis, sorted. */
  cells: readonly Vec3[];
  /** Bounding box size per axis. */
  extent: Vec3;
}

/** Quarter turns (right-handed, counter-clockwise looking down the axis). */
const QUARTER_TURN: Record<Axis, (c: Vec3) => Vec3> = {
  x: ([x, y, z]) => [x, -z, y],
  y: ([x, y, z]) => [z, y, -x],
  z: ([x, y, z]) => [-y, x, z],
};

export function normalize(cells: readonly Vec3[]): Vec3[] {
  const min = [0, 1, 2].map((a) => Math.min(...cells.map((c) => c[a]!)));
  // `+ 0` turns the -0 that rotations produce into 0.
  return cells
    .map(([x, y, z]): Vec3 => [x - min[0]! + 0, y - min[1]! + 0, z - min[2]! + 0])
    .sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
}

export function orientationKey(cells: readonly Vec3[]): string {
  return cells.map((c) => c.join(',')).join(';');
}

function toOrientation(cells: Vec3[]): Orientation {
  const extent = [0, 1, 2].map((a) => Math.max(...cells.map((c) => c[a]!)) + 1) as unknown as Vec3;
  return { cells, extent };
}

/** All distinct orientations reachable by 90° rotations; index 0 is the base shape. */
export function generateOrientations(base: readonly Vec3[]): Orientation[] {
  const start = normalize(base);
  const seen = new Set([orientationKey(start)]);
  const result = [toOrientation(start)];
  for (let i = 0; i < result.length; i++) {
    for (const turn of Object.values(QUARTER_TURN)) {
      const next = normalize(result[i]!.cells.map(turn));
      const key = orientationKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(toOrientation(next));
    }
  }
  return result;
}

const cache = new Map<PieceId, Orientation[]>();

export function getOrientations(id: PieceId): readonly Orientation[] {
  let list = cache.get(id);
  if (!list) {
    list = generateOrientations(PIECES[id].cells);
    cache.set(id, list);
  }
  return list;
}

/** Index of the orientation reached by one quarter turn of `index` around `axis`. */
export function rotateOrientation(id: PieceId, index: number, axis: Axis, dir: 1 | -1): number {
  const list = getOrientations(id);
  const current = list[index];
  if (!current) throw new RangeError(`No orientation ${index} for piece ${id}`);
  let cells: readonly Vec3[] = current.cells;
  for (let n = 0; n < (dir === 1 ? 1 : 3); n++) cells = cells.map(QUARTER_TURN[axis]);
  const key = orientationKey(normalize(cells));
  return list.findIndex((o) => orientationKey(o.cells) === key);
}
