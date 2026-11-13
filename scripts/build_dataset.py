import paths  # sets cwd to data/work and defines repo paths
from sanitize import clean_html
import json,re,collections,math,os,html,shutil
ROOT=paths.PUBLIC+'/'
SYW='https://akkartik.name/archives/foc/share-your-work/index.html#'
INT='https://akkartik.name/archives/foc/introduce-yourself/index.html#'
syw=sorted(json.load(open('syw.json')),key=lambda x:float(x['id']))
intro=sorted(json.load(open('intro.json')),key=lambda x:float(x['id']))
P=json.load(open('merged2.json'))
ALIAS={'edward':'Edward de Jong','magicmouse94937':'Edward de Jong','breck7':'Breck Yunits','tonyo':"Tony O'Dell",'mariano445':'Mariano Guerra','geraclion':'Oleksandr Kryvonos','Scott':'Scott Werner'}
IDEAS={
 'VIS':('Visual programming','Nodes, blocks, diagrams instead of (or beside) text'),
 'CANVAS':('Spatial & canvas computing','Infinite canvases, spatial layout of code and thought'),
 '3D':('3D, VR & AR programming','Programming in or for three-dimensional / immersive space'),
 'LIVE':('Live programming','Immediate feedback, time travel, editing running systems'),
 'UNDER':('Understanding & debugging code','Visualizing execution, navigating and explaining codebases'),
 'LANG':('New programming languages','Designing languages: serious, minimal or just for fun'),
 'STRUCT':('Structure & projectional editors','Editing ASTs directly instead of text'),
 'FORMAL':('Logic, types & formal methods','Proofs, type systems, declarative logic, notations'),
 'EUP':('End-user programming & no-code','Spreadsheets, no-code builders, programming by example'),
 'MALL':('Malleable & personal computing','Software users can reshape; beyond apps; personal OSes'),
 'SMALL':('Small & minimal computing','Bootstrapping, permacomputing, tiny tools you fully understand'),
 'COLLAB':('Collaboration & local-first','Sync, CRDTs, version control, shared environments'),
 'DATA':('Dataflow & reactive data','Reactive systems, dataflow, data transformation tools'),
 'NB':('Notebooks & literate programming','Computational documents mixing prose and code'),
 'THINK':('Tools for thought','Knowledge tools, outliners, writing and thinking aids'),
 'ART':('Creative coding, art & music','Live-coded music, generative art, playful toys'),
 'GAME':('Games & play','Programming games, playful environments, satire'),
 'HW':('Hardware & physical computing','Tangible interfaces, sensors, Dynamicland-style rooms'),
 'AI':('AI-assisted programming','LLMs, agents and ML applied to making software'),
 'EDU':('Learning & teaching programming','Education, explorable explanations, tutorials'),
 'ESSAY':('Essays, history & theory','Writing about the past and philosophy of computing'),
 'COMM':('Community & curation','Podcasts, newsletters, lists, meetups, search'),
}
THEMES=[ # order = categorical palette slot order
 ('visual','Visual & spatial programming',['VIS','CANVAS','3D']),
 ('live','Live programming & understanding code',['LIVE','UNDER']),
 ('lang','Languages, editors & formalisms',['LANG','STRUCT','FORMAL']),
 ('enduser','End-user, malleable & small software',['EUP','MALL','SMALL','COLLAB']),
 ('data','Data, notebooks & tools for thought',['DATA','NB','THINK']),
 ('creative','Creative coding, art & play',['ART','GAME','HW']),
 ('ai','AI & programming',['AI']),
 ('discourse','Learning, essays & community',['EDU','ESSAY','COMM']),
]
I2T={i:t[0] for t in THEMES for i in t[2]}
AUD={'edu':'Educational','pro':'Professional','dev':'Developers','art':'Artists & musicians','res':'Researchers','user':'End users / general public','kids':'Children'}
RAT={'artistic':'How artistic / aesthetic / expressive (1 functional – 5 artful)','useful':'Practical usefulness today (1 speculative – 5 broadly useful)','complexity':'Conceptual/technical complexity (1 simple – 5 complex)','scale':'Size of the effort (1 small sketch – 5 big platform)','experimental':'How radical / novel the idea is (1 conventional – 5 far out)'}
# avatars
avatar={}
for x in syw+intro:
    n=ALIAS.get(x['author'],x['author'])
    if x['avatar'] and n not in avatar: avatar[n]=x['avatar']
os.makedirs(ROOT+'images/avatars',exist_ok=True)
introBy=collections.defaultdict(list)
for x in intro: introBy[ALIAS.get(x['author'],x['author'])].append(x)
def clean(t,n=600):
    t=re.sub(r'\s+',' ',t).strip(); return t if len(t)<=n else t[:n].rsplit(' ',1)[0]+'…'
