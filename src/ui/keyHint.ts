export interface HintedButtonSpec {
  label: string;
  title: string;
  /** Keyboard shortcut shown beside (not inside) the button; hidden on touch screens. */
  key: string;
  action: () => void;
}

/** A control button wrapped with a small key hint label next to it. */
export function hintedButton(spec: HintedButtonSpec): {
  wrap: HTMLElement;
  button: HTMLButtonElement;
} {
  const wrap = document.createElement('div');
  wrap.className = 'ctl';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = spec.label;
  button.title = `${spec.title} (${spec.key})`;
  button.setAttribute('aria-label', spec.title);
  button.setAttribute('aria-keyshortcuts', spec.key);
  // Keep presses on controls from reaching the board's pointer handlers.
  button.addEventListener('pointerdown', (e) => e.stopPropagation());
  button.addEventListener('click', spec.action);
  const hint = document.createElement('kbd');
  hint.className = 'key-hint';
  hint.textContent = spec.key;
  hint.setAttribute('aria-hidden', 'true');
  wrap.append(button, hint);
  return { wrap, button };
}
