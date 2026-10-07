import * as THREE from 'three';
import { CAMERA, COLORS } from '../config';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

export function createScene(container: HTMLElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 500);
  const elev = THREE.MathUtils.degToRad(CAMERA.elevationDeg);
  const azim = THREE.MathUtils.degToRad(CAMERA.azimuthDeg);
  camera.position.set(
    CAMERA.distance * Math.cos(elev) * Math.sin(azim),
    CAMERA.distance * Math.sin(elev) + CAMERA.targetY,
    CAMERA.distance * Math.cos(elev) * Math.cos(azim),
  );
  camera.lookAt(0, CAMERA.targetY, 0);

  addLights(scene);

  const resize = (): void => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera };
}

function addLights(scene: THREE.Scene): void {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6));

  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(14, 20, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 6;
  sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0005;
  const s = sun.shadow.camera;
  s.left = s.bottom = -12;
  s.right = s.top = 12;
  s.near = 1;
  s.far = 50;
  scene.add(sun);
}
