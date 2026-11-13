// UI state shared by all modules, plus a tiny change notifier.

export const state = {
  view: 'ideas',        // ideas | people | ratings | cards | list
  tokens: [],           // active filters: {type: theme|idea|aud|person|text, value}
  typing: '',           // text currently typed in the search box (live filter)
  media: '',            // '' | image | shot | video | github | live
  sel: null,            // selected project id or person name
  ax: 'first_date',     // scatter x field
  ay: 'comments',       // scatter y field
  cardsVisited: false,  // first visit to the card view defaults the media filter to screenshots
};

const listeners = new Set();

/** Subscribe to filter changes (tokens, typing, media). Returns an unsubscribe function. */
export function onFilterChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Notify all listeners that filters changed. */
export function filtersChanged() {
  for (const fn of listeners) fn();
}
