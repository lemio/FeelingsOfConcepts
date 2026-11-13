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
export const asset = path => (!path || /^https?:/.test(path) ? path : import.meta.env.BASE_URL + path);

/** Project visual: an <img>, or for Slack video uploads a muted <video> showing an early frame
 *  (only the metadata/first frame is requested; the file stays on history.futureofcoding.org). */
export function projectVisual(p, { cls = '', controls = false, lazy = false } = {}) {
  if (!p.image) return '';
  const c = cls ? ` class="${cls}"` : '';
  if (p.image_type === 'slack-video')
    return `<video${c} src="${esc(p.image)}#t=0.5" muted playsinline preload="metadata"${controls ? ' controls' : ''} onerror="this.remove()"></video>`;
  // Remote images can disappear; a failed image removes itself (cards then show the title tile).
  return `<img${c} src="${esc(asset(p.image))}" alt=""${lazy ? ' loading="lazy"' : ''} referrerpolicy="no-referrer" onerror="this.remove()">`;
}
