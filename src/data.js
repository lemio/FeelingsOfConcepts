// Loaded dataset plus lookup tables derived from it.
// `store` is filled once by initData() and then treated as read-only.

export const store = {
  D: null,          // full projects.json
  M: null,          // D.meta
  themes: [],       // M.themes in palette order
  TI: {},           // theme id -> index (palette slot)
  projById: new Map(),
  personBy: new Map(),
};

export function initData(D) {
  store.D = D;
  store.M = D.meta;
  store.themes = D.meta.themes;
  store.TI = Object.fromEntries(store.themes.map((t, i) => [t.id, i]));
  store.projById = new Map(D.projects.map(p => [p.id, p]));
  store.personBy = new Map(D.people.map(p => [p.name, p]));

  // Text index: titles (name, description, people) are searched before the full post text.
  for (const p of D.projects) {
    p._title = (p.name + ' ' + p.description + ' ' + p.people.join(' ')).toLowerCase();
    p._body = p.posts
      .map(x => x.html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
      .join(' \n ');
    p._bodyL = p._body.toLowerCase();
  }
}

/** CSS colour for a theme id (categorical palette slot). */
export const col = id => `var(--s${store.TI[id] + 1})`;

/** Label for a theme id. */
export const themeLabel = id => store.themes[store.TI[id]].label;

/** All themes a project touches (via its ideas), primary theme first. */
export const projThemes = p => [...new Set(p.ideas.map(i => store.M.ideas[i].theme))];

/** Projects similar to p: shared ideas (Jaccard) plus a bonus for shared people. */
export function related(p) {
  return store.D.projects
    .filter(q => q !== p)
    .map(q => {
      const shared = p.ideas.filter(i => q.ideas.includes(i));
      const ppl = p.people.filter(n => q.people.includes(n));
      return { p: q, shared, ppl, score: shared.length / new Set([...p.ideas, ...q.ideas]).size + (ppl.length ? 0.5 : 0) };
    })
    .filter(r => r.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
