import type { Grid, Vec3 } from './grid';

/**
 * Empty cells hidden under cubes: every empty cell that has at least one
 * filled cell above it in the same column. Open air above a column's highest
 * cube is not a gap.
 */
export function hiddenGaps(grid: Grid): Vec3[] {
  const gaps: Vec3[] = [];
  for (let y = 0; y < grid.size; y++)
    for (let x = 0; x < grid.size; x++) {
      let covered = false;
      for (let z = grid.height - 1; z >= 0; z--) {
        if (!grid.isEmpty(x, y, z)) covered = true;
        else if (covered) gaps.push([x, y, z]);
      }
    }
  return gaps;
}
