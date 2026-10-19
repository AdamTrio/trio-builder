/* Realistic kit batch 2 MOCK (10/17) — gothic + more nature, built from the Realistic kit's own materials. window.TRIOGOTH */
(function(){ const T=THREE, V3=T.Vector3, W=window.HEXCORE.WORLD, RM=W.realMat(); let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  const M=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.9,metalness:0},o||{}));
  const stone=M(0x6a6f76,{normalMap:RM.rock.normalMap,roughness:.95}), darkStone=M(0x44484e,{normalMap:RM.rock.normalMap,roughness:.95}), moss=M(0x4d5a3a,{map:RM.ground.map});
  const deadBark=M(0x4a423a,{map:RM.bark.map,normalMap:RM.bark.normalMap}), iron=M(0x1c1c20,{metalness:.75,roughness:.5});
  const mud=M(0x3b3428,{map:RM.dirt.map,normalMap:RM.dirt.normalMap}), swampW=new T.MeshStandardMaterial({color:0x1f2a1e,emissive:0x050805,roughness:.08,metalness:.2,normalMap:RM.water.normalMap,normalScale:new T.Vector2(.3,.3)});
  const reed=RM.tuft.clone(); reed.color=new T.Color(0x8a8a55);
  const leafTex=cols=>{ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); for(let i=0;i<70;i++){ x.fillStyle=cols[i%cols.length]; x.beginPath(); x.ellipse(14+Math.random()*100,14+Math.random()*100,5+Math.random()*7,3+Math.random()*4,Math.random()*3,0,6.3); x.fill(); } const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; return t; };
  const autumn=new T.MeshStandardMaterial({map:leafTex(['#e8892c','#f2b23a','#d9572a','#b8401f']),alphaTest:.5,side:T.DoubleSide,roughness:.8}); const autumn2=new T.MeshStandardMaterial({map:leafTex(['#c43a24','#e06a2a','#f0a23a','#8f2a1c']),alphaTest:.5,side:T.DoubleSide,roughness:.8});
  const birchLeaf=RM.leaves.clone(); birchLeaf.color=new T.Color(0xc7e07a);
  const birchBark=(()=>{ const c=document.createElement('canvas'); c.width=64; c.height=256; const x=c.getContext('2d'); x.fillStyle='#e9e6dc'; x.fillRect(0,0,64,256); x.fillStyle='#1d1d1d';
    for(let i=0;i<34;i++){ const y=Math.random()*256, w=6+Math.random()*24; x.fillRect(Math.random()*64,y,w,1+Math.random()*3); } const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; t.wrapS=t.wrapT=T.RepeatWrapping; return M(0xffffff,{map:t,roughness:.8}); })();
  const ground=(g,mat,y)=>{ const p=new T.PlaneGeometry(16,16); p.rotateX(-Math.PI/2); const uv=p.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*2,uv.getY(i)*2); const m=new T.Mesh(p,mat); m.position.y=y||0; m.receiveShadow=true; g.add(m); return m; };
  const mesh=(g,geo,m,x,y,z,ry)=>{ const o=new T.Mesh(geo,m); o.position.set(x,y,z); o.rotation.y=ry||0; o.castShadow=o.receiveShadow=true; g.add(o); return o; };
  function cards(g,mat,cx,cy,cz,r,n,size){ for(let i=0;i<n;i++){ const q=new T.PlaneGeometry(size,size); const a=rnd()*6.28, e=(rnd()-.3)*1.4, d=r*Math.cbrt(rnd()); q.rotateY(rnd()*3.14); q.rotateX((rnd()-.5)*.8);
    q.translate(cx+Math.cos(a)*Math.cos(e)*d, cy+Math.sin(e)*d*.8, cz+Math.sin(a)*Math.cos(e)*d); const o=new T.Mesh(q,mat); o.castShadow=true; g.add(o); } }
  function tree(g,x,z,s,leaf,bark,trunkR){ const h=(4.5+rnd()*1.5)*s; mesh(g,new T.CylinderGeometry((trunkR||.18)*s*.7,(trunkR||.18)*s,h,8),bark,x,h/2,z);
    cards(g,leaf,x,h*.95,z,1.9*s,40,1.5*s); cards(g,leaf,x+.4*s,h*.72,z-.3*s,1.5*s,22,1.4*s); }
  function deadTree(g,x,z,s,twist){ const grp=new T.Group(); grp.position.set(x,0,z); grp.scale.setScalar(s); grp.rotation.y=rnd()*6.28;
    const limb=(p,len,r,ax,az,depth)=>{ const c=new T.Mesh(new T.CylinderGeometry(r*.55,r,len,6),deadBark); c.position.y=len/2; c.castShadow=true; const h=new T.Group(); h.position.copy(p); h.rotation.set(ax,0,az); h.add(c); grp.add(h);
      if(depth<5){ const top=new V3(0,len,0).applyEuler(h.rotation).add(p); const n=2+(rnd()<.35?1:0); for(let i=0;i<n;i++) limb(top,len*(.58+rnd()*.18),r*.62,ax+(rnd()-.5)*(twist||1.3),az+(rnd()-.5)*(twist||1.3),depth+1); } };
    limb(new V3(0,0,0),3.4,.34,0,(rnd()-.5)*.25,0);
    for(let k=0;k<4;k++){ const a=k*1.6+rnd(); const root=new T.Mesh(new T.CylinderGeometry(.05,.16,1.6,5),deadBark); root.position.set(Math.cos(a)*.5,.12,Math.sin(a)*.5); root.rotation.set(Math.sin(a)*1.25,0,-Math.cos(a)*1.25); grp.add(root); }
    g.add(grp); return grp; }
  function mist(g,y,op){ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'), gr=x.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,'rgba(220,230,235,1)'); gr.addColorStop(1,'rgba(220,230,235,0)'); x.fillStyle=gr; x.fillRect(0,0,128,128);
    const t=new T.CanvasTexture(c); for(let i=0;i<14;i++){ const s=new T.Sprite(new T.SpriteMaterial({map:t,transparent:true,opacity:op||.16,depthWrite:false})); s.position.set((rnd()-.5)*14,y+rnd()*.6,(rnd()-.5)*14); s.scale.set(7,2.2,1); g.add(s); } }
  function headstone(g,x,z,kind){ const r=(rnd()-.5)*.25, tilt=(rnd()-.5)*.18; let o;
    if(kind===0){ const sh=new T.Shape(); sh.moveTo(-.4,0); sh.lineTo(-.4,.75); sh.absarc(0,.75,.4,Math.PI,0,true); sh.lineTo(.4,0); const geo=new T.ExtrudeGeometry(sh,{depth:.14,bevelEnabled:false}); o=mesh(g,geo,stone,x,0,z,r); }
    else if(kind===1){ o=new T.Group(); o.position.set(x,0,z); o.rotation.y=r; g.add(o); const a=mesh(o,new T.BoxGeometry(.16,1.4,.16),stone,0,.7,0); const b=mesh(o,new T.BoxGeometry(.7,.16,.16),stone,0,1.05,0); }
    else { o=mesh(g,new T.BoxGeometry(.8,.5,.5),darkStone,x,.25,z,r); mesh(g,new T.BoxGeometry(.9,.08,.6),darkStone,x,.54,z,r); }
    o.rotation.z=tilt; return o; }
  function fence(g,x0,z0,x1,z1,h){ h=h||1.6; const L=Math.hypot(x1-x0,z1-z0), n=Math.round(L/.18), a=Math.atan2(z1-z0,x1-x0);
    for(let i=0;i<=n;i++){ const t=i/n, x=x0+(x1-x0)*t, z=z0+(z1-z0)*t; mesh(g,new T.CylinderGeometry(.022,.022,h,5),iron,x,h/2,z); const tip=mesh(g,new T.ConeGeometry(.05,.16,4),iron,x,h+.08,z); }
    [.25,h-.2].forEach(y=>{ const r=mesh(g,new T.BoxGeometry(L,.05,.04),iron,(x0+x1)/2,y,(z0+z1)/2); r.rotation.y=-a; });
    for(let i=0;i<=Math.round(L/2.4);i++){ const t=i/Math.round(L/2.4); mesh(g,new T.BoxGeometry(.32,h+.3,.32),darkStone,x0+(x1-x0)*t,(h+.3)/2,z0+(z1-z0)*t); } }
  function gate(g,x,z){ const G=new T.Group(); G.position.set(x,0,z); g.add(G); [-1.9,1.9].forEach(px=>{ mesh(G,new T.BoxGeometry(.6,3,.6),darkStone,px,1.5,0); mesh(G,new T.BoxGeometry(.75,.2,.75),darkStone,px,3.1,0); mesh(G,new T.SphereGeometry(.28,10,8),darkStone,px,3.45,0); });
    for(let i=0;i<14;i++){ const px=-1.55+i*.24, h=2.2+Math.sin(i/13*Math.PI)*.6; mesh(G,new T.CylinderGeometry(.025,.025,h,5),iron,px,h/2,0); mesh(G,new T.ConeGeometry(.055,.18,4),iron,px,h+.09,0); }
    const arc=new T.Mesh(new T.TorusGeometry(1.6,.04,6,24,Math.PI),iron); arc.position.y=2.15; G.add(arc); [.3,1.1].forEach(y=>mesh(G,new T.BoxGeometry(3.2,.05,.05),iron,0,y,0)); return G; }
  function gasLamp(g,x,z,lights){ const G=new T.Group(); G.position.set(x,0,z); g.add(G); mesh(G,new T.CylinderGeometry(.1,.16,3.4,8),iron,0,1.7,0); mesh(G,new T.CylinderGeometry(.22,.26,.3,8),iron,0,.15,0);
    const cage=new T.Mesh(new T.CylinderGeometry(.26,.16,.55,6,1,true),new T.MeshStandardMaterial({color:0xffd9a0,emissive:0xffa94a,emissiveIntensity:2.6,transparent:true,opacity:.85,side:T.DoubleSide,toneMapped:false})); cage.position.y=3.72; G.add(cage);
    mesh(G,new T.ConeGeometry(.36,.3,6),iron,0,4.15,0); mesh(G,new T.SphereGeometry(.06,6,6),iron,0,4.33,0); if(lights){ const L=new T.PointLight(0xffa458,3,12,2); L.position.set(0,3.7,0); G.add(L); lights.push(L); } return G; }
  function arch(G,w,h,d,x,z,ry,broken){ const sh=new T.Shape(); sh.moveTo(-w/2-.5,0); sh.lineTo(-w/2-.5,h+w*.9); sh.lineTo(w/2+.5,h+w*.9); sh.lineTo(w/2+.5,0); sh.lineTo(w/2,0); sh.lineTo(w/2,h);
    sh.quadraticCurveTo(w/2,h+w*.55,0,h+w*.8); sh.quadraticCurveTo(-w/2,h+w*.55,-w/2,h); sh.lineTo(-w/2,0); const geo=new T.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false}); geo.translate(0,0,-d/2);
    const o=mesh(G,geo,stone,x,0,z,ry); if(broken){ o.scale.y=.75; } return o; }
  function chapel(g,x,z){ const G=new T.Group(); G.position.set(x,0,z); g.add(G);
    mesh(G,new T.BoxGeometry(9,.4,15),darkStone,0,.2,0);
    arch(G,3,4.5,.9,0,7,0); const rose=new T.Mesh(new T.TorusGeometry(1.1,.18,8,24),stone); rose.position.set(0,9.4,7); G.add(rose); for(let k=0;k<8;k++){ const sp=mesh(G,new T.BoxGeometry(.1,2.2,.1),stone,0,9.4,7); sp.rotation.z=k*Math.PI/8; }
    const gable=new T.Shape(); gable.moveTo(-4.4,0); gable.lineTo(4.4,0); gable.lineTo(0,4.2); const gg=new T.ExtrudeGeometry(gable,{depth:.9,bevelEnabled:false}); gg.translate(0,0,-.45); mesh(G,gg,stone,0,7.2,7);
    [-1,1].forEach(s=>{ for(let k=0;k<3;k++){ const zz=4.2-k*4.4; const a=arch(G,1.7,3.2,.8,s*4.1,zz,Math.PI/2,k===2); if(k===2){ a.scale.y=.55; } }
      mesh(G,new T.BoxGeometry(.8,7.5,.8),stone,s*4.1,3.75,6.6); mesh(G,new T.ConeGeometry(.55,1.6,4),stone,s*4.1,8.3,6.6); });
    mesh(G,new T.BoxGeometry(1,2.6,4),stone,-4.1,1.3,-5.5); mesh(G,new T.BoxGeometry(.9,1.3,2.5),stone,4.1,.65,-5.8);
    for(let i=0;i<10;i++) mesh(G,new T.DodecahedronGeometry(.25+rnd()*.35,0),stone,(rnd()-.5)*7,.2,(rnd()-.5)*12);
    cards(G,RM.leaves,-4.3,4.6,5.2,.9,16,.8); return G; }
  /* ---------- TILES ---------- */
  const P={};
  P.deadForest=()=>{ const g=new T.Group(); ground(g,mud); for(let i=0;i<9;i++) deadTree(g,(rnd()-.5)*13,(rnd()-.5)*13,.95+rnd()*.5,1.5); for(let i=0;i<30;i++){ const q=new T.PlaneGeometry(.8,.6); q.translate(0,.3,0); q.rotateY(rnd()*3); q.translate((rnd()-.5)*15,0,(rnd()-.5)*15); g.add(new T.Mesh(q,reed)); }
    for(let i=0;i<5;i++){ const l=mesh(g,new T.CylinderGeometry(.2,.26,3+rnd()*2,7),deadBark,(rnd()-.5)*12,.2,(rnd()-.5)*12,rnd()*3); l.rotation.z=Math.PI/2; } mist(g,.4,.2); return g; };
  P.graveyard=()=>{ const g=new T.Group(); ground(g,moss); const grid=[]; for(let r=0;r<4;r++) for(let c=0;c<6;c++){ if(rnd()<.18) continue; headstone(g,-5.8+c*2.1+(rnd()-.5)*.4,-5+r*2.6,(r*7+c)%5===0?2:(c+r)%3===0?1:0); }
    fence(g,-7.8,-7.8,7.8,-7.8); fence(g,-7.8,-7.8,-7.8,7.8); fence(g,7.8,-7.8,7.8,7.8); fence(g,-7.8,7.8,-2,7.8); fence(g,2,7.8,7.8,7.8);
    const cr=new T.Group(); cr.position.set(4.6,0,-5.4); g.add(cr); mesh(cr,new T.BoxGeometry(3,2.6,3.4),darkStone,0,1.3,0); const rf=new T.ConeGeometry(2.6,1.4,4); rf.rotateY(Math.PI/4); mesh(cr,rf,darkStone,0,3.3,0); mesh(cr,new T.BoxGeometry(1,1.8,.1),iron,0,.9,1.72);
    deadTree(g,-5.5,5,1.1,1.4); mist(g,.3,.14); return g; };
  P.swamp=()=>{ const g=new T.Group(); ground(g,mud); const w=new T.Mesh(new T.CircleGeometry(5.6,40),swampW); w.rotation.x=-Math.PI/2; w.position.set(.5,.04,.4); w.scale.set(1,1.3,1); g.add(w);
    for(let i=0;i<5;i++){ const a=rnd()*6.28; deadTree(g,Math.cos(a)*4.2,Math.sin(a)*5,.8+rnd()*.4,1.7); } for(let i=0;i<70;i++){ const a=rnd()*6.28, r=4.5+rnd()*3; const q=new T.PlaneGeometry(.5,1.6); q.translate(0,.8,0); q.rotateY(rnd()*3); q.translate(Math.cos(a)*r,0,Math.sin(a)*r*1.1); g.add(new T.Mesh(q,reed)); }
    for(let i=0;i<8;i++){ const l=new T.Mesh(new T.CircleGeometry(.35,8),RM.lily); l.rotation.x=-Math.PI/2; l.position.set((rnd()-.5)*6,.06,(rnd()-.5)*6); g.add(l); } mist(g,.3,.24); return g; };
  P.birch=()=>{ const g=new T.Group(); ground(g,RM.ground); for(let i=0;i<14;i++) tree(g,(rnd()-.5)*13.5,(rnd()-.5)*13.5,.9+rnd()*.3,birchLeaf,birchBark,.15); for(let i=0;i<40;i++){ const q=new T.PlaneGeometry(.9,.6); q.translate(0,.3,0); q.rotateY(rnd()*3); q.translate((rnd()-.5)*15,0,(rnd()-.5)*15); g.add(new T.Mesh(q,RM.fern)); } return g; };
  P.autumn=()=>{ const g=new T.Group(); ground(g,M(0x7a5a33,{map:RM.ground.map})); for(let i=0;i<11;i++) tree(g,(rnd()-.5)*13.5,(rnd()-.5)*13.5,1+rnd()*.35,i%3?autumn:autumn2,RM.bark,.22);
    for(let i=0;i<60;i++){ const q=new T.PlaneGeometry(.5,.5); q.rotateX(-Math.PI/2); q.translate((rnd()-.5)*15,.03,(rnd()-.5)*15); g.add(new T.Mesh(q,i%2?autumn:autumn2)); } return g; };
  P.boulders=()=>{ const g=new T.Group(); ground(g,RM.ground); const hill=new T.Mesh(new T.SphereGeometry(6.5,24,12,0,Math.PI*2,0,Math.PI/2),RM.ground); hill.scale.y=.42; hill.position.set(-1,0,-1); hill.receiveShadow=true; g.add(hill);
    [[0,2.7,-1,2.2],[-3,1.4,1.8,1.6],[2.8,1.3,2,1.3],[4.5,.5,-4.5,1.8],[-5,.4,-4.5,1.2],[5.5,.3,5,.9]].forEach(([x,y,z,s])=>{ const geo=new T.IcosahedronGeometry(s,3), p=geo.attributes.position; for(let i=0;i<p.count;i++){ const X=p.getX(i),Y=p.getY(i),Z=p.getZ(i), n=1+.18*Math.sin(X*2.1+Z*1.3)*Math.cos(Y*2.7+X*.9)+.08*Math.sin(Z*5.3+Y*4.1); p.setXYZ(i,X*n,Y*.7*n,Z*n); } geo.computeVertexNormals(); { const nn=geo.attributes.normal; for(let i=0;i<p.count;i++){ const v=new V3(p.getX(i),p.getY(i)/.49,p.getZ(i)).normalize(); nn.setXYZ(i,v.x,v.y,v.z); } } mesh(g,geo,RM.rock,x,y,z,rnd()*3); });
    tree(g,5,-1,.9,RM.leaves,RM.bark); for(let i=0;i<40;i++){ const q=new T.PlaneGeometry(.9,.7); q.translate(0,.35,0); q.rotateY(rnd()*3); q.translate((rnd()-.5)*15,0,(rnd()-.5)*15); g.add(new T.Mesh(q,RM.tuft)); } return g; };
  P.stream=()=>{ const g=new T.Group(); ground(g,RM.ground); const strip=(w,mat,y)=>{ const pl=new T.PlaneGeometry(w,16,8,40); pl.rotateX(-Math.PI/2); const q=pl.attributes.position; for(let i=0;i<q.count;i++) q.setX(i,q.getX(i)+Math.sin(q.getZ(i)*.39)*1.2); const m=new T.Mesh(pl,mat); m.position.y=y; m.receiveShadow=true; g.add(m); return m; };
    strip(5.6,mud,.02); const wm=RM.water.clone(); wm.polygonOffset=true; wm.polygonOffsetFactor=-2; strip(3.8,wm,.05);
    for(let i=0;i<26;i++){ const z=(rnd()-.5)*15, x=Math.sin(z*.39)*1.2+(rnd()<.5?-1:1)*(2.3+rnd()*.7); mesh(g,new T.IcosahedronGeometry(.22+rnd()*.32,2),RM.rock,x,.08,z); }
    tree(g,-5.5,-4,1,RM.leaves,RM.bark); tree(g,5.8,3.5,.9,RM.leaves,RM.bark); for(let i=0;i<60;i++){ const z=(rnd()-.5)*15, x=Math.sin(z*.39)*1.2+(rnd()<.5?-1:1)*(2.8+rnd()*2.2); const r=new T.PlaneGeometry(.5,1.2); r.translate(0,.6,0); r.rotateY(rnd()*3); r.translate(x,0,z); g.add(new T.Mesh(r,RM.tuft)); } return g; };
  P.flowers=()=>{ const g=new T.Group(); ground(g,RM.ground); for(let i=0;i<260;i++){ const q=new T.PlaneGeometry(.7,.55); q.translate(0,.27,0); q.rotateY(rnd()*3); q.translate((rnd()-.5)*15.5,0,(rnd()-.5)*15.5); g.add(new T.Mesh(q,i%3?RM.flowers:RM.tuft)); } tree(g,4,-4,1.1,RM.leaves,RM.bark); return g; };
  window.TRIOGOTH={P,deadTree,gate,fence,gasLamp,chapel,headstone,mist,ground,tree,rnd,iron,stone,RM};
})();
