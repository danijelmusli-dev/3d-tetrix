import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DEFAULT_SKIN, SKINS, isSkinId } from '../../src/config';
import { BoardView } from '../../src/render/boardView';
import { createSkin, cubeGeometry } from '../../src/render/skins';

describe('skins', () => {
  it('lists unique ids with names and a valid default', () => {
    expect(new Set(SKINS.map((s) => s.id)).size).toBe(SKINS.length);
    expect(SKINS.length).toBe(9);
    expect(isSkinId(DEFAULT_SKIN)).toBe(true);
    expect(isSkinId('nope')).toBe(false);
    expect(isSkinId(undefined)).toBe(false);
  });

  for (const { id } of SKINS) {
    it(`builds and disposes the ${id} skin`, () => {
      const skin = createSkin(id);
      expect(skin.id).toBe(id);
      expect(skin.material).toBeInstanceOf(THREE.Material);
      expect(skin.geometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(() => skin.dispose()).not.toThrow();
    });
  }

  it('shares the beveled cube except for the pixel and stud skins', () => {
    for (const { id } of SKINS) {
      const skin = createSkin(id);
      expect(skin.geometry === cubeGeometry).toBe(id !== 'pixel' && id !== 'studs');
      skin.dispose();
    }
  });

  it('studs add geometry on top of the cube', () => {
    const skin = createSkin('studs');
    expect(skin.geometry.getAttribute('position').count).toBeGreaterThan(
      cubeGeometry.getAttribute('position').count,
    );
    skin.dispose();
  });

  it('slime pulls colours toward green', () => {
    const skin = createSkin('slime');
    const red = new THREE.Color(0xff0000);
    skin.recolor!(red);
    expect(red.g).toBeGreaterThan(0.3);
    expect(red.r).toBeLessThan(1);
    skin.dispose();
  });
});

describe('BoardView.setSkin', () => {
  it('swaps material and geometry and keeps the drawn cubes', () => {
    const board = new BoardView(6, 6);
    board.draw([{ x: 0, y: 0, z: 0, colorId: 1 }]);
    const mesh = board.group.getObjectByProperty('isInstancedMesh', true) as THREE.InstancedMesh;
    const before = mesh.material;
    board.setSkin('studs');
    expect(board.skinId).toBe('studs');
    expect(mesh.material).not.toBe(before);
    expect(mesh.geometry).not.toBe(cubeGeometry);
    expect(board.drawnCount).toBe(1);
  });

  it('ignores picking the current skin and survives a resize', () => {
    const board = new BoardView(6, 6);
    const mesh = board.group.getObjectByProperty('isInstancedMesh', true) as THREE.InstancedMesh;
    const material = mesh.material;
    board.setSkin('classic');
    expect(mesh.material).toBe(material);
    board.setSkin('metal');
    board.resize(8, 8);
    const next = board.group.getObjectByProperty('isInstancedMesh', true) as THREE.InstancedMesh;
    expect(board.skinId).toBe('metal');
    expect(next.material).not.toBe(material);
    expect(next.count).toBe(0);
  });
});
