"""Check which remote images referenced by the dataset still resolve (HEAD requests only,
nothing is downloaded). Results are cached in data/work/remote_media_status.json and used by
build_dataset.py to skip dead link previews / uploads when picking a project's visual.

Run after scripts/slack_files.py and again whenever you want to refresh the status.
"""
import paths  # sets cwd to data/work and defines repo paths
import json
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor

OUT = 'remote_media_status.json'
status = json.load(open(OUT)) if os.path.exists(OUT) else {}


def head(url):
    for method in ('HEAD', 'GET'):  # some hosts reject HEAD; a GET is only read for its headers
        try:
            req = urllib.request.Request(url, method=method, headers={'User-Agent': 'Mozilla/5.0 foc-shared-work-map'})
            with urllib.request.urlopen(req, timeout=20) as r:
                ok = r.status == 200 and (r.headers.get('Content-Type', '').startswith(('image/', 'video/', 'application/octet-stream')))
                return url, ok
        except Exception:
            continue
    return url, False


S = json.load(open('slack_files.json'))
urls = {f['url'] for v in S.values() for f in v['files'] if f['kind'] in ('image', 'video')}
urls |= {p['image'] for v in S.values() for p in v['previews']}
todo = sorted(u for u in urls if u not in status)
print(f'{len(urls)} remote media URLs, {len(todo)} to check')
with ThreadPoolExecutor(8) as ex:
    for url, ok in ex.map(head, todo):
        status[url] = ok
json.dump(status, open(OUT, 'w'), indent=1)
print('alive:', sum(status.values()), 'dead:', sum(not v for v in status.values()))
