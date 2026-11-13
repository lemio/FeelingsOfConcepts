// View manager: owns the shared SVG / list container and switches between views.
import * as d3 from 'd3';
import { store, related } from './data.js';
import { state } from './state.js';
import { projMatch, personMatch, drawFilters } from './filters.js';
import { hideTip } from './tooltip.js';
import { renderIdeas } from './views/ideas.js';
import { renderPeople } from './views/people.js';
import { renderScatter } from './views/scatter.js';
import { renderCards } from './views/cards.js';
import { renderTable } from './views/table.js';

const VIEWS = { ideas: renderIdeas, people: renderPeople, ratings: renderScatter, cards: renderCards, list: renderTable };
const HTML_VIEWS = new Set(['cards', 'list']);

/** Shared context handed to every view. */
export const ctx = {
  svg: null,
  sim: null,                 // the running d3-force simulation, if any
  scatterLinks: () => {},    // set by the scatter view: draw lines to similar projects
  size() {
    const r = document.getElementById('stage').getBoundingClientRect();
    return [r.width, r.height];
  },
  zoomable(g) {
    ctx.svg.call(d3.zoom().scaleExtent([0.3, 6]).on('zoom', e => g.attr('transform', e.transform)));
  },
  /** Drag behaviour for force-graph nodes. */
  drag() {
    return d3.drag()
      .on('start', (e, d) => { if (!e.active) ctx.sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) ctx.sim.alphaTarget(0); d.fx = d.fy = null; });
  },
};

export function initRender() {
  ctx.svg = d3.select('#svg');
  // Clicking empty space clears the selection.
  ctx.svg.on('click', e => {
    if (e.target === ctx.svg.node() && state.sel) { state.sel = null; ctx.scatterLinks(null); applyFilter(); }
  });
}

export function render() {
  ctx.sim?.stop();
  ctx.sim = null;
  ctx.svg.selectAll('*').remove();
  ctx.svg.on('.zoom', null);
  ctx.scatterLinks = () => {};
  hideTip();
  const html = HTML_VIEWS.has(state.view);
  d3.select('#list').style('display', html ? 'block' : 'none');
  ctx.svg.style('display', html ? 'none' : 'block');
  d3.select('#legend').style('display', state.view === 'ideas' ? 'flex' : 'none'); // legend only on the Ideas view
  d3.select('#axisCtl').style('display', state.view === 'ratings' ? 'inline-flex' : 'none');
  VIEWS[state.view](ctx);
  applyFilter();
}

export function setView(v) {
  state.view = v;
  // The card view is about browsing pictures: the first visit defaults to projects with a screenshot.
  if (v === 'cards' && !state.cardsVisited) {
    state.cardsVisited = true;
    if (!state.media) { state.media = 'shot'; d3.select('#fMedia').property('value', 'shot'); drawFilters(); }
  }
  d3.selectAll('.seg button').attr('aria-pressed', function () { return this.dataset.view === state.view; });
  render();
}

/** Apply filters to the current view (re-render HTML views, dim SVG nodes). */
export function applyFilter() {
  if (state.view === 'list') { renderTable(ctx); return; }
  if (state.view === 'cards') { renderCards(ctx); return; }
  // In the scatter, a clicked project keeps itself and its similar projects highlighted.
  const focus = state.view === 'ratings' && store.projById.has(state.sel)
    ? new Set([state.sel, ...related(store.projById.get(state.sel)).map(r => r.p.id)]) : null;
  ctx.svg.selectAll('.node')
    .classed('dim', d => d.p ? (!projMatch(d.p) || (focus && !focus.has(d.p.id))) : !personMatch(d.pe))
    .classed('sel', d => d.p ? state.sel === d.p.id : state.sel === d.pe.name);
}

/** Dim everything except p and its similar projects (used on hover). */
export function highlightProj(p) {
  const rel = new Set([p.id, ...related(p).map(r => r.p.id)]);
  ctx.svg.selectAll('.node').classed('dim', d => d.p && !rel.has(d.p.id));
}

