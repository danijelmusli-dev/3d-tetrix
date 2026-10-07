import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CAMERA } from '../../src/config';
import { Animator } from '../../src/render/animator';
import { CameraRig } from '../../src/render/cameraRig';

/** Elevation (degrees) of the camera's view direction below the horizon. */
function elevation(camera: THREE.PerspectiveCamera): number {
  camera.updateMatrixWorld();
  const dir = camera.getWorldDirection(new THREE.Vector3());
  return THREE.MathUtils.radToDeg(Math.asin(-dir.y));
}

function setup() {
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 16 / 9, 0.1, 500);
  const animator = new Animator();
  const rig = new CameraRig(camera, 10, 10, animator);
  const settle = (): void => {
    const now = performance.now();
    animator.update(now);
    animator.update(now + 10_000);
  };
  return { camera, rig, settle };
}

describe('CameraRig top view', () => {
  it('starts at the reference angle', () => {
    const { camera, rig } = setup();
    expect(rig.topView).toBe(false);
    expect(elevation(camera)).toBeCloseTo(CAMERA.elevationDeg, 3);
  });

  it('toggles to a near top-down view and back', () => {
    const { camera, rig, settle } = setup();
    rig.toggleTopView();
    settle();
    expect(rig.topView).toBe(true);
    expect(elevation(camera)).toBeCloseTo(CAMERA.topElevationDeg, 3);
    rig.toggleTopView();
    settle();
    expect(elevation(camera)).toBeCloseTo(CAMERA.elevationDeg, 3);
  });

  it('looks square-on from above: screen right is world +X', () => {
    const { camera, rig, settle } = setup();
    rig.toggleTopView();
    settle();
    camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    expect(right.x).toBeCloseTo(1, 3);
  });

  it('keeps the board in frame from above, also with a tall stack', () => {
    const { camera, rig, settle } = setup();
    rig.setStackHeight(8);
    rig.toggleTopView();
    settle();
    camera.updateMatrixWorld();
    for (const [x, y, z] of [
      [-5, 0, -5],
      [5, 0, 5],
      [-5, 8, 5],
      [5, 8, -5],
    ] as const) {
      const p = new THREE.Vector3(x, y, z).project(camera);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
    }
  });
});
