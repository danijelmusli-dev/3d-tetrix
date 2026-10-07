/**
 * Dev-only tooling, loaded from main.ts when import.meta.env.DEV is true.
 *
 * Console:  tetrix.place('I', 0, 2, 3)   tetrix.orientations('L')   tetrix.fill(3)   tetrix.spin(1)
 * URL hash: #place=I,0,0,0;T,1,4,4   #fill=3   #spin=1   (runs on load, for screenshots)
 *           #seed=7&hold=0&aim=600,400&rot=spin,tip&drop   (scripted tray drag)
 *           ...&free&slide=700,420&lift=1               (Shift free move, then slide/raise)
 *           aimcell=x,y,z / slidecell=x,y,z  aim at a grid cell instead of pixels
 *           #cave   roof over x>=2 at z=1 (diagonal holes), open cave mouth at x=0..1
 *           rowx=y,z[,a-b];...  fill an X-line at (y, z) leaving holes x=a..b (rowy likewise)
 *           cells=x,y,z;...     single cubes    #endgame  one I move left, then no moves
 *           slow=5              play animations 5x slower
 */
import type { Game, PlaceResult } from './core/game';
import { getOrientations } from './core/orientations';
import { PIECE_IDS, type PieceId } from './core/pieces';
import type { PieceController } from './input/pieceController';
import type { RotationKind } from './input/placementMath';
import type { Animator } from './render/animator';
import type { BoardSpin } from './render/boardSpin';
import type { BoardView } from './render/boardView';
import type { CameraRig } from './render/cameraRig';

export interface DebugDeps {
  game: Game;
  spin: BoardSpin;
  controller: PieceController;
  rig: CameraRig;
  animator: Animator;
  board: BoardView;
  /** Screen (client px) position of grid cell center (x, y, z). */
  cellToScreen: (x: number, y: number, z: number) => [number, number];
  /** Redraw the board and refit the camera after grid changes. */
  refresh: () => void;
}

export interface DebugApi {
  game: Game;
  place(pieceId: PieceId, orientation?: number, x?: number, y?: number): PlaceResult | null;
  orientations(pieceId: PieceId): string[];
  fill(layers?: number): void;
  clear(): void;
  spin(dir: 1 | -1): void;
  /** Simulate pressing tray `slot` at screen point (x, y). */
  hold(slot: number, x?: number, y?: number): void;
  aim(x: number, y: number): void;
  rotate(kind: RotationKind, dir?: 1 | -1): void;
  /** Release the pointer at its last position (places if valid). */
  drop(): void;
  report(): Record<string, unknown>;
  /** Place a tray piece through the controller's real onPlaced (animation) path. */
  play(slot: number, orientation: number, x: number, y: number): PlaceResult | null;
  /** Simulate holding / releasing Shift (free move). */
  free(on: boolean): void;
  raise(dz: 1 | -1): void;
  cellToScreen(x: number, y: number, z: number): [number, number];
  refresh(): void;
}

declare global {
  interface Window {
    tetrix?: DebugApi;
  }
}

