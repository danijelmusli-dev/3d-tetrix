import { renderControlGroups } from './controlsData';

/** "?" button with a panel explaining the goal and the controls. */
export function createHelp(): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'help-button';
  button.textContent = '?';
  button.setAttribute('aria-label', 'How to play');
  button.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.className = 'help-panel';
  panel.hidden = true;
  const title = document.createElement('h2');
  title.textContent = 'How to play';
  const goal = document.createElement('p');
  goal.textContent =
    'Fill a full line of cubes along either side of any layer to clear it. ' +
    'Cubes above fall into the gap, and new lines they complete score combos. ' +
    'The game ends when no piece in the tray fits.';
  panel.append(title, goal);
  renderControlGroups(panel);

  const setOpen = (open: boolean): void => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(panel.hidden === true));
  panel.addEventListener('click', () => setOpen(false));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  document.body.append(button, panel);
  return button;
}
