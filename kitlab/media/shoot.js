// Media-in-the-world mock (10/17): jumbotron, building projection, hologram cube, drive-in, water screen, moon screen, fan-board wall.
// Renders inside the builder page (THREE + Realistic kit + coded houses). Screen content = frames of the KATSEYE × TRIO teaser.
const { chromium } = require('playwright'); const fs=require('fs');
const F=['f0.5','f2','f3.5','f4.8','g1.2','g2.6','g4.2','g5.4'].map(n=>'data:image/jpeg;base64,'+fs.readFileSync('out/media/'+n+'.jpg').toString('base64'));
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
    /* A · JUMBOTRON on truss towers over a plaza crowd */
    { const S=base(grid('C04R','N04R','lawn','C01R','lawn'));
      const sw=16, sh=9, y0=6; [-1,1].forEach(s=>{ const x=s*(sw/2+.9); for(let k=0;k<4;k++){ box(S,.12,y0+sh+2,.12,steel,x+(k%2?.5:-.5),0,-12+(k<2?.5:-.5)); } for(let y=1;y<y0+sh+2;y+=1.2) box(S,1.1,.06,1.1,steel,x,y,-12); });
      box(S,sw+3.2,.5,1,steel,0,y0+sh+1.6,-12); box(S,sw+.8,sh+.8,.6,black,0,y0-.4,-12.2);
      const scr=new T.Mesh(new T.PlaneGeometry(sw,sh),screenM(1)); scr.position.set(0,y0+sh/2,-11.88); S.add(scr);
      const led=new T.MeshBasicMaterial({color:0xb48cff,toneMapped:false}); box(S,sw+.9,.12,.1,led,0,y0-.48,-11.85); box(S,sw+.9,.12,.1,led,0,y0+sh+.36,-11.85);
      [-1,1].forEach(s=>{ for(let k=0;k<3;k++) box(S,1.6,1.3,1.4,black,s*12,k*1.3,-10.5); });
      box(S,18,1.2,6,new T.MeshStandardMaterial({color:0x1b1a22,roughness:.7}),0,0,-9.5);
      const pl=new T.PointLight(0x8fb4ff,9,40,1.6); pl.position.set(0,y0+sh/2,-6); S.add(pl); halo(S,0,y0+sh/2,-12.5,30,0x7aa8ff,.35);
      crowd(S,0,4,220,7,1); out.jumbotron=shoot(S,[0,4.2,22],[0,9,-12],50); }
    /* B · PROJECTION onto a house front (projector on a tripod in the street) */
    { const S=base([['lawn',0,0],['lawn',-16,0],['lawn',16,0],['C01R',0,16,Math.PI/2],['C01R',-16,16,Math.PI/2],['C01R',16,16,Math.PI/2],['N03R',0,-16],['N04R',-16,-16],['N03R',16,-16]]);
      const hs=H.build('suburban',{walls:{t:'siding',c:'#e9ecef'},roof:{t:'shingles',c:'#3d3f46'},trim:'#ffffff',door:'#2a2a2a',glow:{on:false}}); hs.position.set(0,0,-2); S.add(hs);
      const pr=new T.Mesh(new T.PlaneGeometry(10.2,6.2),screenM(2,{transparent:true,opacity:.9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4})); pr.position.set(0,.5+3.1,-2+4.16); S.add(pr);
      const tri=new T.Group(); tri.position.set(1,0,12); [0,2.1,4.2].forEach(a=>{ const l=new T.Mesh(new T.CylinderGeometry(.03,.03,1.6,6),steel); l.position.set(Math.cos(a)*.35,.75,Math.sin(a)*.35); l.rotation.set(Math.sin(a)*.25,0,-Math.cos(a)*.25); tri.add(l); });
      const pj=new T.Mesh(new T.BoxGeometry(.6,.35,.7),black); pj.position.y=1.65; tri.add(pj); S.add(tri);
      const cone=new T.Mesh(new T.ConeGeometry(5.5,14,4,1,true),new T.MeshBasicMaterial({color:0xbfd4ff,transparent:true,opacity:.07,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
      cone.position.set(.5,2.6,5); cone.lookAt(1,1.65,12); cone.rotateX(-Math.PI/2); cone.rotation.z+=Math.PI/4; S.add(cone);
      const pl=new T.PointLight(0xbfd4ff,1.2,12,1.6); pl.position.set(0,3,5); S.add(pl);
      out.projection=shoot(S,[-9,3.6,16],[0,3.6,-1],46); }
    /* C · HOLOGRAM CUBE floating over the crossroads */
    { const S=base(grid('C04R','N04R','lawn','C01R'));
      const cube=new T.Group(); cube.position.set(0,10,0); cube.rotation.y=.62;
      [[0,0],[1,Math.PI/2],[2,Math.PI],[3,-Math.PI/2]].forEach(([i,a])=>{ const f=new T.Mesh(new T.PlaneGeometry(6,6),screenM(i+4)); f.position.set(Math.sin(a)*3,0,Math.cos(a)*3); f.rotation.y=a; cube.add(f); });
      const eg=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(6.05,6.05,6.05)),new T.LineBasicMaterial({color:0x7ef9ff})); cube.add(eg); S.add(cube);
      const beam=new T.Mesh(new T.CylinderGeometry(.4,2.2,7,24,1,true),new T.MeshBasicMaterial({color:0x7ef9ff,transparent:true,opacity:.18,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide})); beam.position.set(0,3.5,0); S.add(beam);
      const ring=new T.Mesh(new T.TorusGeometry(2.3,.08,8,48),new T.MeshBasicMaterial({color:0x7ef9ff,toneMapped:false})); ring.rotation.x=Math.PI/2; ring.position.y=.08; S.add(ring);
      halo(S,0,10,0,22,0x7ef9ff,.3); const pl=new T.PointLight(0x9fe8ff,6,30,1.6); pl.position.set(0,7,0); S.add(pl);
      crowd(S,0,0,90,9,0); out.hologram=shoot(S,[14,5,20],[0,8,0],52); }
    /* D · DRIVE-IN screen in a meadow, string lights, parked cars */
    { const S=base(grid('lawn','N04R','lawn','lawn','lawn'),[['#04040c',0],['#151a3a',.75],['#2c2648',1]]);
      const sw=20, sh=9; [-1,1].forEach(s=>box(S,.4,sh+3,.4,steel,s*(sw/2-.5),0,-14)); box(S,sw+.6,sh+.6,.3,new T.MeshStandardMaterial({color:0xdedede}),0,2.7,-14.1);
      const scr=new T.Mesh(new T.PlaneGeometry(sw,sh),screenM(0)); scr.position.set(0,3+sh/2,-13.9); S.add(scr); halo(S,0,7.5,-14.5,34,0x9ad0ff,.25);
      const carM=['#7a2232','#2c4f7a','#d9d4c8','#2b2b30','#3e6a4a','#c79a3a'].map(c=>new T.MeshStandardMaterial({color:c,metalness:.6,roughness:.35})), glass=new T.MeshStandardMaterial({color:0x0b0e14,metalness:.5,roughness:.1});
      [[-7,4],[-2.4,4.5],[2.4,4.2],[7,4.6],[-4.6,10],[0,10.4],[4.6,10.1]].forEach(([x,z],i)=>{ const c=new T.Group(); c.position.set(x,0,z); c.rotation.y=(Math.random()-.5)*.1;
        const b1=new T.Mesh(new T.BoxGeometry(1.9,.7,4.3),carM[i%6]); b1.position.y=.65; c.add(b1); const b2=new T.Mesh(new T.BoxGeometry(1.7,.6,2.2),glass); b2.position.set(0,1.28,.2); c.add(b2);
        [[-.85,1.4],[.85,1.4],[-.85,-1.4],[.85,-1.4]].forEach(([wx,wz])=>{ const w=new T.Mesh(new T.CylinderGeometry(.36,.36,.25,14),black); w.rotation.z=Math.PI/2; w.position.set(wx,.36,wz); c.add(w); });
        c.traverse(o=>{ if(o.isMesh) o.castShadow=true; }); S.add(c); });
      const bulbM=new T.MeshBasicMaterial({color:0xffd59a,toneMapped:false}); [-12,12].forEach(x=>box(S,.12,5,.12,steel,x,0,8)); for(let k=0;k<=30;k++){ const t=k/30, x=-12+24*t, y=5-Math.sin(t*Math.PI)*1.2; const bl=new T.Mesh(new T.SphereGeometry(.09,8,6),bulbM); bl.position.set(x,y,8); S.add(bl); halo(S,x,y,8,1,0xffc887,.6); }
      const pl=new T.PointLight(0x9ad0ff,6,40,1.4); pl.position.set(0,7,-8); S.add(pl);
      out.drivein=shoot(S,[3,3.2,20],[0,5.5,-12],50); }
    /* E · WATER SCREEN — a mist sheet over the pond with the video on it */
    { const S=base(grid('N10R','N04R','lawn','N03R'));
      const c=document.createElement('canvas'); c.width=256; c.height=128; const x=c.getContext('2d'), g=x.createRadialGradient(128,64,10,128,64,128); g.addColorStop(0,'#fff'); g.addColorStop(.7,'#bbb'); g.addColorStop(1,'#000'); x.fillStyle=g; x.fillRect(0,0,256,128); const am=new T.CanvasTexture(c);
      const scr=new T.Mesh(new T.PlaneGeometry(8.5,4.6),screenM(6,{transparent:true,alphaMap:am,opacity:.95,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide})); scr.position.set(0,3.2,0); S.add(scr);
      const jm=new T.MeshBasicMaterial({color:0xcfe8ff,transparent:true,opacity:.35,blending:T.AdditiveBlending,depthWrite:false}); for(let k=0;k<22;k++){ const j=new T.Mesh(new T.CylinderGeometry(.03,.06,1+Math.random()*.6,6),jm); j.position.set(-4.2+k*.4,.6,0); S.add(j); }
      const mist=new T.Mesh(new T.PlaneGeometry(10,6),new T.MeshBasicMaterial({color:0x9fc8ff,transparent:true,opacity:.08,alphaMap:am,blending:T.AdditiveBlending,depthWrite:false})); mist.position.set(0,3,-.1); S.add(mist);
      const pl=new T.PointLight(0x9ad0ff,2.5,12,1.6); pl.position.set(0,2.6,2.5); S.add(pl);
      out.water=shoot(S,[3,2.6,11],[0,2.6,0],50); }
    /* F · MOON SCREEN — the video plays on a giant moon over the forest */
    { const S=base(grid('N01R','N04R','lawn','N03R'),[['#020208',0],['#0d0f26',.8],['#1c1b3b',1]]);
      const mg=new T.CircleGeometry(30,64); const moon=new T.Mesh(mg,screenM(3,{fog:false})); moon.position.set(0,44,-110); S.add(moon);
      const rim=new T.Mesh(new T.RingGeometry(30,31.4,64),new T.MeshBasicMaterial({color:0xe8eeff,toneMapped:false,fog:false})); rim.position.copy(moon.position); rim.position.z+=.1; S.add(rim);
      const sp=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xaecbff,transparent:true,opacity:.35,blending:T.AdditiveBlending,depthWrite:false,fog:false})); sp.position.set(0,44,-111); sp.scale.set(150,150,1); S.add(sp);
      out.moon=shoot(S,[0,2.2,20],[0,22,-80],58); }
    /* G · FAN BOARD wall — your own board, shown big in a plaza (placeholder picture of posts) */
    { const S=base(grid('C04R','N04R','lawn','C01R'));
      const c=document.createElement('canvas'); c.width=1600; c.height=900; const x=c.getContext('2d'); x.fillStyle='#0f0d18'; x.fillRect(0,0,1600,900); x.fillStyle='#f5d400'; x.font='800 64px Helvetica'; x.fillText('FAN BOARD',60,100); x.fillStyle='#9c94bd'; x.font='600 30px Helvetica'; x.fillText('your board — live from your site',60,145);
      const cols=['#ff6fb1','#7ef9ff','#f5d400','#b48cff','#8bf5a6','#ff9a5c']; for(let i=0;i<12;i++){ const cx=60+(i%4)*385, cy=190+Math.floor(i/4)*235; x.fillStyle='#1d1a2b'; x.fillRect(cx,cy,360,210);
        x.fillStyle=cols[i%6]; x.beginPath(); x.arc(cx+40,cy+42,22,0,7); x.fill(); x.fillStyle='#e8e4f7'; x.font='700 26px Helvetica'; x.fillText(['@luna','@kai','@mira','@jojo','@sol','@remy'][i%6],cx+76,cy+52);
        x.fillStyle='#bdb5dc'; x.font='500 22px Helvetica'; ['this drop is insane','who else is here rn?','see you at the show','best room yet','pls play it again','first!!'].slice(i%3,i%3+2).forEach((t,k)=>x.fillText(t,cx+24,cy+110+k*36)); x.fillStyle=cols[(i+2)%6]; x.fillText('♥ '+(12+i*7),cx+24,cy+190); }
      const bt=new T.CanvasTexture(c); bt.colorSpace=T.SRGBColorSpace;
      const fr=box(S,16.8,9.8,.5,black,0,1.6,-6); const scr=new T.Mesh(new T.PlaneGeometry(16,9),new T.MeshBasicMaterial({map:bt,toneMapped:false})); scr.position.set(0,6.5,-5.73); S.add(scr);
      [-1,1].forEach(s=>box(S,.5,1.6,.5,steel,s*7,0,-6)); const led=new T.MeshBasicMaterial({color:0xf5d400,toneMapped:false}); box(S,16.9,.1,.1,led,0,1.62,-5.7); box(S,16.9,.1,.1,led,0,11.3,-5.7);
      halo(S,0,6.5,-6.4,26,0xb48cff,.25); const pl=new T.PointLight(0xc6b4ff,5,30,1.6); pl.position.set(0,6,0); S.add(pl);
      crowd(S,0,8,60,6,0); out.board=shoot(S,[5,3.4,22],[0,6.2,-6],48); }
    return out; },F);
  for(const k in shots) fs.writeFileSync('out/media/'+k+'.jpg',Buffer.from(shots[k].split(',')[1],'base64'));
  console.log('errors',errs.slice(0,4)); await b.close();
})();
