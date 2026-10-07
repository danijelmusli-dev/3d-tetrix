import * as THREE from 'three';
import { CAMERA } from '../config';
import type { Animator, TweenHandle } from './animator';
import { SLAB_MARGIN, SLAB_THICKNESS } from './boardView';

/**
 * Fixed-angle camera that zooms with the stack: it frames the board footprint
 * up to `tallest stack + headroom` layers, easing in/out as that changes.
 */
export class CameraRig {
  private visibleLayers: number;
  private goal: number;
  private tween?: TweenHandle;
  /** NDC height (0..2) reserved at the bottom of the viewport for UI. */
  private bottomInset = 0;
  private readonly dir: THREE.Vector3;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly size: number,
    private readonly maxLayers: number,
    private readonly animator: Animator,
  ) {
    const elev = THREE.MathUtils.degToRad(CAMERA.elevationDeg);
    const azim = THREE.MathUtils.degToRad(CAMERA.azimuthDeg);
    this.dir = new THREE.Vector3(
      Math.cos(elev) * Math.sin(azim),
      Math.sin(elev),
      Math.cos(elev) * Math.cos(azim),
    );
    this.goal = this.visibleLayers = this.layersFor(0);
    this.apply();
  }

  setStackHeight(stack: number): void {
    const target = this.layersFor(stack);
    if (target === this.goal) return;
    this.goal = target;
    this.tween?.cancel();
    this.tween = this.animator.tween({
      from: this.visibleLayers,
      to: target,
      duration: CAMERA.zoomMs,
      onUpdate: (v) => {
        this.visibleLayers = v;
        this.apply();
      },
    });
  }

  /** Snapshot for debug tooling. */
  debugState(): { visibleLayers: number; goal: number; distance: number } {
    return {
      visibleLayers: this.visibleLayers,
      goal: this.goal,
      distance: this.camera.position.distanceTo(new THREE.Vector3(0, this.visibleLayers / 2, 0)),
    };
  }

  /**
   * Re-fit for the current viewport, keeping `bottomPx` at the bottom free for
   * UI (the tray). The projection center shifts up so the board is centered
   * in the remaining area.
   */
  layout(width: number, height: number, bottomPx: number): void {
    this.bottomInset = (2 * bottomPx) / height;
    this.camera.setViewOffset(width, height, 0, bottomPx / 2, width, height);
    this.apply();
  }

  private layersFor(stack: number): number {
    return THREE.MathUtils.clamp(stack + CAMERA.headroom, CAMERA.minLayers, this.maxLayers);
  }

  /** Move along the fixed view direction until the framed box just fits. */
  private apply(): void {
    const h = this.visibleLayers;
    const half = this.size / 2 + SLAB_MARGIN;
    const target = new THREE.Vector3(0, h / 2, 0);
    const corners: THREE.Vector3[] = [];
    for (const x of [-half, half])
      for (const y of [-SLAB_THICKNESS, h])
        for (const z of [-half, half]) corners.push(new THREE.Vector3(x, y, z));

    const limit = 1 - CAMERA.margin;
    const place = (distance: number): void => {
      this.camera.position.copy(target).addScaledVector(this.dir, distance);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld();
    };
    const fits = (): boolean =>
      corners.every((c) => {
        const p = c.clone().project(this.camera);
        return Math.abs(p.x) <= limit && p.y <= limit && p.y >= -limit + this.bottomInset;
      });

    let lo = 1;
    let hi = 500;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      place(mid);
      if (fits()) hi = mid;
      else lo = mid;
    }
    place(hi);
  }
}
