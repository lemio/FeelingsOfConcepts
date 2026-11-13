import paths  # sets cwd to data/work and defines repo paths
import json,os,subprocess,urllib.request,hashlib
from concurrent.futures import ThreadPoolExecutor
G=json.load(open('github_media.json'))
OUT=paths.IMAGES+'/github/'; os.makedirs(OUT,exist_ok=True)
CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
def shot(url,path):
    prof=subprocess.run(['mktemp','-d','tmp/prof.XXXX'],capture_output=True,text=True).stdout.strip()
    try: subprocess.run([CH,'--headless=new','--disable-gpu','--hide-scrollbars','--mute-audio','--no-first-run',f'--user-data-dir={prof}','--window-size=1280,800','--virtual-time-budget=10000',f'--screenshot={path}',url],capture_output=True,timeout=60)
    except Exception: pass
    subprocess.run(['rm','-rf',prof])
    return os.path.exists(path) and os.path.getsize(path)>12000
def fetch(url,path):
    try:
        data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read()
        if len(data)<3000: return False
        open(path,'wb').write(data); return True
    except Exception: return False
def to_jpg(src,dst):
    subprocess.run(['sips','-s','format','jpeg','-s','formatOptions','75','--resampleWidth','800',src,'--out',dst],capture_output=True)
    return os.path.exists(dst)
def work(item):
    k,g=item; tmp=f'{paths.TMP}/gh_{k}'
    steps=[]
    if g['demo_url']: steps.append(('demo-screenshot',g['demo_url'],lambda: shot(g['demo_url'],tmp+'.png') and tmp+'.png'))
    if g['youtube']: steps.append(('youtube-thumbnail',f"https://www.youtube.com/watch?v={g['youtube']}",lambda: fetch(f"https://img.youtube.com/vi/{g['youtube']}/hqdefault.jpg",tmp+'.yt.jpg') and tmp+'.yt.jpg'))
    if g['readme_image']: steps.append(('readme-image',g['readme_image'],lambda: fetch(g['readme_image'],tmp+'.img') and tmp+'.img'))
    if g['exists']: steps.append(('readme-screenshot',g['repo']+'#readme',lambda: shot(g['repo']+'#readme',tmp+'.rd.png') and tmp+'.rd.png'))
    for kind,src,fn in steps:
        f=fn()
        if f and to_jpg(f,OUT+k+'.jpg'): return k,dict(kind=kind,source=src)
    return k,None
res=dict(ThreadPoolExecutor(6).map(work,G.items()))
for k,v in res.items(): G[k]['image']=v
json.dump(G,open('github_media.json','w'),indent=1)
import collections; print(collections.Counter(v['kind'] if v else None for v in res.values()))
