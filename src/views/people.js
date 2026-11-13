// People: force graph of people linked to the people with the most similar idea profiles.
import * as d3 from 'd3';
import { store, col } from '../data.js';
import { showTip, moveTip, hideTip, personTip } from '../tooltip.js';
import { applyFilter } from '../render.js';
import { selectPerson } from '../panel.js';

const MIN_SIMILARITY = 0.7;
const MAX_LINKS_PER_PERSON = 3;

export function renderPeople(ctx) {
  const [W, H] = ctx.size();
  const g = ctx.svg.append('g');
  ctx.zoomable(g);

  const nodes = store.D.people.map(pe => ({ pe, r: 4 + Math.sqrt(pe.projects.length) * 3.2 }));
  const idx = new Map(nodes.map(n => [n.pe.name, n]));
  const seen = new Set();
  const links = [];
  for (const n of nodes) {
    for (const s of n.pe.similar.filter(s => s.score >= MIN_SIMILARITY).slice(0, MAX_LINKS_PER_PERSON)) {
      const k = [n.pe.name, s.name].sort().join('|');
      if (seen.has(k)) continue;
      seen.add(k);
      links.push({ source: n, target: idx.get(s.name), s: s.score });
    }
  }

  const link = g.append('g').selectAll('line').data(links).join('line').attr('stroke', 'var(--edge)').attr('stroke-width', 1);
  const node = g.selectAll('.node').data(nodes).join('g').attr('class', 'node')
    .on('mouseenter', (e, d) => {
      showTip(e, personTip(d.pe));
      const nb = new Set([d.pe.name, ...d.pe.similar.map(s => s.name)]);
      node.classed('dim', x => !nb.has(x.pe.name));
      link.attr('stroke', l => (l.source === d || l.target === d ? 'var(--edge-hi)' : 'var(--edge)'));
    })
    .on('mousemove', moveTip)
    .on('mouseleave', () => { hideTip(); link.attr('stroke', 'var(--edge)'); applyFilter(); })
    .on('click', (e, d) => selectPerson(d.pe.name))
    .call(ctx.drag());
  node.append('circle').attr('r', d => d.r).attr('fill', d => col(d.pe.main_theme));
  node.filter(d => d.pe.projects.length >= 4).append('text').attr('class', 'plabel')
    .attr('y', d => -d.r - 3).attr('text-anchor', 'middle').text(d => d.pe.name);

  ctx.sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).distance(38).strength(l => 0.15 + l.s * 0.3))
    .force('charge', d3.forceManyBody().strength(-38))
    .force('x', d3.forceX(W / 2).strength(0.06))
    .force('y', d3.forceY(H / 2).strength(0.08))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('c', d3.forceCollide(d => d.r + 2))
    .on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}
