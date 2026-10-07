const CONTROLS: [string, string][] = [
  ['Drag a piece from the tray', 'Aim it, release to drop'],
  ['Click a piece, then the board', 'Same, without dragging'],
  ['R / F / T, mouse wheel', 'Spin / tip / roll the piece'],
  ['Hold Shift (or Slide)', 'Slide the piece into gaps under overhangs'],
  ['A / D, ← →', 'Step the piece left / right (slides)'],
  ['Z / C, ↑ ↓', 'Step the piece away / toward you (slides)'],
  ['W / S, wheel (while sliding)', 'Raise / lower the piece'],
  ['Q / E, ↺ ↻', 'Turn the board'],
  ['Space, ⊡', "Bird's-eye view on / off"],
  ['X, ◍', 'Show hidden empty gaps in red'],
  ['M / N', 'Music / sound effects on or off'],
  ['Esc, right click, ✕', 'Put the piece back'],
];

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
  const list = document.createElement('dl');
  for (const [keys, what] of CONTROLS) {
    const dt = document.createElement('dt');
    dt.textContent = keys;
    const dd = document.createElement('dd');
    dd.textContent = what;
    list.append(dt, dd);
  }
  panel.append(title, goal, list);

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
