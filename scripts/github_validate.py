"""Rule-based validation of demo pages + README-render fallback. No AI judgement."""
import paths  # sets cwd to data/work and defines repo paths
import json,subprocess,urllib.request,os,re,html
G=json.load(open('github_media.json'))
CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
OUT=paths.IMAGES+'/github/'
BAD=re.compile(r'(404|not found|page not found|error 10\d\d|security verification|verify you are human|just a moment|access denied|domain (is )?for sale|this domain|site can.t be reached)',re.I)
def status(u):
    try: return urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=20).status
    except urllib.error.HTTPError as e: return e.code
    except Exception: return 0
def dom_text(u):
    prof=subprocess.run(['mktemp','-d','tmp/prof.XXXX'],capture_output=True,text=True).stdout.strip()
    try: r=subprocess.run([CH,'--headless=new','--disable-gpu',f'--user-data-dir={prof}','--virtual-time-budget=8000','--dump-dom',u],capture_output=True,text=True,timeout=60).stdout
    except Exception: r=''
    subprocess.run(['rm','-rf',prof])
    t=re.sub(r'<script.*?</script>|<style.*?</style>','',r,flags=re.S); t=re.sub(r'<[^>]+>',' ',t); return re.sub(r'\s+',' ',t)
def demo_ok(u):
    s=status(u)
    if s!=200: return False,f'http {s}'
    t=dom_text(u)
    if len(t)<40: return False,'empty page text'
    m=BAD.search(t[:600])
    if m: return False,f'error phrase "{m.group(0)}"'
    return True,'ok'
CSS="body{margin:0;background:#fff;font:15px/1.55 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2328}.bar{background:#f6f8fa;border-bottom:1px solid #d0d7de;padding:14px 32px;font-size:18px}.bar b{color:#0969da}.md{max-width:900px;margin:24px auto;padding:0 32px}.md h1,.md h2{border-bottom:1px solid #d8dee4;padding-bottom:.3em}code,pre{background:#f6f8fa;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:13px}pre{padding:14px;overflow:hidden}img{max-width:100%}a{color:#0969da}"
def readme_render(k,g):
    o,r=g['repo'].split('/')[-2:]
    h=subprocess.run(['gh','api',f'repos/{o}/{r}/readme','-H','Accept: application/vnd.github.html'],capture_output=True,text=True).stdout
    if not h.strip(): return False
    f=os.path.abspath(f'tmp/readme_html/{k}.html'); open(f,'w').write(f'<!doctype html><meta charset=utf-8><base href="https://github.com/{o}/{r}/raw/HEAD/"><style>{CSS}</style><div class=bar>{html.escape(o)} / <b>{html.escape(r)}</b></div><div class=md>{h}</div>')
    png=f[:-5]+'.png'; prof=subprocess.run(['mktemp','-d','tmp/prof.XXXX'],capture_output=True,text=True).stdout.strip()
    subprocess.run([CH,'--headless=new','--disable-gpu','--hide-scrollbars',f'--user-data-dir={prof}','--window-size=1280,800','--virtual-time-budget=6000',f'--screenshot={png}','file://'+f],capture_output=True,timeout=60)
    subprocess.run(['rm','-rf',prof])
    if os.path.exists(png) and os.path.getsize(png)>8000:
        subprocess.run(['sips','-s','format','jpeg','-s','formatOptions','75','--resampleWidth','800',png,'--out',OUT+k+'.jpg'],capture_output=True); return True
    return False
def fetch(url,dst):
    try:
        d=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read()
        if len(d)<3000: return False
        tmp=dst+'.src'; open(tmp,'wb').write(d)
        subprocess.run(['sips','-s','format','jpeg','-s','formatOptions','75','--resampleWidth','800',tmp,'--out',dst],capture_output=True); os.remove(tmp)
        return os.path.exists(dst)
    except Exception: return False
for k,g in G.items():
    img=g.get('image') or {}
    if img.get('kind')=='demo-screenshot':
        ok,why=demo_ok(g['demo_url']); g['demo_check']=why
        if ok: continue
        print(k,'demo rejected:',why); g['demo_url_rejected']=g['demo_url']; g['demo_url']=None
    elif img.get('kind') not in (None,'readme-screenshot'): continue
    # fall through the remaining rules
    if g['youtube'] and fetch(f"https://img.youtube.com/vi/{g['youtube']}/hqdefault.jpg",OUT+k+'.jpg'):
        g['image']=dict(kind='youtube-thumbnail',source=f"https://www.youtube.com/watch?v={g['youtube']}")
    elif g['readme_image'] and fetch(g['readme_image'],OUT+k+'.jpg'):
        g['image']=dict(kind='readme-image',source=g['readme_image'])
    elif g['exists'] and readme_render(k,g):
        g['image']=dict(kind='readme-render',source=g['repo']+'#readme')
    else:
        g['image']=None
        if os.path.exists(OUT+k+'.jpg'): os.remove(OUT+k+'.jpg')
    print(k,'->',g['image'] and g['image']['kind'])
json.dump(G,open('github_media.json','w'),indent=1)
import collections; print(collections.Counter((g.get('image') or {}).get('kind') for g in G.values()))
