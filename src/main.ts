import './style.css';
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
import { BoardSettings } from './ui/boardSettings';
import { createSpinButtons } from './ui/controls';
import { createHelp } from './ui/help';
import { Hud } from './ui/hud';
import { PieceControls } from './ui/pieceControls';
import {
  isValidBoard,
  loadBest,
  loadBoard,
  saveBest,
  saveBoard,
  type BoardDims,
} from './ui/storage';
import { TrayView } from './ui/trayView';

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing');

const { renderer, scene, camera, fitShadows } = createScene(container);
const animator = new Animator();
const hashParams = new URLSearchParams(location.hash.slice(1));
const debugSeed = import.meta.env.DEV ? Number(hashParams.get('seed')) || undefined : undefined;
/** Dev: #size=8&height=6 overrides the saved board size. */
const debugDims = {
  size: Number(hashParams.get('size')),
  height: Number(hashParams.get('height') ?? hashParams.get('size')),
};
let dims: BoardDims = import.meta.env.DEV && isValidBoard(debugDims) ? debugDims : loadBoard();

const game = new Game({ size: dims.size, height: dims.height, seed: debugSeed });
const board = new BoardView(dims.size, dims.height);
scene.add(board.group);
fitShadows(dims.size, dims.height);

const rig = new CameraRig(camera, dims.size, dims.height, animator);
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
    try {
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
    } catch (err) {
      // The animation is cosmetic: never let it leave the game locked or the board stale.
      console.error('Placement animation failed', err);
    } finally {
      refresh();
      hud.setScore(game.score);
      controller.locked = false;
      const newBest = game.score > best;
      if (newBest) {
        best = game.score;
        saveBest(dims, best);
        hud.setBest(best);
      }
      if (result.gameOver) hud.showGameOver(game.score, newBest && game.score > startBest);
    }
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

const pieceControls = new PieceControls({
  rotate: (kind) => controller.rotate(kind, 1),
  toggleFree: () => controller.toggleFree(),
  raise: (dz) => controller.raise(dz),
  cancel: () => controller.cancel(),
});
createHelp();

const settings = new BoardSettings(dims, startGame);
const hud = new Hud(animator, restart, () => {
  hud.hideGameOver();
  settings.open();
});
let best = loadBest(dims);
/** Best score when the current game started, to tell whether this game beat it. */
let startBest = best;
hud.setBest(best);

/** Fit the camera into the space between the score readout and the piece controls / tray. */
function layout(): void {
  const { clientWidth: w, clientHeight: h } = container!;
  const top = hud.scoreEl.getBoundingClientRect().bottom;
  // The controls bar only takes bottom space when laid out as a row (phones).
  const row = getComputedStyle(pieceControls.el).flexDirection === 'row';
  const bottom = h - (row ? pieceControls.el : tray.el).getBoundingClientRect().top;
  rig.layout(w, h, top, bottom);
}
window.addEventListener('resize', layout);
layout();

/** New game on a (possibly) different board size. */
function startGame(next: BoardDims): void {
  dims = next;
  saveBoard(dims);
  game.reset(undefined, dims.size, dims.height);
  board.resize(dims.size, dims.height);
  rig.resize(dims.size, dims.height);
  fitShadows(dims.size, dims.height);
  controller.reset();
  refresh();
  best = startBest = loadBest(dims);
  hud.setBest(best);
  hud.setScore(0, false);
  hud.hideGameOver();
  settings.setCurrent(dims);
}

function restart(): void {
  startGame(dims);
}

if (import.meta.env.DEV) {
  void import('./debug').then(({ installDebug }) =>
    installDebug({
      game,
      spin,
      controller,
      rig,
      animator,
      board,
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
  // three.js only schedules the next frame after this callback returns, so an
  // exception here would freeze the screen for good. Log it and keep drawing.
  try {
    animator.update(now);
    controller.update();
    pieceControls.update(controller.holding, controller.isFree);
  } catch (err) {
    console.error('Frame update failed', err);
  }
  renderer.render(scene, camera);
});
