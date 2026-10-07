import type * as THREE from 'three';
import { CAMERA } from '../config';
import type { Animator, TweenHandle } from './animator';

/**
 * Spins the board group in 90° steps around the vertical axis.
 * Rapid presses retarget the running tween, so the board always settles on
 * an exact quarter turn and never drifts.
 */
export class BoardSpin {
  private turns = 0;
  private tween?: TweenHandle;

  constructor(
    private readonly group: THREE.Object3D,
    private readonly animator: Animator,
  ) {}

  /** Current quarter turn, 0..3 (counter-clockwise seen from above). */
  get quarter(): number {
    return ((this.turns % 4) + 4) % 4;
  }

  get spinning(): boolean {
    return this.tween !== undefined;
  }

  /** +1 = counter-clockwise seen from above, -1 = clockwise. */
  turn(dir: 1 | -1): void {
    this.turns += dir;
    this.tween?.cancel();
    const tween = this.animator.tween({
      from: this.group.rotation.y,
      to: (this.turns * Math.PI) / 2,
      duration: CAMERA.spinMs,
      onUpdate: (v) => (this.group.rotation.y = v),
    });
    this.tween = tween;
    void tween.done.then(() => {
      if (this.tween === tween) this.tween = undefined;
    });
  }
}
