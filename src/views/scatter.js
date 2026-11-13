// Scatter: any two fields on the axes; hovering/selecting a project draws lines to similar projects.
import * as d3 from 'd3';
import { store, col, related } from '../data.js';
import { state } from '../state.js';
import { projMatch } from '../filters.js';
import { scatterFields } from '../fields.js';
import { showTip, moveTip, hideTip, projTip } from '../tooltip.js';
import { applyFilter, highlightProj } from '../render.js';
import { selectProject } from '../panel.js';

const COUNT_TICKS = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const CELL_LINES = [1.5, 2.5, 3.5, 4.5];

function scaleFor(f, range) {
  const v = store.D.projects.map(f.get);
  if (f.type === 'ord') return d3.scaleLinear([0.5, 5.5], range);
  if (f.type === 'time') return d3.scaleUtc(d3.extent(v), range).nice();
  return d3.scaleSymlog([0, d3.max(v)], range).constant(1).nice();
}

const ticksFor = (s, f, n) =>
  f.type === 'ord' ? [1, 2, 3, 4, 5] : f.type === 'time' ? s.ticks(n) : COUNT_TICKS.filter(t => t <= s.domain()[1]);
const gridFor = (s, f, n) => (f.type === 'ord' ? CELL_LINES : ticksFor(s, f, n));
const formatFor = f => (f.type === 'time' ? d3.utcFormat('%Y') : d3.format('~s'));

export function renderScatter(ctx) {
  const [W, H] = ctx.size();
  const m = { l: 64, r: 24, t: 20, b: 52 };
  const g = ctx.svg.append('g');
  const FIELDS = scatterFields();
  const fx = FIELDS[state.ax], fy = FIELDS[state.ay];
  const x = scaleFor(fx, [m.l, W - m.r]), y = scaleFor(fy, [H - m.b, m.t]);

  // grid + axes
  const gl = g.append('g').attr('class', 'grid');
  gl.selectAll(null).data(gridFor(x, fx, 8)).join('line').attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', m.t).attr('y2', H - m.b);
  gl.selectAll(null).data(gridFor(y, fy, 6)).join('line').attr('y1', d => y(d)).attr('y2', d => y(d)).attr('x1', m.l).attr('x2', W - m.r);
  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).tickValues(ticksFor(x, fx, 8)).tickFormat(formatFor(fx)).tickSize(0).tickPadding(8))
    .select('.domain').remove();
  g.append('g').attr('class', 'axis').attr('transform', `translate(${m.l},0)`)
    .call(d3.axisLeft(y).tickValues(ticksFor(y, fy, 6)).tickFormat(formatFor(fy)).tickSize(0).tickPadding(8))
    .select('.domain').remove();
  g.append('text').attr('class', 'axis-title').attr('x', (W + m.l) / 2).attr('y', H - 12).attr('text-anchor', 'middle').text(fx.desc);
  g.append('text').attr('class', 'axis-title').attr('transform', `translate(16,${(H - m.b + m.t) / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle').text(fy.desc);

  const nodes = store.D.projects.map(p => ({ p, tx: x(fx.get(p)), ty: y(fy.get(p)), r: 4.5 }));
  nodes.forEach(n => { n.x = n.tx + Math.random() * 4; n.y = n.ty + Math.random() * 4; });
  const byId = new Map(nodes.map(n => [n.p.id, n]));

  // Lines to similar projects: solid = shares people, dashed = shares ideas only.
  const linkG = g.append('g');
  let links = [];
  const drawLinks = () => linkG.selectAll('line').data(links).join('line')
    .attr('stroke', l => col(l.s.p.theme))
    .attr('stroke-opacity', l => 0.25 + l.score * 0.45)
    .attr('stroke-width', l => (l.ppl ? 2 : 1.25))
    .attr('stroke-dasharray', l => (l.ppl ? null : '3 3'))
    .attr('x1', l => l.s.x).attr('y1', l => l.s.y).attr('x2', l => l.t.x).attr('y2', l => l.t.y);
  ctx.scatterLinks = p => {
    links = p ? related(p).filter(r => projMatch(r.p))
      .map(r => ({ s: byId.get(p.id), t: byId.get(r.p.id), score: Math.min(1, r.score), ppl: r.ppl.length > 0 })) : [];
    drawLinks();
  };

  const node = g.selectAll('.node').data(nodes).join('g').attr('class', 'node')
    .on('mouseenter', (e, d) => { showTip(e, projTip(d.p)); highlightProj(d.p); ctx.scatterLinks(d.p); })
    .on('mousemove', moveTip)
    .on('mouseleave', () => { hideTip(); applyFilter(); ctx.scatterLinks(state.sel && store.projById.get(state.sel)); })
    .on('click', (e, d) => selectProject(d.p));
  node.append('circle').attr('r', 8).attr('fill', 'transparent').attr('stroke', 'none'); // bigger hit target
  node.append('circle').attr('r', d => d.r).attr('fill', d => col(d.p.theme));

  // Ordinal axes need spreading; continuous axes stay close to their true position.
  const ordinal = fx.type === 'ord' || fy.type === 'ord';
  ctx.sim = d3.forceSimulation(nodes)
    .force('x', d3.forceX(d => d.tx).strength(fx.type === 'ord' ? 0.25 : 0.9))
    .force('y', d3.forceY(d => d.ty).strength(fy.type === 'ord' ? 0.25 : 0.9))
    .force('c', d3.forceCollide(ordinal ? 5.6 : 3.2))
    .on('tick', () => { node.attr('transform', d => `translate(${d.x},${d.y})`); drawLinks(); });
  ctx.scatterLinks(state.sel && store.projById.get(state.sel));
}
