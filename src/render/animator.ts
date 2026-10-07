export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
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
  start: number;
  finish: () => void;
}

/** Minimal tween runner driven by the render loop's `update(now)`. */
export class Animator {
  private readonly active = new Set<Active>();

  get busy(): boolean {
    return this.active.size > 0;
  }

  tween(options: TweenOptions, now = performance.now()): TweenHandle {
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
      const progress = t.duration > 0 ? Math.min((now - t.start) / t.duration, 1) : 1;
      t.onUpdate(t.from + (t.to - t.from) * t.ease(progress));
      if (progress === 1) {
        this.active.delete(t);
        t.finish();
      }
    }
  }
}
