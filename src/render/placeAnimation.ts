import { ANIM } from '../config';
import type { ClearStep } from '../core/clearing';
import type { PlaceResult } from '../core/game';
import { easeInQuad, easeOutCubic, linear, type Animator, type Easing } from './animator';
import type { BoardView } from './boardView';
import { DisplayBoard } from './displayBoard';

export interface PlacementHooks {
  /** Called as each cascade step starts clearing (combo level = index + 1). */
  onStep?: (index: number, step: ClearStep) => void;
}

/**
 * Replay a placement on screen: the piece drops in, then for each cascade
 * step the cleared cubes flash and shrink away and the cubes above fall.
 * Resolves once the board shows the final state (the real grid already does).
 */
export async function animatePlacement(
  result: PlaceResult,
  board: BoardView,
  animator: Animator,
  hooks: PlacementHooks = {},
): Promise<void> {
  const display = DisplayBoard.fromGrid(result.before);
  const draw = (): void => board.draw(display.list());
  const run = (duration: number, ease: Easing, onUpdate: (t: number) => void): Promise<void> =>
    animator.tween({ from: 0, to: 1, duration, ease, onUpdate: (t) => (onUpdate(t), draw()) }).done;

  const placed = display.add(result.placed, result.colorId);
  await run(ANIM.dropMs, easeOutCubic, (t) =>
    placed.forEach((cube, i) => (cube.z = result.placed[i]![2] + (1 - t) * ANIM.dropHeight)),
  );

  for (const [index, step] of result.steps.entries()) {
    hooks.onStep?.(index, step);
    const doomed = display.at(step.cleared);
    await run(ANIM.flashMs, linear, (t) =>
      doomed.forEach((cube) => {
        cube.flash = t;
        cube.scale = 1 + 0.12 * t;
      }),
    );
    await run(ANIM.shrinkMs, easeInQuad, (t) =>
      doomed.forEach((cube) => (cube.scale = 1.12 * (1 - t))),
    );
    display.remove(step.cleared);
    const falling = display.move(step.moves);
    await run(ANIM.fallMs, easeInQuad, (t) =>
      falling.forEach(({ cube, fromZ, toZ }) => (cube.z = fromZ + (toZ - fromZ) * t)),
    );
  }
  draw();
}
