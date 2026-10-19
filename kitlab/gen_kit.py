# Kit Lab v1 textures: realistic road + forest (procedural, tileable, same colour/normal/roughness shape as the room packs)
import numpy as np, sys, math
from PIL import Image, ImageFilter, ImageDraw
from scipy.spatial import cKDTree
exec(open('../moodlab/gen_tex.py').read().split('# --- concrete')[0])
OUT='tex'
def sv(name, arr, q=88): Image.fromarray(arr).save(OUT+'/'+name+'.jpg', quality=q)
def blur(a,r): return np.asarray(Image.fromarray(to8(np.clip(a,0,1))).filter(ImageFilter.GaussianBlur(r)))/255.
N=1024; y,x=np.mgrid[0:N,0:N]/N
def voro2(n_pts, seed, w1, w2, ws):
    r=np.random.default_rng(seed); P=r.random((n_pts,2)); t=cKDTree(P, boxsize=1.0)
    wx=(fbm(N,4,3,ws)-.5)*w1*2+(fbm(N,4,24,ws+2)-.5)*w2*2; wy=(fbm(N,4,3,ws+1)-.5)*w1*2+(fbm(N,4,24,ws+3)-.5)*w2*2
    Q=np.stack([(x+wx)%1,(y+wy)%1],-1).reshape(-1,2); d,i=t.query(Q,k=2); d=d.reshape(N,N,2)
    return d[...,1]-d[...,0]
