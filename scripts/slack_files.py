"""Find Slack file uploads (images / videos) and link previews for every post in the dataset,
using the per-day message history that powers https://search.futureofcoding.org/ (by Mariano Guerra).

Only the small per-day JSON metadata is fetched (and cached in data/work/slack_history/);
the media itself is never downloaded. The dataset just refers to its URL on
history.futureofcoding.org.

Output: data/work/slack_files.json  {post uuid: {"files": [...], "previews": [...]}}
"""
import paths  # sets cwd to data/work and defines repo paths
import datetime
import json
import os
import time
import urllib.error
import urllib.request

HISTORY = 'https://search.futureofcoding.org/history'
FILES_BASE = 'https://history.futureofcoding.org/history/msg_files/'
CHANNEL = 'share-your-work'
CACHE = 'slack_history'
os.makedirs(CACHE, exist_ok=True)


def day_json(day):
    """Messages of one day in the channel (cached). Missing days are cached as []."""
    path = f'{CACHE}/{day.isoformat()}.json'
    if os.path.exists(path):
        return json.load(open(path))
    url = f'{HISTORY}/{day.year}/{day.month}/{day.day}/{CHANNEL}.json'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'foc-shared-work-map'})
        data = json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        data = [] if e.code == 404 else None
    except Exception:
        data = None
    if data is None:
        return []  # transient error: don't cache, retry next run
    msgs = data if isinstance(data, list) else data.get('messages', [])
    json.dump(msgs, open(path, 'w'))
    time.sleep(0.15)  # be gentle with the server
    return msgs


def file_url(f):
    ext = '.' + f['filetype'] if f.get('filetype') else ''
    return FILES_BASE + f['id'][:3] + '/' + f['id'] + ext


def media_of(msg):
    files = []
    for f in msg.get('files', []) or []:
        mt = f.get('mimetype') or ''
        if not f.get('id') or f.get('mode') == 'tombstone':
            continue
        kind = 'video' if mt.startswith('video/') else 'image' if mt.startswith('image/') else 'file'
        files.append({'kind': kind, 'url': file_url(f), 'title': f.get('title') or f.get('name') or '',
                      'mimetype': mt})
    previews = []
    for a in msg.get('attachments', []) or []:
        img = a.get('thumb_url') or a.get('image_url')
        if img:
            previews.append({'image': img, 'title': a.get('title') or '', 'link': a.get('title_link') or a.get('from_url') or ''})
    return files, previews


def main():
    D = json.load(open(paths.DATASET))
    uuids = sorted({x['uuid'] for p in D['projects'] for x in p['posts']}, key=float)
    out, found, missing = {}, 0, 0
    for n, ts in enumerate(uuids):
        day = datetime.datetime.fromtimestamp(float(ts), datetime.timezone.utc).date()
        msg = None
        for delta in (0, 1, -1):  # history files are per (UTC-ish) day; tolerate an off-by-one
            msg = next((m for m in day_json(day + datetime.timedelta(days=delta)) if m.get('ts') == ts), None)
            if msg:
                break
        if not msg:
            missing += 1
            continue
        found += 1
        files, previews = media_of(msg)
        if files or previews:
            out[ts] = {'files': files, 'previews': previews}
        if n % 100 == 0:
            print(f'{n}/{len(uuids)} posts checked, {len(out)} with media', flush=True)
    json.dump(out, open('slack_files.json', 'w'), indent=1)
    print(f'posts found in history: {found}, not found: {missing}, with media: {len(out)}')


if __name__ == '__main__':
    main()
