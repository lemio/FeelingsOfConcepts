# Feeling of Computing – shared work map

A map of what people have shared in the **#share-your-work** channel of the
[Feeling of Computing](https://feelingof.com/community) Slack (formerly Future of Coding).
It turns eight years of posts into a browsable set of projects, groups them by idea, and
connects people who work on similar ideas.

The site is built with [Vite](https://vite.dev) and [D3](https://d3js.org) and is
deployed to GitHub Pages on every push to `main`.

## Quick start

```sh
npm install
npm run dev       # local dev server with hot reload
npm run build     # production build in dist/
npm run preview   # serve dist/ locally
```

Requires Node 20+. The data pipeline (optional, only needed to rebuild the dataset) needs
Python 3, the GitHub CLI (`gh`) and Google Chrome.

## Data snapshot

The archive pages were saved on **13 November 2026** from
[akkartik.name/archives/foc](https://akkartik.name/archives/foc/share-your-work/index.html).
They cover posts from **3 September 2018 to 6 September 2026** (the last post in the
channel at the time of saving). Nothing after that is included.

| | |
|---|---|
| Projects | 507 (from ~1,400 non-trivial posts) |
| People | 330, of whom 219 have an #introduce-yourself post |
| Projects with an image | 422 |
| Projects with a GitHub link | 142 |
| Projects with a video | 150 (69 with videos uploaded to Slack, 107 videos) |

## Repository layout

```text
index.html                 page shell (toolbar, stage, side panel)
src/
  main.js                  entry: loads data/projects.json, wires controls, first render
  data.js                  dataset store + helpers (colours, themes, similar projects)
  state.js                 UI state and a small change notifier
  filters.js               filter tokens, media filter, text matching/ranking, filter chips
  search.js                search box with grouped suggestions
  render.js                view manager (switches views, applies filters, shared SVG)
  panel.js                 project / person detail panel
  tooltip.js, fields.js, util.js
  views/                   ideas.js · people.js · scatter.js · cards.js · table.js
  styles/                  tokens · toolbar · layout · panel · views (.css)
public/                    copied as-is into the build
  data/projects.json       the dataset
  images/                  shots/ · github/ · video/ · manual/ · avatars/
data/
  source/                  saved Slack archive pages (pipeline input)
  work/                    curated + intermediate pipeline files
scripts/                   Python/shell data pipeline (see below)
.github/workflows/         GitHub Pages deployment
```

The app is plain ES modules, with no UI framework. Each view is one file exporting
`render(ctx)`. Views talk to each other only through `state.js` (`filtersChanged()` /
`onFilterChange()`) and the functions in `render.js` and `panel.js`.

## Deployment

`.github/workflows/deploy.yml` runs `npm ci && npm run build` on every push to `main` and
publishes `dist/` to GitHub Pages. To enable it once: in the repository go to
**Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
The build uses a relative base path, so it works under `https://<user>.github.io/<repo>/`.

## The views

- **Ideas** – force graph: every project is linked to each of its ideas, so projects that
  combine ideas sit between clusters.
- **People** – people linked by how similar their idea profiles are.
- **Scatter** – any two of: date first/last shared, comments, posts, people, ratings.
  Clicking a project draws lines to similar projects.
- **Cards** – screenshots with title, people, description and comment count.
- **Table** – sortable list.

The search box takes projects, people, ideas, themes, audiences or free text. Each choice
becomes a filter chip, and chips stack. Free text matches titles first, then the full text
of the Slack posts. The media menu limits results to projects with an image, screenshot,
video, GitHub link or a working link.

Use ♥ to love a project (in the side panel, on a card, or in the table). Loves are kept in
your browser's `localStorage`, so they're per browser and never leave your machine. Pick
**♥ Loved projects** in the search suggestions (or type "love"), or open `?q=loved:yes`,
to see only what you loved. It combines with any other filter.

Clicking a project shows the original Slack posts (formatted, expandable), links to the
project, video, GitHub repo and the Wayback Machine, plus similar projects and people.

## Links (URL parameters)

The address bar always reflects what you see, so any state can be shared or bookmarked:

```text
?view=ideas|people|scatter|cards|table
&idea=LIVE&theme=visual&aud=art&person=Kartik%20Agaram&text=sound&loved=1   filters (repeatable)
&media=image|shot|video|github|live
&sort=relevance|comments|first_date|last_date|posts|name|people|themes|loved&dir=asc
&x=first_date&y=comments                                                     scatter axes
&project=<project id>   or   &person-open=<name>                             open in the side panel
```

Idea and theme ids are in `projects.json` under `meta.ideas` / `meta.themes`
(e.g. `idea=VIS`, `idea=LIVE`, `theme=enduser`). Older links (`?q=idea:LIVE`,
`#view/<project>`) still work and are rewritten to this format.

## Data model (`projects.json`)

```text
meta      sources, taxonomy (themes → ideas), audiences, rating definitions
projects  id, name, description, people, shared_by,
          url, demo_url, video, github_url, wayback_url, link_status,
          image, image_type, image_source,
          slack_videos[] { url, title, post, thread_reply },
          ideas, theme, audience, ratings,
          first_date, last_date, comments,
          posts[] { uuid, date, author, comments, archive, excerpt, html,
                  files[] { kind, url, title, mimetype },   # Slack uploads
                  previews[] { image, title, link } }       # link unfurls
people    name, avatar, intro { uuid, date, archive, text },
          projects, ideas, audience, main_theme, similar[]
```

`uuid` is the Slack message timestamp. Append it to the archive URL to jump to the post:
`https://akkartik.name/archives/foc/share-your-work/index.html#<uuid>`
(or `…/introduce-yourself/index.html#<uuid>` for introductions).

## How it was made

1. **Parse** both archive pages into posts (author, date, text, links, reply count).
2. **Group posts into projects and classify them.** This step was done by reading the
   posts (with Claude), not by an algorithm. Each project got:
   - a short description
   - one or more of 22 **ideas**, grouped into 8 **themes** (used for colour)
   - **audiences** (developers, researchers, artists & musicians, end users, education,
     professionals, children)
   - five **ratings** from 1 to 5: artistic, useful, complexity, scale, experimental.

   These are judgements, not measurements. That's why the table doesn't show them.
3. **Link people** to their first #introduce-yourself post, and compute who is similar
   (cosine similarity of their idea profiles).
4. **Images**, tried in this order:
   - Screenshot of the project site (headless Chrome). Blank pages, 404s and bot walls
     were removed.
   - For the 50 most-discussed projects whose site has changed: a **Wayback Machine**
     snapshot close to the post date.
   - For GitHub projects, a plain rule-based script reads the README. It picks the first
     of: a linked demo page that loads, a YouTube thumbnail, the first README image, a
     rendering of the README.
   - Video thumbnails from YouTube, Vimeo or Loom.
   - Medium articles, captured in a logged-in browser and cropped to the article.
   - For projects that still had nothing: images and videos uploaded to Slack, or the
     link-preview image of the post. These come from the history behind
     [search.futureofcoding.org](https://search.futureofcoding.org/) (by Mariano Guerra).
     They are **referenced, not copied**: the URLs point at `history.futureofcoding.org`.
     Dead URLs are skipped (HEAD check), and the page falls back to a title tile if an
     image disappears later. Every post in the side panel also shows its uploads and link
     previews.
5. **Clean links**:
   - Domains now owned by someone else lost their live link but keep the archived link
     (`link_status: "domain-taken-over"`).
   - GitHub Pages sites and gists count as GitHub links once the repo was confirmed.
   - Every project with a link also gets a `wayback_url` pinned to the date it was
     first shared.

## Data pipeline

All scripts live in `scripts/` and read and write `data/work/` (set up by
`scripts/paths.py`). Only the last command is needed to rebuild `projects.json` after
editing the curated files. Running the whole chain reproduces the committed dataset
exactly.

| Step | Command | Reads → writes |
|---|---|---|
| 1. Parse archive | `python3 scripts/parse_archive.py` | `data/source/*.html` → `syw.json`, `intro.json` |
| 2. Reading digest | `python3 scripts/make_digest.py 260` | `syw.json` → `digest.txt` (compact text used for curation) |
| 3. Merge curation | `python3 scripts/merge_curated.py` | **`projects_curated.txt`** → `merged.json` |
| 4. People | `python3 scripts/normalize_people.py` | → `merged2.json` (name aliases, team members, `shared_by`) |
| 5. GitHub README rules | `python3 scripts/github_media.py` then `github_images.py`, `github_validate.py` | → `github_media.json`, `public/images/github/` |
| 6. GitHub Pages / gists | `python3 scripts/gh_pages_resolve.py` | → `gh_pages_links.json` |
| 7. Screenshots | `tr '\t' '\n' < data/work/shots.tsv \| xargs -n2 -P6 scripts/screenshot.sh` then `scripts/convert_shots.sh` | → `public/images/shots/` |
| 7b. Slack uploads | `python3 scripts/slack_files.py` then `python3 scripts/check_remote_media.py` | search.futureofcoding.org history → `slack_files.json`, `remote_media_status.json` |
| 7c. Slack videos | `python3 scripts/slack_videos.py` (no network: reads the cached history) | `slack_history/` → `slack_videos.json` |
| 8. **Build dataset** | `npm run data` (= `python3 scripts/build_dataset.py`) | everything above → `public/data/projects.json`, avatars |

The hand-curated inputs are:

- **`data/work/projects_curated.txt`**: one line per project:
  `id|name|people|post indices|url|video|description|audiences|ideas|ratings`.
  A line `+id|post indices` adds posts to an existing project. Post indices refer to
  `digest.txt`.
- `data/work/takeover.txt`: projects whose domain was taken over.
- `data/work/wayback.tsv`: chosen Wayback snapshots.
- The `MANUAL` overrides near the end of `scripts/build_dataset.py`: hand-picked images,
  plus the Medium screenshots in `public/images/manual/`.

The scripts were written for a one-off run on macOS (they use `sips` for images and the
Chrome path on macOS; set `CHROME=` to override in `screenshot.sh`).

## Related

- [Future of Coding search](https://search.futureofcoding.org/) by Mariano Guerra lets you
  search the full history of the community Slack, including threads and every channel. This
  map only covers top-level posts in #share-your-work.
- The Slack archive this data comes from is kept by Kartik Agaram at
  [akkartik.name/archives/foc](https://akkartik.name/archives/foc/).

## Limitations

- Only top-level channel posts are included. Thread replies are counted, not read.
- Grouping, ideas, audiences and ratings are one reading of the posts and will have
  mistakes. Corrections to `projects.json` are welcome.
- Screenshots show sites as they looked in November 2026, not when they were shared.
- 85 projects have no image (text-only posts, dead sites, or pages that wouldn't render).
- The pipeline scripts are functional but terse. They are a record of how the data was
  made more than a polished tool.
