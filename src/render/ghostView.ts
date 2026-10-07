import * as THREE from 'three';
import type { Vec3 } from '../core/grid';
import { cubeGeometry, pieceColor, type BoardView } from './boardView';

const INVALID_COLOR = 0xff4d4d;
const edgesGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));

/** Translucent preview of where the held piece will land. Lives in the board group. */
export class GhostView {
  private readonly group = new THREE.Group();
  private readonly fill = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    roughness: 0.6,
  });
  private key = '';
  private readonly edges = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  });

  constructor(private readonly board: BoardView) {
    this.group.visible = false;
    this.group.renderOrder = 1;
    board.group.add(this.group);
  }

  /** Show `cells` offset by (x, y, z). `valid` = the piece can be dropped here. */
  show(
    cells: readonly Vec3[],
    x: number,
    y: number,
    z: number,
    colorId: number,
    valid: boolean,
  ): void {
    const key = `${cells.map((c) => c.join()).join(';')}|${x},${y},${z}|${colorId}|${valid}`;
    this.group.visible = true;
    if (key === this.key) return;
    this.key = key;
    this.fill.color.set(valid ? pieceColor(colorId) : new THREE.Color(INVALID_COLOR));
    this.edges.opacity = valid ? 0.7 : 0.3;
    this.group.clear();
    for (const [dx, dy, dz] of cells) {
      const pos = this.board.cellCenter(x + dx, y + dy, z + dz);
      const cube = new THREE.Mesh(cubeGeometry, this.fill);
      const outline = new THREE.LineSegments(edgesGeometry, this.edges);
      cube.position.copy(pos);
      outline.position.copy(pos);
      this.group.add(cube, outline);
    }
  }

  hide(): void {
    this.group.visible = false;
  }
}
