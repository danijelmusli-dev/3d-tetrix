import type { Grid } from './grid';
import { getOrientations, rotateOrientation, type Axis } from './orientations';
import type { PieceId } from './pieces';
import { fits, kickPosition } from './placement';

const ROTATIONS: readonly [Axis, 1 | -1][] = [
  ['x', 1],
  ['x', -1],
  ['y', 1],
  ['y', -1],
  ['z', 1],
  ['z', -1],
];

const neighborCache = new Map<PieceId, number[][]>();

/** For each orientation index, the orientation reached by each quarter turn. */
function rotationNeighbors(id: PieceId): number[][] {
  let table = neighborCache.get(id);
  if (!table) {
    table = getOrientations(id).map((_, i) =>
      ROTATIONS.map(([axis, dir]) => rotateOrientation(id, i, axis, dir)),
    );
    neighborCache.set(id, table);
  }
  return table;
}

/**
 * Like `canReach`, but the piece may also rotate on the way (with the same
 * kicks the slide controls use). This is exactly what a player can do in
 * slide mode, so any position the controls produce is accepted here.
 *
 * Search space is position x orientation; only run when plain `canReach`
 * fails, which is rare.
 */
export function canReachWithRotations(
  grid: Grid,
  id: PieceId,
  orientation: number,
  x: number,
  y: number,
  z: number,
): boolean {
  const orientations = getOrientations(id);
  const target = orientations[orientation];
  if (!target || !fits(grid, target.cells, x, y, z)) return false;

  const { size, height } = grid;
  const perOrientation = size * size * height;
  const index = (o: number, px: number, py: number, pz: number): number =>
    o * perOrientation + (pz * size + py) * size + px;
  const seen = new Uint8Array(orientations.length * perOrientation);
  const queue: number[] = [];
  const visit = (o: number, px: number, py: number, pz: number): void => {
    if (px < 0 || py < 0 || pz < 0 || px >= size || py >= size || pz >= height) return;
    const i = index(o, px, py, pz);
    if (seen[i] || !fits(grid, orientations[o]!.cells, px, py, pz)) return;
    seen[i] = 1;
    queue.push(i);
  };

  // Enter from above: every fitting spot on the highest layer each orientation fits in.
  orientations.forEach((o, oi) => {
    const topZ = height - o.extent[2];
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) visit(oi, px, py, topZ);
  });

  const neighbors = rotationNeighbors(id);
  const goal = index(orientation, x, y, z);
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]!;
    if (i === goal) return true;
    const o = Math.floor(i / perOrientation);
    const rest = i % perOrientation;
    const px = rest % size;
    const py = Math.floor(rest / size) % size;
    const pz = Math.floor(rest / (size * size));
    visit(o, px + 1, py, pz);
    visit(o, px - 1, py, pz);
    visit(o, px, py + 1, pz);
    visit(o, px, py - 1, pz);
    visit(o, px, py, pz + 1);
    visit(o, px, py, pz - 1);
    for (const next of neighbors[o]!) {
      const kicked = kickPosition(grid, orientations[next]!.cells, px, py, pz);
      if (kicked) visit(next, ...kicked);
    }
  }
  return false;
}
