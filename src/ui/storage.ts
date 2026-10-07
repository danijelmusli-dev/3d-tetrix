const BEST_KEY = 'tetrix.best';

/** Best score from this browser; 0 if storage is empty or unavailable. */
export function loadBest(): number {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** Remember a best score; silently skipped when storage is blocked. */
export function saveBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode or blocked storage: best score just won't persist.
  }
}
