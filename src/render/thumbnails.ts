import * as THREE from 'three';
import { CAMERA, DEFAULT_SKIN, SKINS, type SkinId } from '../config';
import { PIECE_IDS, PIECES, type PieceId } from '../core/pieces';
import { pieceColor } from './boardView';
import { createSkin } from './skins';

const WIDTH = 200;
const HEIGHT = 140;

type Cells = readonly (readonly [number, number, number])[];

interface Shape {
  key: string;
  cells: Cells;
  colorId: number;
}

const boundsRadius = (cells: Cells): number => {
  const box = new THREE.Box3();
  for (const [x, y, z] of cells) {
    box.expandByPoint(new THREE.Vector3(x - 0.5, z - 0.5, y - 0.5));
    box.expandByPoint(new THREE.Vector3(x + 0.5, z + 0.5, y + 0.5));
  }
  return box.getBoundingSphere(new THREE.Sphere()).radius;
};

/**
 * Render shapes from the game camera's angle into PNG data URLs, wearing `skinId`,
 * all at one shared scale (fit to the largest) so a single cube looks small next to
 * an I. Uses a short-lived offscreen renderer with its own skin textures.
 */
function renderShapes(skinId: SkinId, shapes: readonly Shape[]): Record<string, string> {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(WIDTH, HEIGHT, false);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(14, 20, -2);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, WIDTH / HEIGHT, 0.1, 100);
  const elev = THREE.MathUtils.degToRad(CAMERA.elevationDeg);
  const azim = THREE.MathUtils.degToRad(CAMERA.azimuthDeg);
  const dir = new THREE.Vector3(
    Math.cos(elev) * Math.sin(azim),
    Math.sin(elev),
    Math.cos(elev) * Math.cos(azim),
  );

  const radius = Math.max(...shapes.map((shape) => boundsRadius(shape.cells)));
  const skin = createSkin(skinId);

  const result: Record<string, string> = {};
  for (const { key, cells, colorId } of shapes) {
    const piece = new THREE.Group();
    // The skin's material is white; a plain mesh needs its own colour.
    const material = skin.material.clone() as THREE.MeshStandardMaterial;
    const color = pieceColor(colorId);
    skin.recolor?.(color);
    material.color.copy(color);
    for (const [x, y, z] of cells) {
      const cube = new THREE.Mesh(skin.geometry, material);
      cube.position.set(x, z, y); // grid → three (y-up)
      piece.add(cube);
    }
    const sphere = new THREE.Box3().setFromObject(piece).getBoundingSphere(new THREE.Sphere());
    piece.position.sub(sphere.center);
    scene.add(piece);

    const fov = THREE.MathUtils.degToRad(CAMERA.fov);
    const distance = (radius * 1.05) / Math.sin(fov / 2);
    camera.position.copy(dir).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    result[key] = renderer.domElement.toDataURL('image/png');

    scene.remove(piece);
    material.dispose();
  }

  skin.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return result;
}

/** Each piece's base shape, for the tray. */
export function createPieceThumbnails(skinId: SkinId = DEFAULT_SKIN): Record<PieceId, string> {
  const shapes = PIECE_IDS.map((id) => ({
    key: id,
    cells: PIECES[id].cells,
    colorId: PIECES[id].colorId,
  }));
  return renderShapes(skinId, shapes) as Record<PieceId, string>;
}

/** One 2-cube preview per skin, for the skin picker. */
export function createSkinPreviews(): Record<SkinId, string> {
  const cells: Cells = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 0, 1],
  ];
  const previews = {} as Record<SkinId, string>;
  for (const { id } of SKINS) {
    previews[id] = renderShapes(id, [{ key: id, cells, colorId: 9 }])[id]!;
  }
  return previews;
}
