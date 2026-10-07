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
