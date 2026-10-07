/** Board footprint (cells per side). */
export const BOARD_SIZE = 10;
/** Max stack height in layers. */
export const BOARD_HEIGHT = 10;

/** Board sizes players can pick (pieces are 4 long, so 6 leaves room to move). */
export const BOARD_LIMITS = { minSize: 6, maxSize: 14, minHeight: 6, maxHeight: 14 } as const;

/** Piece colors, indexed by colorId - 1 (colorId 0 = empty cell). */
export const PIECE_COLORS = [
  0xd9a441, // I - yellow
  0x4a63d8, // O - blue
  0xa04ad8, // T - purple
  0x5bc04a, // S - green
  0xd2402f, // Z - red
  0x3fb6c9, // J - cyan
  0xe07b2c, // L - orange
] as const;

export const COLORS = {
  background: 0x3a3a3a,
  slab: 0x52646e,
  cellLines: 0x6d808b,
} as const;

/**
 * Fixed camera: 3/4 view from a corner, matching the reference image.
 * Distance is auto-fit so the full board volume (all layers) stays on screen.
 */
export const CAMERA = {
  fov: 35,
  elevationDeg: 36,
  azimuthDeg: -40,
  /** Fraction of the viewport kept free around the framed volume. */
  margin: 0.06,
  /** Layers framed above the tallest stack (an upright I is 4 tall). */
  headroom: 4,
  /** Fewest layers ever framed, so an empty board is not zoomed in too far. */
  minLayers: 4,
  zoomMs: 600,
  spinMs: 250,
  /** Bird's-eye view (Space): almost straight down; exactly 90° would make lookAt degenerate. */
  topElevationDeg: 88,
  tiltMs: 450,
} as const;

/** Placement / clear animation timings (ms). */
export const ANIM = {
  dropMs: 200,
  /** Height (layers) the placed piece drops in from. */
  dropHeight: 0.8,
  flashMs: 150,
  shrinkMs: 180,
  fallMs: 220,
  scoreCountMs: 400,
} as const;
