import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS } from '../config';

const SLAB_THICKNESS = 0.3;
const SLAB_MARGIN = 0.4;

/**
 * Board and everything standing on it live in `group`, so rotating the board
 * rotates the pieces with it while the camera stays fixed.
 *
 * Grid coordinates: x and y span the footprint, z is height.
 * Three.js is Y-up, so grid z maps to local y and grid y maps to local z.
 */
export class BoardView {
  readonly group = new THREE.Group();
  readonly size: number;

  constructor(size: number) {
    this.size = size;
    this.group.add(this.createSlab(), this.createCellLines());
  }

  /** Local-space center of grid cell (x, y, z). */
  cellCenter(x: number, y: number, z: number): THREE.Vector3 {
    const half = this.size / 2;
    return new THREE.Vector3(x - half + 0.5, z + 0.5, y - half + 0.5);
  }

  private createSlab(): THREE.Mesh {
    const w = this.size + SLAB_MARGIN * 2;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(w, SLAB_THICKNESS, w),
      new THREE.MeshStandardMaterial({ color: COLORS.slab, roughness: 0.9 }),
    );
    slab.position.y = -SLAB_THICKNESS / 2;
    slab.receiveShadow = true;
    return slab;
  }

  private createCellLines(): THREE.LineSegments {
    const half = this.size / 2;
    const y = 0.002;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= this.size; i++) {
      const p = i - half;
      pts.push(new THREE.Vector3(p, y, -half), new THREE.Vector3(p, y, half));
      pts.push(new THREE.Vector3(-half, y, p), new THREE.Vector3(half, y, p));
    }
    return new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: COLORS.cellLines, transparent: true, opacity: 0.35 }),
    );
  }
}

const cubeGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.025);

/** Single beveled unit cube; Phase 2 replaces per-mesh cubes with InstancedMesh. */
export function createCube(color: number): THREE.Mesh {
  const cube = new THREE.Mesh(
    cubeGeometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.55 }),
  );
  cube.castShadow = true;
  cube.receiveShadow = true;
  return cube;
}