# images
shots={f[:-4] for f in os.listdir(ROOT+'images/shots') } if os.path.isdir(ROOT+'images/shots') else set()
vids={f[:-4] for f in os.listdir(ROOT+'images/video')}
WB={l.split('\t')[0]:(l.split('\t')[1],l.split('\t')[2]) for l in open('wayback.tsv').read().split('\n') if l.strip()}
USED={'storyscript','darklang','blawx','horizon-vs','krouse-essays','maraca','tofu','instadeq'}
projects=[]
for p in P:
    posts=[syw[i] for i in p['_posts']]
    img = f'images/shots/{p["key"]}.jpg' if p['key'] in shots else (f'images/video/{p["key"]}.jpg' if p['key'] in vids else None)
    themes=collections.Counter(I2T[i] for i in p['ideas'])
    projects.append(dict(
        id=p['key'],name=p['name'],description=p['description'],
        people=p['people'],shared_by=[ALIAS.get(s,s) for s in p['shared_by'] if ALIAS.get(s,s) not in p['people']],
        url=p['url'] or None,video=p['video'] or None,image=img,
        image_type=(('wayback-screenshot' if p['key'] in USED else 'screenshot') if p['key'] in shots else 'video-thumbnail' if img else None),
        image_source=(WB[p['key']][0].replace('if_/','/') if p['key'] in USED and p['key'] in shots else (p['url'] if p['key'] in shots else (p['video'] or p['url']) if img else None)),
        wayback_timestamp=(WB[p['key']][1] if p['key'] in USED and p['key'] in shots else None),
        wayback_url=(f"https://web.archive.org/web/{posts[0]['date'][:10].replace('-','')}/{p['url']}" if p['url'] and not p['url'].startswith('mailto') else None),
        wayback_video=(f"https://web.archive.org/web/{posts[0]['date'][:10].replace('-','')}/{p['video']}" if p['video'] and p['video']!=p['url'] else None),
        audience=p['audience'],ideas=p['ideas'],theme=I2T[p['ideas'][0]],
        ratings=p['ratings'],
        first_date=posts[0]['date'][:10],last_date=posts[-1]['date'][:10],
        comments=sum(x['comments'] for x in posts),
        posts=[dict(uuid=x['id'],date=x['date'],author=ALIAS.get(x['author'],x['author']),comments=x['comments'],archive=SYW+x['id'],excerpt=clean(x['text'],280),html=clean_html(x['html'])) for x in posts],
    ))


# ---- repair URLs that were cut short while reading the archive digest:
# replace only when the stored URL ends mid-word and a post contains the full link
import html as _h
for pr in projects:
    links=[_h.unescape(l) for x in pr['posts'] for l in re.findall(r'href="([^"]+)"',x['html'])]
    for f in ('url','video'):
        u=pr[f]
        if not u or u in links or u.endswith('/'): continue
        full=[l for l in links if l.startswith(u) and len(l)>len(u) and re.match(r'[A-Za-z0-9%-]',l[len(u)])]
        if full:
            pr[f]=full[0]
            if f=='url' and pr.get('wayback_url'): pr['wayback_url']=pr['wayback_url'].split('/http',1)[0]+'/'+full[0]
            if f=='video' and pr.get('wayback_video'): pr['wayback_video']=pr['wayback_video'].split('/http',1)[0]+'/'+full[0]

# ---- post-processing: GitHub README rules, manual overrides, taken-over domains
GHM=json.load(open('github_media.json'))
GHPAGES=json.load(open('gh_pages_links.json')) if os.path.exists('gh_pages_links.json') else {}
TAKEOVER=set(open('takeover.txt').read().split())
RE_GH=re.compile(r'https?://(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)')
for pr in projects:
    k=pr['id']
    # github link: project url first, else first repo link in the posts by the project's people
    gh=None
    if pr['url'] and RE_GH.match(pr['url']): gh=RE_GH.match(pr['url']).group(0)
    else:
        for x in pr['posts']:
            m=RE_GH.search(x['html'])
            if m and m.group(2) not in ('issues','pulls'): gh=m.group(0); break
    pr['github_url']=(GHM[k]['repo'] if k in GHM and GHM[k]['exists'] else gh)
    if not pr['github_url'] and k in GHPAGES: pr['github_url']=GHPAGES[k]   # GitHub Pages site -> verified repo, or a gist
    pr['demo_url']=None
    if k in GHM:
        g=GHM[k]; pr['demo_url']=g.get('demo_url')
        if g.get('youtube') and not pr['video']: pr['video']=f"https://www.youtube.com/watch?v={g['youtube']}"
        if g.get('image'):
            pr['image']=f'images/github/{k}.jpg'; pr['image_type']=g['image']['kind']; pr['image_source']=g['image']['source']; pr['wayback_timestamp']=None
        elif pr['image_type'] in ('screenshot',): pr['image']=pr['image_type']=pr['image_source']=None
    if pr['image'] and pr['image'].startswith('images/shots/') and not os.path.exists(ROOT+pr['image']):
        pr['image']=pr['image_type']=pr['image_source']=None
    if k in TAKEOVER:
        pr['link_status']='domain-taken-over'; pr['url']=None   # wayback_url (original link at post date) is kept
        if pr['image_type']=='screenshot': pr['image']=pr['image_type']=pr['image_source']=None
    else: pr['link_status']=None
