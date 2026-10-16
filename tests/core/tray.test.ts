import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';
import { PIECE_IDS } from '../../src/core/pieces';
import { Tray, TRAY_SLOTS } from '../../src/core/tray';

describe('Tray', () => {
  it('starts with 3 random pieces', () => {
    const tray = new Tray(createRng(1));
    expect(tray.pieces).toHaveLength(TRAY_SLOTS);
    for (const id of tray.pieces) expect(PIECE_IDS).toContain(id);
  });

  it('deals pieces by weight: every piece appears, small ones less often', () => {
    const tray = new Tray(createRng(123));
    const counts = new Map<string, number>();
    for (let i = 0; i < 3000; i++) {
      tray.take(0);
      tray.take(1);
      tray.take(2);
      tray.refillIfEmpty(Infinity);
      for (const id of tray.pieces) counts.set(id!, (counts.get(id!) ?? 0) + 1);
    }
    for (const id of PIECE_IDS) expect(counts.get(id)).toBeGreaterThan(0);
    expect(counts.get('M')!).toBeLessThan(counts.get('D')!);
    expect(counts.get('D')!).toBeLessThan(counts.get('T')!);
  });

  it('deals only the simple bricks until the score unlocks the odd ones', () => {
    const START = ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'D', 'M', 'E'];
    const seen = (score: number) => {
      const tray = new Tray(createRng(5));
      const ids = new Set<string>();
      for (let i = 0; i < 2000; i++) {
        tray.take(0);
        tray.take(1);
        tray.take(2);
        tray.refillIfEmpty(score);
        for (const id of tray.pieces) ids.add(id!);
      }
      return ids;
    };
    expect([...seen(0)].sort()).toEqual([...START].sort());
    expect(seen(200).has('B')).toBe(false);
    expect(seen(300).has('B')).toBe(true);
    expect(seen(300).has('C')).toBe(false);
    expect(seen(5000).has('C')).toBe(true);
  });

  it('is deterministic for a seed', () => {
    expect(new Tray(createRng(9)).pieces).toEqual(new Tray(createRng(9)).pieces);
  });

  it('honors initial pieces', () => {
    expect(new Tray(createRng(1), ['I', 'O', 'T']).pieces).toEqual(['I', 'O', 'T']);
  });

  it('take empties the slot and returns the piece', () => {
    const tray = new Tray(createRng(1), ['I', 'O', 'T']);
    expect(tray.take(1)).toBe('O');
    expect(tray.pieces).toEqual(['I', null, 'T']);
    expect(() => tray.take(1)).toThrow();
    expect(() => tray.take(5)).toThrow();
  });

  it('refills only once every slot is used', () => {
    const tray = new Tray(createRng(1), ['I', 'O', 'T']);
    tray.take(0);
    tray.take(1);
    expect(tray.refillIfEmpty()).toBe(false);
    tray.take(2);
    expect(tray.refillIfEmpty()).toBe(true);
    expect(tray.pieces.every((p) => p !== null)).toBe(true);
  });
});
