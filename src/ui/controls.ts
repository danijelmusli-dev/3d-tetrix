/** On-screen board spin buttons (mirrors Q / E). */
export function createSpinButtons(onLeft: () => void, onRight: () => void): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'spin-controls';
  const button = (label: string, title: string, action: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', action);
    return b;
  };
  bar.append(
    button('↺', 'Rotate board left (Q)', onLeft),
    button('↻', 'Rotate board right (E)', onRight),
  );
  document.body.appendChild(bar);
  return bar;
}
