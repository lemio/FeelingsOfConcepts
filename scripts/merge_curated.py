import paths  # sets cwd to data/work and defines repo paths
import json,re,collections
syw=sorted(json.load(open('syw.json')),key=lambda x:float(x['id']))
P={};order=[];errs=[]
for ln in open('projects_curated.txt'):
    ln=ln.rstrip('\n')
    if not ln.strip(): continue
    if ln.startswith('+'):
        parts=ln[1:].split('|'); k=parts[0]
        if k not in P: errs.append(ln); continue
        P[k]['posts']+= [int(i) for i in parts[1].split(',') if i]
        if len(parts)>2 and parts[2] and not P[k]['video']: P[k]['video']=parts[2]
        continue
    f=ln.split('|')
    if len(f)!=10: errs.append(('bad',len(f),ln[:80])); continue
    k,name,people,posts,url,video,desc,aud,ideas,r=f
    if k in P: errs.append(('dup',k)); P[k]['posts']+=[int(i) for i in posts.split(',')]; continue
    a,u,c,s,e=[int(x) for x in r.split(',')]
    P[k]=dict(key=k,name=name,people=[p.strip() for p in people.split(',')],posts=[int(i) for i in posts.split(',')],url=url,video=video,description=desc,audience=aud.split(','),ideas=ideas.split(','),ratings=dict(artistic=a,useful=u,complexity=c,scale=s,experimental=e))
    order.append(k)
print('errors',errs)
json.dump([P[k] for k in order],open('merged.json','w'),indent=1,ensure_ascii=False)
# authors of posts not in people
for k in order:
    p=P[k]; auth={syw[i]['author'] for i in set(p['posts'])}
    extra=auth-set(p['people'])
    if extra: print(k,extra)
