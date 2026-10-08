import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Grid } from '../../src/core/grid';
import { BoardView } from '../../src/render/boardView';

/** Ray straight down onto local cell (x, y) from above the board. */
function rayDown(board: BoardView, x: number, y: number): THREE.Raycaster {
  const c = board.cellCenter(x, y, 0);
  const origin = board.group.localToWorld(new THREE.Vector3(c.x, 50, c.z));
  return new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0));
}

function setup(): { board: BoardView; grid: Grid } {
  const board = new BoardView(10, 10);
  const grid = new Grid(10, 10);
  board.group.updateMatrixWorld(true);
  return { board, grid };
}

describe('BoardView.pickColumn', () => {
  it('picks the column under the ray on an empty board', () => {
    const { board, grid } = setup();
    board.sync(grid);
    expect(board.pickColumn(rayDown(board, 3, 7))).toEqual([3, 7]);
  });

  it('picks the column of a cube top that the ray hits', () => {
    const { board, grid } = setup();
    for (let z = 0; z < 8; z++) grid.set(4, 4, z, 1);
    board.sync(grid);
    expect(board.pickColumn(rayDown(board, 4, 4))).toEqual([4, 4]);
  });

  it('picks the neighbor column when hitting a cube side', () => {
    const { board, grid } = setup();
    for (let z = 0; z < 5; z++) grid.set(4, 4, z, 1);
    board.sync(grid);
    // Horizontal ray at layer 2 travelling +x, hits the -x face of (4,4).
    const c = board.cellCenter(0, 4, 2);
    const ray = new THREE.Raycaster(
      board.group.localToWorld(new THREE.Vector3(c.x - 5, c.y, c.z)),
      new THREE.Vector3(1, 0, 0),
    );
    expect(board.pickColumn(ray)).toEqual([3, 4]);
  });

  it('aims at the hit cube itself when its side faces off the board', () => {
    const { board, grid } = setup();
    for (let z = 0; z < 3; z++) grid.set(0, 4, z, 1);
    board.sync(grid);
    // Ray travelling +x from outside the board hits the -x wall of (0,4).
    const c = board.cellCenter(0, 4, 1);
    const ray = new THREE.Raycaster(
      board.group.localToWorld(new THREE.Vector3(c.x - 5, c.y, c.z)),
      new THREE.Vector3(1, 0, 0),
    );
    expect(board.pickColumn(ray)).toEqual([0, 4]);
  });

  it('still hits cubes after the board is rotated and re-synced', () => {
    const { board, grid } = setup();
    for (let z = 0; z < 8; z++)
      for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) grid.set(x, y, z, 1);
    board.sync(grid);
    board.group.rotation.y = Math.PI / 2;
    board.group.updateMatrixWorld(true);
    const hit = board.pickColumn(rayDown(board, 6, 2));
    expect(hit).toEqual([6, 2]);
  });
});

describe.each([6, 14])('BoardView on a %i-wide board', (size) => {
  it('picks columns across the whole footprint', () => {
    const board = new BoardView(size, 8);
    board.group.updateMatrixWorld(true);
    board.sync(new Grid(size, 8));
    for (const [x, y] of [
      [0, 0],
      [size - 1, size - 1],
      [Math.floor(size / 2), 1],
    ] as const)
      expect(board.pickColumn(rayDown(board, x, y))).toEqual([x, y]);
  });
});

describe('BoardView.resize', () => {
  it('rebuilds for the new size, keeps other children and starts empty', () => {
    const board = new BoardView(10, 10);
    const ghost = new THREE.Group();
    board.group.add(ghost);
    const grid = new Grid(10, 10);
    grid.set(0, 0, 0, 1);
    board.sync(grid);
    expect(board.drawnCount).toBe(1);

    board.resize(6, 8);
    expect([board.size, board.height]).toEqual([6, 8]);
    expect(board.drawnCount).toBe(0);
    expect(board.group.children).toContain(ghost);
    board.group.updateMatrixWorld(true);
    expect(board.pickColumn(rayDown(board, 5, 5))).toEqual([5, 5]);
  });

  it('is a no-op for the same size', () => {
    const board = new BoardView(10, 10);
    const grid = new Grid(10, 10);
    grid.set(1, 1, 0, 1);
    board.sync(grid);
    board.resize(10, 10);
    expect(board.drawnCount).toBe(1);
  });
});

describe('BoardView resize and draw', () => {
  it('releases the old instanced mesh when the board is resized', () => {
    const board = new BoardView(10, 10);
    const old = board.group.getObjectByProperty('isInstancedMesh', true) as THREE.InstancedMesh;
    let disposed = false;
    old.addEventListener('dispose', () => (disposed = true));
    board.resize(6, 6);
    expect(disposed).toBe(true);
  });

  it('never draws more cubes than the board can hold', () => {
    const board = new BoardView(6, 6);
    const extra = Array.from({ length: 6 * 6 * 6 + 50 }, () => ({ x: 0, y: 0, z: 0, colorId: 1 }));
    board.draw(extra);
    expect(board.drawnCount).toBe(6 * 6 * 6);
  });
});
