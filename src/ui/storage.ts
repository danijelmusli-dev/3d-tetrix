import { BOARD_HEIGHT, BOARD_LIMITS, BOARD_SIZE } from '../config';

export interface BoardDims {
  size: number;
  height: number;
}

export const DEFAULT_BOARD: BoardDims = { size: BOARD_SIZE, height: BOARD_HEIGHT };
const BOARD_KEY = 'tetrix.board';

/** True if the dims are whole numbers inside BOARD_LIMITS. */
export function isValidBoard({ size, height }: BoardDims): boolean {
  return (
    Number.isInteger(size) &&
    Number.isInteger(height) &&
    size >= BOARD_LIMITS.minSize &&
    size <= BOARD_LIMITS.maxSize &&
    height >= BOARD_LIMITS.minHeight &&
    height <= BOARD_LIMITS.maxHeight
  );
}

/** Last chosen board size, or the default if none / invalid / storage unavailable. */
export function loadBoard(): BoardDims {
  try {
    const [size, height] = (localStorage.getItem(BOARD_KEY) ?? '').split('x').map(Number);
    const dims = { size: size ?? NaN, height: height ?? NaN };
    return isValidBoard(dims) ? dims : DEFAULT_BOARD;
  } catch {
    return DEFAULT_BOARD;
  }
}

export function saveBoard({ size, height }: BoardDims): void {
  write(BOARD_KEY, `${size}x${height}`);
}

/** Best scores are kept per board size; 10x10 keeps the original key. */
function bestKey({ size, height }: BoardDims): string {
  return size === DEFAULT_BOARD.size && height === DEFAULT_BOARD.height
    ? 'tetrix.best'
    : `tetrix.best.${size}x${height}`;
}

/** Best score for this board size in this browser; 0 if none or unavailable. */
export function loadBest(dims: BoardDims): number {
  try {
    const value = Number(localStorage.getItem(bestKey(dims)));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBest(dims: BoardDims, score: number): void {
  write(bestKey(dims), String(score));
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the value just won't persist.
  }
}
