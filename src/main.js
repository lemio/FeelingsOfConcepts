// Entry point: load the dataset, build the controls, render the first view.
import * as d3 from 'd3';
import './styles/index.css';
import { store, initData, col } from './data.js';
import { state, onFilterChange } from './state.js';
import { MEDIA_OPTIONS, drawFilters, setMedia, addToken } from './filters.js';
import { initSearch } from './search.js';
import { scatterFields } from './fields.js';
import { initRender, render, setView, applyFilter } from './render.js';
import { selectProject, selectPerson } from './panel.js';
import { esc } from './util.js';
import { initLoves } from './loves.js';

const VIEWS = ['ideas', 'people', 'ratings', 'cards', 'list'];

function initControls() {
  // Media filter
  d3.select('#fMedia').selectAll('option').data(MEDIA_OPTIONS).join('option')
    .attr('value', d => d[0]).text(d => d[1]);
  d3.select('#fMedia').on('change', function () { setMedia(this.value); });

  // Scatter axis selects, grouped
  const FIELDS = scatterFields();
  for (const sel of ['#ax', '#ay']) {
    for (const [grp, fs] of d3.groups(Object.entries(FIELDS), ([, f]) => f.group)) {
      const og = d3.select(sel).append('optgroup').attr('label', grp);
      for (const [k, f] of fs) og.append('option').attr('value', k).text(f.label);
    }
  }
  d3.select('#ax').property('value', state.ax).on('change', function () { state.ax = this.value; render(); });
  d3.select('#ay').property('value', state.ay).on('change', function () { state.ay = this.value; render(); });

  // View switcher and theme toggle
  d3.selectAll('.seg button').on('click', function () { setView(this.dataset.view); });
  d3.select('#theme').on('click', () => {
    const r = document.documentElement;
    const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    r.dataset.theme = dark ? 'light' : 'dark';
  });

  // Colour legend (click a theme to filter)
  d3.select('#legend').selectAll('span').data(store.themes).join('span').attr('title', 'Filter by this theme')
    .html(t => `<i style="background:${col(t.id)}"></i>${esc(t.label)}`)
    .on('click', (e, t) => addToken({ type: 'theme', value: t.id }));
}

/** ?q=text&q=idea:LIVE&q=person:Name&q=loved:yes — preset filters, handy for sharing a search. */
function readQueryFilters() {
  for (const v of new URLSearchParams(location.search).getAll('q')) {
    const m = v.match(/^(loved|theme|idea|aud|person|text):(.+)$/);
    state.tokens.push(m ? { type: m[1], value: m[2] } : { type: 'text', value: v });
  }
}

async function main() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/projects.json`);
  initData(await res.json());

  initLoves();
  initControls();
  initSearch();
  initRender();
  onFilterChange(() => { drawFilters(); applyFilter(); });

  readQueryFilters();
  drawFilters();

  // #view or #view/<project id | person name>
  const [view, target] = location.hash.slice(1).split('/');
  if (VIEWS.includes(view)) setView(view); else render();
  if (target) {
    const id = decodeURIComponent(target);
    store.projById.has(id) ? selectProject(store.projById.get(id)) : selectPerson(id);
  }

  addEventListener('resize', () => {
    clearTimeout(main.resizeTimer);
    main.resizeTimer = setTimeout(render, 200);
  });
}

main();
