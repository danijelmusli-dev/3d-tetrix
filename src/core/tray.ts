import { PIECE_IDS, PIECES, type PieceId } from './pieces';
import type { Rng } from './rng';

export const TRAY_SLOTS = 3;
const TOTAL_WEIGHT = PIECE_IDS.reduce((sum, id) => sum + PIECES[id].weight, 0);

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
  refillIfEmpty(): boolean {
    if (this.slots.some((p) => p !== null)) return false;
    this.slots = this.deal();
    return true;
  }

  private deal(): PieceId[] {
    return Array.from({ length: TRAY_SLOTS }, () => this.pick());
  }

  /** Weighted random piece (see PieceDef.weight). */
  private pick(): PieceId {
    let roll = this.rng() * TOTAL_WEIGHT;
    // The last piece also catches float rounding at the very top of the range.
    return PIECE_IDS.find(
      (id, i) => (roll -= PIECES[id].weight) < 0 || i === PIECE_IDS.length - 1,
    )!;
  }
}