MANUAL={'jsbubbles':dict(image='images/manual/jsbubbles.jpg',image_type='readme-image',image_source='https://raw.githubusercontent.com/Raathigesh/waypoint/master/docs/assets/demo.png'),
        'livecoder':dict(video='https://www.youtube.com/watch?v=LW_fgRFmEGI',image='images/manual/livecoder.jpg',image_type='video-thumbnail',image_source='https://www.youtube.com/watch?v=LW_fgRFmEGI')}
# Medium articles captured in the user's logged-in browser (cropped to the article column)
for _k in ['darklang','openapi-programs','tarpit-ts','enso','parabeac','miqula','figmata','osm-prompt']:
    MANUAL[_k]=dict(image=f'images/manual/{_k}.jpg',image_type='screenshot')
MANUAL['openapi-programs']['url']='https://medium.com/p/problems-with-api-specifications-690be2c30f29'
for pr in projects:
    if pr['id'] in MANUAL:
        pr.update(MANUAL[pr['id']]); pr['wayback_timestamp']=None
        if pr['image_type']=='screenshot' and 'image_source' not in MANUAL[pr['id']]: pr['image_source']=pr['url']
# people
pp=collections.defaultdict(lambda: dict(projects=[],ideas=collections.Counter(),audience=collections.Counter()))
for pr in projects:
    for n in pr['people']:
        d=pp[n]; d['projects'].append(pr['id'])
        for i in pr['ideas']: d['ideas'][i]+=1
        for a in pr['audience']: d['audience'][a]+=1
names=sorted(pp)
def vec(n): return pp[n]['ideas']
def cos(a,b):
    s=sum(a[k]*b.get(k,0) for k in a); 
    return s/math.sqrt(sum(v*v for v in a.values())*sum(v*v for v in b.values())) if s else 0
people=[]
for n in names:
    d=pp[n]; iv=d['ideas']
    sims=sorted(((cos(iv,vec(m)),m) for m in names if m!=n),reverse=True)[:8]
    ins=introBy.get(n,[])
    if n in avatar:
        src=paths.SOURCE+'/share-your-work_files/'+avatar[n]
        if not os.path.exists(src): src=paths.SOURCE+'/introduce-yourself_files/'+avatar[n]
        av=None
        if os.path.exists(src): shutil.copy(src,ROOT+'images/avatars/'+avatar[n]); av='images/avatars/'+avatar[n]
    else: av=None
    tc=collections.Counter()
    for i,c in iv.items(): tc[I2T[i]]+=c
    people.append(dict(name=n,avatar=av,
        intro=(dict(uuid=ins[0]['id'],date=ins[0]['date'],archive=INT+ins[0]['id'],text=clean(ins[0]['text'],900)) if ins else None),
        other_intro_channel_posts=[dict(uuid=x['id'],date=x['date'],archive=INT+x['id'],text=clean(x['text'],200)) for x in ins[1:]],
        projects=d['projects'],
        ideas=dict(iv.most_common()),audience=dict(d['audience'].most_common()),
        main_theme=tc.most_common(1)[0][0],
        similar=[dict(name=m,score=round(s,3),shared_ideas=sorted(set(iv)&set(vec(m)))) for s,m in sims if s>0.35]))
meta=dict(
  source='Feeling of Computing (formerly Future of Coding) Slack, #share-your-work channel archive',
  share_your_work_archive=SYW, introduce_yourself_archive=INT,
  note='uuid = Slack message timestamp; append to the archive URL after # to jump to the post. wayback_url points the Wayback Machine at the date the project was first shared; it redirects to the nearest available snapshot.',
  generated='2026-11-13',ratings=RAT,audiences=AUD,
  ideas={k:dict(label=v[0],description=v[1],theme=I2T[k]) for k,v in IDEAS.items()},
  themes=[dict(id=t[0],label=t[1],ideas=t[2]) for t in THEMES])
out=dict(meta=meta,projects=projects,people=people)
json.dump(out,open(paths.DATASET,'w'),indent=1,ensure_ascii=False)
print(len(projects),len(people),sum(1 for p in projects if p['image']),sum(1 for p in people if p['intro']))
print(collections.Counter(p['theme'] for p in projects))
