import type { Grid, Vec3 } from './grid';

/** True if every cell, offset by (x, y, z), is inside the grid and empty. */
export function fits(grid: Grid, cells: readonly Vec3[], x: number, y: number, z: number): boolean {
  return cells.every(([dx, dy, dz]) => {
    const cx = x + dx;
    const cy = y + dy;
    const cz = z + dz;
    return grid.inBounds(cx, cy, cz) && grid.isEmpty(cx, cy, cz);
  });
}

/**
 * Drop a piece straight down from above the board at footprint offset (x, y)
 * and return the z where it comes to rest, ignoring the height cap (the piece
 * may stick out above it). Null only if the footprint leaves the board.
 */
export function restingZ(grid: Grid, cells: readonly Vec3[], x: number, y: number): number | null {
  const onBoard = cells.every(
    ([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < grid.size && y + dy < grid.size,
  );
  if (!onBoard) return null;

  // Cells above the cap are open air while the piece is still falling in.
  const free = (z: number): boolean =>
    cells.every(([dx, dy, dz]) => z + dz >= grid.height || grid.isEmpty(x + dx, y + dy, z + dz));

  let z = grid.height;
  while (z > 0 && free(z - 1)) z--;
  return z;
}

/**
 * Like `restingZ`, but null when the resting piece would stick out above the
 * height cap — i.e. the landing z of a legal drop, or null.
 */
export function dropZ(grid: Grid, cells: readonly Vec3[], x: number, y: number): number | null {
  const z = restingZ(grid, cells, x, y);
  if (z === null) return null;
  const top = z + Math.max(...cells.map(([, , dz]) => dz));
  return top < grid.height ? z : null;
}

/** From a fitting position, move down while the piece still fits. Null if blocked. */
export function fallZ(
  grid: Grid,
  cells: readonly Vec3[],
  x: number,
  y: number,
  z: number,
): number | null {
  if (!fits(grid, cells, x, y, z)) return null;
  while (z > 0 && fits(grid, cells, x, y, z - 1)) z--;
  return z;
}

/**
 * True if the piece can be maneuvered to (x, y, z) from above the board by
 * unit moves (±x, ±y, ±z) through free space, never passing through cubes.
 * Entry is any fitting position on the highest layer the piece fits in.
 */
export function canReach(
  grid: Grid,
  cells: readonly Vec3[],
  x: number,
  y: number,
  z: number,
): boolean {
  if (!fits(grid, cells, x, y, z)) return false;
  const { size, height } = grid;
  const topZ = height - 1 - Math.max(...cells.map(([, , dz]) => dz));
  const index = (px: number, py: number, pz: number): number => px + py * size + pz * size * size;
  const seen = new Uint8Array(size * size * height);
  const queue: Vec3[] = [];
  const visit = (px: number, py: number, pz: number): void => {
    if (px < 0 || py < 0 || pz < 0 || px >= size || py >= size || pz > topZ) return;
    const i = index(px, py, pz);
    if (seen[i] || !fits(grid, cells, px, py, pz)) return;
    seen[i] = 1;
    queue.push([px, py, pz]);
  };

  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) visit(px, py, topZ);
  for (let head = 0; head < queue.length; head++) {
    const [px, py, pz] = queue[head]!;
    if (px === x && py === y && pz === z) return true;
    visit(px + 1, py, pz);
    visit(px - 1, py, pz);
    visit(px, py + 1, pz);
    visit(px, py - 1, pz);
    visit(px, py, pz + 1);
    visit(px, py, pz - 1);
  }
  return false;
}

/**
 * Slide the piece within layer `z` from `from` toward `target`, never through
 * cubes. Returns the reachable footprint offset closest to the target.
 */
export function slideToward(
  grid: Grid,
  cells: readonly Vec3[],
  from: readonly [number, number],
  z: number,
  target: readonly [number, number],
): [number, number] {
  const [fx, fy] = from;
  if (!fits(grid, cells, fx, fy, z)) return [fx, fy];
  const { size } = grid;
  const seen = new Uint8Array(size * size);
  const queue: [number, number][] = [[fx, fy]];
  seen[fx + fy * size] = 1;
  const dist = ([px, py]: readonly [number, number]): number =>
    (px - target[0]) ** 2 + (py - target[1]) ** 2;

  let best: [number, number] = [fx, fy];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]!;
    if (dist(cur) < dist(best)) best = cur;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = cur[0] + dx;
      const ny = cur[1] + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size || seen[nx + ny * size]) continue;
      seen[nx + ny * size] = 1;
      if (fits(grid, cells, nx, ny, z)) queue.push([nx, ny]);
    }
  }
  return best;
}

/**
 * Rotation kick offsets, closest first: stay, sideways, up, diagonal, two away,
 * two up, three away (an I turning against a wall needs three).
 */
const KICKS: readonly Vec3[] = [
  [0, 0, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [2, 0, 0],
  [-2, 0, 0],
  [0, 2, 0],
  [0, -2, 0],
  [0, 0, 2],
  [3, 0, 0],
  [-3, 0, 0],
  [0, 3, 0],
  [0, -3, 0],
];

/**
 * Where a freshly rotated piece can sit near (x, y, z): the first kick offset
 * whose position fits, or null if none does. Like standard Tetris kicks, the
 * offset is tested directly (no path), so a kick can pop a piece past a thin
 * edge; `canReachWithRotations` uses the same rule, keeping controls and rules
 * in agreement.
 */
export function kickPosition(
  grid: Grid,
  cells: readonly Vec3[],
  x: number,
  y: number,
  z: number,
): Vec3 | null {
  for (const [dx, dy, dz] of KICKS) {
    if (fits(grid, cells, x + dx, y + dy, z + dz)) return [x + dx, y + dy, z + dz];
  }
  return null;
}
