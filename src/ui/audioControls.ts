import { hintedButton } from './keyHint';

/** Music / sound-effect toggles (M / N), top-left. */
export class AudioControls {
  private readonly music: HTMLButtonElement;
  private readonly sfx: HTMLButtonElement;

  constructor(actions: { toggleMusic(): void; toggleSfx(): void }) {
    const el = document.createElement('div');
    el.className = 'audio-controls';
    const add = (label: string, title: string, key: string, action: () => void) => {
      const { wrap, button } = hintedButton({ label, title, key, action });
      el.appendChild(wrap);
      return button;
    };
    this.music = add('♪', 'Music', 'M', actions.toggleMusic);
    this.sfx = add('', 'Sound effects', 'N', actions.toggleSfx);
    this.sfx.appendChild(speakerIcon());
    document.body.appendChild(el);
  }

  update(music: boolean, sfx: boolean): void {
    this.music.setAttribute('aria-pressed', String(music));
    this.sfx.setAttribute('aria-pressed', String(sfx));
    this.music.classList.toggle('off', !music);
    this.sfx.classList.toggle('off', !sfx);
  }
}

/** Speaker icon built from DOM nodes (emoji render inconsistently across systems). */
function speakerIcon(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const make = <K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string>,
  ): SVGElementTagNameMap[K] => {
    const node = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };
  const svg = make('svg', {
    viewBox: '0 0 24 24',
    width: '20',
    height: '20',
    'aria-hidden': 'true',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  svg.append(
    make('path', { d: 'M4 9h4l5-4v14l-5-4H4z', fill: 'currentColor' }),
    make('path', { d: 'M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12' }),
  );
  return svg;
}
