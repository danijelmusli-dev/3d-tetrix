/**
 * Pure helpers that turn screen-space intent into grid-space placement.
 *
 * The camera looks at the board from a fixed corner. Its horizontal
 * "screen-right" direction is closest to world +X and "toward the viewer" is
 * closest to world +Z (three.js). The board group is rotated by `quarter`
 * 90° turns (counter-clockwise from above), so those world directions map to
 * different grid axes per quarter. Grid x = local three x, grid y = local three z.
 */
import type { Grid, Vec3 } from '../core/grid';
import { rotateOrientation, type Axis, type Orientation } from '../core/orientations';
import { dropZ } from '../core/placement';
import type { PieceId } from '../core/pieces';

export type ScreenAxis = 'right' | 'toward';
export type RotationKind = 'spin' | 'tip' | 'roll';

/** Footprint offset so the piece is centered on `cell`, clamped onto the board. */
export function anchorFor(
  cell: readonly [number, number],
  extent: Vec3,
  size: number,
): [number, number] | null {
  const [cx, cy] = cell;
  if (cx < 0 || cy < 0 || cx >= size || cy >= size) return null;
  const clamp = (v: number, ext: number): number => Math.min(Math.max(v, 0), size - ext);
  return [
    clamp(cx - Math.floor((extent[0] - 1) / 2), extent[0]),
    clamp(cy - Math.floor((extent[1] - 1) / 2), extent[1]),
  ];
}

/**
 * Drop target for an orientation aimed at a grid column: footprint centered on
 * the column (clamped onto the board) and its landing z, or z null if it
 * cannot be dropped there. Null when the column is off the board. Always
 * computed from the orientation passed in, so it stays valid after rotations.
 */
export function aimTarget(
  grid: Grid,
  orientation: Orientation,
  column: readonly [number, number],
): { x: number; y: number; z: number | null } | null {
  const anchor = anchorFor(column, orientation.extent, grid.size);
  if (!anchor) return null;
  const [x, y] = anchor;
  return { x, y, z: dropZ(grid, orientation.cells, x, y) };
}

/** Grid axis (with sign) that currently points along a screen direction. */
export function gridAxisFor(
  quarter: number,
  screen: ScreenAxis,
): { axis: 'x' | 'y'; sign: 1 | -1 } {
  const q = ((quarter % 4) + 4) % 4;
  // Board-local direction of the world axis is R_y(-q·90°) applied to it.
  const table =
    screen === 'right'
      ? ([
          ['x', 1],
          ['y', 1],
          ['x', -1],
          ['y', -1],
        ] as const)
      : ([
          ['y', 1],
          ['x', -1],
          ['y', -1],
          ['x', 1],
        ] as const);
  const [axis, sign] = table[q]!;
  return { axis, sign };
}

export type ScreenDirection = 'left' | 'right' | 'away' | 'toward';

/** One-cell grid step (dx, dy) for a screen direction at the current board quarter. */
export function stepFor(quarter: number, direction: ScreenDirection): [number, number] {
  const horizontal = direction === 'left' || direction === 'right';
  const { axis, sign } = gridAxisFor(quarter, horizontal ? 'right' : 'toward');
  const s = direction === 'left' || direction === 'away' ? -sign : sign;
  return axis === 'x' ? [s, 0] : [0, s];
}

/**
 * Orientation to start with when a piece is picked up, so it appears on the
 * rotated board the same way its (unrotated) thumbnail shows it.
 * A grid +z quarter turn is clockwise from above, undoing one board turn.
 */
export function initialOrientation(id: PieceId, quarter: number): number {
  const q = ((quarter % 4) + 4) % 4;
  let index = 0;
  for (let i = 0; i < q; i++) index = rotateOrientation(id, index, 'z', 1);
  return index;
}

/**
 * spin = around the vertical axis, tip = around screen-right (top tips away/toward),
 * roll = around the toward-viewer axis (top rolls left/right).
 */
export function rotateForView(
  id: PieceId,
  index: number,
  kind: RotationKind,
  quarter: number,
  dir: 1 | -1,
): number {
  if (kind === 'spin') return rotateOrientation(id, index, 'z', dir);
  const { axis, sign } = gridAxisFor(quarter, kind === 'tip' ? 'right' : 'toward');
  return rotateOrientation(id, index, axis as Axis, (sign * dir) as 1 | -1);
}
