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

  /** Re-fit after the viewport aspect changes. */
  resize(): void {
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
        return Math.abs(p.x) <= limit && Math.abs(p.y) <= limit;
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
