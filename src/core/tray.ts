import { PIECE_IDS, type PieceId } from './pieces';
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
  refillIfEmpty(): boolean {
    if (this.slots.some((p) => p !== null)) return false;
    this.slots = this.deal();
    return true;
  }

  private deal(): PieceId[] {
    return Array.from(
      { length: TRAY_SLOTS },
      () => PIECE_IDS[Math.floor(this.rng() * PIECE_IDS.length)]!,
    );
  }
}
