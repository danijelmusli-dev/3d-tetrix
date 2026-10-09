import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { SkinId } from '../config';

/** Shared beveled unit cube used by every cube on the board. */
export const cubeGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.025);

/**
 * How placed cubes look. The material's own colour stays white: the board
 * tints it per instance with the piece colour, so textures here are light
 * greyscale patterns that the colour multiplies.
 */
export interface Skin {
  id: SkinId;
  material: THREE.Material;
  geometry: THREE.BufferGeometry;
  /** Optional adjustment of the piece colour (e.g. slime pulls everything toward green). */
  recolor?: (color: THREE.Color) => void;
  /** Free the material, its textures and any geometry the skin owns. */
  dispose(): void;
}

type Pen = CanvasRenderingContext2D;

/** Small procedural texture, or undefined where there is no DOM (tests). */
function canvasTexture(
  width: number,
  height: number,
  draw: (g: Pen, w: number, h: number) => void,
  options: { nearest?: boolean; srgb?: boolean } = {},
): THREE.CanvasTexture | undefined {
  if (typeof document === 'undefined') return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  if (!g) return undefined;
  draw(g, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = options.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (options.nearest) {
    // Crisp pixels: no smoothing, no mip blur, no wrapping bleed at the tile edge.
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  }
  return texture;
}

/** Deterministic pseudo-random so a skin looks the same every launch. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grey = (v: number): string => `rgb(${v | 0} ${v | 0} ${v | 0})`;

/** Soft studio-like sky, used as a reflection source for glossy skins. */
function environment(): THREE.CanvasTexture | undefined {
  const texture = canvasTexture(256, 128, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#dfeaff');
    sky.addColorStop(0.5, '#ffffff');
    sky.addColorStop(0.52, '#7a6a5a');
    sky.addColorStop(1, '#2a2622');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // Bright window-like panels give crisp highlights.
    g.fillStyle = '#ffffff';
    for (const [x, y, pw, ph] of [
      [30, 14, 50, 22],
      [150, 10, 70, 18],
      [96, 40, 26, 14],
    ] as const)
      g.fillRect(x, y, pw, ph);
  });
  if (texture) texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function speckle(g: Pen, w: number, h: number, base: number, spread: number, seed: number): void {
  const rand = seeded(seed);
  g.fillStyle = grey(base);
  g.fillRect(0, 0, w, h);
  const image = g.getImageData(0, 0, w, h);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = base - rand() * spread - (rand() < 0.04 ? spread : 0);
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
  }
  g.putImageData(image, 0, 0);
}

function brushed(g: Pen, w: number, h: number): void {
  const rand = seeded(5);
  g.fillStyle = grey(235);
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) {
    g.fillStyle = grey(235 - rand() * 38);
    g.fillRect(0, y, w, 1);
  }
}

/**
 * Chunky 8-bit tile. The rim is the same on all four sides (a dark outline plus
 * a light inner ring), so it looks identical whichever way a face is turned and
 * neighbouring cubes meet edge to edge.
 */
function pixelTile(g: Pen, w: number): void {
  const rand = seeded(3);
  const n = 8;
  const cell = w / n;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const edge = Math.min(x, y, n - 1 - x, n - 1 - y);
      const v = edge === 0 ? 140 : edge === 1 ? 255 : 226 + rand() * 20;
      g.fillStyle = grey(v);
      g.fillRect(x * cell, y * cell, cell, cell);
    }
}

/** Minecraft-style planks: four boards per face, dark seams, pixel grain and nail marks. */
function plankTile(g: Pen, w: number): void {
  const rand = seeded(17);
  const n = 16;
  const cell = w / n;
  const px = (x: number, y: number, v: number): void => {
    g.fillStyle = grey(v);
    g.fillRect(x * cell, y * cell, cell, cell);
  };
  for (let board = 0; board < 4; board++) {
    const shade = 226 + (board % 2) * 14 + rand() * 10;
    for (let y = board * 4; y < board * 4 + 4; y++)
      for (let x = 0; x < n; x++) {
        let v = shade - rand() * 14;
        if (y === board * 4 + 3) v = 168; // seam below each board
        if (y === board * 4) v = Math.min(v + 14, 255); // lit top edge
        px(x, y, v);
      }
    // Horizontal grain dashes.
    for (let i = 0; i < 4; i++) {
      const gx = Math.floor(rand() * 11);
      const gy = board * 4 + 1 + Math.floor(rand() * 2);
      for (let k = 0; k < 3 + Math.floor(rand() * 3); k++) px(gx + k, gy, shade - 30);
    }
    // Board ends, like staggered plank joints.
    px(board % 2 ? 4 : 11, board * 4 + 1, 150);
    px(board % 2 ? 4 : 11, board * 4 + 2, 150);
  }
}

/**
 * Cotton candy: smooth slanted bands with thin, bright glossy streaks and a
 * little fluff. Drawn per pixel with a period that divides the tile, so it tiles
 * without a seam.
 */
function candyStripes(g: Pen, w: number, h: number): void {
  const rand = seeded(23);
  const image = g.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // Slanted, gently wavy coordinate.
      const t = (x + y) / 64 + 0.06 * Math.sin((x - y) * 0.09);
      const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
      let v = 246 - 62 * wave * wave;
      // Thin shiny streak on the bright side of each band.
      v += 40 * Math.max(0, 1 - Math.abs(wave - 0.93) * 24);
      v += (rand() - 0.5) * 10;
      const i = (y * w + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = Math.max(0, Math.min(255, v));
      image.data[i + 3] = 255;
    }
  g.putImageData(image, 0, 0);
}

