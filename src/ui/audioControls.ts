import type { IconName } from './icons';
import { hintedButton } from './keyHint';

/** Music / sound-effect toggles (M / N), top-left. */
export class AudioControls {
  private readonly music: HTMLButtonElement;
  private readonly sfx: HTMLButtonElement;

  constructor(actions: { toggleMusic(): void; toggleSfx(): void }) {
    const el = document.createElement('div');
    el.className = 'audio-controls';
    const add = (name: IconName, title: string, key: string, action: () => void) => {
      const { wrap, button } = hintedButton({ icon: name, title, key, action });
      el.appendChild(wrap);
      return button;
    };
    this.music = add('music', 'Music', 'M', actions.toggleMusic);
    this.sfx = add('sound', 'Sound effects', 'N', actions.toggleSfx);
    document.body.appendChild(el);
  }

  update(music: boolean, sfx: boolean): void {
    this.music.setAttribute('aria-pressed', String(music));
    this.sfx.setAttribute('aria-pressed', String(sfx));
    this.music.classList.toggle('off', !music);
    this.sfx.classList.toggle('off', !sfx);
  }
}
