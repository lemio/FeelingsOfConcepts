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
import { readUrl, syncUrl } from './url.js';


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
  d3.select('#ax').property('value', state.ax).on('change', function () { state.ax = this.value; render(); syncUrl(); });
  d3.select('#ay').property('value', state.ay).on('change', function () { state.ay = this.value; render(); syncUrl(); });

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

async function main() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/projects.json`);
  initData(await res.json());

  // URL first, so the controls start from the linked state
  const target = readUrl();
  initLoves();
  initControls();
  initSearch();
  initRender();
  onFilterChange(() => { drawFilters(); applyFilter(); syncUrl(); });

  d3.select('#fMedia').property('value', state.media);
  drawFilters();
  setView(state.view);
  if (target?.project && store.projById.has(target.project)) selectProject(store.projById.get(target.project));
  else if (target?.person) selectPerson(target.person);
  else if (target?.any) store.projById.has(target.any) ? selectProject(store.projById.get(target.any)) : selectPerson(target.any);
  syncUrl(); // normalise legacy links (?q=…, #view/…) to the current format

  addEventListener('resize', () => {
    clearTimeout(main.resizeTimer);
    main.resizeTimer = setTimeout(render, 200);
  });
}

main();
