/** One drawn icon set (24x24, 1.75 stroke) so every button shares the same weight. */
type Shape = [tag: 'path' | 'circle' | 'rect', attrs: Record<string, string>];

const ICONS = {
  music: [
    ['path', { d: 'M9 17V5l11-2v12' }],
    ['circle', { cx: '6.5', cy: '17', r: '2.5' }],
    ['circle', { cx: '17.5', cy: '15', r: '2.5' }],
  ],
  sound: [
    ['path', { d: 'M4 9.5h3.5L12 6v12l-4.5-3.5H4z' }],
    ['path', { d: 'M15.5 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11' }],
  ],
  turnLeft: [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
    ['path', { d: 'M3 3v5h5' }],
  ],
  turnRight: [
    ['path', { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' }],
    ['path', { d: 'M21 3v5h-5' }],
  ],
  topView: [
    ['rect', { x: '4', y: '4', width: '16', height: '16', rx: '3' }],
    ['path', { d: 'M4 12h16M12 4v16' }],
  ],
  gaps: [
    ['path', { d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z' }],
    ['circle', { cx: '12', cy: '12', r: '3' }],
  ],
  spin: [
    ['path', { d: 'M21 12a9 9 0 1 1-3-6.7' }],
    ['path', { d: 'M21 4v5h-5' }],
  ],
  tip: [
    ['path', { d: 'm10 15 5 5 5-5' }],
    ['path', { d: 'M4 4h7a4 4 0 0 1 4 4v12' }],
  ],
  roll: [
    ['path', { d: 'M21 7v6h-6' }],
    ['path', { d: 'M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7' }],
  ],
  raise: [['path', { d: 'M12 19V5M5 12l7-7 7 7' }]],
  lower: [['path', { d: 'M12 5v14M5 12l7 7 7-7' }]],
  close: [['path', { d: 'M18 6 6 18M6 6l12 12' }]],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const base = {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.75',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
  for (const [key, value] of Object.entries(base)) svg.setAttribute(key, value);
  svg.classList.add('icon');
  for (const [tag, attrs] of ICONS[name]) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.appendChild(node);
  }
  return svg;
}
