import re,sys,glob,json,collections
VI=re.compile(r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]')
def strings(src):
    # tokenizer that skips comments, yields string literals
    i=0;n=len(src);out=[]
    while i<n:
        c=src[i]
        if c=='/' and i+1<n and src[i+1]=='/':
            j=src.find('\n',i); i=n if j<0 else j; continue
        if c=='/' and i+1<n and src[i+1]=='*':
            j=src.find('*/',i+2); i=n if j<0 else j+2; continue
        if c in '\'"`':
            q=c; j=i+1; buf=[]
            while j<n and src[j]!=q:
                if src[j]=='\\': buf.append(src[j:j+2]); j+=2; continue
                if q!='`' and src[j]=='\n': break
                buf.append(src[j]); j+=1
            out.append((q,''.join(buf),i)); i=j+1; continue
        i+=1
    return out
if __name__=='__main__':
    files=sys.argv[1:]
    tot=collections.Counter(); per={}
    for f in files:
        s=open(f,encoding='utf-8').read()
        if f.endswith('.html'):
            # only script blocks
            s='\n'.join(re.findall(r'<script[^>]*>(.*?)</script>',s,re.S))
        v=[x for x in strings(s) if VI.search(x[1])]
        per[f]=len(v)
        for q,t,_ in v: tot[t]+=1
    for f,k in per.items(): print(f,k)
    print('distinct',len(tot),'chars',sum(len(t) for t in tot))
