import json,glob,re
import os
H=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(H,'..','..'))
segs=json.load(open(os.path.join(H,'segs.json')))
tr={}
tr.update(json.load(open(os.path.join(H,'translations.json'))))
out={}; missing=[]
for k in segs:
    if 'bản màu · v' in k: continue  # nhãn phiên bản (đổi mỗi bản)
    if len(k)>400 or k.startswith('/*') or ('{' in k and ';' in k and ':' in k): continue
    v=tr.get(k)
    if v is None: missing.append(k); continue
    if v==k: continue
    out[k]=v
# mảnh dính thẻ HTML ('\">Mở', '— chuột phải: cài đặt\">'): tách phần chữ ra thành khoá riêng
import re as _re
VI=_re.compile(r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐÀÁẢÃẠÂĂÊÔƠƯ]')
R=r'[a-zA-Z-]+="[^"]*"|<[a-zA-Z]+\b[^>]*$|["<>]'
for k,v in list(out.items()):
    if not _re.search(r'["<>]',k): continue
    pk=[p.strip() for p in _re.split(R,k) if p.strip() and VI.search(p)]
    pv=[p.strip() for p in _re.split(R,v) if p.strip()]
    if len(pk)==len(pv):
        for a,b in zip(pk,pv): out.setdefault(re.sub(r'\s+',' ',a),b)
# extra entries (manual) not in segs (e.g. runtime-composed headers)
for k,v in tr.items():
    if k not in segs: out.setdefault(k,v)
print('entries',len(out),'missing',len(missing))
json.dump(missing,open(os.path.join(H,'missing.json'),'w'),ensure_ascii=False,indent=0)
if missing: print('Thiếu bản dịch -> thêm vào translations.json:', missing[:20])
js='/* DVDCAD — từ điển giao diện tiếng Việt → English (tự sinh từ chuỗi trong mã, dùng bởi dvd-i18n.js) */\nwindow.DVD_I18N_EN = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n'
open(os.path.join(ROOT,'dvd-i18n-en.js'),'w',encoding='utf-8').write(js)
print('bytes',len(js.encode()))
