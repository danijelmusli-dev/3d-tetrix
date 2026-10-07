import { hintedButton } from './keyHint';

export interface ViewControlActions {
  turnLeft(): void;
  turnRight(): void;
  toggleTopView(): void;
  toggleXray(): void;
}

/** Board view buttons: turn (Q / E), bird's-eye (Space), gap x-ray (X). */
export class ViewControls {
  readonly el: HTMLElement;
  private readonly top: HTMLButtonElement;
  private readonly xray: HTMLButtonElement;

  constructor(actions: ViewControlActions) {
    this.el = document.createElement('div');
    this.el.className = 'spin-controls';
    const add = (label: string, title: string, key: string, action: () => void) => {
      const { wrap, button } = hintedButton({ label, title, key, action });
      this.el.appendChild(wrap);
      return button;
    };
    add('↺', 'Turn board left', 'Q', actions.turnLeft);
    add('↻', 'Turn board right', 'E', actions.turnRight);
    this.top = add('⊡', "Bird's-eye view", 'Space', actions.toggleTopView);
    this.xray = add('◍', 'Show hidden gaps', 'X', actions.toggleXray);
    for (const b of [this.top, this.xray]) b.setAttribute('aria-pressed', 'false');
    document.body.appendChild(this.el);
  }

  /** Reflect toggle states (called after a toggle, from any input). */
  update(topView: boolean, xray: boolean): void {
    this.top.setAttribute('aria-pressed', String(topView));
    this.xray.setAttribute('aria-pressed', String(xray));
  }
}
