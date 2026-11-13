// "Loved" projects, kept per browser in localStorage.
// Storage can be unavailable (private mode, blocked site data), so every access is guarded
// and the feature keeps working in memory for the session.
import { state, filtersChanged } from './state.js';

const KEY = 'foc-map:loved';
let loved = new Set(read());

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function write() {
  try { localStorage.setItem(KEY, JSON.stringify([...loved])); } catch { /* storage unavailable */ }
}

export const isLoved = id => loved.has(id);
export const lovedCount = () => loved.size;

export function toggleLove(id) {
  loved.has(id) ? loved.delete(id) : loved.add(id);
  write();
  syncButtons(id);
  // Re-filter when the "Loved" filter is active, otherwise just refresh counts in the filter row.
  if (state.tokens.some(t => t.type === 'loved')) filtersChanged();
}

/** Heart toggle button for a project (works anywhere: panel, cards, table). */
export function loveButton(id, extraClass = '') {
  const on = loved.has(id);
  return `<button type="button" class="love ${extraClass}" data-love="${id}" aria-pressed="${on}" ` +
    `aria-label="${on ? 'Unlove' : 'Love'} this project" title="${on ? 'Loved – click to remove' : 'Love this project'}">${on ? '♥' : '♡'}</button>`;
}

function syncButtons(id) {
  const on = loved.has(id);
  for (const b of document.querySelectorAll(`[data-love="${CSS.escape(id)}"]`)) {
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', `${on ? 'Unlove' : 'Love'} this project`);
    b.title = on ? 'Loved – click to remove' : 'Love this project';
    b.textContent = on ? '♥' : '♡';
  }
}

/** One delegated listener for every heart button; runs in the capture phase so it doesn't
 *  also trigger the card/row click underneath. */
export function initLoves() {
  document.addEventListener('click', e => {
    const b = e.target.closest?.('[data-love]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    toggleLove(b.dataset.love);
  }, true);
  // Keep tabs in sync when loves change in another tab.
  addEventListener('storage', e => {
    if (e.key !== KEY) return;
    loved = new Set(read());
    document.querySelectorAll('[data-love]').forEach(b => syncButtons(b.dataset.love));
    if (state.tokens.some(t => t.type === 'loved')) filtersChanged();
  });
}
