// Media-in-the-world mock (10/17): jumbotron, building projection, hologram cube, drive-in, water screen, moon screen, fan-board wall.
// Renders inside the builder page (THREE + Realistic kit + coded houses). Screen content = frames of the KATSEYE × TRIO teaser.
const { chromium } = require('playwright'); const fs=require('fs');
const F=['p1.5','p3.8'].map(n=>'data:image/jpeg;base64,'+fs.readFileSync('out/media/'+n+'.jpg').toString('base64'));
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&window.HEXCORE.WORLD,null,{timeout:90000}); await p.waitForTimeout(1500);
  await p.addScriptTag({content:fs.readFileSync('kitlab/houses/houses.js','utf8')});
  const shots=await p.evaluate(async F=>{ const T=THREE, W=window.HEXCORE.WORLD, H=window.TRIOHOUSE, V3=T.Vector3;
    ['C01R','C04R','N01R','N03R','N04R','N10R'].forEach(id=>W.buildPiece(id)); H.preload(); await W.texReady(); await H.ready();
    const TL=new T.TextureLoader(); const VID=await Promise.all(F.map(u=>new Promise(r=>TL.load(u,t=>{ t.colorSpace=T.SRGBColorSpace; r(t); }))));
    const R=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.ACESFilmicToneMapping; R.toneMappingExposure=1.05; R.shadowMap.enabled=true; R.setSize(1280,720);
    const screenM=(i,o)=>new T.MeshBasicMaterial(Object.assign({map:VID[i%VID.length],toneMapped:false},o||{}));
    const glowTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'), g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(0,0,128,128); return new T.CanvasTexture(c); })();
    const halo=(S,x,y,z,s,c,o)=>{ const sp=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:c,transparent:true,opacity:o||.5,blending:T.AdditiveBlending,depthWrite:false})); sp.position.set(x,y,z); sp.scale.set(s,s*.7,1); S.add(sp); };
    const box=(S,w,h,d,m,x,y,z)=>{ const o=new T.Mesh(new T.BoxGeometry(w,h,d),m); o.position.set(x,y+h/2,z); o.castShadow=o.receiveShadow=true; S.add(o); return o; };
    const steel=new T.MeshStandardMaterial({color:0x2a2c33,metalness:.8,roughness:.4}), black=new T.MeshStandardMaterial({color:0x111114,roughness:.6});
    const base=(pieces,sky)=>{ const S=new T.Scene(); const c=document.createElement('canvas'); c.width=4; c.height=256; const x=c.getContext('2d'), g=x.createLinearGradient(0,0,0,256);
      (sky||[['#05040e',0],['#1d1838',.8],['#3a2a55',1]]).forEach(([col,t])=>g.addColorStop(t,col)); x.fillStyle=g; x.fillRect(0,0,4,256); const bt=new T.CanvasTexture(c); bt.colorSpace=T.SRGBColorSpace; S.background=bt; S.fog=new T.Fog(0x1a1630,50,160);
      S.add(new T.HemisphereLight(0x6a76b8,0x231c18,.55)); const d=new T.DirectionalLight(0x9fb0e8,.7); d.position.set(-20,30,20); d.castShadow=true; d.shadow.mapSize.set(2048,2048); const sc=d.shadow.camera; sc.left=-40; sc.right=40; sc.top=40; sc.bottom=-40; S.add(d);
      pieces.forEach(([id,x,z,r])=>{ if(id==='lawn'){ const pg=new T.PlaneGeometry(16,16); pg.rotateX(-Math.PI/2); const uv=pg.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*2,uv.getY(i)*2); const m=new T.Mesh(pg,W.realMat().ground); m.position.set(x,0,z); m.receiveShadow=true; S.add(m); return; } const g=W.buildPiece(id); g.position.set(x,0,z); g.rotation.y=r||0; g.traverse(o=>{ if(o.isMesh){ o.receiveShadow=true; o.castShadow=true; } }); S.add(g); }); return S; };
    const grid=(c,back,front,side,bc)=>{ const out=[[c,0,0,0]]; [-1,0,1].forEach(i=>{ out.push([(i===0&&bc)?bc:back,i*16,-16,0]); out.push([front,i*16,16,0]); if(bc) out.push([back,i*16,-32,0]); }); out.push([side,-16,0,Math.PI/2]); out.push([side,16,0,Math.PI/2]); return out; };
    const crowd=(S,cx,cz,n,rad,face)=>{ const m=new T.MeshStandardMaterial({color:0x14121c,roughness:.8}), g=new T.CapsuleGeometry(.24,1.05,4,8), hd=new T.SphereGeometry(.17,10,8);
      const im=new T.InstancedMesh(g,m,n), ih=new T.InstancedMesh(hd,m,n), M=new T.Matrix4(); for(let i=0;i<n;i++){ const a=Math.random()*6.28, r=Math.sqrt(Math.random())*rad, x=cx+Math.cos(a)*r*1.6, z=cz+Math.sin(a)*r*.7, s=.9+Math.random()*.2;
        M.makeScale(s,s,s).setPosition(x,.8*s,z); im.setMatrixAt(i,M); M.makeScale(s,s,s).setPosition(x,1.72*s,z); ih.setMatrixAt(i,M); } S.add(im); S.add(ih); };
    const shoot=(S,pos,look,fov)=>{ const C=new T.PerspectiveCamera(fov||48,1280/720,.1,500); C.position.set(...pos); C.lookAt(...look); R.render(S,C); return R.domElement.toDataURL('image/jpeg',.88); };
    const out={};
    /* PORTRAIT TOWER: a tall 9:16 screen on a slim pylon for vertical clips */
    const tower=(S,x,z,ry,vi)=>{ const G=new T.Group(); G.position.set(x,0,z); G.rotation.y=ry||0; const sw=6.4, sh=sw*16/9, y0=4.2;
      const conc=new T.MeshStandardMaterial({color:0x6d6a72,roughness:.85}); const b=(w,h,d,m,px,py,pz)=>{ const o=new T.Mesh(new T.BoxGeometry(w,h,d),m); o.position.set(px,py+h/2,pz); o.castShadow=o.receiveShadow=true; G.add(o); return o; };
      b(4.2,.5,3,conc,0,0,0); b(1.4,y0,1,steel,0,.5,-.2); b(sw+.7,sh+.7,.7,black,0,y0-.35,-.35);
      const scr=new T.Mesh(new T.PlaneGeometry(sw,sh),screenM(vi)); scr.position.set(0,y0+sh/2,.02); G.add(scr);
      const led=new T.MeshBasicMaterial({color:0xff5fa2,toneMapped:false}); b(.1,sh+.8,.1,led,-(sw/2+.38),y0-.4,.02); b(.1,sh+.8,.1,led,(sw/2+.38),y0-.4,.02); b(sw+.86,.1,.1,led,0,y0+sh+.32,.02);
      b(sw+1.2,.3,1.1,steel,0,y0+sh+.45,-.3); const back=new T.Mesh(new T.PlaneGeometry(sw,sh),screenM(1-vi)); back.position.set(0,y0+sh/2,-.72); back.rotation.y=Math.PI; G.add(back);
      S.add(G); halo(S,x,y0+sh/2,z-1,18,0xff7ab8,.28); const pl=new T.PointLight(0xffb0d4,4,26,1.6); pl.position.set(x+Math.sin(ry||0)*5,y0+3,z+Math.cos(ry||0)*5); S.add(pl); };
    { const S=base(grid('C04R','N04R','lawn','C01R','lawn')); tower(S,0,-9,0,0); crowd(S,0,3,110,6,0); out.tower=shoot(S,[7,3,20],[0,9.5,-9],50); }
    { const S=base(grid('C04R','N04R','lawn','C01R','lawn')); tower(S,-7.5,-9,.25,0); tower(S,7.5,-9,-.25,1); crowd(S,0,2,140,7,0); out.towers=shoot(S,[0,2.2,22],[0,9.5,-9],52); }
    return out; },F);
  for(const k in shots) fs.writeFileSync('out/media/'+k+'.jpg',Buffer.from(shots[k].split(',')[1],'base64'));
  console.log('errors',errs.slice(0,4)); await b.close();
})();
