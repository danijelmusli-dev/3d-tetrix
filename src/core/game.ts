import { resolveCascade, type ClearStep } from './clearing';
import { Grid, type Vec3 } from './grid';
import { getOrientations } from './orientations';
import { PIECES, type PieceId } from './pieces';
import { canReach, dropZ, fallZ } from './placement';
import { createRng } from './rng';
import { Tray } from './tray';

export const POINTS_PER_PLACED_CELL = 1;
export const POINTS_PER_CLEARED_CELL = 10;

export interface GameOptions {
  size?: number;
  height?: number;
  seed?: number;
  grid?: Grid;
  tray?: Tray;
}

export interface PlaceResult {
  pieceId: PieceId;
  colorId: number;
  placed: Vec3[];
  /** Grid as it was before the piece landed (for replaying the placement). */
  before: Grid;
  /** Ordered clear → drop steps; step i scores at combo level i + 1. */
  steps: ClearStep[];
  scoreDelta: number;
  trayRefilled: boolean;
  gameOver: boolean;
}

/** Placement points plus cleared cells, each cascade step multiplied by its combo level. */
export function scoreFor(placedCells: number, steps: readonly ClearStep[]): number {
  return steps.reduce(
    (sum, step, i) => sum + step.cleared.length * POINTS_PER_CLEARED_CELL * (i + 1),
    placedCells * POINTS_PER_PLACED_CELL,
  );
}

export class Game {
  readonly grid: Grid;
  tray: Tray;
  score = 0;
  gameOver = false;

  constructor(options: GameOptions = {}) {
    const { size = 10, height = 10, seed = Date.now() } = options;
    this.grid = options.grid ?? new Grid(size, height);
    this.tray = options.tray ?? new Tray(createRng(seed));
    this.gameOver = !this.hasAnyMove();
  }

  /** Start over: empty board, zero score, fresh tray. */
  reset(seed = Date.now()): void {
    this.grid.cells.fill(0);
    this.tray = new Tray(createRng(seed));
    this.score = 0;
    this.gameOver = !this.hasAnyMove();
  }

  /** Resting z for the tray piece in `slot` at `orientation` and footprint (x, y), or null. */
  landingZ(slot: number, orientation: number, x: number, y: number): number | null {
    const id = this.tray.pieces[slot];
    const o = id ? getOrientations(id)[orientation] : undefined;
    return o ? dropZ(this.grid, o.cells, x, y) : null;
  }

  place(slot: number, orientation: number, x: number, y: number): PlaceResult | null {
    if (this.gameOver) return null;
    const z = this.landingZ(slot, orientation, x, y);
    if (z === null) return null;

    const pieceId = this.tray.take(slot);
    const trayRefilled = this.tray.refillIfEmpty();
    return this.commit(pieceId, orientation, x, y, z, trayRefilled);
  }

  /**
   * Free-move placement: put the tray piece at (x, y, z) if it can be
   * maneuvered there from above without passing through cubes; it then falls
   * until supported.
   */
  placeAt(slot: number, orientation: number, x: number, y: number, z: number): PlaceResult | null {
    if (this.gameOver) return null;
    const id = this.tray.pieces[slot];
    const o = id ? getOrientations(id)[orientation] : undefined;
    if (!id || !o || !canReach(this.grid, o.cells, x, y, z)) return null;
    const rest = fallZ(this.grid, o.cells, x, y, z)!;
    this.tray.take(slot);
    const trayRefilled = this.tray.refillIfEmpty();
    return this.commit(id, orientation, x, y, rest, trayRefilled);
  }

  /** Drop any piece, bypassing the tray (debug tooling). Still scores and clears. */
  placeFree(pieceId: PieceId, orientation: number, x: number, y: number): PlaceResult | null {
    const o = getOrientations(pieceId)[orientation];
    const z = o ? dropZ(this.grid, o.cells, x, y) : null;
    if (z === null) return null;
    return this.commit(pieceId, orientation, x, y, z, false);
  }

  private commit(
    pieceId: PieceId,
    orientation: number,
    x: number,
    y: number,
    z: number,
    trayRefilled: boolean,
  ): PlaceResult {
    const before = this.grid.clone();
    const { colorId } = PIECES[pieceId];
    const placed = getOrientations(pieceId)[orientation]!.cells.map(([dx, dy, dz]): Vec3 => [
      x + dx,
      y + dy,
      z + dz,
    ]);
    for (const [cx, cy, cz] of placed) this.grid.set(cx, cy, cz, colorId);

    const steps = resolveCascade(this.grid);
    const scoreDelta = scoreFor(placed.length, steps);
    this.score += scoreDelta;
    this.gameOver = !this.hasAnyMove();

    return {
      pieceId,
      colorId,
      placed,
      before,
      steps,
      scoreDelta,
      trayRefilled,
      gameOver: this.gameOver,
    };
  }

  /** True if any tray piece fits anywhere in any orientation. */
  hasAnyMove(): boolean {
    const { size } = this.grid;
    return this.tray.pieces.some(
      (id) =>
        id !== null &&
        getOrientations(id).some((o) => {
          for (let x = 0; x <= size - o.extent[0]; x++)
            for (let y = 0; y <= size - o.extent[1]; y++)
              if (dropZ(this.grid, o.cells, x, y) !== null) return true;
          return false;
        }),
    );
  }
}
