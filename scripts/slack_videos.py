"""Collect every Slack video for each project from the cached history (data/work/slack_history/,
filled by scripts/slack_files.py). Nothing is fetched: videos are referenced by their URL on
history.futureofcoding.org.

A video counts for a project when it was uploaded
  - with one of the project's posts, or
  - in the thread under one of those posts, by one of the project's people.

Slack user ids are mapped to names using our own posts (each post's uuid is its Slack ts).

Output: data/work/slack_videos.json  {project id: [{url, title, post, thread_reply}]}
"""
import paths  # sets cwd to data/work and defines repo paths
import json
import os

FILES_BASE = 'https://history.futureofcoding.org/history/msg_files/'


def file_url(f):
    ext = '.' + f['filetype'] if f.get('filetype') else ''
    return FILES_BASE + f['id'][:3] + '/' + f['id'] + ext


def videos(msg):
    return [f for f in msg.get('files') or []
            if (f.get('mimetype') or '').startswith('video/') and f.get('id') and f.get('mode') != 'tombstone']


msgs = [m for name in sorted(os.listdir('slack_history')) for m in json.load(open(f'slack_history/{name}'))]
by_ts = {m['ts']: m for m in msgs if m.get('ts')}
replies = {}
for m in msgs:
    if m.get('thread_ts') and m['thread_ts'] != m.get('ts'):
        replies.setdefault(m['thread_ts'], []).append(m)

D = json.load(open(paths.DATASET))

# Slack user id -> display name, learned from our own posts
uid_name = {}
for p in D['projects']:
    for x in p['posts']:
        m = by_ts.get(x['uuid'])
        if m and m.get('user'):
            uid_name[m['user']] = x['author']

out = {}
for p in D['projects']:
    people = set(p['people'])
    found, seen = [], set()
    for x in p['posts']:
        m = by_ts.get(x['uuid'])
        if not m:
            continue
        candidates = [(m, False)] + [(r, True) for r in sorted(replies.get(x['uuid'], []), key=lambda r: float(r['ts']))
                                     if uid_name.get(r.get('user')) in people]
        for msg, is_reply in candidates:
            for f in videos(msg):
                url = file_url(f)
                if url in seen:
                    continue
                seen.add(url)
                found.append({'url': url, 'title': f.get('title') or f.get('name') or '',
                              'post': x['uuid'], 'thread_reply': is_reply})
    if found:
        out[p['id']] = found

json.dump(out, open('slack_videos.json', 'w'), indent=1)
total = sum(len(v) for v in out.values())
print(f'{len(out)} projects with Slack videos, {total} videos '
      f'({sum(1 for v in out.values() for f in v if f["thread_reply"])} from thread replies)')
