import { Grid } from '../../src/core/grid';

/** Fill a line along X at row y, layer z, leaving holes at the given x. */
export function fillRowX(grid: Grid, y: number, z: number, holes: number[] = [], color = 1): void {
  for (let x = 0; x < grid.size; x++) if (!holes.includes(x)) grid.set(x, y, z, color);
}

/** Fill a line along Y at column x, layer z, leaving holes at the given y. */
export function fillRowY(grid: Grid, x: number, z: number, holes: number[] = [], color = 1): void {
  for (let y = 0; y < grid.size; y++) if (!holes.includes(y)) grid.set(x, y, z, color);
}

export function countFilled(grid: Grid): number {
  return grid.cells.reduce((n, v) => n + (v === 0 ? 0 : 1), 0);
}
