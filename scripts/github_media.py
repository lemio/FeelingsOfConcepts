"""Deterministic README scan for GitHub-hosted projects (no AI involved)."""
import paths  # sets cwd to data/work and defines repo paths
import json,re,subprocess,sys
D=json.load(open(paths.DATASET))['projects']
RE_REPO=re.compile(r'https?://(?:www\.)?github\.com/([^/\s]+)/([^/#?\s]+)')
RE_YT=re.compile(r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|img\.youtube\.com/vi/)([\w-]{11})')
RE_MDLINK=re.compile(r'(?<!!)\[([^\]]*)\]\((https?://[^)\s]+)\)')
RE_HREF=re.compile(r'<a[^>]+href="(https?://[^"]+)"[^>]*>(.*?)</a>',re.S|re.I)
RE_MDIMG=re.compile(r'!\[[^\]]*\]\(([^)\s]+)')
RE_HTMLIMG=re.compile(r'<img[^>]+src="([^"]+)"',re.I)
DEMO_HOST=re.compile(r'(github\.io|netlify\.app|vercel\.app|surge\.sh|glitch\.me|pages\.dev|itch\.io|replit\.com|repl\.co|codesandbox\.io|observablehq\.com|stackblitz\.com|herokuapp\.com|fly\.dev)',re.I)
DEMO_TEXT=re.compile(r'\b(demo|try it|try|playground|live|online|web app|launch|play)\b',re.I)
BADGE=re.compile(r'(shields\.io|badge|travis-ci|circleci|codecov|coveralls|gitter|discord|npmjs|badgen|actions/workflows|/workflows/|herokucdn|buymeacoffee|ko-fi|sponsor|\.svg($|\?))',re.I)
EXCLUDE=re.compile(r'(\.pdf($|\?)|youtube\.com|youtu\.be|apps\.apple|discord|dsc\.gg|hackage|pypi\.org|npmjs|crates\.io|archive\.org|twitter\.com|x\.com/|linkedin|marketplace\.visualstudio)',re.I)
def norm(s): return re.sub(r'[^a-z0-9]','',s.lower())
def related(u,o,r):
    # the link must share a name (>=4 chars) with the repo owner or repo name
    parts=[norm(x) for x in re.split(r'[./:\-_?=&#]+',re.sub(r'^https?://','',u)) if len(norm(x))>=4 and norm(x) not in ('www','http','https','html','index','github','netlify','vercel','pages','surge','glitch')]
    names=[norm(o),norm(r)]
    return any(a in b or b in a for a in parts for b in names if b)
def gh(path,raw=False):
    cmd=['gh','api',path]+(['-H','Accept: application/vnd.github.raw'] if raw else [])
    r=subprocess.run(cmd,capture_output=True,text=True)
    return r.stdout if r.returncode==0 else None
out={}
for p in D:
    m=p['url'] and RE_REPO.match(p['url'])
    if not m: continue
    o,r=m.group(1),m.group(2).removesuffix('.git')
    meta=gh(f'repos/{o}/{r}'); meta=json.loads(meta) if meta else {}
    if meta.get('full_name'): o,r=meta['full_name'].split('/')
    branch=meta.get('default_branch','HEAD')
    readme=gh(f'repos/{o}/{r}/readme',raw=True) or ''
    links=[(u,t) for t,u in RE_MDLINK.findall(readme)]+[(u,re.sub('<[^>]+>','',t)) for u,t in RE_HREF.findall(readme)]
    hp=(meta.get('homepage') or '').strip()
    demo=None
    if hp.startswith('http') and 'github.com' not in hp and not EXCLUDE.search(hp) and related(hp,o,r): demo=hp
    if not demo:
        for u,t in links:
            if 'github.com' in u or BADGE.search(u) or EXCLUDE.search(u) or not related(u,o,r): continue
            if DEMO_HOST.search(u) or DEMO_TEXT.search(t): demo=u; break
    yt=RE_YT.search(readme); yt=yt.group(1) if yt else None
    img=None
    for u in RE_MDIMG.findall(readme)+RE_HTMLIMG.findall(readme):
        if BADGE.search(u): continue
        if not u.startswith('http'):
            u=f'https://raw.githubusercontent.com/{o}/{r}/{branch}/'+u.lstrip('./')
        u=re.sub(r'github\.com/([^/]+)/([^/]+)/blob/',r'raw.githubusercontent.com/\1/\2/',u)
        if re.search(r'\.(png|jpe?g|gif|webp)(\?|$)',u,re.I) or 'user-images.githubusercontent' in u or 'github.com/user-attachments' in u:
            img=u; break
    out[p['id']]=dict(repo=f'https://github.com/{o}/{r}',exists=bool(meta),homepage=hp or None,demo_url=demo,youtube=yt,readme_image=img)
    print(p['id'],'|',demo,'|',yt,'|',(img or '')[:70],file=sys.stderr)
json.dump(out,open('github_media.json','w'),indent=1)
