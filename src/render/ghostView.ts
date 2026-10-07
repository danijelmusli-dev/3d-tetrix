import * as THREE from 'three';
import type { Vec3 } from '../core/grid';
import { cubeGeometry, pieceColor, type BoardView } from './boardView';

const INVALID_COLOR = 0xff4d4d;
const edgesGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
/** Same edges with line distances, needed for dashed lines. */
const dashedEdgesGeometry = new THREE.LineSegments(edgesGeometry.clone()).computeLineDistances()
  .geometry;

/**
 * Translucent preview of where the held piece will land. Lives in the board group.
 * Edges hidden behind cubes are drawn as faint dashes on top (x-ray), so parts
 * tucked under overhangs stay visible. In free move, an outline also marks the
 * carried position when the piece will fall lower from it.
 */
export class GhostView {
  private readonly group = new THREE.Group();
  private key = '';
  private readonly fill = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    roughness: 0.6,
  });
  private readonly edges = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
  });
  private readonly xray = new THREE.LineDashedMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    dashSize: 0.1,
    gapSize: 0.07,
    depthTest: false,
    depthWrite: false,
  });
  private readonly carrierEdges = new THREE.LineDashedMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    dashSize: 0.18,
    gapSize: 0.12,
    depthWrite: false,
  });

  constructor(private readonly board: BoardView) {
    this.group.visible = false;
    board.group.add(this.group);
  }

  /**
   * Show `cells` offset by (x, y, z). `valid` = the piece can be placed here.
   * `carrierZ` (free move) = layer the piece is carried at, if above `z`.
   */
  show(
    cells: readonly Vec3[],
    x: number,
    y: number,
    z: number,
    colorId: number,
    valid: boolean,
    carrierZ?: number,
  ): void {
    const key = `${cells.map((c) => c.join()).join(';')}|${x},${y},${z}|${colorId}|${valid}|${carrierZ}`;
    this.group.visible = true;
    if (key === this.key) return;
    this.key = key;
    this.fill.color.set(valid ? pieceColor(colorId) : new THREE.Color(INVALID_COLOR));
    this.edges.opacity = valid ? 0.7 : 0.3;
    this.group.clear();

    for (const [dx, dy, dz] of cells) {
      const pos = this.board.cellCenter(x + dx, y + dy, z + dz);
      this.add(new THREE.Mesh(cubeGeometry, this.fill), pos, 1);
      this.add(new THREE.LineSegments(edgesGeometry, this.edges), pos, 2);
      this.add(new THREE.LineSegments(dashedEdgesGeometry, this.xray), pos, 3);
    }
    if (carrierZ !== undefined && carrierZ > z) {
      for (const [dx, dy, dz] of cells) {
        const pos = this.board.cellCenter(x + dx, y + dy, carrierZ + dz);
        this.add(new THREE.LineSegments(dashedEdgesGeometry, this.carrierEdges), pos, 2);
      }
    }
  }

  hide(): void {
    this.group.visible = false;
  }

  private add(object: THREE.Object3D, pos: THREE.Vector3, renderOrder: number): void {
    object.position.copy(pos);
    object.renderOrder = renderOrder;
    this.group.add(object);
  }
}
