// Filter logic: tokens (stacked search filters), media filter, free-text matching and ranking.
import * as d3 from 'd3';
import { store, col, themeLabel } from './data.js';
import { state, filtersChanged } from './state.js';
import { esc, hl } from './util.js';
import { isLoved } from './loves.js';

export const TOKEN_LABEL = { loved: '', theme: 'Theme', idea: 'Idea', aud: 'Audience', person: 'Person', text: 'Text' };

export const MEDIA_OPTIONS = [
  ['', 'All media'],
  ['image', 'Has image'],
  ['shot', 'Has screenshot'],
  ['video', 'Has video'],
  ['github', 'Has GitHub link'],
  ['live', 'Has working project link'],
];

/** 2 = match in title/description/people, 1 = match in post text, 0 = no match. */
export function textHit(p, q) {
  if (p._title.includes(q)) return 2;
  if (p._bodyL.includes(q)) return 1;
  return 0;
}

function tokenMatch(p, t) {
  const { M } = store;
  switch (t.type) {
    case 'theme': return p.ideas.some(i => M.ideas[i].theme === t.value);
    case 'idea': return p.ideas.includes(t.value);
    case 'aud': return p.audience.includes(t.value);
    case 'person': return p.people.includes(t.value) || p.shared_by.includes(t.value);
    case 'text': return textHit(p, t.value.toLowerCase()) > 0;
    case 'loved': return isLoved(p.id);
  }
  return true;
}

function mediaMatch(p) {
  switch (state.media) {
    case 'image': return !!p.image;
    case 'shot': return /screenshot|readme-render/.test(p.image_type || '');
    case 'video': return !!p.video;
    case 'github': return !!p.github_url;
    case 'live': return !!p.url;
    default: return true;
  }
}

/** Does project p pass all active filters (plus optional extra tokens)? */
export function projMatch(p, extraTokens = []) {
  if (!mediaMatch(p)) return false;
  for (const t of state.tokens.concat(extraTokens)) if (!tokenMatch(p, t)) return false;
  if (state.typing && state.typing.length > 1 && !textHit(p, state.typing.toLowerCase())) return false;
  return true;
}

export const personMatch = pe => pe.projects.some(id => projMatch(store.projById.get(id)));

export function addToken(t) {
  if (!state.tokens.some(x => x.type === t.type && x.value === t.value)) state.tokens.push(t);
  state.typing = '';
  filtersChanged();
}

export function removeToken(i) {
  state.tokens.splice(i, 1);
  filtersChanged();
}

export function setMedia(m) {
  state.media = m;
  d3.select('#fMedia').property('value', m);
  filtersChanged();
}

export function clearFilters() {
  state.tokens = [];
  state.typing = '';
  setMedia('');
}

const tokenText = t =>
  t.type === 'loved' ? '♥ Loved'
  : t.type === 'theme' ? themeLabel(t.value)
  : t.type === 'idea' ? store.M.ideas[t.value].label
  : t.type === 'aud' ? store.M.audiences[t.value]
  : t.value;

/** Render the row of active filter chips under the toolbar. */
export function drawFilters() {
  const { D, M } = store;
  const F = d3.select('#filters');
  const any = state.tokens.length || state.media;
  // The row floats over the top of the stage (see .filters in toolbar.css), so showing or
  // hiding it never moves the chart. Scrolling lists get top padding while it is visible.
  F.style('display', any ? 'flex' : 'none');
  d3.select('#list').classed('with-filters', !!any);
  if (!any) { F.html(''); return; }
  const n = D.projects.filter(p => projMatch(p)).length;
  const dot = t => (t.type === 'theme' || t.type === 'idea')
    ? `<span class="dot" style="background:${col(t.type === 'theme' ? t.value : M.ideas[t.value].theme)}"></span>` : '';
  const mediaLabel = MEDIA_OPTIONS.find(([v]) => v === state.media)?.[1];
  F.html(
    `<span class="count">${n} of ${D.projects.length} projects</span>` +
    state.tokens.map((t, i) =>
      `<span class="fchip">${TOKEN_LABEL[t.type] ? `<span class="k">${TOKEN_LABEL[t.type]}</span>` : ''}${dot(t)}${esc(tokenText(t))}<button data-i="${i}" aria-label="Remove filter">×</button></span>`).join('') +
    (state.media ? `<span class="fchip"><span class="k">Media</span>${esc(mediaLabel)}<button data-media aria-label="Remove filter">×</button></span>` : '') +
    `<button class="clear">Clear all</button>`);
  F.selectAll('button[data-i]').on('click', function () { removeToken(+this.dataset.i); });
  F.selectAll('button[data-media]').on('click', () => setMedia(''));
  F.select('.clear').on('click', clearFilters);
}

// ---------- free-text ranking: title matches first, then post-text matches

export const textQueries = () =>
  state.tokens.filter(t => t.type === 'text').map(t => t.value)
    .concat(state.typing && state.typing.length > 1 ? [state.typing] : []);

export function textRank(p) {
  const qs = textQueries();
  return qs.length ? d3.min(qs, q => textHit(p, q.toLowerCase())) : 0;
}

/** Snippet of post text around the first query that only matches in the body. */
export function snippet(p) {
  const qs = textQueries();
  const q = qs.find(q => !p._title.includes(q.toLowerCase()));
  if (!q) return '';
  const i = p._bodyL.indexOf(q.toLowerCase());
  if (i < 0) return '';
  return '…' + hl(p._body.slice(Math.max(0, i - 60), i + q.length + 80).replace(/\s+/g, ' '), q) + '…';
}
