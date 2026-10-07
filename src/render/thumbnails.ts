import * as THREE from 'three';
import { CAMERA } from '../config';
import { PIECE_IDS, PIECES, type PieceId } from '../core/pieces';
import { cubeGeometry, pieceColor } from './boardView';

const WIDTH = 200;
const HEIGHT = 140;

/**
 * Render each piece's base shape once, from the game camera's angle, into
 * PNG data URLs for the tray. Uses a short-lived offscreen renderer.
 */
export function createPieceThumbnails(): Record<PieceId, string> {
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

  const result = {} as Record<PieceId, string>;
  for (const id of PIECE_IDS) {
    const piece = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: pieceColor(PIECES[id].colorId),
      roughness: 0.55,
    });
    for (const [x, y, z] of PIECES[id].cells) {
      const cube = new THREE.Mesh(cubeGeometry, material);
      cube.position.set(x, z, y); // grid → three (y-up)
      piece.add(cube);
    }
    const sphere = new THREE.Box3().setFromObject(piece).getBoundingSphere(new THREE.Sphere());
    piece.position.sub(sphere.center);
    scene.add(piece);

    const fov = THREE.MathUtils.degToRad(CAMERA.fov);
    const distance = (sphere.radius * 1.05) / Math.sin(fov / 2);
    camera.position.copy(dir).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    result[id] = renderer.domElement.toDataURL('image/png');

    scene.remove(piece);
    material.dispose();
  }

  renderer.dispose();
  renderer.forceContextLoss();
  return result;
}
