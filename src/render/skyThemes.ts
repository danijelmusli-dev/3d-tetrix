/** One sky look, reached once the score passes `minScore`. Colors are sRGB hex. */
export interface SkyTheme {
  name: string;
  minScore: number;
  top: number;
  horizon: number;
  bottom: number;
  /** Sun glow color, strength 0..1 and height on screen (0 bottom .. 1 top). */
  sun: number;
  sunStrength: number;
  sunY: number;
  /** How visible the moon is, 0..1 (its look is rolled separately, see MOONS). */
  moon: number;
  clouds: number;
  cloudColor: number;
  stars: number;
  aurora: number;
  /** Scene lighting so cubes match the sky. */
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sunLight: number;
  sunIntensity: number;
}

export const SKY_THEMES: readonly SkyTheme[] = [
  {
    name: 'Dawn',
    minScore: 0,
    top: 0x6f8fc4,
    horizon: 0xf2b8a2,
    bottom: 0x5b5f7a,
    sun: 0xffd2a8,
    sunStrength: 0.7,
    sunY: 0.34,
    moon: 0,
    clouds: 0.45,
    cloudColor: 0xffe2d6,
    stars: 0.05,
    aurora: 0,
    hemiSky: 0xffe9de,
    hemiGround: 0x4a4458,
    hemiIntensity: 1.6,
    sunLight: 0xffe0c8,
    sunIntensity: 1.7,
  },
  {
    name: 'Day',
    minScore: 400,
    top: 0x3f86d8,
    horizon: 0xa9d4f5,
    bottom: 0x5d7c93,
    sun: 0xfff6d8,
    sunStrength: 0.8,
    sunY: 0.82,
    moon: 0,
    clouds: 0.6,
    cloudColor: 0xffffff,
    stars: 0,
    aurora: 0,
    hemiSky: 0xffffff,
    hemiGround: 0x4a5560,
    hemiIntensity: 1.7,
    sunLight: 0xffffff,
    sunIntensity: 1.9,
  },
  {
    name: 'Sunset',
    minScore: 1200,
    top: 0x3b3f8a,
    horizon: 0xff8a4c,
    bottom: 0x5a3b52,
    sun: 0xffb060,
    sunStrength: 1,
    sunY: 0.26,
    moon: 0,
    clouds: 0.55,
    cloudColor: 0xffa98a,
    stars: 0.1,
    aurora: 0,
    hemiSky: 0xffd2b0,
    hemiGround: 0x4b3647,
    hemiIntensity: 1.55,
    sunLight: 0xffc89a,
    sunIntensity: 1.8,
  },
  {
    name: 'Dusk',
    minScore: 2500,
    top: 0x1d1d4f,
    horizon: 0x8a5a9e,
    bottom: 0x2c2440,
    sun: 0xd9a0ff,
    sunStrength: 0.2,
    sunY: 0.12,
    moon: 0.5,
    clouds: 0.3,
    cloudColor: 0xb58ad0,
    stars: 0.5,
    aurora: 0,
    hemiSky: 0xd9c8ff,
    hemiGround: 0x332a48,
    hemiIntensity: 1.45,
    sunLight: 0xd8c4ff,
    sunIntensity: 1.5,
  },
  {
    name: 'Night',
    minScore: 4500,
    top: 0x070b1f,
    horizon: 0x1c2a52,
    bottom: 0x10162b,
    sun: 0xcfe0ff,
    sunStrength: 0,
    sunY: 0.1,
    moon: 1,
    clouds: 0.18,
    cloudColor: 0x5a6a99,
    stars: 1,
    aurora: 0,
    hemiSky: 0xbfd0ff,
    hemiGround: 0x232b44,
    hemiIntensity: 1.35,
    sunLight: 0xcad8ff,
    sunIntensity: 1.35,
  },
  {
    name: 'Aurora',
    minScore: 7500,
    top: 0x04121a,
    horizon: 0x0f3a46,
    bottom: 0x081a22,
    sun: 0xbaffea,
    sunStrength: 0,
    sunY: 0.1,
    moon: 1,
    clouds: 0.1,
    cloudColor: 0x3d6f73,
    stars: 0.9,
    aurora: 1,
    hemiSky: 0xc4ffe9,
    hemiGround: 0x1d3a3c,
    hemiIntensity: 1.4,
    sunLight: 0xd0fff0,
    sunIntensity: 1.35,
  },
];

/** Index of the sky for a score: the last theme whose threshold is reached. */
export function themeIndexFor(score: number): number {
  let index = 0;
  SKY_THEMES.forEach((theme, i) => {
    if (score >= theme.minScore) index = i;
  });
  return index;
}

/** One moon look. `phase`: 0 new, 0.25 half, 0.5 full. */
export interface MoonStyle {
  name: string;
  phase: number;
  /** sRGB hex. */
  tint: number;
  /** Disc radius multiplier. */
  size: number;
  /** Glow strength 0..1. */
  halo: number;
  ring: boolean;
  /** Tilt of the terminator / ring in radians. */
  tilt: number;
}

export const MOONS: readonly MoonStyle[] = [
  { name: 'Full moon', phase: 0.5, tint: 0xf4f1e4, size: 1, halo: 0.6, ring: false, tilt: 0 },
  { name: 'Crescent', phase: 0.1, tint: 0xf4f1e4, size: 1, halo: 0.5, ring: false, tilt: 0.5 },
  { name: 'Half moon', phase: 0.25, tint: 0xeeeadb, size: 1, halo: 0.5, ring: false, tilt: -0.3 },
  { name: 'Gibbous', phase: 0.38, tint: 0xf4f1e4, size: 1, halo: 0.55, ring: false, tilt: 0.3 },
  { name: 'Blood moon', phase: 0.5, tint: 0xff5a3c, size: 1.15, halo: 0.9, ring: false, tilt: 0 },
  { name: 'Blue moon', phase: 0.5, tint: 0x9cc8ff, size: 1, halo: 1, ring: false, tilt: 0 },
  { name: 'Harvest moon', phase: 0.5, tint: 0xffb865, size: 1.4, halo: 0.8, ring: false, tilt: 0 },
  {
    name: 'Ringed moon',
    phase: 0.5,
    tint: 0xe8dcc0,
    size: 0.9,
    halo: 0.6,
    ring: true,
    tilt: -0.35,
  },
];

/** A random moon for tonight, never the same one as `previous`. `rng` returns [0, 1). */
export function pickMoon(rng: () => number, previous?: MoonStyle): MoonStyle {
  const choices = MOONS.filter((m) => m !== previous);
  return choices[Math.min(Math.floor(rng() * choices.length), choices.length - 1)]!;
}
