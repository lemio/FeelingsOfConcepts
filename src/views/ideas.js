// Ideas: force graph where every project is pulled towards the hubs of all its ideas.
// Projects that combine ideas sit between clusters; ideas that share many projects end up close.
import * as d3 from 'd3';
import { store, col } from '../data.js';
import { addToken } from '../filters.js';
import { showTip, moveTip, hideTip, projTip } from '../tooltip.js';
import { esc } from '../util.js';
import { applyFilter } from '../render.js';
import { selectProject } from '../panel.js';

export function renderIdeas(ctx) {
  const { D, M } = store;
  const [W, H] = ctx.size();
  const g = ctx.svg.append('g');
  ctx.zoomable(g);

  const counts = d3.rollup(D.projects.flatMap(p => p.ideas), v => v.length, d => d);
  const hubs = Object.entries(M.ideas).map(([k, v]) => {
    const n = counts.get(k) || 0;
    return { hub: true, id: k, v, n, r: 7 + Math.sqrt(n) * 1.6 };
  });
  const hubBy = new Map(hubs.map(h => [h.id, h]));
  const pn = D.projects.map(p => ({ p, r: 2.6 + p.ratings.scale * 0.9 }));
  const links = pn.flatMap(n => n.p.ideas.map((i, j) => ({ source: n, target: hubBy.get(i), w: j === 0 ? 1 : 0.55 })));

  // Seed hubs on a circle so the layout starts readable.
  hubs.forEach((h, i) => {
    const a = (i / hubs.length) * 2 * Math.PI, R = Math.min(W, H) * 0.32;
    h.x = W / 2 + Math.cos(a) * R;
    h.y = H / 2 + Math.sin(a) * R;
  });
  pn.forEach(n => {
    const h = hubBy.get(n.p.ideas[0]);
    n.x = h.x + (Math.random() - 0.5) * 30;
    n.y = h.y + (Math.random() - 0.5) * 30;
  });

  const link = g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', 'var(--edge)').attr('stroke-width', l => (l.w > 0.9 ? 1 : 0.6));
  const resetLinks = () => link.attr('stroke', 'var(--edge)');

  const node = g.append('g').selectAll('.node').data(pn).join('g').attr('class', 'node')
    .on('mouseenter', (e, d) => {
      showTip(e, projTip(d.p));
      const s = new Set(d.p.ideas);
      link.attr('stroke', l => (l.source === d ? 'var(--edge-hi)' : 'var(--edge)'));
      node.classed('dim', x => x !== d && !x.p.ideas.some(i => s.has(i)));
    })
    .on('mousemove', moveTip)
    .on('mouseleave', () => { hideTip(); resetLinks(); applyFilter(); })
    .on('click', (e, d) => selectProject(d.p));
  node.append('circle').attr('r', d => d.r).attr('fill', d => col(d.p.theme));

  const hub = g.append('g').selectAll('.hub').data(hubs).join('g').attr('class', 'hub')
    .on('mouseenter', (e, d) => {
      showTip(e, `<b>${esc(d.v.label)}</b><div class="d">${esc(d.v.description)}</div><div class="m">${d.n} projects · click to filter</div>`);
      node.classed('dim', x => !x.p.ideas.includes(d.id));
      link.attr('stroke', l => (l.target === d ? 'var(--edge-hi)' : 'var(--edge)'));
    })
    .on('mousemove', moveTip)
    .on('mouseleave', () => { hideTip(); resetLinks(); applyFilter(); })
    .on('click', (e, d) => addToken({ type: 'idea', value: d.id }))
    .call(ctx.drag());
  hub.append('circle').attr('r', d => d.r).attr('fill', d => col(d.v.theme)).attr('fill-opacity', 0.9);
  hub.append('text').attr('text-anchor', 'middle').attr('dy', d => -d.r - 5).text(d => d.v.label);

  ctx.sim = d3.forceSimulation([...hubs, ...pn])
    .force('link', d3.forceLink(links).distance(l => 18 + l.target.r).strength(l => 0.05 + (0.25 * l.w) / l.source.p.ideas.length))
    .force('charge', d3.forceManyBody().strength(d => (d.hub ? -420 : -14)))
    .force('collide', d3.forceCollide(d => (d.hub ? d.r + 14 : d.r + 1.2)))
    .force('x', d3.forceX(W / 2).strength(0.035))
    .force('y', d3.forceY(H / 2).strength(0.05))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .alphaDecay(0.02)
    .on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
      hub.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}
