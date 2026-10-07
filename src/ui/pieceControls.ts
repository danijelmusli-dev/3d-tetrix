import type { RotationKind } from '../input/placementMath';

export interface PieceControlActions {
  rotate(kind: RotationKind): void;
  toggleFree(): void;
  raise(dz: 1 | -1): void;
  cancel(): void;
}

interface ButtonSpec {
  label: string;
  title: string;
  action: () => void;
  /** Only shown while free move (Slide) is on. */
  freeOnly?: boolean;
}

/**
 * Buttons for the held piece (mirrors R/F/T, Shift, W/S, Esc) so the game is
 * playable on touch screens. The bar always keeps its space (the camera
 * frames the board above it); it is only visible while a piece is held.
 */
export class PieceControls {
  readonly el: HTMLElement;
  private readonly slide: HTMLButtonElement;
  private readonly freeOnly: HTMLButtonElement[] = [];
  private state = '';

  constructor(actions: PieceControlActions) {
    this.el = document.createElement('div');
    this.el.className = 'piece-controls';
    const specs: ButtonSpec[] = [
      { label: '⟳', title: 'Spin piece (R)', action: () => actions.rotate('spin') },
      { label: '⤵', title: 'Tip piece (F)', action: () => actions.rotate('tip') },
      { label: '↷', title: 'Roll piece (T)', action: () => actions.rotate('roll') },
      { label: 'Slide', title: 'Slide into gaps (hold Shift)', action: () => actions.toggleFree() },
      { label: '▲', title: 'Raise (W)', action: () => actions.raise(1), freeOnly: true },
      { label: '▼', title: 'Lower (S)', action: () => actions.raise(-1), freeOnly: true },
      { label: '✕', title: 'Put back (Esc)', action: () => actions.cancel() },
    ];
    let slide: HTMLButtonElement | undefined;
    for (const spec of specs) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = spec.label;
      b.title = spec.title;
      b.setAttribute('aria-label', spec.title);
      // Act on pointerdown-free click; stop the press reaching the board handlers.
      b.addEventListener('pointerdown', (e) => e.stopPropagation());
      b.addEventListener('click', spec.action);
      if (spec.freeOnly) this.freeOnly.push(b);
      if (spec.label === 'Slide') slide = b;
      this.el.appendChild(b);
    }
    this.slide = slide!;
    this.slide.classList.add('slide');
    this.slide.setAttribute('aria-pressed', 'false');
    document.body.appendChild(this.el);
    this.update(false, false);
  }

  /** Cheap per-frame sync with the controller state. */
  update(holding: boolean, free: boolean): void {
    const state = `${holding}|${free}`;
    if (state === this.state) return;
    this.state = state;
    this.el.classList.toggle('visible', holding);
    this.slide.setAttribute('aria-pressed', String(free));
    for (const b of this.freeOnly) b.hidden = !free;
  }
}
