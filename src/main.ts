import './style.css';
import { BOARD_HEIGHT, BOARD_SIZE } from './config';
import { Game } from './core/game';
import { bindKeys } from './input/keyboard';
import { Animator } from './render/animator';
import { BoardSpin } from './render/boardSpin';
import { BoardView } from './render/boardView';
import { CameraRig } from './render/cameraRig';
import { createScene } from './render/scene';
import { createSpinButtons } from './ui/controls';

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing');

const { renderer, scene, camera } = createScene(container);
const animator = new Animator();
const game = new Game({ size: BOARD_SIZE, height: BOARD_HEIGHT });
const board = new BoardView(BOARD_SIZE, BOARD_HEIGHT);
scene.add(board.group);

const rig = new CameraRig(camera, BOARD_SIZE, BOARD_HEIGHT, animator);
window.addEventListener('resize', () => rig.resize());
const spin = new BoardSpin(board.group, animator);

/** Redraw board state and let the camera follow the stack height. */
function refresh(): void {
  board.sync(game.grid);
  rig.setStackHeight(game.grid.stackHeight());
}
refresh();

bindKeys({ q: () => spin.turn(1), e: () => spin.turn(-1) });
createSpinButtons(
  () => spin.turn(1),
  () => spin.turn(-1),
);

if (import.meta.env.DEV) {
  void import('./debug').then(({ installDebug }) => installDebug({ game, spin, refresh }));
}

renderer.setAnimationLoop((now) => {
  animator.update(now);
  renderer.render(scene, camera);
});
