import { renderControlGroups } from './controlsData';
import { loadFlag, saveFlag } from './storage';

/** Below this width the panel starts collapsed (it would crowd the board). */
const WIDE_SCREEN = 1000;

/**
 * Compact "Controls" window floating on the right edge, listing every
 * control. It overlays the scene (the board stays centered) and collapses
 * to a small tab; the choice is remembered.
 */
export class ControlsPanel {
  readonly el: HTMLElement;
  private readonly tab: HTMLButtonElement;
  private open: boolean;

  constructor() {
    this.open = loadFlag('controlsPanel', window.innerWidth >= WIDE_SCREEN);

    this.el = document.createElement('aside');
    this.el.className = 'controls-panel';
    this.el.setAttribute('aria-label', 'Game controls');
    const header = document.createElement('div');
    header.className = 'controls-panel-header';
    const title = document.createElement('h2');
    title.textContent = 'Controls';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'controls-panel-close';
    close.textContent = '»';
    close.setAttribute('aria-label', 'Hide controls');
    close.addEventListener('click', () => this.setOpen(false));
    header.append(title, close);
    const body = document.createElement('div');
    body.className = 'controls-panel-body';
    renderControlGroups(body);
    this.el.append(header, body);

    this.tab = document.createElement('button');
    this.tab.type = 'button';
    this.tab.className = 'controls-tab';
    this.tab.textContent = 'Controls';
    this.tab.setAttribute('aria-label', 'Show controls');
    this.tab.addEventListener('click', () => this.setOpen(true));

    document.body.append(this.el, this.tab);
    this.render();
  }

  private setOpen(open: boolean): void {
    this.open = open;
    saveFlag('controlsPanel', open);
    this.render();
  }

  private render(): void {
    this.el.hidden = !this.open;
    this.tab.hidden = this.open;
  }
}
