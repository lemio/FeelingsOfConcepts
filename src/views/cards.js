// Cards: image, title, people, description; comment count in a badge.
import * as d3 from 'd3';
import { store, col, themeLabel } from '../data.js';
import { state } from '../state.js';
import { projMatch, textQueries, snippet } from '../filters.js';
import { esc, projectVisual } from '../util.js';
import { selectProject } from '../panel.js';
import { loveButton } from '../loves.js';
import { SORTS, compareProjects, setSort } from '../sorting.js';

function cardHtml(p) {
  const sn = snippet(p);
  // Title tile underneath, visual on top: if the visual fails to load, the tile shows through.
  const thumb = `<div class="noimg" style="--c:${col(p.theme)}">${esc(p.name)}</div>` + projectVisual(p, { lazy: true });
  return `<div class="thumb">${thumb}
      ${loveButton(p.id, 'on-card')}
      ${p.comments ? `<span class="badge" title="${p.comments} comments in Slack threads">${p.comments}</span>` : ''}
      ${p.video ? '<span class="vid" title="Has a video">▶</span>' : ''}</div>
    <div class="cbody">
      <div class="ctheme"><span class="dot" style="background:${col(p.theme)}"></span>${esc(themeLabel(p.theme))}</div>
      <h4>${esc(p.name)}</h4>
      <div class="cby">${esc(p.people.join(', '))} · ${p.first_date.slice(0, 4)}</div>
      <p>${esc(p.description)}</p>
      ${sn ? `<div class="hit">In post: ${sn}</div>` : ''}
    </div>`;
}

export function renderCards() {
  const rows = store.D.projects.filter(p => projMatch(p)).sort(compareProjects);
  const L = d3.select('#list').html('');
  const head = L.append('div').attr('class', 'cards-head');
  head.append('span').text(`${rows.length} projects · sort by `);
  // "Relevance" = title matches first while searching, otherwise most comments
  const sel = head.append('select').attr('class', 'sortsel').attr('aria-label', 'Sort cards');
  sel.selectAll('option').data(Object.entries(SORTS).filter(([k]) => k !== 'themes' && k !== 'people')).join('option')
    .attr('value', d => d[0]).text(d => (d[0] === 'relevance' && !textQueries().length ? 'Most comments' : d[1][0]));
  sel.property('value', state.sort.key in SORTS ? state.sort.key : 'relevance')
    .on('change', function () { setSort(this.value); renderCards(); });
  if (state.sort.key !== 'relevance') {
    head.append('button').attr('class', 'sortdir').attr('type', 'button')
      .attr('title', 'Reverse order').text(state.sort.dir < 0 ? '▼' : '▲')
      .on('click', () => { setSort(state.sort.key); renderCards(); });
  }
  L.append('div').attr('class', 'cards').selectAll('.card').data(rows).join('article')
    .attr('class', p => 'card' + (state.sel === p.id ? ' sel' : ''))
    .attr('tabindex', 0)
    .on('click', (e, p) => selectProject(p))
    .on('keydown', (e, p) => { if (e.key === 'Enter') selectProject(p); })
    .html(cardHtml);
}
