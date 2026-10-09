import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import { AudioEngine } from './audio/engine';
import { Music } from './audio/music';
import { Sfx } from './audio/sfx';
import { ANIM } from './config';
import { Game, POINTS_PER_CLEARED_CELL, POINTS_PER_PLACED_CELL } from './core/game';
import { TRAY_SLOTS } from './core/tray';
import { bindKeys } from './input/keyboard';
import { PieceController } from './input/pieceController';
import { Animator } from './render/animator';
import { BoardSpin } from './render/boardSpin';
import { BoardView } from './render/boardView';
import { CameraRig } from './render/cameraRig';
import { GapsView } from './render/gapsView';
import { GhostView } from './render/ghostView';
import { animatePlacement } from './render/placeAnimation';
import { createScene } from './render/scene';
import { SkyView } from './render/skyView';
import { createPieceThumbnails, createSkinPreviews } from './render/thumbnails';
import { AudioControls } from './ui/audioControls';
import { BoardSettings } from './ui/boardSettings';
import { ViewControls } from './ui/controls';
import { ControlsPanel } from './ui/controlsPanel';
import { createHelp } from './ui/help';
import { Hud } from './ui/hud';
import { PieceControls } from './ui/pieceControls';
import { SkinPicker } from './ui/skinPicker';
import {
  isValidBoard,
  loadBest,
  loadBoard,
  loadFlag,
  loadSkin,
  saveBest,
  saveBoard,
  saveFlag,
  saveSkin,
  type BoardDims,
} from './ui/storage';
import { TrayView } from './ui/trayView';

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing');

const { renderer, scene, camera, fitShadows, lights } = createScene(container);
const animator = new Animator();
/** Dev only: #seed=N fixes the tray, #size=8&height=6 overrides the saved board size. */
const hashParams = import.meta.env.DEV ? new URLSearchParams(location.hash.slice(1)) : null;
const debugSeed = Number(hashParams?.get('seed')) || undefined;
const debugDims = {
  size: Number(hashParams?.get('size')),
  height: Number(hashParams?.get('height') ?? hashParams?.get('size')),
};
let dims: BoardDims = isValidBoard(debugDims) ? debugDims : loadBoard();

const game = new Game({ size: dims.size, height: dims.height, seed: debugSeed });
const board = new BoardView(dims.size, dims.height);
const skin = loadSkin();
board.setSkin(skin);
scene.add(board.group);
fitShadows(dims.size, dims.height);

const rig = new CameraRig(camera, dims.size, dims.height, animator);
const spin = new BoardSpin(board.group, animator);
const ghost = new GhostView(board);
const gaps = new GapsView(board);
const sky = new SkyView(scene, animator, lights);

const audio = new AudioEngine(loadFlag('music', true), loadFlag('sfx', true));
const sfx = new Sfx(audio);
const music = new Music(audio);
audio.onReady = () => {
  if (audio.isOn('music')) music.start();
};

/** Redraw board state and let the camera follow the stack height. */
function refresh(): void {
  board.sync(game.grid);
  gaps.update(game.grid);
  rig.setStackHeight(game.grid.stackHeight());
}
refresh();

