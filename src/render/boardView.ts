import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS, PIECE_COLORS } from '../config';
import type { Grid } from '../core/grid';

export const SLAB_THICKNESS = 0.3;
export const SLAB_MARGIN = 0.4;

/** Shared beveled unit cube used by every cube on the board. */
export const cubeGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.025);

/** Snap a (possibly beveled, diagonal) normal to its strongest axis. */
function dominantAxis(n: THREE.Vector3): THREE.Vector3 {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ay >= ax && ay >= az) return new THREE.Vector3(0, Math.sign(n.y), 0);
  if (ax >= az) return new THREE.Vector3(Math.sign(n.x), 0, 0);
  return new THREE.Vector3(0, 0, Math.sign(n.z));
}

/** A cube to draw: grid position (may be fractional while animating), size and flash. */
export interface DisplayCube {
  x: number;
  y: number;
  z: number;
  colorId: number;
  /** 1 = full size. */
  scale?: number;
  /** 0..1 blend toward white. */
  flash?: number;
}

const IDENTITY_QUATERNION = new THREE.Quaternion();
const FLASH_COLOR = new THREE.Color(0xffffff);

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
  /** Slab, cell lines and cubes; rebuilt on resize (other children, like the ghost, stay). */
  private readonly fixtures = new THREE.Group();
  private cubes!: THREE.InstancedMesh;

  constructor(
    public size: number,
    public height: number,
  ) {
    this.group.add(this.fixtures);
    this.build();
  }

  /** Rebuild for a new board size. The board is empty afterwards; call `sync`. */
  resize(size: number, height: number): void {
    if (size === this.size && height === this.height) return;
    this.fixtures.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
      if (object.geometry !== cubeGeometry) object.geometry.dispose();
      (object.material as THREE.Material).dispose();
      // Frees the per-instance matrix and color buffers.
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    this.fixtures.clear();
    this.size = size;
    this.height = height;
    this.build();
  }

  private build(): void {
    this.cubes = this.createCubes();
    this.fixtures.add(this.createSlab(), this.createCellLines(), this.cubes);
  }

  /** Number of cubes currently drawn (debug checks). */
  get drawnCount(): number {
    return this.cubes.count;
  }

  /** Local-space center of grid cell (x, y, z). */
  cellCenter(x: number, y: number, z: number): THREE.Vector3 {
    const half = this.size / 2;
    return new THREE.Vector3(x - half + 0.5, z + 0.5, y - half + 0.5);
  }

  /** Redraw every placed cube from the grid. */
  sync(grid: Grid): void {
    this.draw(Array.from(grid.filled(), ({ pos: [x, y, z], colorId }) => ({ x, y, z, colorId })));
  }

  /** Draw an explicit list of cubes (animation frames use fractional positions). */
  draw(cubes: Iterable<DisplayCube>): void {
    const matrix = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();
    const capacity = this.cubes.instanceMatrix.count;
    let i = 0;
    for (const cube of cubes) {
      if (i >= capacity) break;
      const s = cube.scale ?? 1;
      matrix.compose(
        this.cellCenter(cube.x, cube.y, cube.z),
        IDENTITY_QUATERNION,
        scale.set(s, s, s),
      );
      this.cubes.setMatrixAt(i, matrix);
      color.copy(pieceColor(cube.colorId)).lerp(FLASH_COLOR, cube.flash ?? 0);
      this.cubes.setColorAt(i, color);
      i++;
    }
    this.cubes.count = i;
    this.cubes.instanceMatrix.needsUpdate = true;
    if (this.cubes.instanceColor) this.cubes.instanceColor.needsUpdate = true;
    // Raycasting tests against the bounding sphere, so keep it current.
    this.cubes.computeBoundingSphere();
  }

  /**
   * Grid column (x, y) under a ray. Hitting a cube's top picks its column;
   * hitting a side picks the neighboring column on that side. Otherwise the
   * ray is intersected with the board's top plane. May be off the board.
   */
  pickColumn(raycaster: THREE.Raycaster): [number, number] | null {
    const half = this.size / 2;
    const toCell = (p: THREE.Vector3): [number, number] => [
      Math.floor(p.x + half),
      Math.floor(p.z + half),
    ];

    const hit = raycaster.intersectObject(this.cubes, false)[0];
    if (hit?.face) {
      const local = this.group.worldToLocal(hit.point.clone());
      const normal = dominantAxis(hit.face.normal);
      const neighbor = toCell(local.clone().addScaledVector(normal, 0.5));
      const onBoard = neighbor.every((v) => v >= 0 && v < this.size);
      // Outer walls have no neighbor on the board: aim at the hit cube's own column.
      return onBoard ? neighbor : toCell(local.addScaledVector(normal, -0.5));
    }

    const inverse = this.group.matrixWorld.clone().invert();
    const ray = raycaster.ray.clone().applyMatrix4(inverse);
    const point = ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      new THREE.Vector3(),
    );
    return point ? toCell(point) : null;
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
