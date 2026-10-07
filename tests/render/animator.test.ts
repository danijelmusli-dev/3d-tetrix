import { describe, expect, it } from 'vitest';
import {
  Animator,
  easeInOutCubic,
  easeInQuad,
  easeOutCubic,
  linear,
} from '../../src/render/animator';

describe('easing', () => {
  it('maps 0 → 0 and 1 → 1', () => {
    for (const ease of [linear, easeInOutCubic, easeOutCubic, easeInQuad]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
    }
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
  });
});

describe('Animator', () => {
  it('interpolates from → to over the duration', () => {
    const anim = new Animator();
    const seen: number[] = [];
    anim.tween({ from: 0, to: 10, duration: 100, ease: linear, onUpdate: (v) => seen.push(v) }, 0);
    anim.update(50);
    anim.update(100);
    anim.update(150);
    expect(seen).toEqual([5, 10]);
    expect(anim.busy).toBe(false);
  });

  it('resolves done when finished', async () => {
    const anim = new Animator();
    const t = anim.tween({ from: 0, to: 1, duration: 10, onUpdate: () => {} }, 0);
    expect(anim.busy).toBe(true);
    anim.update(10);
    await expect(t.done).resolves.toBeUndefined();
  });

  it('cancel stops updates and resolves done', async () => {
    const anim = new Animator();
    const seen: number[] = [];
    const t = anim.tween({ from: 0, to: 1, duration: 10, onUpdate: (v) => seen.push(v) }, 0);
    t.cancel();
    anim.update(5);
    expect(seen).toEqual([]);
    expect(anim.busy).toBe(false);
    await expect(t.done).resolves.toBeUndefined();
  });

  it('starts on the first update when no start time is given', () => {
    const anim = new Animator();
    const seen: number[] = [];
    anim.tween({ from: 0, to: 10, duration: 100, ease: linear, onUpdate: (v) => seen.push(v) });
    anim.update(5000); // render-loop clock, unrelated to performance.now()
    anim.update(5050);
    expect(seen).toEqual([0, 5]);
  });

  it('never runs backwards when update time precedes the start', () => {
    const anim = new Animator();
    const seen: number[] = [];
    anim.tween({ from: 4, to: 5, duration: 100, onUpdate: (v) => seen.push(v) }, 1000);
    anim.update(900);
    expect(seen).toEqual([4]);
  });

  it('timeScale slows playback', () => {
    const anim = new Animator();
    anim.timeScale = 0.5;
    const seen: number[] = [];
    anim.tween({ from: 0, to: 10, duration: 100, ease: linear, onUpdate: (v) => seen.push(v) }, 0);
    anim.update(100);
    expect(seen).toEqual([5]);
  });

  it('zero duration jumps straight to the end', () => {
    const anim = new Animator();
    const seen: number[] = [];
    anim.tween({ from: 3, to: 7, duration: 0, onUpdate: (v) => seen.push(v) }, 0);
    anim.update(0);
    expect(seen).toEqual([7]);
  });
});
