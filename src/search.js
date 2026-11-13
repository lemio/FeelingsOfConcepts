// Search box with grouped suggestions (text, themes, ideas, audiences, people, projects).
import * as d3 from 'd3';
import { store, col } from './data.js';
import { state, filtersChanged, onFilterChange } from './state.js';
import { projMatch, addToken, removeToken } from './filters.js';
import { esc, hl, asset } from './util.js';
import { selectProject } from './panel.js';
import { lovedCount } from './loves.js';

let qInput, sugg;
let opts = [];
let active = -1;

function suggestions(q) {
  const { D, M, themes } = store;
  const ql = q.toLowerCase().trim();
  const out = [];
  const cnt = t => D.projects.filter(p => projMatch(p, [t])).length;
  const has = s => !ql || s.toLowerCase().includes(ql);
  const push = (grp, items, max) => items.slice(0, max).forEach(it => out.push({ grp, ...it }));
  const withCount = o => ({ ...o, n: cnt(o.token) });

  // Loved projects: shown on an empty search, or when typing something like "love", "fav", "♥".
  const lovedToken = { type: 'loved', value: 'yes' };
  if (lovedCount() && (!ql || /^(lov|fav|♥|❤|heart|like|star)/.test(ql) || 'loved'.includes(ql)))
    push('Yours', [withCount({ label: '♥ Loved projects', token: lovedToken })].filter(o => o.n), 1);
  if (ql) push('Search text', [withCount({ label: `“${q.trim()}” in titles, then post text`, token: { type: 'text', value: q.trim() } })], 1);
  push('Themes', themes.filter(t => has(t.label))
    .map(t => withCount({ label: t.label, dot: col(t.id), token: { type: 'theme', value: t.id } })).filter(o => o.n), 8);
  push('Ideas', Object.entries(M.ideas).filter(([, v]) => has(v.label) || has(v.description))
    .map(([k, v]) => withCount({ label: v.label, dot: col(v.theme), token: { type: 'idea', value: k } }))
    .filter(o => o.n).sort((a, b) => b.n - a.n), ql ? 8 : 22);
  push('Audiences', Object.entries(M.audiences).filter(([, v]) => has(v))
    .map(([k, v]) => withCount({ label: v, token: { type: 'aud', value: k } })).filter(o => o.n), 7);
  if (ql) {
    push('People', D.people.filter(pe => has(pe.name))
      .map(pe => withCount({ label: pe.name, img: pe.avatar, token: { type: 'person', value: pe.name } }))
      .filter(o => o.n).sort((a, b) => b.n - a.n), 6);
    push('Projects (open)', D.projects.filter(p => has(p.name) && projMatch(p))
      .sort((a, b) => b.comments - a.comments)
      .map(p => ({ label: p.name, dot: col(p.theme), open: p.id })), 6);
  }
  return out;
}

function show() {
  const q = qInput.value;
  opts = suggestions(q);
  active = q.trim() ? 0 : -1;
  if (!opts.length) { hide(); return; }
  let html = '', last = '';
  opts.forEach((o, i) => {
    if (o.grp !== last) { html += `<div class="grp">${o.grp}</div>`; last = o.grp; }
    html += `<div class="opt${i === active ? ' active' : ''}" role="option" data-i="${i}">` +
      (o.dot ? `<span class="dot" style="background:${o.dot}"></span>` : '') +
      (o.img ? `<img src="${asset(o.img)}" alt="">` : '') +
      `<span>${hl(o.label, q.trim())}</span>` +
      (o.n != null ? `<span class="n">${o.n}</span>` : '') + `</div>`;
  });
  sugg.html(html).style('display', 'block');
  sugg.selectAll('.opt').on('mousedown', function (e) { e.preventDefault(); pick(+this.dataset.i); });
}

const hide = () => sugg.style('display', 'none');

function pick(i) {
  const o = opts[i];
  if (!o) return;
  if (o.open) {
    qInput.value = '';
    state.typing = '';
    hide();
    filtersChanged();
    selectProject(store.projById.get(o.open));
    return;
  }
  addToken(o.token);
}

function moveActive(delta) {
  active = Math.max(0, Math.min(opts.length - 1, active + delta));
  sugg.selectAll('.opt').classed('active', function () { return +this.dataset.i === active; });
  sugg.select('.opt.active').node()?.scrollIntoView({ block: 'nearest' });
}

export function initSearch() {
  qInput = document.getElementById('q');
  sugg = d3.select('#sugg');

  qInput.addEventListener('focus', show);
  qInput.addEventListener('blur', () => setTimeout(hide, 120));
  qInput.addEventListener('input', () => { state.typing = qInput.value.trim(); show(); filtersChanged(); });
  qInput.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowDown': moveActive(1); e.preventDefault(); break;
      case 'ArrowUp': moveActive(-1); e.preventDefault(); break;
      case 'Enter':
        if (active >= 0) pick(active);
        else if (qInput.value.trim()) addToken({ type: 'text', value: qInput.value.trim() });
        e.preventDefault();
        break;
      case 'Escape': hide(); qInput.blur(); break;
      case 'Backspace':
        if (!qInput.value && state.tokens.length) removeToken(state.tokens.length - 1);
        break;
    }
  });

  // When a filter is added elsewhere (e.g. clicking a tag), clear the typed text.
  onFilterChange(() => {
    if (!state.typing && qInput.value) { qInput.value = ''; hide(); }
  });
}
