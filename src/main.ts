import './style.css';
import { BOARD_HEIGHT, BOARD_SIZE } from './config';
import { Game } from './core/game';
import { createScene } from './render/scene';
import { BoardView } from './render/boardView';

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing');

const { renderer, scene, camera } = createScene(container, BOARD_SIZE, BOARD_HEIGHT);
const game = new Game({ size: BOARD_SIZE, height: BOARD_HEIGHT });
const board = new BoardView(BOARD_SIZE, BOARD_HEIGHT);
scene.add(board.group);
board.sync(game.grid);

if (import.meta.env.DEV) {
  void import('./debug').then(({ installDebug }) => installDebug(game, board));
}

renderer.setAnimationLoop(() => renderer.render(scene, camera));
