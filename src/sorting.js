// Shared ordering for the Cards and Table views (state.sort).
import * as d3 from 'd3';
import { store, projThemes } from './data.js';
import { state } from './state.js';
import { textRank } from './filters.js';
import { isLoved } from './loves.js';
import { syncUrl } from './url.js';

// key -> [label, value(p), numeric?]
export const SORTS = {
  relevance: ['Relevance', null, true],
  comments: ['Comments', p => p.comments, true],
  first_date: ['First shared', p => p.first_date, true],
  last_date: ['Last shared', p => p.last_date, true],
  posts: ['Posts', p => p.posts.length, true],
  name: ['Project', p => p.name.toLowerCase(), false],
  people: ['People', p => p.people.join(', ').toLowerCase(), false],
  themes: ['Themes', p => projThemes(p).map(t => store.TI[t]).join(','), false],
  loved: ['Loved', p => (isLoved(p.id) ? 1 : 0), true],
};

/** Comparator for the current sort. "Relevance" = title matches first while searching,
 *  then most comments. Any other key sorts by that column only (name breaks ties). */
export function compareProjects(a, b) {
  const { key, dir } = state.sort;
  if (key === 'relevance' || !SORTS[key]) {
    return textRank(b) - textRank(a) || b.comments - a.comments || d3.descending(a.first_date, b.first_date);
  }
  const v = SORTS[key][1];
  return d3.ascending(v(a), v(b)) * dir || d3.ascending(a.name.toLowerCase(), b.name.toLowerCase());
}

/** Choose a sort key. Re-choosing the same key flips the direction; a new numeric/date key
 *  starts highest/newest first (▼), a new text key starts A→Z (▲). */
export function setSort(key) {
  if (state.sort.key === key && key !== 'relevance') state.sort = { key, dir: -state.sort.dir };
  else state.sort = { key, dir: key === 'relevance' || SORTS[key]?.[2] ? -1 : 1 };
  syncUrl();
}

export const sortArrow = key => (state.sort.key === key && key !== 'relevance' ? (state.sort.dir < 0 ? ' ▼' : ' ▲') : '');
