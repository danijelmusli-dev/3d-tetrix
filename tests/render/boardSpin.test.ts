import { describe, expect, it } from 'vitest';
import type * as THREE from 'three';
import { Animator } from '../../src/render/animator';
import { BoardSpin } from '../../src/render/boardSpin';

function setup() {
  const group = { rotation: { y: 0 } } as unknown as THREE.Object3D;
  const animator = new Animator();
  const spin = new BoardSpin(group, animator);
  const settle = async (): Promise<void> => {
    animator.update(performance.now() + 10_000);
    await Promise.resolve();
  };
  return { group, animator, spin, settle };
}

describe('BoardSpin', () => {
  it('turns a quarter counter-clockwise and settles exactly', async () => {
    const { group, spin, settle } = setup();
    spin.turn(1);
    expect(spin.spinning).toBe(true);
    expect(spin.quarter).toBe(1);
    await settle();
    expect(group.rotation.y).toBe(Math.PI / 2);
    expect(spin.spinning).toBe(false);
  });

  it('wraps quarter into 0..3 in both directions', () => {
    const { spin } = setup();
    spin.turn(-1);
    expect(spin.quarter).toBe(3);
    for (let i = 0; i < 5; i++) spin.turn(1);
    expect(spin.quarter).toBe(0);
  });

  it('rapid presses retarget and settle on an exact quarter', async () => {
    const { group, animator, spin, settle } = setup();
    const t0 = performance.now();
    spin.turn(1);
    animator.update(t0 + 100); // mid-spin
    spin.turn(1);
    animator.update(t0 + 150);
    spin.turn(-1);
    spin.turn(1);
    spin.turn(1);
    await settle();
    expect(spin.quarter).toBe(3);
    expect(group.rotation.y).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(animator.busy).toBe(false);
  });
});
