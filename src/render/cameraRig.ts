import * as THREE from 'three';
import { CAMERA } from '../config';
import type { Animator, TweenHandle } from './animator';
import { SLAB_MARGIN, SLAB_THICKNESS } from './boardView';

/**
 * Fixed-angle camera that zooms with the stack: it frames the board footprint
 * up to `tallest stack + headroom` layers, easing in/out as that changes.
 * Space toggles a bird's-eye view: elevation eases to almost straight down
 * and azimuth to 0 so the board reads square. Screen-right stays nearest
 * world +X and toward-viewer nearest +Z, so key directions keep matching.
 */
export class CameraRig {
  private visibleLayers: number;
  private goal: number;
  private tween?: TweenHandle;
  /** NDC heights (0..2) reserved at the top / bottom of the viewport for UI. */
  private topInset = 0;
  private bottomInset = 0;
  private elevationDeg: number = CAMERA.elevationDeg;
  /** Tallest stack, used to frame tightly from above. */
  private stack = 0;
  private top = false;
  private tiltTween?: TweenHandle;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private size: number,
    private maxLayers: number,
    private readonly animator: Animator,
  ) {
    this.goal = this.visibleLayers = this.layersFor(0);
    this.apply();
  }

  /** New board dimensions: snap straight to the empty-board framing. */
  resize(size: number, maxLayers: number): void {
    this.tween?.cancel();
    this.size = size;
    this.maxLayers = maxLayers;
    this.stack = 0;
    this.goal = this.visibleLayers = this.layersFor(0);
    this.apply();
  }

  get topView(): boolean {
    return this.top;
  }

  toggleTopView(): void {
    this.top = !this.top;
    this.tiltTween?.cancel();
    this.tiltTween = this.animator.tween({
      from: this.elevationDeg,
      to: this.top ? CAMERA.topElevationDeg : CAMERA.elevationDeg,
      duration: CAMERA.tiltMs,
      onUpdate: (v) => {
        this.elevationDeg = v;
        this.apply();
      },
    });
  }

  setStackHeight(stack: number): void {
    this.stack = stack;
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
   * Re-fit for the current viewport, keeping `topPx` / `bottomPx` free for UI
   * (score, tray). The projection center shifts so the board is centered in
   * the remaining area.
   */
  layout(width: number, height: number, topPx: number, bottomPx: number): void {
    this.topInset = (2 * topPx) / height;
    this.bottomInset = (2 * bottomPx) / height;
    this.camera.setViewOffset(width, height, 0, (bottomPx - topPx) / 2, width, height);
    this.apply();
  }

  private layersFor(stack: number): number {
    return THREE.MathUtils.clamp(stack + CAMERA.headroom, CAMERA.minLayers, this.maxLayers);
  }

  /** Move along the view direction until the framed box just fits. */
  private apply(): void {
    // 0 at the reference angle, 1 in full bird's-eye view.
    const topness =
      (this.elevationDeg - CAMERA.elevationDeg) / (CAMERA.topElevationDeg - CAMERA.elevationDeg);
    const elev = THREE.MathUtils.degToRad(this.elevationDeg);
    const azim = THREE.MathUtils.degToRad(CAMERA.azimuthDeg * (1 - topness));
    const dir = new THREE.Vector3(
      Math.cos(elev) * Math.sin(azim),
      Math.sin(elev),
      Math.cos(elev) * Math.cos(azim),
    );
    // From above, headroom only inflates the frame (perspective), so frame the real stack.
    const h = THREE.MathUtils.lerp(this.visibleLayers, Math.max(this.stack, 1), topness);
    const half = this.size / 2 + SLAB_MARGIN;
    const target = new THREE.Vector3(0, h / 2, 0);
    const corners: THREE.Vector3[] = [];
    for (const x of [-half, half])
      for (const y of [-SLAB_THICKNESS, h])
        for (const z of [-half, half]) corners.push(new THREE.Vector3(x, y, z));

    const limit = 1 - CAMERA.margin;
    const place = (distance: number): void => {
      this.camera.position.copy(target).addScaledVector(dir, distance);
      this.camera.lookAt(target);
      this.camera.updateMatrixWorld();
    };
    const fits = (): boolean =>
      corners.every((c) => {
        const p = c.clone().project(this.camera);
        return (
          Math.abs(p.x) <= limit && p.y <= limit - this.topInset && p.y >= -limit + this.bottomInset
        );
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
