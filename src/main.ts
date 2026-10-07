import './style.css';
import { BOARD_HEIGHT, BOARD_SIZE } from './config';
import { Game } from './core/game';
import { TRAY_SLOTS } from './core/tray';
import { bindKeys } from './input/keyboard';
import { PieceController } from './input/pieceController';
import { Animator } from './render/animator';
import { BoardSpin } from './render/boardSpin';
import { BoardView } from './render/boardView';
import { CameraRig } from './render/cameraRig';
import { GhostView } from './render/ghostView';
import { createScene } from './render/scene';
import { createPieceThumbnails } from './render/thumbnails';
import { createSpinButtons } from './ui/controls';
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
  onPlaced: (result) => {
    refresh();
    if (result.gameOver) showGameOver();
  },
});

/** Fit the camera into the space above the tray. */
function layout(): void {
  const trayTop = tray.el.getBoundingClientRect().top;
  rig.layout(container!.clientWidth, container!.clientHeight, container!.clientHeight - trayTop);
}
window.addEventListener('resize', layout);
layout();

bindKeys({
  q: () => spin.turn(1),
  e: () => spin.turn(-1),
  r: (e) => controller.rotate('spin', e.shiftKey ? -1 : 1),
  f: (e) => controller.rotate('tip', e.shiftKey ? -1 : 1),
  t: (e) => controller.rotate('roll', e.shiftKey ? -1 : 1),
  escape: () => controller.cancel(),
});
createSpinButtons(
  () => spin.turn(1),
  () => spin.turn(-1),
);

/** Placeholder until the Phase 5 HUD. */
function showGameOver(): void {
  const el = document.createElement('div');
  el.className = 'game-over';
  el.textContent = `No moves left — score ${game.score}. Reload to play again.`;
  document.body.appendChild(el);
}

if (import.meta.env.DEV) {
  void import('./debug').then(({ installDebug }) =>
    installDebug({ game, spin, controller, rig, refresh }),
  );
}

renderer.setAnimationLoop((now) => {
  animator.update(now);
  controller.update();
  renderer.render(scene, camera);
});
