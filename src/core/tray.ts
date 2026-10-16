import { PIECE_IDS, PIECES, type PieceId } from './pieces';
import type { Rng } from './rng';

export const TRAY_SLOTS = 3;
/** Block Blast style hand: 3 pieces, refilled only once all are used. */
export class Tray {
  private slots: (PieceId | null)[];

  constructor(
    private readonly rng: Rng,
    initial?: readonly PieceId[],
  ) {
    this.slots = initial ? [...initial] : this.deal();
  }

  get pieces(): readonly (PieceId | null)[] {
    return this.slots;
  }

  take(slot: number): PieceId {
    const id = this.slots[slot];
    if (!id) throw new Error(`Tray slot ${slot} is empty`);
    this.slots[slot] = null;
    return id;
  }

  /** Deal a fresh hand if every slot is used. Returns true if it refilled. */
  refillIfEmpty(score = 0): boolean {
    if (this.slots.some((p) => p !== null)) return false;
    this.slots = this.deal(score);
    return true;
  }

  private deal(score = 0): PieceId[] {
    const pool = PIECE_IDS.filter((id) => PIECES[id].unlockScore <= score);
    return Array.from({ length: TRAY_SLOTS }, () => this.pick(pool));
  }

  /** Weighted random piece from the unlocked pool (see PieceDef.weight). */
  private pick(pool: readonly PieceId[]): PieceId {
    let roll = this.rng() * pool.reduce((sum, id) => sum + PIECES[id].weight, 0);
    // The last piece also catches float rounding at the very top of the range.
    return pool.find((id, i) => (roll -= PIECES[id].weight) < 0 || i === pool.length - 1)!;
  }
}
