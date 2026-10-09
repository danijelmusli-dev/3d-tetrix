import * as THREE from 'three';
import { easeInOutCubic, type Animator, type TweenHandle } from './animator';
import {
  MOONS,
  SKY_THEMES,
  pickMoon,
  themeIndexFor,
  type MoonStyle,
  type SkyTheme,
} from './skyThemes';

const TRANSITION_MS = 3000;

const COLOR_KEYS = [
  'top',
  'horizon',
  'bottom',
  'sun',
  'cloudColor',
  'hemiSky',
  'hemiGround',
  'sunLight',
] as const;
const NUMBER_KEYS = [
  'sunStrength',
  'sunY',
  'moon',
  'clouds',
  'stars',
  'aurora',
  'hemiIntensity',
  'sunIntensity',
] as const;

type ColorKey = (typeof COLOR_KEYS)[number];
type NumberKey = (typeof NUMBER_KEYS)[number];
type Look = Record<ColorKey, THREE.Color> & Record<NumberKey, number>;

function lookOf(theme: SkyTheme): Look {
  const look = {} as Look;
  for (const k of COLOR_KEYS) look[k] = new THREE.Color(theme[k]);
  for (const k of NUMBER_KEYS) look[k] = theme[k];
  return look;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Full-screen quad at the far plane, independent of the camera.
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime, uAspect, uSunStrength, uSunY, uClouds, uStars, uAurora;
  uniform float uMoonStrength, uMoonPhase, uMoonTilt, uMoonSize, uMoonHalo, uMoonRing;
  uniform vec3 uTop, uHorizon, uBottom, uSun, uCloud, uMoonTint;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = vec2(uv.x * uAspect, uv.y);
    float h = uv.y;

    // Gradient: ground haze at the bottom, horizon glow, sky on top.
    vec3 col = mix(uBottom, uHorizon, smoothstep(0.0, 0.38, h));
    col = mix(col, uTop, smoothstep(0.35, 1.0, h));

    // Twinkling stars.
    if (uStars > 0.0) {
      vec2 g = p * 90.0;
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5 - (vec2(hash(id + 1.3), hash(id + 7.1)) - 0.5) * 0.6;
      float r = hash(id);
      float star = step(0.985, r) * (1.0 - smoothstep(0.0, 0.12, length(f)));
      float twinkle = 0.55 + 0.45 * sin(uTime * (1.5 + r * 3.0) + r * 40.0);
      col += star * twinkle * uStars * smoothstep(0.25, 0.7, h) * vec3(1.0, 0.97, 0.9);
    }

    // Aurora curtains near the top.
    if (uAurora > 0.0) {
      float x = p.x * 1.6 + uTime * 0.03;
      float band = fbm(vec2(x * 2.0, uTime * 0.05));
      float center = 0.72 + 0.12 * sin(x * 3.0 + band * 4.0);
      float a = exp(-pow((h - center) * 9.0, 2.0))
        * (0.5 + 0.5 * fbm(vec2(x * 8.0, h * 3.0 - uTime * 0.2)));
      vec3 ac = mix(vec3(0.15, 0.95, 0.6), vec3(0.6, 0.3, 0.95), smoothstep(0.6, 0.9, h));
      col += ac * a * uAurora * 0.9;
    }

    // Sun: soft glow plus a disc, rising and setting with the theme.
    vec2 sunPos = vec2(0.64 * uAspect, uSunY);
    float d = length(p - sunPos);
    col += uSun * uSunStrength * (exp(-d * 9.0) * 0.9 + (1.0 - smoothstep(0.035, 0.045, d)) * 0.8);

    // Moon: lit sphere with a terminator (phase), maria, halo and an optional ring.
    if (uMoonStrength > 0.0) {
      vec2 mp = vec2(0.24 * uAspect, 0.74);
      vec2 q = (p - mp) / (0.055 * uMoonSize);
      float ct = cos(uMoonTilt), st = sin(uMoonTilt);
      q = mat2(ct, st, -st, ct) * q;
      float rr = length(q);
      col += uMoonTint * uMoonStrength * (0.08 + 0.4 * uMoonHalo) * exp(-rr * 0.75);
      if (uMoonRing > 0.5 && (q.y < 0.0 || rr > 1.0)) {
        float ring = 1.0 - smoothstep(0.0, 0.32, abs(length(vec2(q.x, q.y * 3.2)) - 2.15));
        col = mix(col, uMoonTint * 0.9, ring * 0.65 * uMoonStrength);
      }
      float disc = 1.0 - smoothstep(0.96, 1.0, rr);
      float z = sqrt(max(1.0 - rr * rr, 0.0));
      float a = uMoonPhase * 6.2831853;
      vec3 light = vec3(sin(a), 0.0, -cos(a));
      float lit = smoothstep(-0.04, 0.1, dot(vec3(q, z), light));
      float maria = 0.7 + 0.45 * fbm(q * 1.7 + 3.0);
      float crater = smoothstep(0.64, 0.72, noise(q * 5.5 + 9.0));
      vec3 surface = uMoonTint * maria * (1.0 - 0.18 * crater) * (0.05 + lit * (0.6 + 0.4 * z));
      col = mix(col, surface, disc * uMoonStrength);
    }

    // Two drifting cloud layers.
    vec2 cp = p * vec2(1.6, 3.2);
    float c1 = fbm(cp * 1.3 + vec2(uTime * 0.012, 0.0));
    float c2 = fbm(cp * 2.6 + vec2(uTime * 0.025, 3.7));
    float cloud = smoothstep(0.55 - uClouds * 0.25, 0.85, c1 * 0.65 + c2 * 0.45);
    cloud *= smoothstep(0.15, 0.45, h) * uClouds;
    col = mix(col, uCloud, cloud * 0.75);

    // Gentle vignette keeps attention on the board.
    col *= 0.88 + 0.12 * (1.0 - smoothstep(0.3, 1.2, length(uv - 0.5)));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Animated sky backdrop that changes with the score (see SKY_THEMES), plus
 * matching scene lighting. Drawn as a screen-space quad behind everything,
 * since the camera looks down at the board and rarely sees the real horizon.
 */
export class SkyView {
  private readonly material: THREE.ShaderMaterial;
  private index = 0;
  private current: Look;
  private from: Look;
  private to: Look;
  private tween?: TweenHandle;
  private moonStyle: MoonStyle;

  constructor(
    scene: THREE.Scene,
    private readonly animator: Animator,
    private readonly lights: { hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight },
    /** Picks tonight's moon; injectable for tests. */
    private readonly rng: () => number = Math.random,
  ) {
    this.moonStyle = MOONS[0]!;
    this.current = lookOf(SKY_THEMES[0]!);
    this.from = this.current;
    this.to = this.current;
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uSunStrength: { value: 0 },
        uSunY: { value: 0.8 },
        uMoonStrength: { value: 0 },
        uMoonPhase: { value: 0.5 },
        uMoonTilt: { value: 0 },
        uMoonSize: { value: 1 },
        uMoonHalo: { value: 0.6 },
        uMoonRing: { value: 0 },
        uMoonTint: { value: new THREE.Color() },
        uClouds: { value: 0 },
        uStars: { value: 0 },
        uAurora: { value: 0 },
        uTop: { value: new THREE.Color() },
        uHorizon: { value: new THREE.Color() },
        uBottom: { value: new THREE.Color() },
        uSun: { value: new THREE.Color() },
        uCloud: { value: new THREE.Color() },
      },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    quad.renderOrder = -1000;
    scene.add(quad);
    scene.background = null;
    this.apply();
  }

  /** Sky index 0..5 (also drives music intensity). */
  get level(): number {
    return this.index;
  }

  /** Tonight's moon (a new one is rolled each time night falls). */
  get moon(): MoonStyle {
    return this.moonStyle;
  }

  get themeName(): string {
    return SKY_THEMES[this.index]!.name;
  }

  /** Follow the score; returns the new theme when the sky changes, else null. */
  setScore(score: number): SkyTheme | null {
    const index = themeIndexFor(score);
    if (index === this.index) return null;
    this.index = index;
    this.rollMoon(SKY_THEMES[index]!);
    this.blendTo(SKY_THEMES[index]!, TRANSITION_MS);
    return SKY_THEMES[index]!;
  }

  /** Back to the first sky (new game), with a quick blend. */
  reset(): void {
    if (this.index === 0) return;
    this.index = 0;
    this.blendTo(SKY_THEMES[0]!, 800);
  }

  /** A new night starts: pick another moon, unless the last one is still visible. */
  private rollMoon(theme: SkyTheme): void {
    if (theme.moon > 0 && this.current.moon < 0.05)
      this.moonStyle = pickMoon(this.rng, this.moonStyle);
  }

  /** Per frame: animate clouds / stars and keep stars round at any aspect. */
  update(seconds: number, aspect: number): void {
    this.material.uniforms.uTime!.value = seconds;
    this.material.uniforms.uAspect!.value = aspect;
  }

  private blendTo(theme: SkyTheme, duration: number): void {
    this.tween?.cancel();
    this.from = this.snapshot();
    this.to = lookOf(theme);
    this.tween = this.animator.tween({
      from: 0,
      to: 1,
      duration,
      ease: easeInOutCubic,
      onUpdate: (t) => {
        for (const k of COLOR_KEYS) this.current[k].copy(this.from[k]).lerp(this.to[k], t);
        for (const k of NUMBER_KEYS)
          this.current[k] = THREE.MathUtils.lerp(this.from[k], this.to[k], t);
        this.apply();
      },
    });
  }

  /** Independent copy of the current look (the blend start point). */
  private snapshot(): Look {
    const look = {} as Look;
    for (const k of COLOR_KEYS) look[k] = this.current[k].clone();
    for (const k of NUMBER_KEYS) look[k] = this.current[k];
    return look;
  }

  private apply(): void {
    const u = this.material.uniforms;
    const c = this.current;
    (u.uTop!.value as THREE.Color).copy(c.top);
    (u.uHorizon!.value as THREE.Color).copy(c.horizon);
    (u.uBottom!.value as THREE.Color).copy(c.bottom);
    (u.uSun!.value as THREE.Color).copy(c.sun);
    (u.uCloud!.value as THREE.Color).copy(c.cloudColor);
    u.uSunStrength!.value = c.sunStrength;
    u.uSunY!.value = c.sunY;
    u.uMoonStrength!.value = c.moon;
    const m = this.moonStyle;
    u.uMoonPhase!.value = m.phase;
    u.uMoonTilt!.value = m.tilt;
    u.uMoonSize!.value = m.size;
    u.uMoonHalo!.value = m.halo;
    u.uMoonRing!.value = m.ring ? 1 : 0;
    (u.uMoonTint!.value as THREE.Color).set(m.tint);
    u.uClouds!.value = c.clouds;
    u.uStars!.value = c.stars;
    u.uAurora!.value = c.aurora;
    this.lights.hemi.color.copy(c.hemiSky);
    this.lights.hemi.groundColor.copy(c.hemiGround);
    this.lights.hemi.intensity = c.hemiIntensity;
    this.lights.sun.color.copy(c.sunLight);
    this.lights.sun.intensity = c.sunIntensity;
  }
}
