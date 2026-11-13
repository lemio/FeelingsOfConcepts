// Table: sortable list. Ratings are left out on purpose: they are judgements, not data.
import * as d3 from 'd3';
import { store, col, themeLabel, projThemes } from '../data.js';
import { projMatch, textRank, addToken } from '../filters.js';
import { esc } from '../util.js';
import { selectProject } from '../panel.js';
import { loveButton, isLoved } from '../loves.js';

// [key, label, numeric?]
const COLS = [
  ['loved', '♥', true],
  ['name', 'Project', false],
  ['people', 'People', false],
  ['themes', 'Themes', false],
  ['first_date', 'First shared', true],
  ['posts', 'Posts', true],
  ['comments', 'Comments', true],
];

let sortKey = 'first_date';
let sortDir = -1; // -1 = ▼ = highest / newest first

function sortValue(p, k) {
  switch (k) {
    case 'name': return p.name.toLowerCase();
    case 'people': return p.people.join(', ').toLowerCase();
    case 'themes': return projThemes(p).map(t => store.TI[t]).join(',');
    case 'posts': return p.posts.length;
    case 'loved': return isLoved(p.id) ? 1 : 0;
    default: return p[k];
  }
}

const rowHtml = p =>
  `<td class="lovecell">${loveButton(p.id)}</td><td class="pname">${esc(p.name)}</td><td>${esc(p.people.join(', '))}</td>` +
  `<td><div class="tchips">${projThemes(p).map(id =>
    `<span class="tchip" data-theme="${id}" title="Filter on this theme"><span class="dot" style="background:${col(id)}"></span>${esc(themeLabel(id))}</span>`).join('')}</div></td>` +
  `<td class="num date">${p.first_date}</td><td class="num">${p.posts.length}</td><td class="num">${p.comments}</td>`;

export function renderTable() {
  const rows = store.D.projects.filter(p => projMatch(p))
    .sort((a, b) => textRank(b) - textRank(a) || d3.ascending(sortValue(a, sortKey), sortValue(b, sortKey)) * sortDir);
  const L = d3.select('#list').html('');
  const t = L.append('table');
  t.append('thead').append('tr').selectAll('th').data(COLS).join('th')
    .attr('class', c => (c[2] ? 'num' : null))
    .text(c => c[1] + (c[0] === sortKey ? (sortDir < 0 ? ' ▼' : ' ▲') : ''))
    .on('click', (e, c) => {
      // First click: numbers/dates highest first (▼), text A→Z (▲).
      sortDir = c[0] === sortKey ? -sortDir : c[2] ? -1 : 1;
      sortKey = c[0];
      renderTable();
    });
  t.append('tbody').selectAll('tr').data(rows).join('tr').on('click', (e, p) => selectProject(p)).html(rowHtml);
  t.selectAll('.tchip').on('click', function (e) {
    e.stopPropagation();
    addToken({ type: 'theme', value: this.dataset.theme });
  });
}
