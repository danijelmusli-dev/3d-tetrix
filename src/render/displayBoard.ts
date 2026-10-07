import type { CellMove } from '../core/clearing';
import type { Grid, Vec3 } from '../core/grid';
import type { DisplayCube } from './boardView';

const key = ([x, y, z]: Vec3): string => `${x},${y},${z}`;

/**
 * Cubes currently on screen, keyed by the grid cell they belong to. Used to
 * replay a placement (drop, clears, falls) step by step while the real grid
 * already holds the final state. Positions on the cube objects may be
 * fractional mid-animation; keys always hold the logical cell.
 */
export class DisplayBoard {
  private readonly cubes = new Map<string, DisplayCube>();

  static fromGrid(grid: Grid): DisplayBoard {
    const board = new DisplayBoard();
    for (const { pos, colorId } of grid.filled()) board.add([pos], colorId);
    return board;
  }

  add(cells: readonly Vec3[], colorId: number): DisplayCube[] {
    return cells.map((pos) => {
      const cube: DisplayCube = { x: pos[0], y: pos[1], z: pos[2], colorId };
      this.cubes.set(key(pos), cube);
      return cube;
    });
  }

  /** Cubes at the given cells (missing cells are skipped). */
  at(cells: readonly Vec3[]): DisplayCube[] {
    return cells.flatMap((pos) => this.cubes.get(key(pos)) ?? []);
  }

  remove(cells: readonly Vec3[]): void {
    for (const pos of cells) this.cubes.delete(key(pos));
  }

  /**
   * Re-key moved cubes to their destination cells and set their final z.
   * Returns each moved cube with its starting z so callers can animate the fall.
   */
  move(moves: readonly CellMove[]): { cube: DisplayCube; fromZ: number; toZ: number }[] {
    const taken = moves.flatMap(({ from, to }) => {
      const cube = this.cubes.get(key(from));
      if (!cube) return [];
      this.cubes.delete(key(from));
      return [{ cube, to }];
    });
    return taken.map(({ cube, to }) => {
      const fromZ = cube.z;
      cube.z = to[2];
      this.cubes.set(key(to), cube);
      return { cube, fromZ, toZ: to[2] };
    });
  }

  list(): DisplayCube[] {
    return [...this.cubes.values()];
  }
}
