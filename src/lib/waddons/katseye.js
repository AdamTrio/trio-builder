/* ================= v74 · WORLD ADD-ON · KATSEYE building =================
   Artist-specific pieces are add-ons (Adam 10/16): their own file, switched on per world (M.world.addons.katseye.on),
   carried in a bake only when used. This one: the KATSEYE hexagon — candy-red gloss, chrome trims, pink neon roof, glass roof
   panels, the arched door (its own DOOR_ part, so the world adds no generic doorway), a sign that lights up (p.sign 'on'|'off').
   Real size: about 21 m across, 8 m tall — roughly 2 × 2 map squares. Made entirely in code (Kit Lab: kitlab/katseye/). */
(function(){
  const CORE=window.HEXCORE; if(!CORE||typeof THREE==='undefined'||!CORE.PRIMS) return;
  const T=THREE, V=(x,y,z)=>new T.Vector3(x,y,z);
  CORE.WORLDADDONS=CORE.WORLDADDONS||{};
  CORE.WORLDADDONS.katseye={name:'KATSEYE building', prims:['katseye'], note:'The KATSEYE hexagon with a sign that lights up. Its door opens the room you link.'};
  let MAT=null;
  function mats(){ if(MAT) return MAT;
    MAT={RED:new T.MeshPhysicalMaterial({color:0xc40d1a,roughness:.32,metalness:.05,clearcoat:1,clearcoatRoughness:.08}),
      RED2:new T.MeshPhysicalMaterial({color:0xc20f1b,roughness:.38,metalness:.05,clearcoat:1,clearcoatRoughness:.12}),
      CHROME:new T.MeshStandardMaterial({color:0xf6e2ee,metalness:1,roughness:.12,envMapIntensity:1.7,emissive:0x3a1a2c}),
      CHROMEP:new T.MeshStandardMaterial({color:0xf3c2de,metalness:1,roughness:.18,envMapIntensity:1.7,emissive:0x3a1428}),
      GLASS:new T.MeshStandardMaterial({color:0xf4b8d4,roughness:.12,metalness:.1,transparent:true,opacity:.62,emissive:0xff4fa0,emissiveIntensity:.35,side:T.DoubleSide}),
      DOORG:new T.MeshPhysicalMaterial({color:0xf2bfda,roughness:.18,metalness:.15,clearcoat:1,clearcoatRoughness:.05,emissive:0xff6fb4,emissiveIntensity:.12}),
      NEON:new T.MeshBasicMaterial({color:new T.Color(0xff3d96).multiplyScalar(2.2),toneMapped:false}),
      NEONH:new T.MeshBasicMaterial({color:0xff3d96,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),
      INNER:new T.MeshStandardMaterial({color:0x2a0612,roughness:.6})};
    /* the sign: KATSEYE drawn once, lit from inside */
    const c=document.createElement('canvas'); c.width=2048; c.height=420; const x=c.getContext('2d');
    x.font='900 300px "Didot","Bodoni 72","Playfair Display",Georgia,"Times New Roman",serif'; x.textAlign='center'; x.textBaseline='middle';
    x.lineJoin='round'; x.lineWidth=18; x.strokeStyle='#7a0b18'; x.strokeText('KATSEYE',1024,230);
    const gr=x.createLinearGradient(0,60,0,380); gr.addColorStop(0,'#ffffff'); gr.addColorStop(.6,'#ffeef5'); gr.addColorStop(1,'#f4c6da'); x.fillStyle=gr; x.fillText('KATSEYE',1024,220);
    const st=new T.CanvasTexture(c); st.colorSpace=T.SRGBColorSpace; st.anisotropy=8;
    const gc=document.createElement('canvas'); gc.width=1024; gc.height=210; const y=gc.getContext('2d'); y.filter='blur(16px)'; y.drawImage(c,0,0,1024,210); y.drawImage(gc,0,0);
    const gt=new T.CanvasTexture(gc); gt.colorSpace=T.SRGBColorSpace;
    MAT.SIGN=new T.MeshStandardMaterial({map:st,transparent:true,alphaTest:.15,roughness:.35,metalness:.1,emissive:0xffffff,emissiveMap:st,emissiveIntensity:1.7});
    MAT.SIGNH=new T.MeshBasicMaterial({map:gt,color:0xffb3d6,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:.85});
    return MAT; }
  const Rv=10, AP=Rv*Math.cos(Math.PI/6), H=7.2;
  const vert=(k,r)=>{ const a=k*Math.PI/3; return V(Math.cos(a)*r,0,Math.sin(a)*r); };
  const hexShape=r=>{ const s=new T.Shape(); for(let k=0;k<6;k++){ const a=k*Math.PI/3; k?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r); } s.closePath(); return s; };
  function ring(B,rOut,rIn,h,y,mat,bevel){ const s=hexShape(rOut); s.holes.push(hexShape(rIn)); const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:!!bevel,bevelSize:bevel||0,bevelThickness:bevel||0,bevelSegments:4,curveSegments:4});
    g.rotateX(-Math.PI/2); const m=new T.Mesh(g,mat); m.position.y=y; B.add(m); }
  function star(h,w,depth,mat){ const s=new T.Shape(), c=w*.07; s.moveTo(0,h/2); s.quadraticCurveTo(c,c,w/2,0); s.quadraticCurveTo(c,-c,0,-h/2); s.quadraticCurveTo(-c,-c,-w/2,0); s.quadraticCurveTo(-c,c,0,h/2);
    const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:depth*.6,bevelThickness:depth*.6,bevelSegments:3,curveSegments:16}); g.translate(0,0,-depth/2); return new T.Mesh(g,mat); }
  function arch(w,h){ const s=new T.Shape(), r=w/2; s.moveTo(-r,0); s.lineTo(-r,h-r); s.absarc(0,h-r,r,Math.PI,0,true); s.lineTo(r,0); s.closePath(); return s; }
  function build(){ const M=mats(), B=new T.Group();
    /* the building's front faces +Z (the spec's "front"): its side between 60° and 120° — turn the whole thing so it does */
    ring(B,Rv,Rv-1.2,H-.5,.25,M.RED,.25); ring(B,Rv+.32,Rv-.4,.22,.06,M.CHROME,.06); ring(B,Rv+.22,Rv-.3,.5,.3,M.RED2,.08);
    ring(B,Rv+.2,Rv-.2,.14,3.75,M.CHROME,.04); ring(B,Rv+.28,Rv-.9,.55,H-.1,M.RED2,.12);
    for(let k=0;k<6;k++){ const p=vert(k,Rv+.08); const c=new T.Mesh(new T.CylinderGeometry(.62,.62,H+.1,20),M.RED); c.position.set(p.x,(H+.1)/2+.2,p.z); B.add(c);
      const cb=new T.Mesh(new T.CylinderGeometry(.66,.66,.14,20),M.CHROME); cb.position.set(p.x,3.82,p.z); B.add(cb); }
    const roofY=H+.42; { const gl=new T.Mesh(new T.ShapeGeometry(hexShape(Rv-.5)),M.GLASS); gl.rotation.x=-Math.PI/2; gl.position.y=roofY-.08; B.add(gl);
      const bar=(a,b)=>{ const d=b.clone().sub(a), L=d.length(); const m=new T.Mesh(new T.BoxGeometry(L+.3,.32,.42),M.RED); m.position.copy(a).add(b).multiplyScalar(.5).setY(roofY); m.rotation.y=-Math.atan2(d.z,d.x); B.add(m); };
      for(let k=0;k<6;k++){ bar(vert(k,4.2),vert(k+1,4.2)); bar(vert(k,4.2),vert(k,Rv-.4)); } }
    const neon=(r,y,rad)=>{ const pts=[]; for(let k=0;k<=6;k++) pts.push(vert(k,r).setY(y)); const cv=new T.CatmullRomCurve3(pts,false,'catmullrom',0);
      B.add(new T.Mesh(new T.TubeGeometry(cv,96,rad,8),M.NEON)); B.add(new T.Mesh(new T.TubeGeometry(cv,96,rad*3.6,8),M.NEONH)); };
    neon(Rv+.36,H+.5,.07); neon(Rv+.36,.08,.05);
    const onFace=(k,obj,along,y,out)=>{ const a=(k+.5)*Math.PI/3, d=V(Math.cos(a),0,Math.sin(a)), t=V(-d.z,0,d.x);
      obj.position.copy(d.clone().multiplyScalar(AP+(out||0))).add(t.multiplyScalar(along||0)).setY(y); obj.rotation.y=Math.atan2(d.x,d.z); B.add(obj); return obj; };
    for(const k of [0,2,3,4,5]){ const g=new T.Group();
      const ov=new T.Mesh(new T.TorusGeometry(1,.07,10,64),M.CHROMEP); ov.scale.set(1.25,2,1); ov.position.z=.05; g.add(ov);
      const ov2=new T.Mesh(new T.TorusGeometry(1,.035,8,64),M.NEON); ov2.scale.set(1.12,1.86,1); ov2.position.z=.05; g.add(ov2);
      [[.97,.74],[-.97,-.74]].forEach(([x,y])=>{ const b=new T.Mesh(new T.SphereGeometry(.16,16,12),M.CHROMEP); b.position.set(x*1.075,y*1.72,.12); g.add(b); });
      const s=star(1.2,.8,.06,M.CHROME); s.position.z=.12; g.add(s); onFace(k,g,0,3.95,.62); }
    { const F=new T.Group(); const fr=arch(5.4,4.9); fr.holes.push(arch(4.3,4.35));
      F.add(new T.Mesh(new T.ExtrudeGeometry(fr,{depth:.38,bevelEnabled:true,bevelSize:.12,bevelThickness:.12,bevelSegments:4,curveSegments:24}),M.RED2));
      const im=new T.Mesh(new T.ExtrudeGeometry(arch(4.3,4.35),{depth:.05,bevelEnabled:false,curveSegments:24}),M.INNER); im.position.z=-.02; F.add(im);
      const path=new T.Path(), r=2.15; path.moveTo(-r,0); path.lineTo(-r,4.35-r); path.absarc(0,4.35-r,r,Math.PI,0,true); path.lineTo(r,0);
      const cv=new T.CatmullRomCurve3(path.getSpacedPoints(80).map(p=>V(p.x,p.y,.5)));
      F.add(new T.Mesh(new T.TubeGeometry(cv,120,.06,8),M.NEON)); F.add(new T.Mesh(new T.TubeGeometry(cv,120,.22,8),M.NEONH));
      const dt=new T.Mesh(new T.TubeGeometry(cv,120,.16,10),M.CHROMEP); dt.position.z=-.08; F.add(dt);
      [-1,1].forEach(sd=>{ const s=new T.Shape(), rr=2.05; if(sd<0){ s.moveTo(-rr,0); s.lineTo(-rr,4.25-rr); s.absarc(0,4.25-rr,rr,Math.PI,Math.PI/2,true); s.lineTo(-.03,4.25); s.lineTo(-.03,0); }
          else { s.moveTo(.03,0); s.lineTo(.03,4.25); s.absarc(0,4.25-rr,rr,Math.PI/2,0,true); s.lineTo(rr,0); } s.closePath();
        const d=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.12,bevelEnabled:true,bevelSize:.04,bevelThickness:.04,bevelSegments:2,curveSegments:20}),M.DOORG); d.position.z=.06; F.add(d);
        const hd=new T.Mesh(new T.CylinderGeometry(.06,.06,1.3,12),M.CHROME); hd.position.set(sd*.3,1.9,.32); F.add(hd);
        const st=star(.7,.55,.04,M.CHROMEP); st.position.set(sd*1.1,2.1,.28); F.add(st); });
      const door=new T.Object3D(); door.name='DOOR_katseye'; door.userData.ownDoor=true; door.position.set(0,0,1.6); F.add(door);   /* where "Enter KATSEYE" lives */
      onFace(1,F,0,.32,.62); [-1,1].forEach(sd=>onFace(1,star(2.8,1,.1,M.CHROME),sd*3.55,2.5,.75)); }
    { const G=new T.Group(); G.add(new T.Mesh(new T.BoxGeometry(7.6,1.55,.34),M.RED2)); const rim=new T.Mesh(new T.BoxGeometry(7.75,1.7,.2),M.CHROME); rim.position.z=-.08; G.add(rim);
      const tx=new T.Mesh(new T.PlaneGeometry(7.3,1.5),M.SIGN); tx.position.z=.2; G.add(tx);
      const gl=new T.Mesh(new T.PlaneGeometry(8.4,1.9),M.SIGNH); gl.position.z=.22; G.add(gl); onFace(1,G,0,6.0,.72); B.userData.signGlow=gl; }
    const roofGlow=new T.PointLight(0xff4fa0,2.4,26,2); roofGlow.position.set(0,H+1.5,0); B.add(roofGlow);
    /* the front faces +z already (side 1 sits at 90°) */
    B.userData.addonSync=(p,H)=>{ const on=p.sign!=='off'; let day=false; try{ day=(CORE.skyCfg(H._mood.M).sky)==='day'; }catch(e){}
      M.SIGN.emissiveIntensity=on?(day?.6:1.7):0; B.userData.signGlow.visible=on; M.SIGNH.opacity=day?.3:.85; roofGlow.intensity=day?0:2.4;
      if(!M._env&&CORE.moodEnv&&H){ const e=CORE.moodEnv(H); if(e){ M._env=e; [M.RED,M.RED2,M.CHROME,M.CHROMEP,M.DOORG].forEach(m=>{ m.envMap=e; m.needsUpdate=true; }); } } };
    return B; }
  CORE.PRIMS.katseye={label:'KATSEYE building', world:true, addon:'katseye', build};
})();
