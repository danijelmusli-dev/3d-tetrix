import type { PieceId } from '../core/pieces';

/** Bottom bar with one button per tray slot, each showing its piece thumbnail. */
export class TrayView {
  readonly el: HTMLElement;
  private readonly slots: HTMLButtonElement[];

  constructor(
    slotCount: number,
    private readonly thumbnails: Record<PieceId, string>,
    onPick: (slot: number, e: PointerEvent) => void,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'tray';
    this.slots = Array.from({ length: slotCount }, (_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tray-slot';
      b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        // Touch pointers are implicitly captured; release so moves reach the board.
        if (b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId);
        onPick(i, e);
      });
      this.el.appendChild(b);
      return b;
    });
    document.body.appendChild(this.el);
  }

  render(pieces: readonly (PieceId | null)[], held: number | null): void {
    this.slots.forEach((b, i) => {
      const id = pieces[i] ?? null;
      b.disabled = id === null;
      b.classList.toggle('held', held === i);
      b.setAttribute('aria-label', id ? `Piece ${id}` : 'Empty slot');
      b.replaceChildren();
      if (id) {
        const img = document.createElement('img');
        img.src = this.thumbnails[id];
        img.alt = '';
        img.draggable = false;
        b.appendChild(img);
      }
    });
  }

  contains(clientX: number, clientY: number): boolean {
    const el = document.elementFromPoint(clientX, clientY);
    return !!el && this.el.contains(el);
  }
}
