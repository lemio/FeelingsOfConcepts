// Shareable URLs: the view, filters, media, sort, selection and scatter axes live in GET
// parameters and are kept in sync as you use the map (history.replaceState, no reloads).
//
//   ?view=cards&idea=LIVE&theme=visual&aud=art&person=Kartik%20Agaram&text=sound&loved=1
//    &media=video&sort=comments&dir=asc&x=first_date&y=comments&project=mu
//
// Every filter parameter may repeat (idea=LIVE&idea=VIS). `selected` people use `person-open`.
// Older links keep working: ?q=type:value and #view/<project or person>.
import { state } from './state.js';

export const VIEWS = ['ideas', 'people', 'ratings', 'cards', 'list'];
const VIEW_ALIASES = { scatter: 'ratings', table: 'list' };
const VIEW_NAMES = { ratings: 'scatter', list: 'table' };
const TOKEN_PARAMS = ['theme', 'idea', 'aud', 'person', 'text'];

/** Read the URL into state. Returns the item to select: {project} | {person} | null. */
export function readUrl() {
  const q = new URLSearchParams(location.search);
  const tokens = [];
  for (const type of TOKEN_PARAMS) for (const value of q.getAll(type)) if (value) tokens.push({ type, value });
  if (q.has('loved')) tokens.push({ type: 'loved', value: 'yes' });
  for (const v of q.getAll('q')) { // legacy ?q=type:value
    const m = v.match(/^(loved|theme|idea|aud|person|text):(.+)$/);
    tokens.push(m ? { type: m[1], value: m[2] } : { type: 'text', value: v });
  }
  state.tokens = tokens;

  const view = VIEW_ALIASES[q.get('view')] || q.get('view');
  const [hashView, hashTarget] = location.hash.slice(1).split('/'); // legacy #view/target
  state.view = VIEWS.includes(view) ? view : VIEWS.includes(hashView) ? hashView : 'ideas';
  if (q.has('media')) state.media = q.get('media');
  if (q.has('sort')) state.sort = { key: q.get('sort'), dir: q.get('dir') === 'asc' ? 1 : -1 };
  if (q.has('x')) state.ax = q.get('x');
  if (q.has('y')) state.ay = q.get('y');
  if (q.has('media') || q.get('view')) state.cardsVisited = true; // an explicit link wins over the cards default

  if (q.get('project')) return { project: q.get('project') };
  if (q.get('person-open')) return { person: q.get('person-open') };
  if (hashTarget) return { any: decodeURIComponent(hashTarget) };
  return null;
}

let pending = 0;
/** Write state into the URL (batched to one update per frame). */
export function syncUrl() {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(() => {
    const q = new URLSearchParams();
    if (state.view !== 'ideas') q.set('view', VIEW_NAMES[state.view] || state.view);
    for (const t of state.tokens) {
      if (t.type === 'loved') q.set('loved', '1');
      else q.append(t.type, t.value);
    }
    if (state.media) q.set('media', state.media);
    if ((state.view === 'cards' || state.view === 'list') && state.sort.key !== 'relevance') {
      q.set('sort', state.sort.key);
      if (state.sort.dir > 0) q.set('dir', 'asc');
    }
    if (state.view === 'ratings') { q.set('x', state.ax); q.set('y', state.ay); }
    if (state.sel) q.set(state.selKind === 'person' ? 'person-open' : 'project', state.sel);
    const s = q.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
    const url = location.pathname + (s ? '?' + s : '');
    if (url !== location.pathname + location.search || location.hash) history.replaceState(null, '', url);
  });
}
