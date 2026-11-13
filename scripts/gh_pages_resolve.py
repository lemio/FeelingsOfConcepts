"""Resolve GitHub Pages / gist links in project data to GitHub repos (deterministic, via gh api)."""
import paths  # sets cwd to data/work and defines repo paths
import json,re,subprocess,os
D=json.load(open(paths.DATASET))['projects']
CACHE='gh_pages_cache.json'; cache=json.load(open(CACHE)) if os.path.exists(CACHE) else {}
SKIP_OWNERS={'mermaidjs','stedolan','mustache'}   # third-party tools hosted on GitHub Pages, not the project
RE_PAGES=re.compile(r'https?://([A-Za-z0-9-]+)\.github\.io(?:/([A-Za-z0-9_.-]+))?',re.I)
RE_GIST=re.compile(r'https?://gist\.github\.com/[A-Za-z0-9_-]+/[0-9a-f]+',re.I)
def repo_exists(o,r):
    k=f'{o}/{r}'
    if k not in cache:
        res=subprocess.run(['gh','api',f'repos/{o}/{r}','--jq','.html_url'],capture_output=True,text=True)
        cache[k]=res.stdout.strip() if res.returncode==0 else None
    return cache[k]
out={}
for p in D:
    if p['github_url']: continue
    blob=' '.join([p['url'] or '',p['video'] or '',p.get('demo_url') or '',p.get('wayback_url') or '']+[x['html'] for x in p['posts']])
    found=None
    for m in RE_PAGES.finditer(blob):
        o,r=m.group(1),m.group(2)
        if o.lower() in SKIP_OWNERS: continue
        # owner.github.io/repo/... is served from repo "repo"; owner.github.io/ from "owner.github.io"
        for cand in ([r] if r and not r.endswith(('.html','.pdf')) else [])+[f'{o}.github.io']:
            u=repo_exists(o,cand)
            if u: found=u; break
        if found: break
    if not found:
        g=RE_GIST.search(blob)
        if g: found=g.group(0)
    if found: out[p['id']]=found; print(p['id'],'->',found)
json.dump(cache,open(CACHE,'w'),indent=1); json.dump(out,open('gh_pages_links.json','w'),indent=1)
print(len(out))
