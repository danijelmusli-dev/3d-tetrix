/** One sky look, reached once the score passes `minScore`. Colors are sRGB hex. */
export interface SkyTheme {
  name: string;
  minScore: number;
  top: number;
  horizon: number;
  bottom: number;
  /** Sun (day) or moon (night) glow color and strength 0..1. */
  sun: number;
  sunStrength: number;
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
    sunStrength: 0.45,
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
    sunStrength: 0.55,
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
    sunStrength: 0.35,
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
