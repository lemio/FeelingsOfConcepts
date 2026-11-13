import * as d3 from 'd3';
import { store } from './data.js';
import { esc, projectVisual } from './util.js';

const tip = () => d3.select('#tip');

export function showTip(e, html) {
  tip().html(html).style('display', 'block');
  moveTip(e);
}

export function moveTip(e) {
  const t = tip(), w = 270, h = t.node().offsetHeight;
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + w > innerWidth) x = e.clientX - w - 14;
  if (y + h > innerHeight) y = Math.max(8, e.clientY - h - 14);
  t.style('left', x + 'px').style('top', y + 'px');
}

export const hideTip = () => tip().style('display', 'none');

export const projTip = p =>
  `${projectVisual(p)}<b>${esc(p.name)}</b>` +
  `<div class="d">${esc(p.description)}</div><div class="m">${esc(p.people.join(', '))} · ${p.first_date.slice(0, 4)}</div>`;

export const personTip = pe => {
  const names = pe.projects.slice(0, 4).map(i => store.projById.get(i).name).join(', ');
  return `<b>${esc(pe.name)}</b><div class="d">${pe.projects.length} project${pe.projects.length > 1 ? 's' : ''}: ` +
    `${esc(names)}${pe.projects.length > 4 ? '…' : ''}</div>`;
};
