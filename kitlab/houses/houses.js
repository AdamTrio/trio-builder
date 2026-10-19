/* Trio Kit Lab · coded houses (mock v1, 10/17). Every house is built from named PARTS so each part can take its own
   colour + texture: walls, roof, trim, door, glass (window glow). Front faces +z. Origin = bottom centre.
   window.TRIOHOUSE.build(type, look) → THREE.Group. look = {walls:{c,t}, roof:{c,t}, trim, door, glow:{on,c}, porch, garage, fence} */
(function(){
  const T=THREE, V3=T.Vector3;
  /* ---------- procedural textures (canvas) — light, so a colour can tint them ---------- */
  const TX={};
  function cv(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; draw(c.getContext('2d'),w,h); const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.colorSpace=T.SRGBColorSpace; t.anisotropy=8; return t; }
  const rnd=(()=>{ let s=7; return ()=>{ s=(s*16807)%2147483647; return s/2147483647; }; })();
  function noise(x,w,h,a,n){ for(let i=0;i<n;i++){ const v=Math.floor(rnd()*a); x.fillStyle='rgba('+(v>a/2?255:0)+','+(v>a/2?255:0)+','+(v>a/2?255:0)+','+(rnd()*.05)+')'; x.fillRect(rnd()*w,rnd()*h,1+rnd()*3,1+rnd()*3); } }
  TX.siding=()=>TX._siding||(TX._siding=cv(512,512,(x,w,h)=>{ x.fillStyle='#e9e9e6'; x.fillRect(0,0,w,h); const n=10, bh=h/n;
    for(let i=0;i<n;i++){ const y=i*bh; const g=x.createLinearGradient(0,y,0,y+bh); g.addColorStop(0,'#f7f7f4'); g.addColorStop(.85,'#dcdcd8'); g.addColorStop(1,'#a9a9a4'); x.fillStyle=g; x.fillRect(0,y,w,bh); }
    noise(x,w,h,2,4000); }));        /* 1 tile = 2 m, boards 20 cm */
  TX.shingle=()=>TX._shingle||(TX._shingle=cv(512,512,(x,w,h)=>{ x.fillStyle='#bdbdbd'; x.fillRect(0,0,w,h); const rows=8, rh=h/rows, tw=w/8;
    for(let r=0;r<rows;r++){ const off=(r%2)*tw/2; for(let k=-1;k<9;k++){ const v=170+Math.floor(rnd()*60); x.fillStyle='rgb('+v+','+v+','+v+')'; x.fillRect(off+k*tw+1,r*rh+1,tw-2,rh-2);
      x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(off+k*tw,r*rh+rh-4,tw,4); } } noise(x,w,h,2,6000); }));
  TX.tile=()=>TX._tile||(TX._tile=cv(512,512,(x,w,h)=>{ x.fillStyle='#c8c8c8'; x.fillRect(0,0,w,h); const rows=6, rh=h/rows, cols=6, cw=w/cols;
    for(let r=0;r<rows;r++) for(let k=0;k<=cols;k++){ const cx=k*cw+(r%2)*cw/2; const g=x.createLinearGradient(cx-cw/2,0,cx+cw/2,0); g.addColorStop(0,'#9a9a9a'); g.addColorStop(.5,'#e6e6e6'); g.addColorStop(1,'#9a9a9a'); x.fillStyle=g; x.fillRect(cx-cw/2+1,r*rh,cw-2,rh-3); } }));
  TX.metalroof=()=>TX._mr||(TX._mr=cv(256,256,(x,w,h)=>{ for(let i=0;i<8;i++){ const g=x.createLinearGradient(i*32,0,i*32+32,0); g.addColorStop(0,'#cfcfcf'); g.addColorStop(.15,'#f2f2f2'); g.addColorStop(.3,'#bdbdbd'); g.addColorStop(1,'#c6c6c6'); x.fillStyle=g; x.fillRect(i*32,0,32,h); } }));
  TX.wood=()=>TX._wood||(TX._wood=cv(512,512,(x,w,h)=>{ const n=6, pw=w/n; for(let i=0;i<n;i++){ const b=140+Math.floor(rnd()*40); x.fillStyle='rgb('+b+','+Math.floor(b*.72)+','+Math.floor(b*.5)+')'; x.fillRect(i*pw,0,pw,h);
      for(let k=0;k<40;k++){ x.strokeStyle='rgba(60,35,15,'+(.05+rnd()*.12)+')'; x.lineWidth=1+rnd()*2; x.beginPath(); const xx=i*pw+rnd()*pw; x.moveTo(xx,0); x.bezierCurveTo(xx+rnd()*8-4,h*.3,xx+rnd()*8-4,h*.7,xx,h); x.stroke(); }
      x.fillStyle='rgba(30,18,8,.6)'; x.fillRect(i*pw,0,2,h); } }));
  TX.stone=()=>TX._stone||(TX._stone=cv(512,512,(x,w,h)=>{ x.fillStyle='#8a8580'; x.fillRect(0,0,w,h); for(let i=0;i<70;i++){ const v=150+Math.floor(rnd()*70), cx=rnd()*w, cy=rnd()*h, r=20+rnd()*34;
      x.fillStyle='rgb('+v+','+(v-4)+','+(v-10)+')'; x.beginPath(); x.ellipse(cx,cy,r,r*.7,rnd()*3,0,7); x.fill(); x.strokeStyle='rgba(40,38,35,.6)'; x.lineWidth=3; x.stroke(); } }));
  TX.stucco=()=>TX._stucco||(TX._stucco=cv(512,512,(x,w,h)=>{ x.fillStyle='#ecebe7'; x.fillRect(0,0,w,h); for(let i=0;i<26000;i++){ const v=200+Math.floor(rnd()*55); x.fillStyle='rgba('+v+','+v+','+(v-4)+',.5)'; x.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1+rnd()*2); }
    for(let i=0;i<30;i++){ x.fillStyle='rgba(120,115,105,'+(rnd()*.05)+')'; x.beginPath(); x.ellipse(rnd()*w,rnd()*h,20+rnd()*80,10+rnd()*40,rnd()*3,0,7); x.fill(); } }));
  TX.room=c=>cv(128,128,(x,w,h)=>{ const g=x.createLinearGradient(0,0,0,h); g.addColorStop(0,'#fff3d6'); g.addColorStop(.55,c); g.addColorStop(1,'#5a3a1c'); x.fillStyle=g; x.fillRect(0,0,w,h);
    x.fillStyle='rgba(120,60,40,.55)'; x.fillRect(0,0,w*.16,h); x.fillRect(w*.84,0,w*.16,h); x.fillStyle='rgba(0,0,0,.25)'; x.fillRect(w*.3,h*.62,w*.4,h*.38); });
  TX.awning=c=>cv(256,64,(x,w,h)=>{ for(let i=0;i<8;i++){ x.fillStyle=i%2?'#f4efe6':c; x.fillRect(i*w/8,0,w/8,h); } });
  let PEND=0; const WAIT=[]; const done=()=>{ if(--PEND<=0){ PEND=0; WAIT.splice(0).forEach(f=>f()); } };
  function pack(name){ const M=window.HEXMOODTEX||{}; if(!M[name+'_col']) return null; const L=new T.TextureLoader(); PEND++; const t=L.load(M[name+'_col'],done,undefined,done); t.wrapS=t.wrapT=T.RepeatWrapping; t.colorSpace=T.SRGBColorSpace;
    if(M[name+'_nrm']) PEND++; const n=M[name+'_nrm']?L.load(M[name+'_nrm'],done,undefined,done):null; if(n){ n.wrapS=n.wrapT=T.RepeatWrapping; } return {map:t,normalMap:n}; }
  const PK={};
  /* wall / roof finishes → material. tile = metres per texture repeat (uvs are in metres) */
  const FIN={
    siding:{tex:()=>({map:TX.siding()}), tile:2, rough:.75},
    brick:{tex:()=>PK.brick||(PK.brick=pack('brick')), tile:2.4, rough:.9},
    stucco:{tex:()=>({map:TX.stucco()}), tile:3, rough:.95},
    paint:{tex:()=>PK.paint||(PK.paint=pack('paint')), tile:3, rough:.8},
    stone:{tex:()=>({map:TX.stone()}), tile:2.5, rough:.95},
    wood:{tex:()=>({map:TX.wood()}), tile:1.8, rough:.7},
    shingles:{tex:()=>({map:TX.shingle()}), tile:2.2, rough:.9},
    tiles:{tex:()=>({map:TX.tile()}), tile:1.6, rough:.6},
    metal:{tex:()=>({map:TX.metalroof()}), tile:1.4, rough:.35, metal:.6},
    flat:{tex:()=>PK.concrete||(PK.concrete=pack('concrete')), tile:4, rough:.95}};
  const MC={};
  function finMat(f,c){ const k=f.t+'|'+f.c; if(MC[k]) return MC[k]; const F=FIN[f.t]||FIN.paint, tx=F.tex()||{};
    const m=new T.MeshStandardMaterial({color:new T.Color(f.c||'#ffffff'),map:tx.map||null,normalMap:tx.normalMap||null,roughness:F.rough,metalness:F.metal||0}); m.userData.tile=F.tile; return MC[k]=m; }
  const solid=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:new T.Color(c),roughness:.6},o||{}));
  /* uv in metres ÷ tile, on any geometry (box faces get planar uvs by their normal) */
  function muv(G,tile){ G=G.index?G.toNonIndexed():G; const p=G.attributes.position, n=G.attributes.normal, uv=[];
    for(let i=0;i<p.count;i++){ const ax=Math.abs(n.getX(i)), ay=Math.abs(n.getY(i)), az=Math.abs(n.getZ(i)); let u,v;
      if(ay>ax&&ay>az){ u=p.getX(i); v=p.getZ(i); } else if(ax>az){ u=p.getZ(i); v=p.getY(i); } else { u=p.getX(i); v=p.getY(i); } uv.push(u/tile,v/tile); }
    G.setAttribute('uv',new T.Float32BufferAttribute(uv,2)); return G; }
  function box(g,w,h,d,mat,x,y,z,named){ const G=new T.BoxGeometry(w,h,d); G.translate(x,y+h/2,z); const m=new T.Mesh(mat.userData.tile?muv(G,mat.userData.tile):G,mat); m.castShadow=m.receiveShadow=true; if(named) m.name=named; g.add(m); return m; }
  /* gable roof along x: width w (with overhang), depth d, rise h, at height y. Gable ends filled with wall material */
  function gable(g,w,d,h,y,roof,wall,z0){ z0=z0||0; const hw=w/2, hd=d/2, t=roof.userData.tile||2, sl=Math.hypot(hd,h);
    const P=[], U=[]; const q=(a,b,c,dd,ua)=>{ [a,b,c,a,c,dd].forEach((v,i)=>{ P.push(...v); U.push(...ua[[0,1,2,0,2,3][i]]); }); };
    q([-hw,y,hd+z0],[hw,y,hd+z0],[hw,y+h,z0],[-hw,y+h,z0],[[0,0],[w/t,0],[w/t,sl/t],[0,sl/t]]);
    q([hw,y,-hd+z0],[-hw,y,-hd+z0],[-hw,y+h,z0],[hw,y+h,z0],[[0,0],[w/t,0],[w/t,sl/t],[0,sl/t]]);
    const G=new T.BufferGeometry(); G.setAttribute('position',new T.Float32BufferAttribute(P,3)); G.setAttribute('uv',new T.Float32BufferAttribute(U,2)); G.computeVertexNormals();
    const r=new T.Mesh(G,roof); r.castShadow=r.receiveShadow=true; r.name='roof'; g.add(r);
    const th=new T.Mesh(new T.BoxGeometry(w,.12,.12),roof); th.position.set(0,y+h+.02,z0); g.add(th);
    const gw=w-.9, E=[], EU=[], tw=wall.userData.tile||2;
    [[-1],[1]].forEach(([s])=>{ const x=s*gw/2; const a=[x,y,-hd+.45+z0], b=[x,y,hd-.45+z0], c=[x,y+h*(1-.45/hd),z0]; (s>0?[a,c,b]:[a,b,c]).forEach(v=>{ E.push(...v); EU.push(v[2]/tw,v[1]/tw); }); });
    const GE=new T.BufferGeometry(); GE.setAttribute('position',new T.Float32BufferAttribute(E,3)); GE.setAttribute('uv',new T.Float32BufferAttribute(EU,2)); GE.computeVertexNormals(); const ge=new T.Mesh(GE,wall); ge.castShadow=true; g.add(ge); }
  /* a window: trim frame + glass (glows) + mullions */
  function win(g,x,y,z,w,h,M,face){ face=face||1; const fr=.09;
    box(g,w+fr*2,h+fr*2,.06,M.trim,x,y-fr,z+.03*face); const gl=new T.Mesh(new T.PlaneGeometry(w,h),M.glass); gl.position.set(x,y+h/2,z+.065*face); if(face<0) gl.rotation.y=Math.PI; gl.userData.win={x,y:y+h/2,z:z+.065*face,w,h}; g.add(gl);
    box(g,.05,h,.03,M.trim,x,y,z+.08*face); box(g,w,.05,.03,M.trim,x,y+h/2-.025,z+.08*face); box(g,w+.3,.08,.18,M.trim,x,y-.12,z+.09*face); }
  function door(g,x,y,z,w,h,M){ box(g,w+.24,h+.12,.08,M.trim,x,y,z+.04); const ds=box(g,w,h,.06,M.door,x,y,z+.09); ds.userData.door={x,y,z:z+.09,w,h};
    const gl=new T.Mesh(new T.PlaneGeometry(w*.5,h*.28),M.glass); gl.position.set(x,y+h*.68,z+.125); g.add(gl);
    const k=new T.Mesh(new T.SphereGeometry(.05,10,8),solid('#c9a64a',{metalness:.9,roughness:.3})); k.position.set(x+w*.36,y+h*.48,z+.15); g.add(k); }
  function mats(L){ if(L.wear==='abandoned') L=grimeLook(L); const glowOn=!L.glow||L.glow.on!==false, gc=(L.glow&&L.glow.c)||'#ffbf6e';
    return {wall:finMat(L.walls), roof:finMat(L.roof), trim:solid(L.trim||'#f4f1ea',{roughness:.55}), door:solid(L.door||'#7a1f1f',{roughness:.4}),
      glass:glowOn?(()=>{ const rt=TX.room(gc); return new T.MeshStandardMaterial({color:'#20160c',emissive:'#ffffff',emissiveMap:rt,emissiveIntensity:1.0,roughness:.15}); })():new T.MeshStandardMaterial({color:'#1a2228',roughness:.08,metalness:.4}),
      base:finMat({t:'stone',c:'#b9b4ad'}), deck:finMat({t:'wood',c:'#d8cbb8'})}; }
  /* ---------- v1 · the ABANDONED look: same house, faded + grimy colours, boarded / broken windows, weeds, vines, sagging porch ---------- */
  function fade(c,to,k,d){ const a=new T.Color(c), b=new T.Color(to); a.lerp(b,k).multiplyScalar(d); return '#'+a.getHexString(); }
  function grimeLook(L){ const o=JSON.parse(JSON.stringify(L)); o.walls.c=fade(L.walls.c||'#ffffff','#7d7a68',.45,.78); o.roof.c=fade(L.roof.c||'#555555','#3d4232',.5,.75);
    o.trim=fade(L.trim||'#f4f1ea','#8a8576',.55,.8); o.door=fade(L.door||'#7a1f1f','#2e2620',.75,.8); o.glow={on:false}; o.wear='abandoned'; return o; }
  TX.grime=()=>TX._grime||(TX._grime=(()=>{ const t=cv(256,512,(x,w,h)=>{ x.clearRect(0,0,w,h);
      for(let i=0;i<90;i++){ const sx=rnd()*w, len=h*(.15+rnd()*.55), wd=2+rnd()*9; const g=x.createLinearGradient(0,0,0,len); g.addColorStop(0,'rgba(25,22,15,'+(.25+rnd()*.35)+')'); g.addColorStop(1,'rgba(25,22,15,0)'); x.fillStyle=g; x.fillRect(sx,0,wd,len); }
      const b=x.createLinearGradient(0,h,0,h*.62); b.addColorStop(0,'rgba(38,46,24,.85)'); b.addColorStop(1,'rgba(38,46,24,0)'); x.fillStyle=b; x.fillRect(0,h*.62,w,h*.38);
      for(let i=0;i<55;i++){ x.fillStyle='rgba('+(rnd()<.5?'45,52,30':'30,26,20')+','+(.12+rnd()*.25)+')'; x.beginPath(); x.ellipse(rnd()*w,rnd()*h,6+rnd()*26,4+rnd()*18,rnd()*3,0,7); x.fill(); }
      for(let i=0;i<14;i++){ x.fillStyle='rgba(200,195,180,'+(.15+rnd()*.2)+')'; x.fillRect(rnd()*w,rnd()*h,8+rnd()*24,4+rnd()*10); } }); t.wrapT=T.ClampToEdgeWrapping; return t; })());
  TX.cracked=()=>TX._cr||(TX._cr=cv(256,256,(x,w,h)=>{ x.fillStyle='#0b0d10'; x.fillRect(0,0,w,h); const cx=w*(.3+rnd()*.4), cy=h*(.3+rnd()*.4);
      x.fillStyle='#000'; x.beginPath(); x.moveTo(cx,cy); for(let k=0;k<7;k++){ const a=k/7*6.28+rnd()*.4, r=30+rnd()*50; x.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); } x.fill();
      x.strokeStyle='rgba(190,200,210,.55)'; x.lineWidth=1.4; for(let k=0;k<12;k++){ const a=rnd()*6.28; let px=cx, py=cy; x.beginPath(); x.moveTo(px,py); for(let s=0;s<5;s++){ px+=Math.cos(a+(rnd()-.5)*.6)*26; py+=Math.sin(a+(rnd()-.5)*.6)*26; x.lineTo(px,py); } x.stroke(); } }));
  function deadTree(g,x,z,s){ s=s||1; const bm=solid('#3a332c',{roughness:.95}), grp=new T.Group(); grp.position.set(x,0,z); grp.scale.setScalar(s);
    const limb=(p,len,r,ax,az,depth)=>{ const c=new T.Mesh(new T.CylinderGeometry(r*.6,r,len,6),bm); c.position.y=len/2; const holder=new T.Group(); holder.position.copy(p); holder.rotation.set(ax,0,az); holder.add(c); grp.add(holder);
      if(depth<4){ const top=new V3(0,len,0).applyEuler(holder.rotation).add(p); const n=2+(rnd()<.4?1:0); for(let i=0;i<n;i++) limb(top,len*(.55+rnd()*.2),r*.6,ax+(rnd()-.5)*1.3,az+(rnd()-.5)*1.3,depth+1); } };
    limb(new V3(0,0,0),3.2,.28,0,0,0); g.add(grp); return grp; }
  function wear(g,L){ const W=window.HEXCORE&&window.HEXCORE.WORLD, RMk=W&&W.realMat?W.realMat():null;
    const grime=new T.MeshStandardMaterial({map:TX.grime(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,roughness:1});
    const boardM=finMat({t:'wood',c:'#8a7a62'}), cracked=new T.MeshStandardMaterial({map:TX.cracked(),roughness:.3,metalness:.2}), faint=new T.MeshStandardMaterial({color:'#05080a',emissive:'#7fd6b0',emissiveIntensity:.5});
    const add=[]; let lit=false; g.updateMatrixWorld(true); const wb=new T.Box3();
    g.traverse(o=>{ if(!o.isMesh) return;
      if(o.name==='walls'){ wb.union(new T.Box3().setFromObject(o)); const G=o.geometry.clone(); G.computeBoundingBox(); const bb=G.boundingBox, p=G.attributes.position, n=G.attributes.normal, uv=G.attributes.uv;
        for(let i=0;i<p.count;i++){ const u=Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i); uv.setXY(i,u/3,(p.getY(i)-bb.min.y)/(bb.max.y-bb.min.y)); }
        const m=new T.Mesh(G,grime); m.position.copy(o.position); m.scale.set(1.004,1.002,1.004); add.push(m); }
      const w=o.userData.win; if(w){ const r=rnd();
        if(!lit&&r<.18){ o.material=faint; lit=true; }
        else if(r<.62){ o.material=cracked; for(let k=0;k<3;k++){ const b=new T.Mesh(muv(new T.BoxGeometry(w.w+.35,.2,.05),1.8),boardM); b.position.set(w.x,w.y-w.h*.32+k*w.h*.32,w.z+.07); b.rotation.z=(rnd()-.5)*.35; add.push(b); } }
        else o.material=cracked; }
      if(o.userData.door&&rnd()<.5){ o.rotation.y=-.5; o.position.x-=o.userData.door.w*.12; o.position.z+=.25; } });
    add.forEach(m=>g.add(m));
    const bb=new T.Box3().setFromObject(g), sz=bb.getSize(new V3());
    if(RMk){ const tf=[], lv=[], cards=(list,mat)=>{ const geo=[]; list.forEach(([x,y,z,sc,a])=>{ for(let k=0;k<2;k++){ const q=new T.PlaneGeometry(sc,sc); q.translate(0,sc/2,0); q.rotateY(a+k*Math.PI/2); q.translate(x,y,z); geo.push(q); } });
        if(!geo.length) return; const P=[],N=[],U=[]; geo.forEach(G=>{ const Gn=G.toNonIndexed(); P.push(...Gn.attributes.position.array); N.push(...Gn.attributes.normal.array); U.push(...Gn.attributes.uv.array); });
        const BG=new T.BufferGeometry(); BG.setAttribute('position',new T.Float32BufferAttribute(P,3)); BG.setAttribute('normal',new T.Float32BufferAttribute(N,3)); BG.setAttribute('uv',new T.Float32BufferAttribute(U,2)); g.add(new T.Mesh(BG,mat)); };
      if(wb.isEmpty()) wb.copy(bb); const ws=wb.getSize(new V3());
      for(let i=0;i<46;i++){ const a=rnd(); let x,z; if(a<.55){ x=wb.min.x-.3+rnd()*(ws.x+.6); z=wb.max.z+.1+rnd()*.9; } else if(a<.8){ x=(rnd()<.5?wb.min.x-.2-rnd()*.8:wb.max.x+.2+rnd()*.8); z=wb.min.z+rnd()*ws.z; } else { x=bb.min.x+rnd()*sz.x; z=wb.max.z+1+rnd()*Math.max(.5,bb.max.z-wb.max.z-1); }
        tf.push([x,0,z,.45+rnd()*.6,rnd()*3]); }
      const fz=wb.max.z+.04, vp=[]; for(let v=0;v<3;v++){ let x=wb.min.x+.4+rnd()*(ws.x-.8), y=0; const top=ws.y*(.45+rnd()*.5); while(y<top){ vp.push([x,y,.55+rnd()*.35]); y+=.28+rnd()*.2; x+=(rnd()-.5)*.5; if(rnd()<.25) vp.push([x+(rnd()-.5)*1.2,y,.45]); } }
      const VG=[]; vp.forEach(([x,y,sc])=>{ const q=new T.PlaneGeometry(sc,sc); q.rotateZ(rnd()*6.28); q.translate(x,y+sc/2,fz+rnd()*.03); VG.push(q.toNonIndexed()); });
      if(VG.length){ const P=[],N=[],U=[]; VG.forEach(G=>{ P.push(...G.attributes.position.array); N.push(...G.attributes.normal.array); U.push(...G.attributes.uv.array); }); const BG=new T.BufferGeometry(); BG.setAttribute('position',new T.Float32BufferAttribute(P,3)); BG.setAttribute('normal',new T.Float32BufferAttribute(N,3)); BG.setAttribute('uv',new T.Float32BufferAttribute(U,2)); g.add(new T.Mesh(BG,RMk.leaves)); }
      cards(tf,RMk.tuft); }
    deadTree(g,bb.max.x+1.6,bb.max.z-1.5,1+rnd()*.3); }
  const B={};
  /* suburban two-storey: porch, garage, chimney */
  B.suburban=(g,L,M)=>{ const W=10, D=8, H1=3, H2=2.9;
    box(g,W+.3,.5,D+.3,M.base,0,0,0); box(g,W,H1+H2,D,M.wall,0,.5,0,'walls');
    gable(g,W+.9,D+1.1,2.6,.5+H1+H2,M.roof,M.wall);
    box(g,W+.12,.16,D+.12,M.trim,0,.5+H1-.08,0);   /* belt course */
    [-1,1].forEach(s=>box(g,.18,H1+H2,.18,M.trim,s*(W/2),.5,D/2));
    door(g,1.6,.5,D/2,1,2.2,M); win(g,3.9,1.5,D/2,1.3,1.5,M); win(g,-1.2,1.5,D/2,1.3,1.5,M);
    [-3.4,-.4,2.6].forEach(x=>win(g,x,.5+H1+.6,D/2,1.2,1.4,M));
    if(L.garage!==false){ box(g,3.2,2.5,.1,M.trim,-3.3,.5,D/2+.02); for(let k=1;k<5;k++) box(g,3.2,.05,.04,solid('#9a9a9a'),-3.3,.5+k*.5,D/2+.08); box(g,3.5,.14,.14,M.trim,-3.3,3.05,D/2+.06);
      box(g,3.4,.04,4.5,finMat({t:'flat',c:'#9a968f'}),-3.3,0,D/2+2.3); }
    if(L.porch!==false){ box(g,3.6,.35,2.2,M.deck,1.6,0,D/2+1.1); [[.1,0],[3.1,0]].forEach(([dx],i)=>{ if(L.wear==='abandoned'&&i) return; box(g,.16,2.6,.16,M.trim,dx,.35,D/2+2.05); });
      const pr=new T.Mesh(new T.BoxGeometry(3.9,.12,2.6),M.roof); pr.position.set(1.6,3.05,D/2+1.2); pr.rotation.x=.12; if(L.wear==='abandoned'){ pr.rotation.z=.12; pr.position.y-=.25; } pr.castShadow=true; g.add(pr);
      for(let k=0;k<5;k++) box(g,.05,.8,.05,M.trim,.25+k*.15,.35,D/2+2.1); }
    box(g,.9,2.4,.9,M.base,3.6,.5+H1+H2+1,-1.5); };
  /* brownstone townhouse: 3 floors, stoop, cornice, tall windows */
  B.brownstone=(g,L,M)=>{ const W=6.4, D=10, H=9.6;
    box(g,W,1.3,D,M.base,0,0,0); box(g,W,H-1.3,D,M.wall,0,1.3,0,'walls');
    box(g,W+.5,.45,D+.3,M.trim,0,H,0); box(g,W+.3,.2,D+.1,M.trim,0,H-.2,0); for(let k=0;k<9;k++) box(g,.18,.28,.3,M.trim,-W/2+.4+k*.7,H-.48,D/2+.12);
    box(g,W,.12,D,finMat({t:'flat',c:'#6d6a66'}),0,H+.45,0);
    door(g,1.6,1.3,D/2,1.15,2.5,M); box(g,1.7,.22,.3,M.trim,1.6,4,D/2+.2);
    for(let k=0;k<6;k++) box(g,2,.22,.34,M.base,1.6,k*.22,D/2+.2+(6-k)*.34);
    [[-1,1],[1,1]].forEach(([s])=>box(g,.08,1.3,2.2,solid('#1c1c1c',{metalness:.6}),1.6+s*1.05,.4,D/2+1.2));
    win(g,-1.3,1.9,D/2,1.2,2.1,M); [4.3,7.1].forEach(y=>[-1.6,0,1.6].forEach(x=>win(g,x,y,D/2,1,1.9,M)));
    box(g,5,.12,.4,M.trim,-0.0,3.9,D/2+.15); };
  /* cottage: one storey, steep roof, stone chimney, fence, flower boxes */
  B.cottage=(g,L,M)=>{ const W=7.4, D=6.4, H=3;
    box(g,W+.2,.4,D+.2,M.base,0,0,0); box(g,W,H,D,M.wall,0,.4,0,'walls'); gable(g,W+.8,D+1,3.4,.4+H,M.roof,M.wall);
    door(g,0,.4,D/2,1,2.1,M); [-2.3,2.3].forEach(x=>{ win(g,x,1.3,D/2,1.2,1.3,M); box(g,1.4,.25,.3,M.deck,x,1.05,D/2+.2);
      for(let k=0;k<6;k++){ const f=new T.Mesh(new T.SphereGeometry(.12,8,6),solid((L.wear==='abandoned'?['#5a4630','#4a3a28','#6b5a3e','#3e3424']:['#e24b6b','#f5d04a','#ffffff','#b07ce8'])[k%4],{roughness:.8})); f.position.set(x-.55+k*.22,1.38,D/2+.22); g.add(f); } });
    box(g,1.1,4.6,1,M.base,-2.4,.4+H-1,-.6); box(g,1.2,.15,1.1,M.trim,-2.4,.4+H+3.6,-.6);
    if(L.fence!==false){ const z=D/2+3.2, ab=L.wear==='abandoned'; for(let x=-6;x<=6;x+=.4){ if(Math.abs(x)<.8) continue; if(ab&&rnd()<.3) continue; const pk=box(g,.09,.9,.05,M.trim,x,0,z); if(ab){ pk.rotation.z=(rnd()-.5)*.35; pk.rotation.x=(rnd()-.3)*.3; } }
      [-1,1].forEach(s=>{ box(g,5.3,.07,.05,M.trim,s*3.45,.3,z-.04); box(g,5.3,.07,.05,M.trim,s*3.45,.7,z-.04); }); }
    box(g,1.2,.04,3.2,finMat({t:'stone',c:'#d8d2c8'}),0,0,D/2+1.6); };
  /* modern box: stacked offset volumes, wood cladding, big glass */
  B.modern=(g,L,M)=>{ const W=11, D=8;
    box(g,W,3.2,D,M.wall,0,0,0,'walls'); box(g,7.5,3,D+1.2,M.wall,1.6,3.2,-.6);
    box(g,3.4,3,.2,M.deck,-1.6+1.6-3.75+1.7,3.2,D/2+.05);   /* wood strip on the upper box */
    box(g,W+.3,.25,D+.3,M.trim,0,3.1,0); box(g,7.8,.25,D+1.5,M.trim,1.6,6.2,-.6);
    const gl=(x,y,w,h)=>{ const p=new T.Mesh(new T.PlaneGeometry(w,h),M.glass); p.position.set(x,y+h/2,D/2+.02); g.add(p); for(let k=1;k<Math.round(w/1.4);k++) box(g,.06,h,.06,M.trim,x-w/2+k*(w/Math.round(w/1.4)),y,D/2+.05); };
    gl(-2,.3,5.6,2.6); gl(3.2,3.5,4.6,2.4); door(g,3.8,0,D/2,1.1,2.4,M);
    box(g,4,.04,2.8,finMat({t:'wood',c:'#cbb79c'}),-2,0,D/2+1.5); };
  /* corner shop: shopfront, awning, lit sign, flat over */
  B.shop=(g,L,M)=>{ const W=8, D=8, H=6.6;
    box(g,W,H,D,M.wall,0,0,0,'walls'); box(g,W+.4,.4,D+.4,M.trim,0,H,0);
    const sf=new T.Mesh(new T.PlaneGeometry(5.2,2.4),M.glass); sf.position.set(-1,.5+1.2,D/2+.03); sf.userData.win={x:-1,y:1.7,z:D/2+.03,w:5.2,h:2.4}; g.add(sf); box(g,5.5,.15,.12,M.trim,-1,.4,D/2+.06); box(g,5.5,.15,.12,M.trim,-1,2.9,D/2+.06);
    door(g,2.6,0,D/2,1.1,2.5,M);
    const aw=new T.Mesh(new T.PlaneGeometry(7,1.7),new T.MeshStandardMaterial({map:TX.awning((L.awning)||'#2f6b4f'),color:L.wear==='abandoned'?'#6f6a5c':'#ffffff',side:T.DoubleSide,roughness:.8})); aw.position.set(0,3.25,D/2+.7); aw.rotation.x=-1.0; if(L.wear==='abandoned'){ aw.rotation.x=-1.35; aw.rotation.y=.12; aw.position.y-=.3; } aw.castShadow=true; g.add(aw);
    const sc=document.createElement('canvas'); sc.width=512; sc.height=96; const x=sc.getContext('2d'); x.fillStyle='#14110e'; x.fillRect(0,0,512,96); x.font='800 58px Manrope, Helvetica, Arial'; x.textAlign='center'; x.textBaseline='middle'; x.fillStyle=L.wear==='abandoned'?'#b0302a':(L.signc||'#ffd36a'); x.fillText(L.wear==='abandoned'?'C RN R SH P':(L.sign||'CORNER SHOP'),256,52);
    const st=new T.CanvasTexture(sc); st.colorSpace=T.SRGBColorSpace; const sg=new T.Mesh(new T.PlaneGeometry(5,.95),new T.MeshStandardMaterial({map:st,emissiveMap:st,emissive:'#ffffff',emissiveIntensity:L.wear==='abandoned'?.45:1.4})); sg.position.set(0,4.35,D/2+.06); if(L.wear==='abandoned') sg.rotation.z=-.06; g.add(sg);
    [-2.2,0,2.2].forEach(x=>win(g,x,4.9,D/2,1.2,1.3,M)); };
  window.TRIOHOUSE={deadTree, build(type,L){ const g=new T.Group(), M=mats(L); B[type](g,L,M); if(L.wear==='abandoned') wear(g,L); g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } }); return g; }, types:Object.keys(B), ready:()=>new Promise(r=>{ if(PEND<=0) r(); else WAIT.push(r); }), preload(){ ['brick','concrete','paint'].forEach(k=>{ if(!PK[k]) PK[k]=pack(k); }); }};
})();
