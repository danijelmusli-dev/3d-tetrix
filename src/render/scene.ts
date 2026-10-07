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
  addFloor(scene);

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

/** Blender-style floor: procedural grid lines + X/Y axis lines, fading with distance. */
function addFloor(scene: THREE.Scene): void {
  const c = (hex: number): THREE.Color => new THREE.Color(hex);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uBg: { value: c(COLORS.background) },
      uLine: { value: c(COLORS.floorGrid) },
      uAxisX: { value: c(COLORS.axisX) },
      uAxisY: { value: c(COLORS.axisY) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBg, uLine, uAxisX, uAxisY;
      varying vec3 vWorld;
      float lineMask(vec2 coord) {
        vec2 g = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        vec2 p = vWorld.xz;
        float fade = 1.0 - smoothstep(25.0, 70.0, length(p));
        vec3 col = mix(uBg, uLine, lineMask(p) * fade);
        float ax = 1.0 - min(abs(p.y) / fwidth(p.y), 1.0);
        float ay = 1.0 - min(abs(p.x) / fwidth(p.x), 1.0);
        col = mix(col, uAxisX, ax * fade);
        col = mix(col, uAxisY, ay * fade);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.6;
  scene.add(floor);
}
