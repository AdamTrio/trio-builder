# v55 candidates: cracked concrete + peeling paint (procedural, tileable, same 3-map shape as the others)
import numpy as np, sys
from PIL import Image, ImageFilter
from scipy.spatial import cKDTree
exec(open('gen_tex.py').read().split('# --- concrete')[0])   # fbm, normal_from_height, to8
OUT=sys.argv[1] if len(sys.argv)>1 else 'tex'
def save2(name, arr, q=86): Image.fromarray(arr).save(OUT+'/'+name+'.jpg', quality=q)
N=1024; y,x=np.mgrid[0:N,0:N]/N
def voro(n_pts, seed, warp=.035, wseed=0):
    r=np.random.default_rng(seed); P=r.random((n_pts,2))
    t=cKDTree(P, boxsize=1.0)
    wx=(fbm(N,5,4,wseed)-.5)*warp*2; wy=(fbm(N,5,4,wseed+1)-.5)*warp*2
    Q=np.stack([(x+wx)%1,(y+wy)%1],-1).reshape(-1,2)
    d,i=t.query(Q,k=2); d=d.reshape(N,N,2); i=i.reshape(N,N,2)
    return d[...,1]-d[...,0], i[...,0]
# ---------- cracked: worn concrete with long jagged cracks that branch and die out
def voro2(n_pts, seed, w1, w2, ws):
    r=np.random.default_rng(seed); P=r.random((n_pts,2)); t=cKDTree(P, boxsize=1.0)
    wx=(fbm(N,4,3,ws)-.5)*w1*2+(fbm(N,4,24,ws+2)-.5)*w2*2; wy=(fbm(N,4,3,ws+1)-.5)*w1*2+(fbm(N,4,24,ws+3)-.5)*w2*2
    Q=np.stack([(x+wx)%1,(y+wy)%1],-1).reshape(-1,2); d,i=t.query(Q,k=2); d=d.reshape(N,N,2)
    return d[...,1]-d[...,0]
base=fbm(N,8,4,11); st=fbm(N,5,2,12); grain=fbm(N,3,64,13)
e1=voro2(14,21,.06,.006,30)
keep=np.clip((fbm(N,4,2,33)-.38)*5,0,1)                            # cracks run out in places
big=np.clip(1-e1/(.0035+.0035*fbm(N,3,6,34)),0,1)**1.3*keep
e2=voro2(45,22,.05,.005,40)
mid=np.clip(1-e2/.0018,0,1)*np.clip((fbm(N,4,3,41)-.5)*5,0,1)       # thinner branches, only some
pits=(np.random.default_rng(9).random((N,N))>.9993).astype(float)
pits=np.asarray(Image.fromarray(to8(pits)).filter(ImageFilter.GaussianBlur(1.6)))/255.
height=base*.55+st*.2+grain*.06-big*1.0-mid*.45-pits*.6
col=.30+(base-.5)*.26+(st-.5)*.28+(grain-.5)*.05
dirt=np.asarray(Image.fromarray(to8(np.clip(big+mid*.5,0,1))).filter(ImageFilter.GaussianBlur(6)))/255.
col=col-dirt*.08-big*.18-mid*.08-pits*.12
rgb=np.stack([col,col*.985,col*.95],-1)
save2('cracked_col',to8(rgb)); save2('cracked_nrm',normal_from_height(height,6)); save2('cracked_rgh',to8(.62+(st-.5)*.6+big*.25))
# ---------- peeling paint: dark painted wall, small ragged chips showing the raw concrete under it
c=fbm(N,7,4,51); s2=fbm(N,5,3,52)
m=fbm(N,5,6,53)*.55+fbm(N,4,20,54)*.3+fbm(N,3,60,55)*.15
wear=fbm(N,4,2,56)                                                 # some areas worn far more
mm=m-(wear-.5)*.35; paint=(mm<np.percentile(mm,74)).astype(float)                # ~3/4 still painted
paint=1-np.clip(1-paint,0,1)
paint=np.asarray(Image.fromarray(to8(paint)).filter(ImageFilter.GaussianBlur(.7)))/255.
edge=np.clip(1-np.abs(paint-.5)*2.2,0,1)
under=.34+(c-.5)*.24
pc=.11+(s2-.5)*.05+(fbm(N,3,40,57)-.5)*.02
colv=under*(1-paint)+pc*paint
rgb=np.stack([colv,colv*.99,colv*.97],-1)
height=c*.35+paint*.3+edge*.14
save2('paint_col',to8(rgb)); save2('paint_nrm',normal_from_height(height,6)); save2('paint_rgh',to8(.72-paint*.28+(s2-.5)*.3))
print('ok')
# ---------- v59.1 glossy: polished dark stone — faint cloudy veins, near-mirror finish
c=fbm(N,7,3,81); v=np.abs(fbm(N,6,4,82)-.5); vein=np.clip(1-v*16,0,1)*np.clip((fbm(N,4,2,83)-.35)*3,0,1)
col=.075+(c-.5)*.05+vein*.09
rgb=np.stack([col*1.0,col*.98,col*1.04],-1)
height=c*.04+vein*.02
save2('gloss_col',to8(rgb)); save2('gloss_nrm',normal_from_height(height,1.2)); save2('gloss_rgh',to8(.10+(fbm(N,4,3,84)-.5)*.10+vein*.05))
print('gloss ok')
