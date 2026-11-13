// Side panel: project and person details.
import * as d3 from 'd3';
import { store, col, themeLabel, related } from './data.js';
import { state } from './state.js';
import { addToken, textQueries } from './filters.js';
import { esc, reEsc, extLink, asset, projectVisual } from './util.js';
import { applyFilter, ctx } from './render.js';
import { loveButton } from './loves.js';

const P = () => d3.select('#panel');

const IMAGE_CAPTIONS = {
  'demo-screenshot': 'Screenshot of the demo linked from the README',
  'readme-render': 'Rendered README',
  'readme-image': 'Image from the README',
  'youtube-thumbnail': 'Video linked from the README',
  'slack-image': 'Image uploaded to Slack',
  'slack-video': 'Video uploaded to Slack',
  'link-preview': 'Link preview from the Slack post',
};

const ideaTag = i =>
  `<span class="tag" data-idea="${i}"><span class="dot" style="background:${col(store.M.ideas[i].theme)}"></span>${esc(store.M.ideas[i].label)}</span>`;
const audTag = a => `<span class="tag" data-aud="${a}">${esc(store.M.audiences[a])}</span>`;

function avatar(pe, size) {
  return pe && pe.avatar
    ? `<img src="${asset(pe.avatar)}" alt=""${size ? ` style="width:${size}px;height:${size}px;border-radius:10px"` : ''}>`
    : '<span class="ph"></span>';
}

const personRow = (n, extra = '') =>
  `<div class="person" data-person="${esc(n)}">${avatar(store.personBy.get(n))}` +
  `<div><div>${esc(n)}</div>${extra ? `<div class="meta">${extra}</div>` : ''}</div></div>`;

/** Highlight search terms inside HTML text nodes (never inside tags). */
function markText(h) {
  const qs = textQueries();
  if (!qs.length) return h;
  return h.replace(/(^|>)([^<]+)/g, (m, a, t) =>
    a + qs.reduce((s, q) => s.replace(new RegExp('(' + reEsc(esc(q)) + ')', 'ig'), '<mark>$1</mark>'), t));
}

function wire() {
  const p = P();
  p.selectAll('[data-person]').on('click', function () { selectPerson(this.dataset.person); });
  p.selectAll('[data-proj]').on('click', function () { selectProject(store.projById.get(this.dataset.proj)); });
  p.selectAll('[data-idea]').on('click', function () { addToken({ type: 'idea', value: this.dataset.idea }); });
  p.selectAll('[data-aud]').on('click', function () { addToken({ type: 'aud', value: this.dataset.aud }); });
  p.node().scrollTop = 0;
}

/** Long Slack posts are clamped; the button expands them in place (removed when the text fits). */
function wireExpanders() {
  P().selectAll('.slack').each(function () {
    const b = this.querySelector('.sbody'), btn = this.querySelector('.more');
    const fits = () => b.scrollHeight <= b.clientHeight + 4;
    if (!b.classList.contains('clamp')) {
      b.classList.add('clamp');
      const f = fits();
      b.classList.remove('clamp');
      if (f) { btn.remove(); return; }
      btn.textContent = 'Show less';
    } else if (fits()) { btn.remove(); return; }
    btn.onclick = () => {
      const c = b.classList.toggle('clamp');
      btn.textContent = c ? 'Show full text' : 'Show less';
    };
  });
}

/** Files uploaded with the post and link previews, referenced on history.futureofcoding.org. */
function slackMedia(x) {
  const files = (x.files || []).filter(f => f.kind === 'image').map(f =>
    `<a href="${esc(f.url)}" target="_blank" rel="noopener" title="${esc(f.title)}"><img src="${esc(f.url)}" alt="${esc(f.title)}" loading="lazy" onerror="this.parentNode.remove()"></a>`);
  const previews = (x.previews || []).slice(0, 2).map(v =>
    `<a class="lpreview" href="${esc(v.link || v.image)}" target="_blank" rel="noopener"><img src="${esc(v.image)}" alt="" loading="lazy" referrerpolicy="no-referrer"><span>${esc(v.title)}</span></a>`);
  if (!files.length && !previews.length) return '';
  return `<div class="smedia">${files.join('')}${previews.join('')}</div>`;
}

/** All videos uploaded to Slack for this project (own posts and the project people's thread
 *  replies). Only the first two load a preview frame; the rest load nothing until played. */
function slackVideos(p) {
  // the project's main visual may already be the first Slack video: don't show it twice
  const v = (p.slack_videos || []).filter(f => !(p.image_type === 'slack-video' && f.url === p.image));
  if (!v.length) return '';
  return `<h3>Videos from Slack (${v.length})</h3><div class="svideos">${v.map((f, i) => `
    <figure>
      <video src="${esc(f.url)}${i < 2 ? '#t=0.5' : ''}" controls playsinline preload="${i < 2 ? 'metadata' : 'none'}" onerror="this.closest('figure').remove()"></video>
      <figcaption>${esc(f.title)}${f.thread_reply ? ' · in thread' : ''} ·
        <a href="${SYW_ARCHIVE}${f.post}" target="_blank" rel="noopener">post ↗</a> ·
        <a href="${esc(f.url)}" target="_blank" rel="noopener">file ↗</a></figcaption>
    </figure>`).join('')}</div>`;
}

const SYW_ARCHIVE = 'https://akkartik.name/archives/foc/share-your-work/index.html#';

