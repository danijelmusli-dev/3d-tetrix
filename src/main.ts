import './style.css';
import { BOARD_HEIGHT, BOARD_SIZE } from './config';
import { Game, POINTS_PER_CLEARED_CELL, POINTS_PER_PLACED_CELL } from './core/game';
import { TRAY_SLOTS } from './core/tray';
import { bindKeys } from './input/keyboard';
import { PieceController } from './input/pieceController';
import { Animator } from './render/animator';
import { BoardSpin } from './render/boardSpin';
import { BoardView } from './render/boardView';
import { CameraRig } from './render/cameraRig';
import { GhostView } from './render/ghostView';
import { animatePlacement } from './render/placeAnimation';
import { createScene } from './render/scene';
import { createPieceThumbnails } from './render/thumbnails';
import { createSpinButtons } from './ui/controls';
import { Hud } from './ui/hud';
import { TrayView } from './ui/trayView';

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing');

const { renderer, scene, camera } = createScene(container);
const animator = new Animator();
const debugSeed = import.meta.env.DEV
  ? Number(new URLSearchParams(location.hash.slice(1)).get('seed')) || undefined
  : undefined;
const game = new Game({ size: BOARD_SIZE, height: BOARD_HEIGHT, seed: debugSeed });
const board = new BoardView(BOARD_SIZE, BOARD_HEIGHT);
scene.add(board.group);

const rig = new CameraRig(camera, BOARD_SIZE, BOARD_HEIGHT, animator);
const spin = new BoardSpin(board.group, animator);
const ghost = new GhostView(board);

/** Redraw board state and let the camera follow the stack height. */
function refresh(): void {
  board.sync(game.grid);
  rig.setStackHeight(game.grid.stackHeight());
}
refresh();

const tray = new TrayView(TRAY_SLOTS, createPieceThumbnails(), (slot, e) =>
  controller.pick(slot, e),
);
const controller = new PieceController({
  game,
  board,
  ghost,
  spin,
  tray,
  camera,
  canvas: renderer.domElement,
  onPlaced: async (result) => {
    controller.locked = true;
    // Count the score up alongside the animation: placement first, then each clear step.
    let shown = game.score - result.scoreDelta + result.placed.length * POINTS_PER_PLACED_CELL;
    hud.setScore(shown);
    await animatePlacement(result, board, animator, {
      onStep: (i, step) => {
        const points = step.cleared.length * POINTS_PER_CLEARED_CELL * (i + 1);
        shown += points;
        hud.setScore(shown);
        hud.popup(
          `+${points}`,
          i > 0 ? `Combo ×${i + 1}` : step.lines > 1 ? `${step.lines} lines` : 'Line clear',
        );
      },
    });
    refresh();
    hud.setScore(game.score);
    controller.locked = false;
    if (result.gameOver) hud.showGameOver(game.score);
  },
});

bindKeys({
  q: () => spin.turn(1),
  e: () => spin.turn(-1),
  r: () => controller.rotate('spin', 1),
  f: () => controller.rotate('tip', 1),
  t: () => controller.rotate('roll', 1),
  // Shift held = free move (slide into holes); released via keyup in the controller.
  shift: () => controller.setFree(true),
  w: () => controller.raise(1),
  s: () => controller.raise(-1),
  escape: () => controller.cancel(),
});
createSpinButtons(
  () => spin.turn(1),
  () => spin.turn(-1),
);

const hud = new Hud(animator, restart);

/** Fit the camera into the space between the score readout and the tray. */
function layout(): void {
  const { clientWidth: w, clientHeight: h } = container!;
  const top = hud.scoreEl.getBoundingClientRect().bottom;
  const bottom = h - tray.el.getBoundingClientRect().top;
  rig.layout(w, h, top, bottom);
}
window.addEventListener('resize', layout);
layout();

function restart(): void {
  game.reset();
  controller.reset();
  refresh();
  hud.setScore(0, false);
  hud.hideGameOver();
}

if (import.meta.env.DEV) {
  void import('./debug').then(({ installDebug }) =>
    installDebug({
      game,
      spin,
      controller,
      rig,
      animator,
      refresh,
      cellToScreen: (x, y, z) => {
        // Floor of the cell, so a ray through it lands in that cell.
        const v = board.group.localToWorld(board.cellCenter(x, y, z - 0.5)).project(camera);
        const rect = renderer.domElement.getBoundingClientRect();
        return [rect.left + ((v.x + 1) / 2) * rect.width, rect.top + ((1 - v.y) / 2) * rect.height];
      },
    }),
  );
}

renderer.setAnimationLoop((now) => {
  animator.update(now);
  controller.update();
  renderer.render(scene, camera);
});
