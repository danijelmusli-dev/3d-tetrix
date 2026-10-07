import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_SIZE, PIECE_COLORS } from '../src/config';

describe('config', () => {
  it('has a color for each of the 7 tetrominoes', () => {
    expect(PIECE_COLORS).toHaveLength(7);
  });

  it('defaults to a 10x10x10 board', () => {
    expect([BOARD_SIZE, BOARD_HEIGHT]).toEqual([10, 10]);
  });
});
