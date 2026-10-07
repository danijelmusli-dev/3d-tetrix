import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_SIZE, PIECE_COLORS } from '../src/config';
import { PIECE_IDS } from '../src/core/pieces';

describe('config', () => {
  it('has a color for each piece', () => {
    expect(PIECE_COLORS).toHaveLength(PIECE_IDS.length);
  });

  it('defaults to a 10x10x10 board', () => {
    expect([BOARD_SIZE, BOARD_HEIGHT]).toEqual([10, 10]);
  });
});
