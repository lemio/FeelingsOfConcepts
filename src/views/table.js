// Table: sortable list. Ratings are left out on purpose: they are judgements, not data.
import * as d3 from 'd3';
import { store, col, themeLabel, projThemes } from '../data.js';
import { projMatch, addToken, textQueries } from '../filters.js';
import { esc } from '../util.js';
import { selectProject } from '../panel.js';
import { loveButton } from '../loves.js';
import { state } from '../state.js';
import { compareProjects, setSort, sortArrow } from '../sorting.js';

// [sort key, header label, numeric?]
const COLS = [
  ['loved', '♥', true],
  ['name', 'Project', false],
  ['people', 'People', false],
  ['themes', 'Themes', false],
  ['first_date', 'First shared', true],
  ['posts', 'Posts', true],
  ['comments', 'Comments', true],
];

const rowHtml = p =>
  `<td class="lovecell">${loveButton(p.id)}</td><td class="pname">${esc(p.name)}</td><td>${esc(p.people.join(', '))}</td>` +
  `<td><div class="tchips">${projThemes(p).map(id =>
    `<span class="tchip" data-theme="${id}" title="Filter on this theme"><span class="dot" style="background:${col(id)}"></span>${esc(themeLabel(id))}</span>`).join('')}</div></td>` +
  `<td class="num date">${p.first_date}</td><td class="num">${p.posts.length}</td><td class="num">${p.comments}</td>`;

export function renderTable() {
  const rows = store.D.projects.filter(p => projMatch(p)).sort(compareProjects);
  const L = d3.select('#list').html('');
  if (textQueries().length) {
    L.append('div').attr('class', 'cards-head').html(
      `${rows.length} projects · ` + (state.sort.key === 'relevance'
        ? 'sorted by relevance: title matches first, then matches in post text'
        : `<span class="proj-link" id="byRelevance">sort by relevance</span>`));
    L.select('#byRelevance').on('click', () => { setSort('relevance'); renderTable(); });
  }
  const t = L.append('table');
  t.append('thead').append('tr').selectAll('th').data(COLS).join('th')
    .attr('class', c => (c[2] ? 'num' : null))
    .attr('aria-sort', c => (sortArrow(c[0]) ? (sortArrow(c[0]).includes('▼') ? 'descending' : 'ascending') : null))
    .text(c => c[1] + sortArrow(c[0]))
    .on('click', (e, c) => { setSort(c[0]); renderTable(); });
  t.append('tbody').selectAll('tr').data(rows).join('tr').on('click', (e, p) => selectProject(p)).html(rowHtml);
  t.selectAll('.tchip').on('click', function (e) {
    e.stopPropagation();
    addToken({ type: 'theme', value: this.dataset.theme });
  });
}

