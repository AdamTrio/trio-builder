import base64,os,json
s=open('src.html').read(); d='../../src/assets/kit'
t={f.rsplit('.',1)[0]:'data:image/webp;base64,'+base64.b64encode(open(d+'/'+f,'rb').read()).decode() for f in sorted(os.listdir(d)) if f.split('.')[0] in ('slab_col','slab_nrm','slab_rgh','asphalt_col','asphalt_nrm','asphalt_rgh','paint')}
s=s.replace('/*TEX*/',','.join(json.dumps(k)+':'+json.dumps(v) for k,v in t.items())).replace('/*THREE*/',open('../../src/lib/three.min.js').read(),1)
open('trio-kitlab-katseye.html','w').write(s); print(len(s)//1024,'KB')