export function installDebug({
  game,
  spin,
  controller,
  rig,
  refresh,
  cellToScreen,
  animator,
  board,
}: DebugDeps): void {
  const slow = Number(new URLSearchParams(location.hash.slice(1)).get('slow'));
  if (slow > 0) animator.timeScale = 1 / slow;
  let last = { clientX: 0, clientY: 0 };
  const pointer = (type: string, x: number, y: number): void => {
    last = { clientX: x, clientY: y };
    window.dispatchEvent(new PointerEvent(type, { ...last, button: 0 }));
  };
  const api: DebugApi = {
    game,
    place(pieceId, orientation = 0, x = 0, y = 0) {
      const res = game.placeFree(pieceId, orientation, x, y);
      refresh();
      if (!res) console.warn(`Cannot place ${pieceId}#${orientation} at (${x}, ${y})`);
      return res;
    },
    orientations(pieceId) {
      return getOrientations(pieceId).map((o, i) => `${i}: ${o.extent.join('x')} (x*y*z)`);
    },
    /** Fill whole layers with mixed colors, without clearing (stress test). */
    fill(layers = game.grid.height) {
      const { size } = game.grid;
      for (let z = 0; z < layers; z++)
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++) game.grid.set(x, y, z, ((x + y + z) % 7) + 1);
      refresh();
    },
    clear() {
      game.grid.cells.fill(0);
      refresh();
    },
    spin(dir) {
      spin.turn(dir);
    },
    hold(slot, x = 0, y = 0) {
      last = { clientX: x, clientY: y };
      controller.pick(slot, new PointerEvent('pointerdown', { ...last, button: 0 }));
    },
    aim(x, y) {
      pointer('pointermove', x, y);
    },
    rotate(kind, dir = 1) {
      controller.rotate(kind, dir);
    },
    drop() {
      pointer('pointerup', last.clientX, last.clientY);
    },
    free(on) {
      controller.setFree(on);
    },
    raise(dz) {
      controller.raise(dz);
    },
    cellToScreen,
    refresh,
    play(slot, orientation, x, y) {
      return controller.debugPlace(slot, orientation, x, y);
    },
    report() {
      return {
        quarter: spin.quarter,
        stack: game.grid.stackHeight(),
        score: game.score,
        tray: game.tray.pieces,
        controller: controller.debugState(),
        camera: rig.debugState(),
        drawn: board.drawnCount,
        locked: controller.locked,
      };
    },
  };
  window.tetrix = api;
  showErrors();
  runHashScript(api);
  showFps();
  console.info('[tetrix] debug API on window.tetrix');
}

function runHashScript(api: DebugApi): void {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.has('fill')) api.fill(Number(params.get('fill')) || undefined);
  if (params.has('cave')) {
    const { grid } = api.game;
    for (let x = 2; x < grid.size; x++)
      for (let y = 0; y < grid.size; y++) if (y !== x - 2) grid.set(x, y, 1, 4);
    api.refresh();
  }
  buildScenario(api, params);
  /** `x,y` pixels, or a grid cell via the `<name>cell=x,y,z` param. */
  const point = (name: string): [number, number] | undefined => {
    const cell = params.get(`${name}cell`);
    if (cell) {
      const [x = 0, y = 0, z = 0] = cell.split(',').map(Number);
      return api.cellToScreen(x, y, z);
    }
    const px = params.get(name);
    if (!px) return undefined;
    const [x = 0, y = 0] = px.split(',').map(Number);
    return [x, y];
  };
  for (const step of (params.get('place') ?? '').split(';').filter(Boolean)) {
    const [id, o, x, y] = step.split(',');
    if (!PIECE_IDS.includes(id as PieceId)) continue;
    api.place(id as PieceId, Number(o), Number(x), Number(y));
  }
  const turns = Number(params.get('spin') ?? 0);
  for (let i = 0; i < Math.abs(turns); i++) api.spin(turns > 0 ? 1 : -1);

  // Wait for the camera to settle on the scenario's stack height before aiming.
  const settleMs = 700 * (Number(params.get('slow')) || 1);
  if (params.has('hold')) setTimeout(() => scriptedHold(api, params, point), settleMs);

  // #report: dump state into the DOM for headless `--dump-dom` checks.
  if (params.has('report'))
    setTimeout(() => {
      const pre = document.createElement('pre');
      pre.id = 'report';
      pre.textContent = JSON.stringify(api.report());
      document.body.appendChild(pre);
    }, 2500);
}

