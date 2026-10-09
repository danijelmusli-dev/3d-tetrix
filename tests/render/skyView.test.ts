import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Animator } from '../../src/render/animator';
import { SkyView } from '../../src/render/skyView';

function setup(rolls: number[]) {
  const animator = new Animator();
  const lights = {
    hemi: new THREE.HemisphereLight(),
    sun: new THREE.DirectionalLight(),
  };
  let n = 0;
  const sky = new SkyView(new THREE.Scene(), animator, lights, () => rolls[n++ % rolls.length]!);
  const settle = (): void => {
    const now = performance.now();
    animator.update(now);
    animator.update(now + 20_000);
  };
  const uniform = (name: string): number =>
    (sky as unknown as { material: THREE.ShaderMaterial }).material.uniforms[name]!.value as number;
  return { sky, settle, uniform };
}

describe('SkyView sun and moon', () => {
  it('shows only the sun during the day and only the moon at night', () => {
    const { sky, settle, uniform } = setup([0.1]);
    sky.setScore(500); // Day
    settle();
    expect(uniform('uSunStrength')).toBeGreaterThan(0.5);
    expect(uniform('uMoonStrength')).toBe(0);
    sky.setScore(5000); // Night
    settle();
    expect(uniform('uSunStrength')).toBe(0);
    expect(uniform('uMoonStrength')).toBe(1);
  });

  it('rolls a different moon each time night falls', () => {
    const { sky, settle } = setup([0, 0.5, 0.9]);
    const names: string[] = [];
    for (let night = 0; night < 3; night++) {
      sky.setScore(5000);
      settle();
      names.push(sky.moon.name);
      sky.setScore(500);
      settle();
    }
    expect(new Set(names).size).toBe(3);
  });

  it('keeps the moon while moving between night skies', () => {
    const { sky, settle } = setup([0.2]);
    sky.setScore(5000);
    settle();
    const tonight = sky.moon;
    sky.setScore(8000); // Aurora
    settle();
    expect(sky.moon).toBe(tonight);
  });

  it('does not swap a moon that is still fading out', () => {
    const { sky, settle } = setup([0.2, 0.8]);
    sky.setScore(5000);
    settle();
    const tonight = sky.moon;
    sky.reset();
    // Back into the night before the moon has faded away.
    sky.setScore(5000);
    expect(sky.moon).toBe(tonight);
    settle();
  });
});