function slimeBlobs(g: Pen, w: number, h: number): void {
  const rand = seeded(8);
  g.fillStyle = grey(215);
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 4 + rand() * 11;
    const blob = g.createRadialGradient(x, y, 0, x, y, r);
    blob.addColorStop(0, 'rgba(255,255,255,0.9)');
    blob.addColorStop(0.7, 'rgba(255,255,255,0.25)');
    blob.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = blob;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

/** Cube with a round stud on top, like a toy brick. */
function studGeometry(): THREE.BufferGeometry {
  // The rounded cube is non-indexed, so the stud must be too for the merge to work.
  const round = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 24);
  const stud = round.toNonIndexed();
  round.dispose();
  stud.translate(0, 0.5 + 0.08 - 0.01, 0);
  const merged = mergeGeometries([cubeGeometry, stud]);
  stud.dispose();
  return merged ?? cubeGeometry.clone();
}

interface Parts {
  material: THREE.Material;
  textures?: (THREE.Texture | undefined)[];
  geometry?: THREE.BufferGeometry;
  recolor?: Skin['recolor'];
}

function build(id: SkinId): Parts {
  switch (id) {
    case 'candy': {
      const envMap = environment();
      const map = canvasTexture(128, 128, candyStripes);
      return {
        textures: [envMap, map],
        // Pastel, like spun sugar, whatever the piece colour.
        recolor: (color) => color.lerp(new THREE.Color(0xffffff), 0.32),
        material: new THREE.MeshPhysicalMaterial({
          roughness: 0.2,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          // A soft fuzzy rim light, the cotton-candy fluff.
          sheen: 1,
          sheenRoughness: 0.35,
          sheenColor: new THREE.Color(0xfff0fa),
          map: map ?? null,
          envMap: envMap ?? null,
          envMapIntensity: 0.9,
        }),
      };
    }
    case 'wood': {
      const map = canvasTexture(64, 64, plankTile, { nearest: true });
      return {
        textures: [map],
        // Oak: pull every piece colour toward plank brown.
        recolor: (color) => color.lerp(new THREE.Color(0xc59a5c), 0.86),
        // Sharp-edged blocks, like the game this look comes from.
        geometry: new THREE.BoxGeometry(1, 1, 1),
        material: new THREE.MeshStandardMaterial({ roughness: 0.9, map: map ?? null }),
      };
    }
    case 'stone': {
      const map = canvasTexture(128, 128, (g, w, h) => speckle(g, w, h, 245, 85, 21));
      return {
        textures: [map],
        material: new THREE.MeshStandardMaterial({
          roughness: 1,
          map: map ?? null,
          bumpMap: map ?? null,
          bumpScale: 3,
        }),
      };
    }
    case 'glass': {
      const envMap = environment();
      return {
        textures: [envMap],
        material: new THREE.MeshPhysicalMaterial({
          roughness: 0.04,
          clearcoat: 1,
          clearcoatRoughness: 0,
          transparent: true,
          opacity: 0.58,
          depthWrite: false,
          envMap: envMap ?? null,
          envMapIntensity: 1.5,
        }),
      };
    }
    case 'slime': {
      const envMap = environment();
      const map = canvasTexture(128, 128, slimeBlobs);
      return {
        textures: [envMap, map],
        // Everything turns a little green, so it reads as slime whatever the piece colour.
        recolor: (color) => color.lerp(new THREE.Color(0x5fe05a), 0.55),
        material: new THREE.MeshPhysicalMaterial({
          roughness: 0.05,
          clearcoat: 1,
          clearcoatRoughness: 0.02,
          transparent: true,
          opacity: 0.8,
          map: map ?? null,
          emissive: new THREE.Color(0x1d6a1d),
          emissiveIntensity: 0.35,
          envMap: envMap ?? null,
          envMapIntensity: 1.1,
        }),
      };
    }
    case 'metal': {
      const envMap = environment();
      const map = canvasTexture(128, 128, brushed);
      return {
        textures: [envMap, map],
        material: new THREE.MeshStandardMaterial({
          metalness: 1,
          roughness: 0.3,
          map: map ?? null,
          bumpMap: map ?? null,
          bumpScale: 0.6,
          envMap: envMap ?? null,
          envMapIntensity: 1.4,
        }),
      };
    }
    case 'pixel': {
      const map = canvasTexture(64, 64, pixelTile, { nearest: true });
      return {
        textures: [map],
        // Hard-edged, unbevelled blocks to match the 8-bit tiles.
        geometry: new THREE.BoxGeometry(1, 1, 1),
        material: new THREE.MeshStandardMaterial({ roughness: 0.9, map: map ?? null }),
      };
    }
    case 'studs':
      return {
        geometry: studGeometry(),
        material: new THREE.MeshPhysicalMaterial({
          roughness: 0.28,
          clearcoat: 0.6,
          clearcoatRoughness: 0.2,
        }),
      };
    case 'classic':
      return { material: new THREE.MeshStandardMaterial({ roughness: 0.55 }) };
  }
}

/** Build a skin. Each call makes its own material and textures (one per renderer). */
export function createSkin(id: SkinId): Skin {
  const { material, textures = [], geometry, recolor } = build(id);
  return {
    id,
    material,
    geometry: geometry ?? cubeGeometry,
    recolor,
    dispose() {
      material.dispose();
      for (const texture of textures) texture?.dispose();
      geometry?.dispose();
    },
  };
}
