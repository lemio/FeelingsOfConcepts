/** Escape text for use inside HTML. */
export const esc = s =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Escape text for use inside a RegExp. */
export const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Escape text and wrap case-insensitive matches of q in <mark>. */
export function hl(s, q) {
  if (!q) return esc(s);
  return esc(s).replace(new RegExp('(' + reEsc(esc(q)) + ')', 'ig'), '<mark>$1</mark>');
}

/** External link that opens in a new tab. */
export const extLink = (href, text, cls = '') =>
  `<a ${cls ? `class="${cls}"` : ''} href="${esc(href)}" target="_blank" rel="noopener">${text} ↗</a>`;

/** Resolve a path from the data (e.g. "images/shots/x.jpg") against the site base URL. */
export const asset = path => (path ? import.meta.env.BASE_URL + path : path);