const tray = new TrayView(TRAY_SLOTS, createPieceThumbnails(skin), (slot, e) =>
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
  onEvent: (event) => {
    if (event === 'pick') sfx.pick();
    else if (event === 'rotate') sfx.rotate();
    else if (event === 'step') sfx.step();
    else if (event === 'blocked' || event === 'invalid') sfx.blocked();
    else if (event === 'slideOn' || event === 'slideOff') sfx.toggle(event === 'slideOn');
    else if (event === 'cancel') sfx.cancel();
  },
  onPlaced: async (result) => {
    controller.locked = true;
    // Thump right as the drop animation lands.
    sfx.land(result.placed.length, (ANIM.dropMs * 0.8) / 1000);
    // Count the score up alongside the animation: placement first, then each clear step.
    let shown = game.score - result.scoreDelta + result.placed.length * POINTS_PER_PLACED_CELL;
    hud.setScore(shown);
    try {
      await animatePlacement(result, board, animator, {
        onStep: (i, step) => {
          const points = step.cleared.length * POINTS_PER_CLEARED_CELL * (i + 1);
          shown += points;
          hud.setScore(shown);
          sfx.clear(i, step.cleared.length);
          announceSky(shown);
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
      controller.locked = false;
      const queued = pendingStart;
      pendingStart = null;
      if (queued) {
        // A new game was requested mid-animation: this game's result no longer matters.
        startGame(queued);
      } else {
        refresh();
        hud.setScore(game.score);
        announceSky(game.score);
        const newBest = game.score > best;
        if (newBest) {
          best = game.score;
          saveBest(dims, best);
          hud.setBest(best);
        }
        // Fanfare the first time this game beats a previous best.
        if (startBest > 0 && game.score > startBest && !bestCheered) {
          bestCheered = true;
          sfx.newBest();
        }
        if (result.gameOver) {
          sfx.gameOver();
          lastGameOverBest = newBest && game.score > startBest;
          hud.showGameOver(game.score, lastGameOverBest);
        }
      }
    }
  },
});

bindKeys({
  q: () => turnBoard(1),
  e: () => turnBoard(-1),
  m: () => toggleMusic(),
  n: () => toggleSfx(),
  r: () => controller.rotate('spin', 1),
  f: () => controller.rotate('tip', 1),
  t: () => controller.rotate('roll', 1),
  // Shift held = free move (slide into holes); released via keyup in the controller.
  shift: () => controller.setFree(true),
  w: () => controller.raise(1),
  s: () => controller.raise(-1),
  escape: () => controller.cancel(),
  // Keyboard steps for the held piece (enter slide mode), relative to the screen.
  a: () => controller.step('left'),
  d: () => controller.step('right'),
  z: () => controller.step('away'),
  c: () => controller.step('toward'),
  arrowleft: () => controller.step('left'),
  arrowright: () => controller.step('right'),
  arrowup: () => controller.step('away'),
  arrowdown: () => controller.step('toward'),
  ' ': () => toggleTopView(),
  x: () => toggleXray(),
});
const viewControls = new ViewControls({
  turnLeft: () => turnBoard(1),
  turnRight: () => turnBoard(-1),
  toggleTopView: () => toggleTopView(),
  toggleXray: () => toggleXray(),
});

function turnBoard(dir: 1 | -1): void {
  spin.turn(dir);
  sfx.turn();
}

function toggleTopView(): void {
  rig.toggleTopView();
  viewControls.update(rig.topView, gaps.visible);
  sfx.toggle(rig.topView);
}

function toggleXray(): void {
  gaps.toggle();
  viewControls.update(rig.topView, gaps.visible);
  sfx.toggle(gaps.visible);
}

const audioControls = new AudioControls({
  toggleMusic: () => toggleMusic(),
  toggleSfx: () => toggleSfx(),
});
audioControls.update(audio.isOn('music'), audio.isOn('sfx'));

function toggleMusic(): void {
  const on = !audio.isOn('music');
  audio.setOn('music', on);
  if (on) music.start();
  else music.stop();
  saveFlag('music', on);
  audioControls.update(audio.isOn('music'), audio.isOn('sfx'));
}

function toggleSfx(): void {
  const on = !audio.isOn('sfx');
  audio.setOn('sfx', on);
  saveFlag('sfx', on);
  audioControls.update(audio.isOn('music'), audio.isOn('sfx'));
  sfx.toggle(on);
}

const pieceControls = new PieceControls({
  rotate: (kind) => controller.rotate(kind, 1),
  toggleFree: () => controller.toggleFree(),
  raise: (dz) => controller.raise(dz),
  cancel: () => controller.cancel(),
});
createHelp();
new SkinPicker(skin, createSkinPreviews, (id) => {
  board.setSkin(id);
  // Piece colours depend on the skin (wood, slime and candy shift them), so redraw.
  refresh();
  saveSkin(id);
  tray.setThumbnails(createPieceThumbnails(id));
});
new ControlsPanel();

/** A new game requested while a placement animation plays; started when it ends. */
let pendingStart: BoardDims | null = null;
/** Whether the finished game beat the best, so the game-over card can be shown again. */
let lastGameOverBest = false;

const settings = new BoardSettings(dims, startGame, () => {
  // Closed without choosing a size: bring back the card so the game is not left dead.
  if (game.gameOver) hud.showGameOver(game.score, lastGameOverBest);
});
const hud = new Hud(animator, restart, () => {
  hud.hideGameOver();
  settings.open();
});
let best = loadBest(dims);
/** Best score when the current game started, to tell whether this game beat it. */
let startBest = best;
/** The new-best fanfare plays once per game. */
let bestCheered = false;
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
  if (controller.locked) {
    // Swapping the board under a running animation would draw old cubes on the new one.
    pendingStart = next;
    return;
  }
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
  sky.reset();
  music.intensity = 0;
  bestCheered = false;
}

/** Move the sky along with the score; name the new sky when it changes. */
function announceSky(score: number): void {
  const theme = sky.setScore(score);
  if (!theme) return;
  hud.popup(theme.name, 'New sky');
  sfx.newSky();
  music.intensity = sky.level;
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
      sky,
      audio,
      music,
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
    sky.update(now / 1000, renderer.domElement.clientWidth / renderer.domElement.clientHeight);
    controller.update();
    pieceControls.update(controller.holding, controller.isFree);
  } catch (err) {
    console.error('Frame update failed', err);
  }
  renderer.render(scene, camera);
});
