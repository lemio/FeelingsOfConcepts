import paths  # sets cwd to data/work and defines repo paths
import json,re,sys
d=json.load(open('syw.json'))
d=sorted(d,key=lambda x:float(x['id']))
N=int(sys.argv[1])
lines=[]
for k,x in enumerate(d):
    t=re.sub(r'https?://\S+','',x['text']); t=re.sub(r'\s+',' ',t).strip()
    if len(t)>N: t=t[:N]+'…'
    L=' '.join(re.sub(r'^https?://(www\.)?','',l)[:70] for l in x['links'][:4])
    lines.append(f"{k}|{x['author']}|{x['date'][:7]}|c{x['comments']}|{t} [{L}]")
open('digest.txt','w').write('\n'.join(lines))
print(sum(len(l) for l in lines))
