import type { IconName } from './icons';
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
    const add = (
      name: IconName,
      title: string,
      caption: string,
      key: string,
      action: () => void,
    ) => {
      const { wrap, button } = hintedButton({ icon: name, title, caption, key, action });
      this.el.appendChild(wrap);
      return button;
    };
    add('turnLeft', 'Turn board left', 'Left', 'Q', actions.turnLeft);
    add('turnRight', 'Turn board right', 'Right', 'E', actions.turnRight);
    this.top = add('topView', "Bird's-eye view", 'Top', 'Space', actions.toggleTopView);
    this.xray = add('gaps', 'Show hidden gaps', 'Gaps', 'X', actions.toggleXray);
    for (const b of [this.top, this.xray]) b.setAttribute('aria-pressed', 'false');
    document.body.appendChild(this.el);
  }

  /** Reflect toggle states (called after a toggle, from any input). */
  update(topView: boolean, xray: boolean): void {
    this.top.setAttribute('aria-pressed', String(topView));
    this.xray.setAttribute('aria-pressed', String(xray));
  }
}
