import type { Grid, Vec3 } from './grid';

export interface CellMove {
  from: Vec3;
  to: Vec3;
}

export interface ClearStep {
  /** Unique cells removed in this step. */
  cleared: Vec3[];
  /** Number of full lines (X and Y) that triggered the step. */
  lines: number;
  /** Cubes that fell to fill the gaps. */
  moves: CellMove[];
}

/** Every full line along X or Y on any layer; crossing lines share their cell once. */
export function findFullLines(grid: Grid): { cells: Vec3[]; lines: number } {
  const { size, height } = grid;
  const marked = new Map<string, Vec3>();
  let lines = 0;
  const mark = (c: Vec3): void => void marked.set(c.join(','), c);

  for (let z = 0; z < height; z++) {
    for (let i = 0; i < size; i++) {
      let rowX = true;
      let rowY = true;
      for (let j = 0; j < size && (rowX || rowY); j++) {
        if (grid.isEmpty(j, i, z)) rowX = false;
        if (grid.isEmpty(i, j, z)) rowY = false;
      }
      if (rowX) {
        lines++;
        for (let j = 0; j < size; j++) mark([j, i, z]);
      }
      if (rowY) {
        lines++;
        for (let j = 0; j < size; j++) mark([i, j, z]);
      }
    }
  }
  return { cells: [...marked.values()], lines };
}

/**
 * Remove `cleared` cells, then drop every cube above them by the number of
 * cleared cells beneath it in its column. Pre-existing gaps are kept.
 */
export function clearAndDrop(grid: Grid, cleared: readonly Vec3[]): CellMove[] {
  const columns = new Map<string, Set<number>>();
  for (const [x, y, z] of cleared) {
    grid.set(x, y, z, 0);
    const key = `${x},${y}`;
    let zs = columns.get(key);
    if (!zs) columns.set(key, (zs = new Set()));
    zs.add(z);
  }

  const moves: CellMove[] = [];
  for (const [key, zs] of columns) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    let below = 0;
    for (let z = 0; z < grid.height; z++) {
      if (zs.has(z)) {
        below++;
        continue;
      }
      const colorId = grid.get(x, y, z);
      if (colorId === 0 || below === 0) continue;
      grid.set(x, y, z - below, colorId);
      grid.set(x, y, z, 0);
      moves.push({ from: [x, y, z], to: [x, y, z - below] });
    }
  }
  return moves;
}

/** Clear full lines and apply drops repeatedly until stable. Mutates `grid`. */
export function resolveCascade(grid: Grid): ClearStep[] {
  const steps: ClearStep[] = [];
  for (;;) {
    const { cells, lines } = findFullLines(grid);
    if (lines === 0) return steps;
    steps.push({ cleared: cells, lines, moves: clearAndDrop(grid, cells) });
  }
}
