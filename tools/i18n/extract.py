import re,sys,json,glob,html,os
sys.path.insert(0,__import__('os').path.dirname(__file__))
from scan import strings, VI
ROOT=__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','..'))
def unesc(s):
    try: return json.loads('"'+s.replace('"','\\"').replace("\\'","'").replace('\\`','`')+'"')
    except Exception:
        return s.replace('\\n','\n').replace("\\'","'").replace('\\"','"').replace('\\\\','\\')
segs={}
def add(t,src):
    t=html.unescape(t)
    for part in [t]:
        p=part.strip()
        p=re.sub(r'\s+',' ',p)
        if p and VI.search(p):
            segs.setdefault(p,set()).add(src)
files=sorted(f for f in glob.glob(ROOT+'/dvd-*.js') if 'i18n' not in f)+[ROOT+'/index.html']+sorted(glob.glob(ROOT+'/addins/*.js'))+sorted(glob.glob(ROOT+'/addins/*.lsp'))
for f in files:
    s=open(f,encoding='utf-8').read(); name=os.path.basename(f)
    s=re.sub(r'/\* <PROMPTS> \*/.*?/\* </PROMPTS> \*/','',s,flags=re.S)   # lời nhắc tự sinh trong dvd-help.js: được dịch từng mảnh lúc hiển thị
    if f.endswith('.lsp'):
        for m in re.finditer(r'"((?:[^"\\]|\\.)*)"', '\n'.join(l.split(';')[0] if '"' not in l.split(';')[0] and ';' in l else l for l in s.split('\n'))):
            t=m.group(1).replace('\\n','\n')
            if VI.search(t): add(t,name)
        continue
    if f.endswith('.html'):
        scripts=re.findall(r'<script[^>]*>(.*?)</script>',s,re.S)
        markup=re.sub(r'<script[^>]*>.*?</script>','',s,flags=re.S)
        markup=re.sub(r'<style[^>]*>.*?</style>','',markup,flags=re.S)
        for m in re.findall(r'>([^<>]+)<',markup): add(m,name+':html')
        for m in re.findall(r'(?:title|placeholder|aria-label|alt|value|content|data-tl|data-ts)="([^"]*)"',markup): add(m,name+':attr')
        src='\n'.join(scripts)
    else: src=s
    for q,t,pos in strings(src):
        if not VI.search(t): continue
        t=unesc(t) if q!='`' else t
        pieces=re.split(r'\$\{[^}]*\}',t) if q=='`' else [t]
        for pc in pieces:
            for chunk in re.sub(r'<[a-zA-Z/!][^>]*>', lambda m: m.group(0) if (VI.search(m.group(0)) and '=' not in m.group(0) and '"' not in m.group(0)) else '\x00', pc).split('\x00'):
                add(chunk,name)
            for m in re.findall(r'(?:title|placeholder|aria-label|data-tl|alt)=\\?"([^"\\]*)',pc): add(m,name+':attr')
print(len(segs), sum(len(k) for k in segs))
json.dump({k:sorted(v) for k,v in sorted(segs.items())}, open(__import__('os').path.join(__import__('os').path.dirname(__file__),'segs.json'),'w'), ensure_ascii=False, indent=0)