R=np.random.default_rng(5)
# ---------- asphalt (one tile = 4 m): aggregate grain, tar patches, fine cracks, oil stains
agg=fbm(N,3,180,1); agg2=fbm(N,3,90,2); base=fbm(N,6,3,3)
stones=(R.random((N,N))>.985).astype(float); stones=blur(stones,.9)
cr=voro2(9,7,.07,.006,20); crack=np.clip(1-cr/.0022,0,1)*np.clip((fbm(N,4,2,21)-.45)*4,0,1)
patch=np.clip((fbm(N,4,2,30)-.62)*9,0,1)
oil=np.clip((fbm(N,5,3,40)-.6)*5,0,1)*.7
col=.16+(base-.5)*.07+(agg-.5)*.10+(agg2-.5)*.05+stones*.12-crack*.07-patch*.035-oil*.05
rgb=np.stack([col,col*1.0,col*1.03],-1)
h=agg*.5+agg2*.3+stones*.6-crack*1.2-patch*.05
sv('asphalt_col',to8(rgb)); sv('asphalt_nrm',normal_from_height(h,3.2))
sv('asphalt_rgh',to8(.80+(agg-.5)*.25-oil*.35-patch*.08+crack*.1))
# ---------- sidewalk slabs (one tile = 3 m wide, slabs 1.5 m): concrete + seams + wear
c=fbm(N,7,4,51); g=fbm(N,3,64,52); st=fbm(N,5,2,53)
u=(x*2)%1; v=(y*2)%1
seam=np.clip(1-np.minimum(np.minimum(u,1-u),np.minimum(v,1-v))/.006,0,1)
slab=(np.floor(x*2)+np.floor(y*2)*2).astype(int); tint=np.array([0,.035,-.025,.02])[slab%4]
cr2=voro2(6,61,.05,.004,62); fine=np.clip(1-cr2/.0016,0,1)*np.clip((fbm(N,4,2,63)-.55)*5,0,1)
col=.50+(c-.5)*.16+(g-.5)*.05+(st-.5)*.12+tint-seam*.20-fine*.12
rgb=np.stack([col,col*.985,col*.95],-1)
h=c*.25+g*.15-seam*1.0-fine*.5
sv('slab_col',to8(rgb)); sv('slab_nrm',normal_from_height(h,4)); sv('slab_rgh',to8(.78+(st-.5)*.2+seam*.1))
# ---------- curb stone (granite)
gr=fbm(N,3,140,71); sp=(R.random((N,N))>.96).astype(float)*.6+(R.random((N,N))>.995)*.8; sp=blur(sp,.6)
col=.46+(gr-.5)*.14+sp*.18-(fbm(N,5,3,72)-.5)*.1
sv('curb_col',to8(np.stack([col,col*.99,col*.97],-1))); sv('curb_nrm',normal_from_height(gr*.3+sp*.2,2.5))
# ---------- forest floor (one tile = 8 m): grass with dirt + moss patches, leaf litter
g1=fbm(N,4,96,81); g2=fbm(N,3,200,82); big=fbm(N,5,2,83); mid=fbm(N,5,6,84)
dirt=np.clip((big*.7+mid*.3-.52)*4,0,1); moss=np.clip((fbm(N,5,4,85)-.55)*4,0,1)*(1-dirt)
lit=(R.random((N,N))>.993).astype(float); lit=blur(lit,1.2)*(dirt*.7+.3)
G=np.stack([.20+(g1-.5)*.12+(g2-.5)*.08, .34+(g1-.5)*.16+(g2-.5)*.10, .13+(g1-.5)*.06],-1)
G=G*(1+(mid[...,None]-.5)*.5)
D=np.stack([.30,.23,.16],-1)+((fbm(N,4,60,86)-.5)*.10)[...,None]
Mo=np.stack([.17,.29,.08],-1)+((fbm(N,4,80,87)-.5)*.06)[...,None]
col=G*(1-dirt[...,None])+D*dirt[...,None]; col=col*(1-moss[...,None]*.6)+Mo*moss[...,None]*.6
col=col+lit[...,None]*np.array([.20,.08,-.02])
h=g1*.35+g2*.35-dirt*.15+lit*.3
sv('ground_col',to8(col)); sv('ground_nrm',normal_from_height(h,3.5)); sv('ground_rgh',to8(.88-moss*.1))
# ---------- bark (wraps a trunk; vertical streaks)
M=512; yy,xx=np.mgrid[0:M,0:M]/M
s1=fbm(M,5,8,91); s2=fbm(M,4,40,92)
str_=np.abs(np.sin((xx*14+s1*2.2)*math.pi))**.6
col=.20+(s2-.5)*.12+str_*.10
bark=np.stack([col*1.05,col*.86,col*.68],-1)
Image.fromarray(to8(bark)).save(OUT+'/bark_col.jpg',quality=88)
Image.fromarray(normal_from_height(str_*.6+s2*.4,5)).save(OUT+'/bark_nrm.jpg',quality=88)
# ---------- rock with moss on top (uv v = up)
r1=fbm(M,6,6,101); r2=fbm(M,3,60,102)
mossr=np.clip((1-yy)*1.4-.55+(fbm(M,4,5,103)-.5)*.8,0,1)
rc=np.stack([.30+(r1-.5)*.2+(r2-.5)*.08]*3,-1)*np.array([1,.98,.95])
mc=np.stack([.18,.30,.09],-1)+((r2-.5)*.06)[...,None]
rock=rc*(1-mossr[...,None])+mc*mossr[...,None]
Image.fromarray(to8(rock)).save(OUT+'/rock_col.jpg',quality=88)
Image.fromarray(normal_from_height(r1*.6+r2*.4,5)).save(OUT+'/rock_nrm.jpg',quality=88)
# ---------- leaf cluster card (alpha)
S=512; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
rr=np.random.default_rng(11)
for k in range(0): a=-1.2+k*.3; d.line([(S*.5,S*(.9-k*.07)),(S*.5+math.sin(a)*S*.35,S*(.9-k*.07)-math.cos(a)*S*.22)],fill=(70,52,34,255),width=3)
for i in range(1100):
    cx=S*.5+rr.normal(0,S*.17); cy=S*.47+rr.normal(0,S*.17)
    if (cx-S*.5)**2+(cy-S*.47)**2>(S*.45)**2: continue
    L=rr.uniform(18,34); W=L*.42; a=rr.uniform(0,math.pi*2)
    pts=[(cx+math.cos(a+t)*L*(.5 if abs(t)<.01 else 1)*math.cos(t)-math.sin(a)*W*math.sin(t)*0, 0) for t in [0]]
    poly=[]
    for t in np.linspace(0,2*math.pi,14):
        px=math.cos(t)*L/2; py=math.sin(t)*W/2*(1-.3*math.cos(t))
        poly.append((cx+px*math.cos(a)-py*math.sin(a), cy+px*math.sin(a)+py*math.cos(a)))
    sh=rr.uniform(.75,1.15); gcol=(int(55*sh),int(100*sh+rr.uniform(-10,15)),int(38*sh),255)
    d.polygon(poly,fill=gcol)
    d.line([poly[0],poly[7]],fill=(int(40*sh),int(80*sh),int(30*sh),255),width=1)
im.save(OUT+'/leaves.png')
# ---------- grass tuft card (alpha)
S=256; im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
for i in range(70):
    x0=S*.5+rr.normal(0,S*.12); h0=rr.uniform(.45,.98)*S; bend=rr.normal(0,S*.10); w=rr.uniform(2,4.5)
    sh=rr.uniform(.7,1.2); c=(int(70*sh),int(120*sh),int(40*sh),255)
    pts=[(x0-w,S),(x0+bend*.5,S-h0*.55),(x0+bend,S-h0),(x0+bend*.5+1,S-h0*.55),(x0+w,S)]
    d.polygon(pts,fill=c)
im.save(OUT+'/tuft.png')
# ---------- worn road paint (alpha): white with scuffs
S=512; a=fbm(S,4,24,121)*.6+fbm(S,3,90,122)*.4
alpha=np.clip((a-.18)*4.5,0,1)
im=np.dstack([np.full((S,S),235),np.full((S,S),232),np.full((S,S),214),to8(alpha)]).astype(np.uint8)
Image.fromarray(im).save(OUT+'/paint.png')
print('kit textures ok')