function slackPost(x, i) {
  const commentsUrl = x.archive.replace('index.html#', '') + '.html';
  return `<div class="slack">
    <div class="shead">${avatar(store.personBy.get(x.author))}<b>${esc(x.author)}</b>
      <a href="${x.archive}" target="_blank" rel="noopener" title="Open in the Slack archive">${x.date}</a></div>
    <div class="sbody${i === 0 ? '' : ' clamp'}">${markText(x.html)}</div>
    ${slackMedia(x)}
    <div class="sfoot"><button class="more" type="button">Show full text</button>${
      x.comments ? `<a href="${commentsUrl}" target="_blank" rel="noopener">${x.comments} comment${x.comments > 1 ? 's' : ''} ↗</a>` : ''}</div>
  </div>`;
}

function projectLinks(p) {
  const L = [];
  if (p.url) L.push(extLink(p.url, 'Open project'));
  if (p.demo_url && p.demo_url !== p.url) L.push(extLink(p.demo_url, 'Try demo'));
  if (p.video && p.video !== p.url) L.push(extLink(p.video, 'Watch video'));
  if (p.github_url && p.github_url !== p.url) L.push(extLink(p.github_url, 'GitHub'));
  if (p.wayback_url) L.push(extLink(p.wayback_url, `Archived version (${p.first_date.slice(0, 4)})`, 'sub'));
  if (p.wayback_video) L.push(extLink(p.wayback_video, 'Archived video page', 'sub'));
  return `<div class="links">${L.join('')}</div>`;
}

export function selectProject(p) {
  state.sel = p.id;
  applyFilter();
  const ts = p.wayback_timestamp;
  P().html(`<div class="phead"><h2>${esc(p.name)}</h2>${loveButton(p.id)}</div>
    <div class="tags"><span class="tag static"><span class="dot" style="background:${col(p.theme)}"></span>${esc(themeLabel(p.theme))}</span></div>
    ${projectVisual(p, { cls: 'shot', controls: true })}
    ${ts ? `<div class="caption">Archived view · ${extLink(p.image_source, `Wayback Machine, ${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`)}</div>` : ''}
    ${IMAGE_CAPTIONS[p.image_type] ? `<div class="caption">${IMAGE_CAPTIONS[p.image_type]}</div>` : ''}
    <p>${esc(p.description)}</p>
    ${p.link_status === 'domain-taken-over' ? `<div class="warn">The original domain has been taken over by an unrelated site, so the live link was removed. The archived version shows it as it was.</div>` : ''}
    ${projectLinks(p)}
    ${slackVideos(p)}
    <h3>What was posted on Slack (${p.posts.length})</h3>
    ${p.posts.map(slackPost).join('')}
    <h3>Ideas</h3><div class="tags">${p.ideas.map(ideaTag).join('')}</div>
    <h3>Audience / context</h3><div class="tags">${p.audience.map(audTag).join('')}</div>
    <h3>Ratings</h3>${Object.keys(store.M.ratings).map(k =>
      `<div class="rating" title="${esc(store.M.ratings[k])}"><span>${k}</span><span class="bar"><i style="width:${p.ratings[k] * 20}%"></i></span><b>${p.ratings[k]}</b></div>`).join('')}
    <h3>People</h3>${p.people.map(n => personRow(n)).join('')}
    ${p.shared_by.length ? `<div class="meta">Shared/discussed by ${esc(p.shared_by.join(', '))}</div>` : ''}
    <h3>Similar projects</h3>${related(p).map(r =>
      `<div class="post"><span class="proj-link" data-proj="${r.p.id}">${esc(r.p.name)}</span> — ${esc(r.p.people.join(', '))}<br>` +
      `${r.ppl.length ? 'same people · ' : ''}${esc(r.shared.map(i => store.M.ideas[i].label).join(', '))}</div>`).join('') || '<p class="empty">None found.</p>'}`);
  wireExpanders();
  wire();
  ctx.scatterLinks(p);
  if (state.view === 'cards') d3.selectAll('.card').classed('sel', d => d.id === p.id);
}

export function selectPerson(n) {
  const pe = store.personBy.get(n);
  if (!pe) return;
  state.sel = n;
  applyFilter();
  P().html(`<div class="person static">${avatar(pe, 44)}<h2>${esc(pe.name)}</h2></div>
    <p><span class="proj-link" id="filterPerson">Show only ${esc(pe.name)}’s projects</span></p>
    ${pe.intro
      ? `<h3>Introduction · <a href="${pe.intro.archive}" target="_blank" rel="noopener">${pe.intro.date.slice(0, 10)}</a></h3><div class="intro">${esc(pe.intro.text)}</div>`
      : '<p class="empty small">No top-level #introduce-yourself post found.</p>'}
    <h3>Ideas they work on</h3><div class="tags">${Object.keys(pe.ideas).map(ideaTag).join('')}</div>
    <h3>Projects (${pe.projects.length})</h3>${pe.projects.map(id => {
      const p = store.projById.get(id);
      return `<div class="post"><span class="proj-link" data-proj="${id}">${esc(p.name)}</span> · ${p.first_date.slice(0, 4)}<br>${esc(p.description)}</div>`;
    }).join('')}
    <h3>People working on similar ideas</h3>${pe.similar.map(s =>
      personRow(s.name, `${Math.round(s.score * 100)}% match · ${s.shared_ideas.map(i => store.M.ideas[i].label).join(', ')}`)).join('') || '<p class="empty">None found.</p>'}`);
  P().select('#filterPerson').on('click', () => addToken({ type: 'person', value: n }));
  wire();
}
