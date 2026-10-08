import * as THREE from 'three';
import { CAMERA } from '../config';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Size the sun's shadow camera to cover a size x height board and its shadows. */
  fitShadows: (size: number, height: number) => void;
  /** Lights, so the sky can tint them. */
  lights: { hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight };
}

/** Renderer, scene, lights and camera. Camera placement is owned by CameraRig. */
export function createScene(container: HTMLElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  // No background color: SkyView paints the sky.
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 500);

  const { hemi, sun } = addLights(scene);

  const resize = (): void => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  const fitShadows = (size: number, height: number): void => {
    // The sun sits ~55° up, so a tower casts a shadow ~0.75x its height long.
    const extent = size / 2 + 1.5 + height * 0.75;
    const distance = size + height + 15;
    sun.position.copy(SUN_DIRECTION).multiplyScalar(distance);
    const s = sun.shadow.camera;
    s.left = s.bottom = -extent;
    s.right = s.top = extent;
    s.far = distance * 2;
    s.updateProjectionMatrix();
  };

  return { renderer, scene, camera, fitShadows, lights: { hemi, sun } };
}

const SUN_DIRECTION = new THREE.Vector3(14, 20, -2).normalize();

function addLights(scene: THREE.Scene): {
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
} {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 6;
  sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0005;
  sun.shadow.camera.near = 1;
  scene.add(sun);
  return { hemi, sun };
}
