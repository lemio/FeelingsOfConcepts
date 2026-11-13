// Fields that can be put on the scatter plot axes.
// type: 'ord' = 1–5 rating, 'count' = symlog count, 'time' = date
import { store } from './data.js';

export function scatterFields() {
  const { M } = store;
  return {
    ...Object.fromEntries(Object.keys(M.ratings).map(k =>
      [k, { label: k, desc: M.ratings[k], type: 'ord', group: 'Ratings (1–5)', get: p => p.ratings[k] }])),
    comments: { label: 'comments', desc: 'Thread replies across all posts (symlog scale)', type: 'count', group: 'Activity', get: p => p.comments },
    posts: { label: 'posts', desc: 'Number of #share-your-work posts about the project (symlog)', type: 'count', group: 'Activity', get: p => p.posts.length },
    people: { label: 'people', desc: 'Number of people working on it', type: 'count', group: 'Activity', get: p => p.people.length },
    first_date: { label: 'first shared', desc: 'Date first shared', type: 'time', group: 'Time', get: p => new Date(p.first_date) },
    last_date: { label: 'last shared', desc: 'Date last shared', type: 'time', group: 'Time', get: p => new Date(p.last_date) },
  };
}
