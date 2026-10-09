import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BOARD,
  isValidBoard,
  loadBest,
  loadBoard,
  loadFlag,
  loadSkin,
  saveBest,
  saveBoard,
  saveFlag,
  saveSkin,
} from '../../src/ui/storage';

function stubStorage(): Map<string, string> {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe('board size storage', () => {
  it('round-trips a valid size', () => {
    stubStorage();
    saveBoard({ size: 8, height: 12 });
    expect(loadBoard()).toEqual({ size: 8, height: 12 });
  });

  it('falls back to the default for missing or invalid values', () => {
    const data = stubStorage();
    expect(loadBoard()).toEqual(DEFAULT_BOARD);
    data.set('tetrix.board', '99x3');
    expect(loadBoard()).toEqual(DEFAULT_BOARD);
    data.set('tetrix.board', 'junk');
    expect(loadBoard()).toEqual(DEFAULT_BOARD);
  });

  it('validates limits', () => {
    expect(isValidBoard({ size: 6, height: 14 })).toBe(true);
    expect(isValidBoard({ size: 5, height: 10 })).toBe(false);
    expect(isValidBoard({ size: 10, height: 15 })).toBe(false);
    expect(isValidBoard({ size: 7.5, height: 10 })).toBe(false);
  });
});

describe('flag storage', () => {
  it('round-trips on/off and falls back when unset or blocked', () => {
    stubStorage();
    expect(loadFlag('music', true)).toBe(true);
    saveFlag('music', false);
    expect(loadFlag('music', true)).toBe(false);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadFlag('sfx', true)).toBe(true);
  });
});

describe('best score storage', () => {
  it('keeps a separate best per board size', () => {
    const data = stubStorage();
    saveBest({ size: 10, height: 10 }, 500);
    saveBest({ size: 8, height: 6 }, 120);
    expect(loadBest({ size: 10, height: 10 })).toBe(500);
    expect(loadBest({ size: 8, height: 6 })).toBe(120);
    expect(loadBest({ size: 12, height: 12 })).toBe(0);
    expect(data.get('tetrix.best')).toBe('500'); // 10x10 keeps the original key
  });

  it('survives storage that throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadBest(DEFAULT_BOARD)).toBe(0);
    expect(loadBoard()).toEqual(DEFAULT_BOARD);
    expect(() => saveBest(DEFAULT_BOARD, 5)).not.toThrow();
    expect(() => saveBoard(DEFAULT_BOARD)).not.toThrow();
  });
});

describe('skin storage', () => {
  it('round-trips a known skin', () => {
    stubStorage();
    saveSkin('wood');
    expect(loadSkin()).toBe('wood');
  });

  it('falls back to classic for unknown values', () => {
    const data = stubStorage();
    expect(loadSkin()).toBe('classic');
    for (const bad of ['', 'gold', '__proto__', '1']) {
      data.set('tetrix.skin', bad);
      expect(loadSkin()).toBe('classic');
    }
  });

  it('falls back when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadSkin()).toBe('classic');
    expect(() => saveSkin('metal')).not.toThrow();
  });
});
