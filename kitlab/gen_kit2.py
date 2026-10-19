# Kit batch 1 (v75) textures: dirt path, flower clump, fern, water ripples. Same procedural recipe as gen_kit.py.
# Writes straight to src/assets/kit/*.webp (the builder's kit library).
import numpy as np, math, os
from PIL import Image, ImageFilter, ImageDraw
exec(open('../moodlab/gen_tex.py').read().split('# --- concrete')[0])
OUT='../src/assets/kit'
def webp(name, im, size, q=80):
    im=im.resize((size,size), Image.LANCZOS); im.save(OUT+'/'+name+'.webp', 'WEBP', quality=q, method=6)
def blur(a,r): return np.asarray(Image.fromarray(to8(np.clip(a,0,1))).filter(ImageFilter.GaussianBlur(r)))/255.
N=1024; R=np.random.default_rng(9)
# ---------- packed dirt path (one tile = 3 m): earth, pebbles, footprint wear, a little grass creeping in
b=fbm(N,6,3,201); g=fbm(N,3,120,202); m=fbm(N,5,10,203)
peb=(R.random((N,N))>.992).astype(float); peb=blur(peb,1.4); peb2=(R.random((N,N))>.9985).astype(float); peb2=blur(peb2,2.6)
wet=np.clip((fbm(N,5,2,204)-.58)*4,0,1)
grass=np.clip((fbm(N,4,5,205)-.66)*5,0,1)
col=np.stack([.36,.29,.21],-1)+((b-.5)*.14+(g-.5)*.08+(m-.5)*.06)[...,None]
col=col*(1-wet[...,None]*.28)
col=col+(peb[...,None]*np.array([.12,.11,.10]))+(peb2[...,None]*np.array([.16,.15,.14]))
G=np.stack([.22,.33,.13],-1)+((g-.5)*.1)[...,None]
col=col*(1-grass[...,None]*.7)+G*grass[...,None]*.7
h=b*.3+g*.25+peb*.7+peb2*.9-wet*.1
webp('dirt_col',Image.fromarray(to8(col)),512); webp('dirt_nrm',Image.fromarray(normal_from_height(h,3.5)),256,72)
# ---------- flower clump card (alpha): grass blades + little blooms (white, yellow, violet, pink)
S=512; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im); rr=np.random.default_rng(31)
for i in range(110):
    x0=S*.5+rr.normal(0,S*.13); h0=rr.uniform(.35,.85)*S; bend=rr.normal(0,S*.09); w=rr.uniform(2.5,5)
    sh=rr.uniform(.7,1.2); c=(int(64*sh),int(118*sh),int(42*sh),255)
    d.polygon([(x0-w,S),(x0+bend*.5,S-h0*.55),(x0+bend,S-h0),(x0+bend*.5+1,S-h0*.55),(x0+w,S)],fill=c)
COL=[(245,243,232),(250,214,70),(160,120,220),(236,120,170),(250,250,250)]
for i in range(26):
    x=S*.5+rr.normal(0,S*.16); y=S*rr.uniform(.12,.5); stem=(x+rr.normal(0,6),S)
    d.line([stem,(x,y)],fill=(60,105,40,255),width=3)
    c=COL[rr.integers(0,len(COL))]; r=rr.uniform(9,16)
    for k in range(6):
        a=k/6*math.pi*2+rr.uniform(0,.4); px=x+math.cos(a)*r*.75; py=y+math.sin(a)*r*.75
        d.ellipse([px-r*.5,py-r*.5,px+r*.5,py+r*.5],fill=c+(255,))
    d.ellipse([x-r*.32,y-r*.32,x+r*.32,y+r*.32],fill=(235,180,40,255) if c!=COL[1] else (150,90,30,255))
webp('flowers',im,256,82)
# ---------- fern card (alpha): fronds arching out from the middle
S=512; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
for f in range(9):
    a=-math.pi/2+(f-4)*.32+rr.normal(0,.05); L=S*rr.uniform(.36,.48); sh=rr.uniform(.75,1.1)
    x0,y0=S*.5,S*.98
    pts=[]
    for t in np.linspace(0,1,24):
        ang=a+(f-4)*.12*t*t; pts.append((x0+math.cos(ang)*L*t+(f-4)*t*t*14, y0+math.sin(ang)*L*t+t*t*L*.45))
    d.line(pts,fill=(int(50*sh),int(85*sh),int(30*sh),255),width=3)
    for k in range(1,len(pts)-1):
        t=k/len(pts); lw=(1-t)*S*.07+3; (px,py)=pts[k]; (qx,qy)=pts[k+1]; ang=math.atan2(qy-py,qx-px)
        for s in (-1,1):
            na=ang+s*1.15; ex=px+math.cos(na)*lw; ey=py+math.sin(na)*lw
            d.polygon([(px,py),(ex,ey),(px+math.cos(ang)*5,py+math.sin(ang)*5)],fill=(int(58*sh),int(112*sh+rr.uniform(-8,10)),int(36*sh),255))
webp('fern',im,256,82)
# ---------- water ripples (normal map, tileable)
M=512
w1=fbm(M,5,6,301); w2=fbm(M,4,18,302)
h=w1*.6+w2*.4
Image.fromarray(normal_from_height(h,6)).save('/tmp/wn.png')
webp('water_nrm',Image.fromarray(normal_from_height(h,6)),256,78)
print('batch 1 textures ok', {f:os.path.getsize(OUT+'/'+f)//1024 for f in ['dirt_col.webp','dirt_nrm.webp','flowers.webp','fern.webp','water_nrm.webp']})
