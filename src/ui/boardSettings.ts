import { BOARD_LIMITS } from '../config';
import type { BoardDims } from './storage';

/** "Board W×W×H" button with a panel to pick a new board size and start over. */
export class BoardSettings {
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly width: HTMLSelectElement;
  private readonly height: HTMLSelectElement;

  /**
   * `onApply` starts a game on the chosen size; `onCancel` runs when the panel is
   * dismissed (button or Esc) without applying.
   */
  constructor(
    current: BoardDims,
    onApply: (dims: BoardDims) => void,
    private readonly onCancel: () => void = () => {},
  ) {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'board-button';
    this.button.setAttribute('aria-expanded', 'false');
    this.button.addEventListener('click', () => (this.isOpen ? this.dismiss() : this.open()));

    this.panel = document.createElement('div');
    this.panel.className = 'board-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Board size');

    const title = document.createElement('h2');
    title.textContent = 'Board size';
    this.width = select('Width', BOARD_LIMITS.minSize, BOARD_LIMITS.maxSize);
    this.height = select('Height', BOARD_LIMITS.minHeight, BOARD_LIMITS.maxHeight);
    const note = document.createElement('p');
    note.textContent = 'Changing the size starts a new game.';
    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'board-start';
    start.textContent = 'Start new game';
    start.addEventListener('click', () => {
      this.close();
      onApply({ size: Number(this.width.value), height: Number(this.height.value) });
    });

    this.panel.append(title, field('Width', this.width), field('Height', this.height), note, start);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.dismiss();
    });
    document.body.append(this.button, this.panel);
    this.setCurrent(current);
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  setCurrent({ size, height }: BoardDims): void {
    this.button.textContent = `${size}×${size}×${height}`;
    this.button.setAttribute('aria-label', `Board ${size} by ${size}, ${height} high. Change size`);
    this.width.value = String(size);
    this.height.value = String(height);
  }

  open(): void {
    this.panel.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    this.width.focus();
  }

  close(): void {
    this.panel.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
  }

  /** Close without applying. */
  private dismiss(): void {
    this.close();
    this.onCancel();
  }
}

function select(name: string, min: number, max: number): HTMLSelectElement {
  const el = document.createElement('select');
  el.name = name.toLowerCase();
  for (let v = min; v <= max; v++) {
    const option = document.createElement('option');
    option.value = String(v);
    option.textContent = String(v);
    el.appendChild(option);
  }
  return el;
}

function field(label: string, control: HTMLElement): HTMLLabelElement {
  const el = document.createElement('label');
  el.className = 'board-field';
  const text = document.createElement('span');
  text.textContent = label;
  el.append(text, control);
  return el;
}
