import * as THREE from 'three';
import { hiddenGaps } from '../core/gaps';
import type { Grid } from '../core/grid';
import type { BoardView } from './boardView';

const GAP_COLOR = 0xff5a4d;
const unitEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 0.96, 0.96));

/**
 * X-ray of hidden gaps (X key): empty cells with cubes above them glow red
 * with dashed edges, drawn on top of everything so they show through cubes.
 * Lives in the board group, so it turns with the board.
 */
export class GapsView {
  private readonly group = new THREE.Group();
  private readonly glow = new THREE.MeshBasicMaterial({
    color: GAP_COLOR,
    transparent: true,
    opacity: 0.2,
    depthTest: false,
    depthWrite: false,
  });
  private readonly edges = new THREE.LineDashedMaterial({
    color: GAP_COLOR,
    transparent: true,
    opacity: 0.85,
    dashSize: 0.1,
    gapSize: 0.07,
    depthTest: false,
    depthWrite: false,
  });
  private readonly cube = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  private lastGrid?: Grid;

  constructor(private readonly board: BoardView) {
    this.group.visible = false;
    board.group.add(this.group);
  }

  get visible(): boolean {
    return this.group.visible;
  }

  toggle(): void {
    this.group.visible = !this.group.visible;
    if (this.group.visible && this.lastGrid) this.rebuild(this.lastGrid);
  }

  /** Call whenever the grid changes; only does work while visible. */
  update(grid: Grid): void {
    this.lastGrid = grid;
    if (this.group.visible) this.rebuild(grid);
  }

  private rebuild(grid: Grid): void {
    for (const child of this.group.children) {
      if (child instanceof THREE.InstancedMesh) child.dispose();
      else if (child instanceof THREE.LineSegments) child.geometry.dispose();
    }
    this.group.clear();

    const gaps = hiddenGaps(grid);
    if (gaps.length === 0) return;

    const glow = new THREE.InstancedMesh(this.cube, this.glow, gaps.length);
    const matrix = new THREE.Matrix4();
    const edgeSource = unitEdges.getAttribute('position');
    const points = new Float32Array(gaps.length * edgeSource.count * 3);
    gaps.forEach(([x, y, z], i) => {
      const center = this.board.cellCenter(x, y, z);
      glow.setMatrixAt(i, matrix.makeTranslation(center));
      for (let v = 0; v < edgeSource.count; v++) {
        const o = (i * edgeSource.count + v) * 3;
        points[o] = edgeSource.getX(v) + center.x;
        points[o + 1] = edgeSource.getY(v) + center.y;
        points[o + 2] = edgeSource.getZ(v) + center.z;
      }
    });
    glow.renderOrder = 4;
    glow.frustumCulled = false;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
    const lines = new THREE.LineSegments(geometry, this.edges).computeLineDistances();
    lines.renderOrder = 5;
    lines.frustumCulled = false;

    this.group.add(glow, lines);
  }
}
