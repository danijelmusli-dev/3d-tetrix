/**
 * Dev-only tooling, loaded from main.ts when import.meta.env.DEV is true.
 *
 * Console:  tetrix.place('I', 0, 2, 3)   tetrix.orientations('L')   tetrix.fill()
 * URL hash: #place=I,0,0,0;T,1,4,4       #fill        (runs on load, for screenshots)
 */
import type { Game, PlaceResult } from './core/game';
import { Grid } from './core/grid';
import { getOrientations } from './core/orientations';
import { PIECE_IDS, type PieceId } from './core/pieces';
import type { BoardView } from './render/boardView';

export interface DebugApi {
  game: Game;
  place(pieceId: PieceId, orientation?: number, x?: number, y?: number): PlaceResult | null;
  orientations(pieceId: PieceId): string[];
  fill(layers?: number): void;
  clear(): void;
}

declare global {
  interface Window {
    tetrix?: DebugApi;
  }
}

export function installDebug(game: Game, board: BoardView): void {
  const api: DebugApi = {
    game,
    place(pieceId, orientation = 0, x = 0, y = 0) {
      const res = game.placeFree(pieceId, orientation, x, y);
      board.sync(game.grid);
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
      board.sync(game.grid);
    },
    clear() {
      game.grid.cells.set(new Grid(game.grid.size, game.grid.height).cells);
      board.sync(game.grid);
    },
  };
  window.tetrix = api;
  runHashScript(api);
  showFps();
  console.info('[tetrix] debug API on window.tetrix');
}

function runHashScript(api: DebugApi): void {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.has('fill')) api.fill(Number(params.get('fill')) || undefined);
  for (const step of (params.get('place') ?? '').split(';').filter(Boolean)) {
    const [id, o, x, y] = step.split(',');
    if (!PIECE_IDS.includes(id as PieceId)) continue;
    api.place(id as PieceId, Number(o), Number(x), Number(y));
  }
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
