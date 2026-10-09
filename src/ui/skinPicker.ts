import { SKINS, type SkinId } from '../config';

/**
 * "Skins" button with a panel of cards, one per block skin, each with a live
 * preview. Picking applies at once (no restart) and closes the panel.
 * Previews are rendered on first open, since each takes an offscreen render.
 */
export class SkinPicker {
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly cards = new Map<SkinId, HTMLButtonElement>();
  private previewsReady = false;

  constructor(
    current: SkinId,
    private readonly makePreviews: () => Record<SkinId, string>,
    private readonly onPick: (skin: SkinId) => void,
  ) {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.className = 'skin-button';
    this.button.textContent = 'Skins';
    this.button.setAttribute('aria-expanded', 'false');
    this.button.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));

    this.panel = document.createElement('div');
    this.panel.className = 'skin-panel';
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Block skins');
    const title = document.createElement('h2');
    title.textContent = 'Block skins';
    const grid = document.createElement('div');
    grid.className = 'skin-grid';
    for (const { id, name } of SKINS) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'skin-card';
      const label = document.createElement('span');
      label.textContent = name;
      card.append(label);
      card.addEventListener('click', () => {
        this.select(id);
        this.onPick(id);
        this.close();
      });
      this.cards.set(id, card);
      grid.appendChild(card);
    }
    this.panel.append(title, grid);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
    document.body.append(this.button, this.panel);
    this.select(current);
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  open(): void {
    if (!this.previewsReady) {
      this.previewsReady = true;
      const previews = this.makePreviews();
      for (const [id, card] of this.cards) {
        const img = document.createElement('img');
        img.src = previews[id];
        img.alt = '';
        img.draggable = false;
        card.prepend(img);
      }
    }
    this.panel.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    this.cards.get(this.current)?.focus();
  }

  close(): void {
    this.panel.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
  }

  private current: SkinId = SKINS[0].id;

  /** Mark the chosen skin. */
  select(id: SkinId): void {
    this.current = id;
    for (const [skin, card] of this.cards) card.setAttribute('aria-pressed', String(skin === id));
  }
}
