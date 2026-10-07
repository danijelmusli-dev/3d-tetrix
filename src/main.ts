import './style.css';
import { BOARD_SIZE, PIECE_COLORS } from './config';
import { createScene } from './render/scene';
import { BoardView, createCube } from './render/boardView';

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing');

const { renderer, scene, camera } = createScene(container);
const board = new BoardView(BOARD_SIZE);
scene.add(board.group);

// Phase 0 look check: static sample pieces resembling the reference image.
const demo: [x: number, y: number, colorIndex: number][] = [
  [3, 0, 0],
  [3, 1, 0],
  [3, 2, 0],
  [3, 3, 0], // I (yellow)
  [5, 0, 1],
  [6, 0, 1],
  [5, 1, 1],
  [6, 1, 1], // O (blue)
  [8, 0, 4],
  [9, 0, 4], // red
  [8, 1, 3],
  [8, 2, 3],
  [9, 2, 3], // green
];
for (const [x, y, color] of demo) {
  const cube = createCube(PIECE_COLORS[color] ?? 0xffffff);
  cube.position.copy(board.cellCenter(x, y, 0));
  board.group.add(cube);
}

renderer.setAnimationLoop(() => renderer.render(scene, camera));
