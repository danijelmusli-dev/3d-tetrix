/** Every control in one place, shared by the side panel and the "?" help. */
export interface ControlRow {
  /** Key chips; a string with spaces is shown as one chip (e.g. "Right click"). */
  keys: string[];
  action: string;
}

export interface ControlGroup {
  title: string;
  rows: ControlRow[];
}

export const CONTROL_GROUPS: readonly ControlGroup[] = [
  {
    title: 'Pieces',
    rows: [
      { keys: ['Drag'], action: 'Drag from tray, release to drop' },
      { keys: ['Click'], action: 'Click piece, then the board' },
      { keys: ['R', 'F', 'T'], action: 'Spin / tip / roll' },
      { keys: ['Wheel'], action: 'Spin' },
      { keys: ['Esc', 'Right click'], action: 'Put piece back' },
    ],
  },
  {
    title: 'Sliding into gaps',
    rows: [
      { keys: ['Shift'], action: 'Hold: slide at current height' },
      { keys: ['A', 'D', '←', '→'], action: 'Step left / right' },
      { keys: ['Z', 'C', '↑', '↓'], action: 'Step away / toward you' },
      { keys: ['W', 'S', 'Wheel'], action: 'Raise / lower' },
    ],
  },
  {
    title: 'Board & view',
    rows: [
      { keys: ['Q', 'E'], action: 'Turn board' },
      { keys: ['Space'], action: "Bird's-eye view" },
      { keys: ['X'], action: 'Show hidden gaps' },
    ],
  },
  {
    title: 'Sound',
    rows: [
      { keys: ['M'], action: 'Music on / off' },
      { keys: ['N'], action: 'Sound effects on / off' },
    ],
  },
];

/** Render the groups as headings plus a key / action grid. */
export function renderControlGroups(container: HTMLElement): void {
  for (const group of CONTROL_GROUPS) {
    const heading = document.createElement('h3');
    heading.textContent = group.title;
    const list = document.createElement('dl');
    list.className = 'control-list';
    for (const row of group.rows) {
      const dt = document.createElement('dt');
      for (const key of row.keys) {
        const kbd = document.createElement('kbd');
        kbd.textContent = key;
        dt.appendChild(kbd);
      }
      const dd = document.createElement('dd');
      dd.textContent = row.action;
      list.append(dt, dd);
    }
    container.append(heading, list);
  }
}