function scriptedHold(
  api: DebugApi,
  params: URLSearchParams,
  point: (name: string) => [number, number] | undefined,
): void {
  const [x, y] = point('aim') ?? [0, 0];
  api.hold(Number(params.get('hold')), x + 20, y + 20);
  api.aim(x, y); // moving past the drag threshold makes it a drag
  for (const kind of (params.get('rot') ?? '').split(',').filter(Boolean))
    api.rotate(kind as RotationKind);
  if (params.has('free')) {
    // Lock after the first frame has a target, then slide the pointer.
    setTimeout(() => {
      api.free(true);
      const lift = Number(params.get('lift') ?? 0);
      for (let i = 0; i < Math.abs(lift); i++) api.raise(lift > 0 ? 1 : -1);
      const slide = point('slide');
      if (slide) api.aim(...slide);
    }, 400);
  }
  // Let the board spin / slide settle before releasing.
  if (params.has('drop')) setTimeout(() => api.drop(), 1200);
}

/** Dev-only: show runtime errors on screen so they can be screenshotted. */
function showErrors(): void {
  const box = document.createElement('pre');
  box.id = 'dev-errors';
  box.style.cssText =
    'position:fixed;left:8px;right:8px;top:100px;max-height:50vh;overflow:auto;margin:0;padding:10px;' +
    'background:#3b1111ee;color:#ffd6d6;font:12px/1.4 monospace;white-space:pre-wrap;z-index:99;display:none';
  document.body.appendChild(box);
  const show = (label: string, err: unknown): void => {
    const text =
      err instanceof Error
        ? `${err.message}
${err.stack ?? ''}`
        : String(err);
    box.textContent += `[${label}] ${text}

`;
    box.style.display = 'block';
  };
  window.addEventListener('error', (e) => show('error', e.error ?? e.message));
  window.addEventListener('unhandledrejection', (e) => show('unhandled promise', e.reason));
}

function showFps(): void {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;top:8px;left:8px;font:12px monospace;color:#9fb3bf;pointer-events:none';
  document.body.appendChild(el);
  let frames = 0;
  let last = performance.now();
  const tick = (now: number): void => {
    frames++;
    if (now - last >= 1000) {
      el.textContent = `${Math.round((frames * 1000) / (now - last))} fps`;
      frames = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Grid setup params for reproducible clear / game-over scenarios. */
function buildScenario(api: DebugApi, params: URLSearchParams): void {
  const { grid } = api.game;
  const holesOf = (range?: string): [number, number] => {
    const [a = -1, b = a] = (range ?? '').split('-').map(Number);
    return [a, b];
  };
  for (const spec of (params.get('rowx') ?? '').split(';').filter(Boolean)) {
    const [y = 0, z = 0, range] = spec.split(',');
    const [a, b] = holesOf(range);
    for (let x = 0; x < grid.size; x++) if (x < a || x > b) grid.set(x, +y, +z, 2);
  }
  for (const spec of (params.get('rowy') ?? '').split(';').filter(Boolean)) {
    const [x = 0, z = 0, range] = spec.split(',');
    const [a, b] = holesOf(range);
    for (let y = 0; y < grid.size; y++) if (y < a || y > b) grid.set(+x, y, +z, 6);
  }
  for (const spec of (params.get('cells') ?? '').split(';').filter(Boolean)) {
    const [x = 0, y = 0, z = 0] = spec.split(',').map(Number);
    grid.set(x, y, z, 5);
  }
  if (params.has('endgame')) {
    // Like the core game-over test: lower layers with one hole per line, top
    // layer of isolated pits plus a single 4-wide slot at the front, (5..8, 9).
    const top = grid.height - 1;
    for (let z = 0; z < top; z++)
      for (let x = 0; x < grid.size; x++)
        for (let y = 0; y < grid.size; y++)
          if (y !== (x + 1) % grid.size) grid.set(x, y, z, ((x + y + z) % 7) + 1);
    for (let x = 0; x < grid.size; x++)
      for (let y = 0; y < grid.size; y++)
        if (x !== y && !(y === 9 && x >= 5 && x <= 8)) grid.set(x, y, top, ((x + y) % 7) + 1);
  }
  api.refresh();
}
