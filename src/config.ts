/** Board footprint (cells per side). */
export const BOARD_SIZE = 10;
/** Max stack height in layers. */
export const BOARD_HEIGHT = 10;

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

/** Fixed camera: 3/4 view from a corner, matching the reference image. */
export const CAMERA = {
  fov: 35,
  elevationDeg: 36,
  azimuthDeg: -40,
  distance: 23,
  targetY: 0.8,
} as const;
