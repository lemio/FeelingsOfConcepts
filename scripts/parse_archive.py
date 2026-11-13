import paths  # sets cwd to data/work and defines repo paths
import re, json, sys, html, os
from html.parser import HTMLParser
def parse(path):
    s=open(path,encoding='utf-8').read()
    # split on author rows
    parts=re.split(r'<td style="width:72px; vertical-align:top; padding-bottom:1em">', s)[1:]
    out=[]
    for p in parts:
        av=re.search(r'<img src="\./[^/]+/([^"]+)"',p)
        m=re.search(r'<b>(.*?)</b>\s*<span[^>]*>([^<]*)</span>\s*<a name="([0-9.]+)"',p,re.S)
        if not m: continue
        body=p[m.end():]; body=body.split(">",1)[1] if ">" in body[:200] else body
        body=body.split('</td>',1)[0]
        rest=p[m.end():]
        cm=re.search(r'>(\d+) comments?</a>',rest.split('<td style="width:72px',1)[0])
        links=re.findall(r'<a href="([^"]+)"',body)
        imgs=re.findall(r'<img src="\./[^/]+/([^"]+)"',body)
        text=re.sub(r'<br>','\n',body); text=re.sub(r'<[^>]+>','',text); text=html.unescape(text).strip()
        text=re.sub(r'^#\s*','',text)
        out.append(dict(html=body,id=m.group(3),author=html.unescape(m.group(1)),date=m.group(2),avatar=av.group(1) if av else None,text=text,links=[html.unescape(l) for l in links if 'akkartik.name/archives' not in l],images=imgs,comments=int(cm.group(1)) if cm else 0))
    return out
# Parse both saved archive pages from data/source/ into data/work/{syw,intro}.json
for page, out in [('share-your-work.html', 'syw.json'), ('introduce-yourself.html', 'intro.json')]:
    posts = parse(os.path.join(paths.SOURCE, page))
    json.dump(posts, open(out, 'w'), indent=1, ensure_ascii=False)
    print(page, len(posts), 'posts')
