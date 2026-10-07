import type { RotationKind } from '../input/placementMath';
import { hintedButton } from './keyHint';

export interface PieceControlActions {
  rotate(kind: RotationKind): void;
  toggleFree(): void;
  raise(dz: 1 | -1): void;
  cancel(): void;
}

/**
 * Buttons for the held piece (mirrors R/F/T, Shift, W/S, Esc) so the game is
 * playable on touch screens. On phones the bar always keeps its space (the
 * camera frames the board above it); it is only visible while a piece is held.
 */
export class PieceControls {
  readonly el: HTMLElement;
  private readonly slide: HTMLButtonElement;
  private readonly freeOnly: HTMLElement[] = [];
  private state = '';

  constructor(actions: PieceControlActions) {
    this.el = document.createElement('div');
    this.el.className = 'piece-controls';
    const add = (label: string, title: string, key: string, action: () => void) => {
      const { wrap, button } = hintedButton({ label, title, key, action });
      this.el.appendChild(wrap);
      return { wrap, button };
    };
    add('⟳', 'Spin piece', 'R', () => actions.rotate('spin'));
    add('⤵', 'Tip piece', 'F', () => actions.rotate('tip'));
    add('↷', 'Roll piece', 'T', () => actions.rotate('roll'));
    this.slide = add('Slide', 'Slide into gaps', 'Shift', () => actions.toggleFree()).button;
    this.slide.classList.add('slide');
    this.slide.setAttribute('aria-pressed', 'false');
    this.freeOnly.push(
      add('▲', 'Raise piece', 'W', () => actions.raise(1)).wrap,
      add('▼', 'Lower piece', 'S', () => actions.raise(-1)).wrap,
    );
    add('✕', 'Put piece back', 'Esc', () => actions.cancel());
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
    for (const wrap of this.freeOnly) wrap.hidden = !free;
  }
}
