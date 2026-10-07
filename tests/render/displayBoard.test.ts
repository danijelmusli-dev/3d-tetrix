import { describe, expect, it } from 'vitest';
import { resolveCascade } from '../../src/core/clearing';
import { Grid } from '../../src/core/grid';
import { DisplayBoard } from '../../src/render/displayBoard';
import { fillRowX, fillRowY } from '../core/helpers';

const sorted = (cubes: { x: number; y: number; z: number; colorId: number }[]) =>
  cubes
    .map(({ x, y, z, colorId }) => [x, y, z, colorId].join())
    .sort()
    .join(' ');

const gridCubes = (grid: Grid) =>
  Array.from(grid.filled(), ({ pos: [x, y, z], colorId }) => ({ x, y, z, colorId }));

describe('DisplayBoard', () => {
  it('mirrors a grid', () => {
    const g = new Grid(4, 4);
    g.set(1, 2, 3, 5);
    expect(DisplayBoard.fromGrid(g).list()).toEqual([{ x: 1, y: 2, z: 3, colorId: 5 }]);
  });

  it('replaying a cascade ends in the same state as the grid', () => {
    const g = new Grid(10, 10);
    fillRowX(g, 0, 0, [], 2);
    fillRowY(g, 0, 1, [0], 3);
    g.set(0, 0, 2, 4);
    g.set(7, 0, 3, 5); // above a cleared cell, drops 1
    const before = g.clone();
    const steps = resolveCascade(g);
    expect(steps).toHaveLength(2);

    const display = DisplayBoard.fromGrid(before);
    for (const step of steps) {
      expect(display.at(step.cleared)).toHaveLength(step.cleared.length);
      display.remove(step.cleared);
      display.move(step.moves);
    }
    expect(sorted(display.list())).toBe(sorted(gridCubes(g)));
  });

  it('move reports start and end heights', () => {
    const display = new DisplayBoard();
    display.add([[0, 0, 3]], 1);
    const [moved] = display.move([{ from: [0, 0, 3], to: [0, 0, 1] }]);
    expect(moved).toMatchObject({ fromZ: 3, toZ: 1 });
    expect(display.at([[0, 0, 1]])).toHaveLength(1);
    expect(display.at([[0, 0, 3]])).toHaveLength(0);
    expect(display.move([{ from: [5, 5, 5], to: [5, 5, 4] }])).toEqual([]);
  });
});
