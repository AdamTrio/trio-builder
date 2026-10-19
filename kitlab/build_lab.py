import base64,os,json
s=open('src.html').read()
t={}
for f in sorted(os.listdir('tex')):
    k=f.rsplit('.',1)[0]; mime='image/png' if f.endswith('.png') else 'image/jpeg'
    t[k]='data:'+mime+';base64,'+base64.b64encode(open('tex/'+f,'rb').read()).decode()
s=s.replace('/*TEX*/',','.join(json.dumps(k)+':'+json.dumps(v) for k,v in t.items()))
s=s.replace('/*THREE*/',open('../src/lib/three.min.js').read(),1)
open('trio-kit-lab-v1.html','w').write(s); print(len(s)//1024,'KB')
