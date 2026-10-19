# Procedural PBR packs (colour / normal / roughness) — stand-ins for real scanned packs.
import numpy as np
from PIL import Image
rng=np.random.default_rng(7)
N=1024
def fbm(n, octaves=6, base=4, seed=0):
    r=np.random.default_rng(seed); out=np.zeros((n,n)); amp=1.0; tot=0
    for o in range(octaves):
        f=base*2**o
        g=r.random((f+1,f+1))
        # tileable: wrap the last row/col
        g[-1,:]=g[0,:]; g[:,-1]=g[:,0]
        x=np.linspace(0,f,n,endpoint=False); xi=x.astype(int); xf=x-xi; xf=xf*xf*(3-2*xf)
        a=g[np.ix_(xi,xi)]; b=g[np.ix_(xi,xi+1)]; c=g[np.ix_(xi+1,xi)]; d=g[np.ix_(xi+1,xi+1)]
        X=xf[None,:]; Y=xf[:,None]
        v=a*(1-X)*(1-Y)+b*X*(1-Y)+c*(1-X)*Y+d*X*Y
        out+=v*amp; tot+=amp; amp*=.5
    return out/tot
def normal_from_height(h, strength=4.0):
    gx=(np.roll(h,-1,1)-np.roll(h,1,1))*strength; gy=(np.roll(h,-1,0)-np.roll(h,1,0))*strength
    nz=np.ones_like(h); l=np.sqrt(gx*gx+gy*gy+nz*nz)
    n=np.stack([-gx/l,gy/l,nz/l],-1)            # OpenGL style (y up)
    return ((n*.5+.5)*255).astype(np.uint8)
def save(name, arr, q=86):
    Image.fromarray(arr).save('tex/'+name+'.jpg', quality=q)
def to8(x): return (np.clip(x,0,1)*255).astype(np.uint8)

# --- concrete: mottled grey, stains, hairline cracks, pitting
h=fbm(N,7,4,1); st=fbm(N,5,2,2); pits=(rng.random((N,N))>.9975).astype(float)
from PIL import ImageFilter
pitimg=Image.fromarray(to8(pits)).filter(ImageFilter.GaussianBlur(1.2)); pits=np.asarray(pitimg)/255.
cr=np.abs(fbm(N,6,3,3)-.5); cracks=np.clip(1-cr*120,0,1)*(fbm(N,3,2,9)>.6)
height=h*.6+st*.25-pits*1.2-cracks*.15
col=.30+ (h-.5)*.2 + (st-.5)*.26 - cracks*.05 - pits*.2
rgb=np.stack([col*1.0,col*.99,col*.95],-1)
save('concrete_col',to8(rgb)); save('concrete_nrm',normal_from_height(height,6)); save('concrete_rgh',to8(.55+ (st-.5)*.7 - cracks*.2))

# --- brick: running bond, mortar recessed, per-brick tint
y,x=np.mgrid[0:N,0:N]/N
rows=8; bw=4
ry=(y*rows); row=np.floor(ry).astype(int); fx=(x*bw+ (row%2)*.5)%1; fy=ry%1
mort=((fx<.035)|(fx>.965)|(fy<.06)|(fy>.94)).astype(float)
bid=(row*13+np.floor(x*bw+(row%2)*.5).astype(int)*7)%17
tint=(bid/17.)
n2=fbm(N,6,8,4)
brickc=np.stack([.26+tint*.07+(n2-.5)*.14, .12+tint*.03+(n2-.5)*.07, .09+(n2-.5)*.05],-1)
mortc=np.stack([.32+(n2-.5)*.08]*3,-1)*np.array([1,.97,.92])
rgb=brickc*(1-mort[...,None])+mortc*mort[...,None]
height=(1-mort)*.6+n2*.4
save('brick_col',to8(rgb)); save('brick_nrm',normal_from_height(height,5)); save('brick_rgh',to8(.75+mort*.15-(n2-.5)*.2))

# --- rusted metal: steel panels, rust blooms, rivets
r1=fbm(N,6,3,5); r2=fbm(N,7,6,6)
rust=np.clip((r1-.45)*3+ (r2-.5)*1.2,0,1)
steel=np.stack([.36+(r2-.5)*.1]*3,-1)*np.array([.95,.97,1])
rustc=np.stack([.38+(r2-.5)*.15,.17+(r2-.5)*.08,.08+(r2-.5)*.04],-1)
rgb=steel*(1-rust[...,None])+rustc*rust[...,None]
seam=(((x*2)%1<.006)|((y*2)%1<.006)).astype(float)
riv=np.zeros((N,N))
for cx in np.linspace(.03,.97,12):
    for cy in (0.03,0.47,0.53,0.97):
        riv+=np.exp(-(((x-cx)**2+(y-cy)**2)/(2*.004**2)))
height=r2*.25+rust*.35-seam*.6+np.clip(riv,0,1)*.8
rgb=rgb*(1-seam[...,None]*.6)
save('metal_col',to8(rgb)); save('metal_nrm',normal_from_height(height,5)); save('metal_rgh',to8(.35+rust*.55))
print('ok')
