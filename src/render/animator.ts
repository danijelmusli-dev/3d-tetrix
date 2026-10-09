export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeInQuad: Easing = (t) => t * t;
/** Overshoots slightly past 1 before settling (landing bounce). */
export const easeOutBack: Easing = (t) => {
  const s = 1.2;
  return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};
export const easeInOutSine: Easing = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export interface TweenOptions {
  from: number;
  to: number;
  /** Milliseconds. */
  duration: number;
  ease?: Easing;
  onUpdate: (value: number) => void;
}

export interface TweenHandle {
  cancel(): void;
  /** Resolves when the tween finishes or is cancelled. */
  done: Promise<void>;
}

interface Active extends Required<TweenOptions> {
  /** Set on the first update so start and progress use the same clock. */
  start: number | undefined;
  finish: () => void;
}

/** Minimal tween runner driven by the render loop's `update(now)`. */
export class Animator {
  private readonly active = new Set<Active>();
  /** Playback speed multiplier (debug slow motion). */
  timeScale = 1;

  get busy(): boolean {
    return this.active.size > 0;
  }

  /**
   * Start a tween. `now` pins the start time (tests); by default the tween
   * starts at the next `update`, using the render loop's own timestamps.
   */
  tween(options: TweenOptions, now?: number): TweenHandle {
    let finish!: () => void;
    const done = new Promise<void>((resolve) => (finish = resolve));
    const entry: Active = { ease: easeInOutCubic, ...options, start: now, finish };
    this.active.add(entry);
    return {
      done,
      cancel: () => {
        if (this.active.delete(entry)) finish();
      },
    };
  }

  update(now: number): void {
    for (const t of this.active) {
      t.start ??= now;
      const elapsed = Math.max(now - t.start, 0) * this.timeScale;
      const progress = t.duration > 0 ? Math.min(elapsed / t.duration, 1) : 1;
      t.onUpdate(t.from + (t.to - t.from) * t.ease(progress));
      if (progress === 1) {
        this.active.delete(t);
        t.finish();
      }
    }
  }
}
