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
