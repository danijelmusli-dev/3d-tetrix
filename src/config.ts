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
  0xe56ba8, // D (domino) - pink
  0xe9e4d4, // M (single cube) - ivory
  0xb8e05a, // B (2x2x2 box) - lime
  0x8fa3b8, // E (bar of 3) - steel
  0x7a5be0, // U (cup) - indigo
  0xf0c04a, // G (long L) - gold
  0x2fb590, // N (long zigzag) - jade
  0xc75a7a, // R (2x3 slab) - rose
  0x9a6a45, // C (2x3x2 block) - bronze
  0xff8f6b, // A (corner) - coral
  0x4fd0e0, // P (plus) - sky
  0xc9d84a, // F (staircase) - chartreuse
  0x6b7bd6, // H (tower) - periwinkle
  0xe0489a, // W (screw) - magenta
  0x3f9e5a, // Y (tripod) - forest
  0xd8d0f0, // Q (ring) - lavender
  0xb5502d, // V (long T) - rust
] as const;

/** Block skins players can pick (see render/skins.ts), with their menu names. */
export const SKINS = [
  { id: 'classic', name: 'Classic' },
  { id: 'candy', name: 'Candy' },
  { id: 'wood', name: 'Wood' },
  { id: 'stone', name: 'Stone' },
  { id: 'glass', name: 'Crystal' },
  { id: 'slime', name: 'Slime' },
  { id: 'metal', name: 'Steel' },
  { id: 'pixel', name: 'Pixel' },
  { id: 'studs', name: 'Studs' },
] as const;
export type SkinId = (typeof SKINS)[number]['id'];
export const DEFAULT_SKIN: SkinId = 'classic';

export function isSkinId(value: unknown): value is SkinId {
  return SKINS.some((skin) => skin.id === value);
}

export const COLORS = {
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
