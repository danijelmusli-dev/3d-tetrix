import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS, PIECE_COLORS } from '../config';
import type { Grid } from '../core/grid';

export const SLAB_THICKNESS = 0.3;
export const SLAB_MARGIN = 0.4;

/** Shared beveled unit cube used by every cube on the board. */
export const cubeGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.025);

export function pieceColor(colorId: number): THREE.Color {
  return new THREE.Color(PIECE_COLORS[colorId - 1] ?? 0xffffff);
}

/**
 * Board and everything standing on it live in `group`, so rotating the board
 * rotates the pieces with it while the camera stays fixed.
 *
 * Grid coordinates: x and y span the footprint, z is height.
 * Three.js is Y-up, so grid z maps to local y and grid y maps to local z.
 */
export class BoardView {
  readonly group = new THREE.Group();
  private readonly cubes: THREE.InstancedMesh;

  constructor(
    readonly size: number,
    readonly height: number,
  ) {
    this.cubes = this.createCubes();
    this.group.add(this.createSlab(), this.createCellLines(), this.cubes);
  }

  /** Local-space center of grid cell (x, y, z). */
  cellCenter(x: number, y: number, z: number): THREE.Vector3 {
    const half = this.size / 2;
    return new THREE.Vector3(x - half + 0.5, z + 0.5, y - half + 0.5);
  }

  /** Redraw every placed cube from the grid. */
  sync(grid: Grid): void {
    const matrix = new THREE.Matrix4();
    let i = 0;
    for (const { pos, colorId } of grid.filled()) {
      matrix.setPosition(this.cellCenter(...pos));
      this.cubes.setMatrixAt(i, matrix);
      this.cubes.setColorAt(i, pieceColor(colorId));
      i++;
    }
    this.cubes.count = i;
    this.cubes.instanceMatrix.needsUpdate = true;
    if (this.cubes.instanceColor) this.cubes.instanceColor.needsUpdate = true;
  }

  private createCubes(): THREE.InstancedMesh {
    const capacity = this.size * this.size * this.height;
    const mesh = new THREE.InstancedMesh(
      cubeGeometry,
      new THREE.MeshStandardMaterial({ roughness: 0.55 }),
      capacity,
    );
    mesh.count = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Instances move every sync; skip bounding-sphere culling (board is always on screen).
    mesh.frustumCulled = false;
    return mesh;
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
