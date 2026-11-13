import paths  # sets cwd to data/work and defines repo paths
import json,re,collections,math,os,html
syw=sorted(json.load(open('syw.json')),key=lambda x:float(x['id']))
intro=sorted(json.load(open('intro.json')),key=lambda x:float(x['id']))
P=json.load(open('merged.json'))
ALIAS={'edward':'Edward de Jong','magicmouse94937':'Edward de Jong','breck7':'Breck Yunits','tonyo':"Tony O'Dell",'mariano445':'Mariano Guerra','geraclion':'Oleksandr Kryvonos'}
TEAM={'darklang':['Ellen Chisa'],'wasp':['Matija Sosic'],'enso':['Sylwia Brodacka'],'nextjournal-clerk':['Philippa Markovics'],'vlojure':['Ella Hoeppner'],'lisperanto':['Oleksandr Kryvonos'],'beads':[],'glogg':[],'storyscript':['Cole Lawrence']}
for p in P:
    if p['key']=='unit': p['posts']=[i for i in p['posts'] if i!=746]
    if p['key']=='lisperanto': p['people']=['Oleksandr Kryvonos']
    p['people']=list(dict.fromkeys([ALIAS.get(x,x) for x in p['people']]+TEAM.get(p['key'],[])))
    auth=[ALIAS.get(syw[i]['author'],syw[i]['author']) for i in sorted(set(p['posts']))]
    p['shared_by']=sorted(set(auth)-set(p['people']))
    p['_posts']=sorted(set(p['posts']))
json.dump(P,open('merged2.json','w'),ensure_ascii=False)
# intro lookup
byname=collections.defaultdict(list)
for x in intro: byname[ALIAS.get(x['author'],x['author'])].append(x)
people=sorted({n for p in P for n in p['people']})
miss=[n for n in people if n not in byname]
print(len(people),'people;',len(miss),'without intro:',miss)
