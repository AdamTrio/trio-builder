/* ================= v71 · WORLD — one big piece of land (World 1) =================
   Its own space next to Event Space / Mood Room / Open Space. Nothing here runs unless the look has M.world:
   every room keeps working exactly as before, and a baked room only carries this file when it IS a world.
   The world is the Open Space engine (sky, mood light, halo, models, lights, eggs, screens) with:
     · one land tile, 128 m × 128 m, centred on the origin — the ground wears the Floor texture + colour
     · a glowing edge you can walk to and not past, faint outlines where the next tiles will stitch on
     · the hexagon's walls / floor / roof / uplights / platform put away
     · models at their real size; a model can be SOLID (you can't walk through it) or carry BLOCK_ parts
     · DOORS: a model that opens a room — a glowing doorway (at its DOOR_ part, or its front), its name, a map pin;
       walk up → "Enter …", or tap the model / the door. Inside a Trio page: {trio:'open', room, name, from}
     · lights only switch on near you (far ones fade out) — phones stay smooth
     · a start spot, the corner map, arrow keys to walk, a weight read-out for the editor
   M.world = {size:128, start:{x,z,yaw}, map:true, next:true}. Edge colour = M.open.rim. */
(function(){
  const CORE=window.HEXCORE; if(!CORE||typeof THREE==='undefined') return;
  const TILE=128, HALF=TILE/2;
  const W={TILE};
  CORE.WORLD=W;
  const V3=THREE.Vector3;
  W.defaults=()=>({size:TILE, start:{x:0,z:40,yaw:0}, map:true, next:true});
  W.on=H=>!!(H&&H._world&&!H._world.dead);

  /* ---------- world-only built-ins (placeholders until the Blender pieces arrive) ---------- */
  const MB=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,metalness:0},o||{}));
  const GLOW=c=>new THREE.MeshBasicMaterial({color:c,toneMapped:false});
  const ADD=(c,o)=>new THREE.MeshBasicMaterial(Object.assign({color:c,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false},o||{}));
  function boxM(w,h,d,m){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); }
  if(CORE.PRIMS){
    CORE.PRIMS.wblock={label:'Building block', world:true, build(){ const g=new THREE.Group();
      const b=boxM(12,10,12,MB(0x433d52)); b.position.y=5; g.add(b);
      const r=boxM(12.3,.25,12.3,GLOW(0x8b7bff)); r.position.y=10; g.add(r);
      const s=boxM(5,.15,.1,GLOW(0xffffff)); s.position.set(0,8.2,6.06); g.add(s); return g; }};
    CORE.PRIMS.wtower={label:'Tower', world:true, build(){ const g=new THREE.Group();
      const b=boxM(8,26,8,MB(0x3a3548)); b.position.y=13; g.add(b);
      for(let i=1;i<6;i++){ const r=boxM(8.15,.12,8.15,GLOW(0x5fd0ff)); r.position.y=i*4.6; g.add(r); } return g; }};
    CORE.PRIMS.wlamp={label:'Lamp post', world:true, build(){ const g=new THREE.Group();
      const p=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,4.2,10),MB(0x1c1a22,{metalness:.6,roughness:.4})); p.position.y=2.1; g.add(p);
      const a=boxM(.9,.08,.12,MB(0x1c1a22,{metalness:.6})); a.position.set(.4,4.15,0); g.add(a);
      const h=new THREE.Mesh(new THREE.SphereGeometry(.2,14,10),GLOW(0xffe2b0)); h.position.set(.82,4,0); g.add(h);
      const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:0xffd59a,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.75}));
      gl.scale.setScalar(2.4); gl.position.copy(h.position); g.add(gl);
      const pool=new THREE.Mesh(new THREE.CircleGeometry(2.6,32),ADD(0xffc884,{opacity:.16,map:glowTex()})); pool.rotation.x=-Math.PI/2; pool.position.set(.82,.03,0); g.add(pool);
      return g; }};
    CORE.PRIMS.wdoor={label:'Doorway', world:true, build(){ const g=new THREE.Group();
      const f=boxM(3.4,4.2,.6,MB(0x24212c)); f.position.y=2.1; g.add(f);
      const d=doorMesh(0xff5fa2); d.position.z=.31; g.add(d); return g; }};
  }
  let GT=null;
  function glowTex(){ if(GT) return GT; const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d');
    const r=x.createRadialGradient(64,64,0,64,64,64); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.35,'rgba(255,255,255,.45)'); r.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=r; x.fillRect(0,0,128,128); GT=new THREE.CanvasTexture(c); return GT; }
  let DT=null;
  function doorTex(){ if(DT) return DT; const c=document.createElement('canvas'); c.width=64; c.height=128; const x=c.getContext('2d');
    const r=x.createLinearGradient(0,128,0,0); r.addColorStop(0,'rgba(255,255,255,.95)'); r.addColorStop(1,'rgba(255,255,255,.25)');
    x.fillStyle=r; x.fillRect(0,0,64,128); DT=new THREE.CanvasTexture(c); return DT; }
  /* a glowing doorway, 1.8 m × 3 m, facing +Z, feet on the ground */
  function doorMesh(col){ const g=new THREE.Group(); g.userData.isDoor=true; const c=new THREE.Color(col);
    const fm=GLOW(c.clone().multiplyScalar(1.6)); fm.userData.door=1;
    [[-.95,1.55,.12,3.1],[.95,1.55,.12,3.1],[0,3.1,2.02,.12]].forEach(([x,y,w,h])=>{ const b=boxM(w,h,.12,fm); b.position.set(x,y,0); g.add(b); });
    const p=new THREE.Mesh(new THREE.PlaneGeometry(1.78,3.04),new THREE.MeshBasicMaterial({color:c,map:doorTex(),transparent:true,opacity:.85,toneMapped:false,depthWrite:false}));
    p.position.set(0,1.52,.01); g.add(p);
    const pool=new THREE.Mesh(new THREE.CircleGeometry(2.4,32),ADD(c,{opacity:.3,map:glowTex()})); pool.rotation.x=-Math.PI/2; pool.position.set(0,.04,1); g.add(pool);
    g.userData.mats=[fm,p.material,pool.material]; return g; }
  function labelSprite(text,col){ const c=document.createElement('canvas'); c.width=1024; c.height=192; const x=c.getContext('2d');
    x.font='900 96px Anton,Impact,"Arial Narrow",Arial,sans-serif'; x.textAlign='center'; x.textBaseline='middle';
    x.shadowColor=col; x.shadowBlur=28; x.fillStyle='#ffffff'; x.fillText(String(text||'').toUpperCase().slice(0,22),512,100);
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,toneMapped:false})); s.scale.set(6,1.125,1); return s; }

  /* ---------- the land ---------- */
  function build(H){
    const X={g:new THREE.Group(), dead:false, doors:{}, blocks:[], lights:[], t:0};
    X.g.name='worldTile'; H.scene.add(X.g);
    X.groundMat=new THREE.MeshStandardMaterial({color:0x2b2a2e,roughness:.9,metalness:0});
    const gr=new THREE.Mesh(new THREE.PlaneGeometry(TILE,TILE),X.groundMat); gr.rotation.x=-Math.PI/2; gr.position.y=-.005; gr.userData.worldGround=true; X.g.add(gr); X.ground=gr;
    /* the edge: a thin bright line + a soft halo, and a glowing post at each corner */
    X.edgeMat=GLOW(0xf5d400); X.edgeHalo=ADD(0xf5d400,{opacity:.12});
    const strip=(x,z,w,d)=>{ const a=boxM(w,.06,d,X.edgeMat); a.position.set(x,.03,z); X.g.add(a);
      const b=boxM(w+(d<w?0:.9),.02,d+(w<d?0:.9),X.edgeHalo); b.position.set(x,.02,z); X.g.add(b); };
    strip(0,-HALF,TILE,.12); strip(0,HALF,TILE,.12); strip(-HALF,0,.12,TILE); strip(HALF,0,.12,TILE);
    [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>{ const p=boxM(.22,2.4,.22,X.edgeMat); p.position.set(a*HALF,1.2,b*HALF); X.g.add(p); });
    /* where the next tiles stitch on: faint squares round this one */
    X.next=new THREE.Group(); const nm=new THREE.MeshBasicMaterial({color:0x0e0d14}), lm=new THREE.LineBasicMaterial({color:0x34304c,transparent:true,opacity:.7});
    for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){ if(!i&&!j) continue;
      const q=new THREE.Mesh(new THREE.PlaneGeometry(TILE-1.5,TILE-1.5),nm); q.rotation.x=-Math.PI/2; q.position.set(i*TILE,-.05,j*TILE); X.next.add(q);
      const h=HALF-.75, pts=[[-h,-h],[h,-h],[h,h],[-h,h],[-h,-h]].map(([a,b])=>new V3(i*TILE+a,-.02,j*TILE+b));
      X.next.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lm)); }
    X.g.add(X.next);
    /* builder only: an 8 m grid to judge size by */
    /* a night sky big enough for the land (the room's own dome is only 46 m across) */
    X.sky=new THREE.Group(); X.sky.add(new THREE.Mesh(new THREE.SphereGeometry(760,32,16),new THREE.MeshBasicMaterial({color:0x0b0919,side:THREE.BackSide,fog:false,depthWrite:false})));
    { const sv=[]; for(let i=0;i<1800;i++){ const t=Math.random()*Math.PI*2, ph=Math.acos(Math.random()*.96); sv.push(700*Math.sin(ph)*Math.cos(t),700*Math.cos(ph)+10,700*Math.sin(ph)*Math.sin(t)); }
      const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.Float32BufferAttribute(sv,3));
      X.sky.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xc9c0ff,size:1.7,sizeAttenuation:false,transparent:true,opacity:.85,fog:false,depthWrite:false}))); }
    X.sky.children.forEach(o=>{ o.renderOrder=-3; o.frustumCulled=false; }); X.g.add(X.sky);
    /* a soft moonlight over the land, so streets and trees read at night (the mood's Room light still sets the level) */
    X.moon=new THREE.DirectionalLight(0xc4ccff,0); X.moon.position.set(-60,110,40); X.g.add(X.moon); X.g.add(X.moon.target);
    X.grid=new THREE.GridHelper(TILE,16,0x4a4470,0x2a2740); X.grid.position.y=.01; X.grid.material.transparent=true; X.grid.material.opacity=.35; X.g.add(X.grid);
    return X;
  }

  /* the ground wears the Floor texture, colour, bumpiness and shine */
  function syncGround(H, force){
    const X=H._world, S=H._mood, M=S&&S.M; if(!X||!M) return;
    const P=CORE.moodPack?CORE.moodPack(S.tex,M.floor,32,32):null;
    const col=CORE.moodColor(M,'floor'), det=P&&P.map&&P.map.userData.detailTex?1:0, bump=M.bump==null?1:+M.bump, sh=M.shine==null?.4:+M.shine;
    const key=[M.floor,col,det,bump,sh].join('|'); if(!force&&X.gkey===key) return; X.gkey=key;
    const m=X.groundMat, t=col?CORE.tintFor(col,P):null;
    m.map=P?((t&&P.map.userData.detailTex)||P.map):null; m.normalMap=P?P.normalMap:null; m.roughnessMap=P?P.roughnessMap:null;
    if(t) m.color.copy(t); else m.color.set(P?0xffffff:0x2b2a2e);
    m.normalScale.set(bump,bump); m.roughness=1-sh*.75; m.metalness=M.floor==='metal'?.55:0;
    const gl=!!(P&&P.gloss); m.envMap=gl&&CORE.moodEnv?CORE.moodEnv(H):null; m.envMapIntensity=gl?.9:1; if(gl) m.roughness=Math.min(m.roughness,.55);
    m.needsUpdate=true; }

  /* the hexagon's own pieces go away in a world */
  function hideHex(H){ const S=H._mood;
    (H.walls||[]).forEach(w=>{ w.visible=false; }); if(H.floor) H.floor.visible=false;
    if(S){ if(S.ceil) S.ceil.visible=false; (S.ups||[]).forEach(u=>{ u.sp.visible=u.can.visible=u.lens.visible=false; });
      if(S.open&&S.open.g) S.open.g.visible=false; if(S.skyp&&S.skyp.sea) S.skyp.sea.visible=false; }
    (H.rigs||[]).forEach(r=>r.visible=false); if(H.aurora) H.aurora.visible=false;
    const X=H._world, night=((CORE.skyCfg(S&&S.M).sky)||'night')==='night';
    if(X&&X.sky){ X.sky.visible=night; if(H.stars) X.sky.rotation.y=H.stars.rotation.y; }
    if(H.dome) H.dome.visible=false; if(H.stars) H.stars.visible=false; }   /* the sky-glow curtains hang at room distance — not in a world */

  /* ---------- props: the list (builder: its look · baked: the bake) ---------- */
  W.props=()=>{ try{ return (CORE.WORLDPROPS&&CORE.WORLDPROPS())||((window.HEXBAKE&&window.HEXBAKE.props)||[]); }catch(e){ return []; } };
  const BX=new THREE.Box3(), TV=new V3();
  /* a model's footprint in its own frame (so a turned building keeps a true box), back in world space */
  function localBox(g){ const r=g.rotation.y, p=g.position.clone(); g.rotation.y=0; g.position.set(0,0,0); g.updateMatrixWorld(true);
    const b=new THREE.Box3(), sh=g.userData.shadow;                                 /* the soft contact shadow is wider than the model — leave it out */
    g.children.forEach(c=>{ if(c!==sh&&!c.isSprite&&!(c.userData&&(c.userData.isShadow||c.userData.glint))) b.expandByObject(c); });
    if(b.isEmpty()) b.setFromObject(g);
    g.rotation.y=r; g.position.copy(p); g.updateMatrixWorld(true); return b; }
  function scanProps(H){ const X=H._world; const list=W.props(); X.blocks=[]; const seen={};
    list.forEach(p=>{ const g=CORE.PROPG[p.id]; if(!g||!g.parent) return; seen[p.id]=1;
      const key=[p.pos,p.rot,p.scale,p.size,!!p.solid,JSON.stringify(p.door||null),g.children.length].join('|');
      let D=X.doors[p.id];
      if(!D||D.key!==key){ if(D) dropDoor(X,p.id); D=X.doors[p.id]={key,p};
        const lb=localBox(g); D.lb=lb; D.ry=g.rotation.y;
        /* DOOR_ parts and BLOCK_ parts the artist named in Blender */
        D.doorAt=null; D.blk=[]; D.own=false;
        g.updateMatrixWorld(true);
        g.traverse(o=>{ const n=String(o.name||'').toUpperCase();
          if(!D.doorAt&&n.indexOf('DOOR_')===0){ D.doorAt=o.getWorldPosition(new V3()); D.own=!!o.userData.ownDoor; }   /* v74: a building with its own door skips the generic doorway */
          if(o.userData.addonSync) D.sync=o.userData.addonSync;
          if(n.indexOf('BLOCK_')===0){ BX.setFromObject(o); if(!BX.isEmpty()) D.blk.push(BX.clone()); } });
        if(p.door&&p.door.on){ const col=p.door.color||'#ff5fa2';
          const dm=doorMesh(col); dm.userData.propId=p.id; dm.traverse(o=>{ o.userData.doorOf=p.id; });
          let at;
          if(D.doorAt) at=D.doorAt.clone().setY(0);
          else { const c=new V3((lb.min.x+lb.max.x)/2,0,lb.max.z+.02); at=c.applyAxisAngle(new V3(0,1,0),g.rotation.y).add(g.position).setY(0); }
          if(!D.own){ dm.position.copy(at); dm.rotation.y=g.rotation.y; X.g.add(dm); D.mesh=dm;
            const lab=labelSprite(p.door.name||p.name||'enter',col); lab.position.copy(at).setY(4.1); X.g.add(lab); D.label=lab; }
          D.at=at; D.col=col; } }
      if(p.solid){ const L=D.lb; const c=[[L.min.x,L.min.z],[L.max.x,L.min.z],[L.max.x,L.max.z],[L.min.x,L.max.z]].map(([x,z])=>new V3(x,0,z).applyAxisAngle(new V3(0,1,0),g.rotation.y).add(g.position));
        X.blocks.push({poly:c}); }
      D.blk.forEach(b=>{ X.blocks.push({box:b}); });
      if(D.sync) try{ D.sync(p,H); }catch(e){} });   /* v74: add-ons follow their model's settings (e.g. the sign lit) */
    (X.tileBlocks||[]).forEach(b=>X.blocks.push({box:b}));   /* v72: BLOCK_ parts of the ground pieces */
    Object.keys(X.doors).forEach(id=>{ if(!seen[id]) dropDoor(X,id); }); }
  function dropDoor(X,id){ const D=X.doors[id]; if(!D) return; [D.mesh,D.label].forEach(o=>{ if(o&&o.parent) o.parent.remove(o); }); delete X.doors[id]; }

  /* walking: the edge of the land, and anything solid */
  function pushOut(X,x,z,r){
    for(let k=0;k<X.blocks.length;k++){ const B=X.blocks[k];
      if(B.box){ const b=B.box; if(x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r){
          const d=[x-(b.min.x-r),(b.max.x+r)-x,z-(b.min.z-r),(b.max.z+r)-z], m=Math.min.apply(null,d);
          if(m===d[0]) x=b.min.x-r; else if(m===d[1]) x=b.max.x+r; else if(m===d[2]) z=b.min.z-r; else z=b.max.z+r; } }
      else if(B.poly){ const P=B.poly; /* a turned box: work in its own frame */
        const ax=new V3().subVectors(P[1],P[0]), az=new V3().subVectors(P[3],P[0]); const lx=ax.length(), lz=az.length(); if(lx<.01||lz<.01) continue; ax.divideScalar(lx); az.divideScalar(lz);
        const rx=x-P[0].x, rz=z-P[0].z; let u=rx*ax.x+rz*ax.z, v=rx*az.x+rz*az.z;
        if(u>-r&&u<lx+r&&v>-r&&v<lz+r){ const d=[u+r,lx+r-u,v+r,lz+r-v], m=Math.min.apply(null,d);
          if(m===d[0]) u=-r; else if(m===d[1]) u=lx+r; else if(m===d[2]) v=-r; else v=lz+r;
          x=P[0].x+ax.x*u+az.x*v; z=P[0].z+ax.z*u+az.z*v; } } }
    return {x,z}; }

  /* ---------- the corner map ---------- */
  function mapBoot(X){ if(X.mapEl) return; const c=document.createElement('canvas'); c.id='hexWorldMap'; c.width=c.height=300;
    c.style.cssText='position:fixed;z-index:30;top:calc(12px + env(safe-area-inset-top));left:12px;width:132px;height:132px;border-radius:14px;'+
      'background:rgba(8,7,14,.72);border:1px solid rgba(255,255,255,.14);pointer-events:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)';
    document.body.appendChild(c); X.mapEl=c; X.mapCtx=c.getContext('2d');
    if(!document.getElementById('hexWorldCss')){ const st=document.createElement('style'); st.id='hexWorldCss'; st.textContent='body.staging #hexWorldMap{top:64px!important}'; document.head.appendChild(st); } }
  function drawMap(H){ const X=H._world, x=X.mapCtx; if(!x) return; const Wd=300, k=Wd/(TILE*1.22), o=Wd/2; x.clearRect(0,0,Wd,Wd);
    const P=(a,b)=>[o+a*k,o+b*k];
    x.fillStyle='rgba(255,255,255,.05)'; x.fillRect(...P(-HALF,-HALF),TILE*k,TILE*k);
    { const M=H._mood&&H._mood.M, cl=M&&M.world&&M.world.map&&M.world.map.cells;   /* v72: the map's squares, coloured by kind */
      if(cl) cl.forEach((c,i)=>{ if(!c||!c.id) return; const pc=W.piece(c.id,M); if(!pc) return; const sz=pc.size===2?2:1, [cx,cz]=W.cellXZ(i,sz);
        x.fillStyle=String(pc.e||'').indexOf('R')>=0?'rgba(62,58,78,.95)':(pc.f==='N'?'rgba(64,112,66,.85)':'rgba(132,128,146,.7)'); x.fillRect(...P(cx-sz*8,cz-sz*8),sz*16*k+.5,sz*16*k+.5); }); }
    x.strokeStyle='#'+X.edgeMat.color.clone().multiplyScalar(1/1.6).getHexString(); x.lineWidth=3; x.strokeRect(...P(-HALF,-HALF),TILE*k,TILE*k);
    x.fillStyle='rgba(170,160,210,.38)';
    W.props().forEach(p=>{ const g=CORE.PROPG[p.id]; if(!g||!g.parent||g.visible===false||p.type==='switch') return; const D=X.doors[p.id];
      const L=D&&D.lb; if(!L||L.isEmpty()) return; if(L.max.y-L.min.y<.6&&!(p.door&&p.door.on)) return;
      x.save(); x.translate(...P(g.position.x,g.position.z)); x.rotate(-g.rotation.y);
      x.fillRect(L.min.x*k,L.min.z*k,Math.max(2,(L.max.x-L.min.x)*k),Math.max(2,(L.max.z-L.min.z)*k)); x.restore(); });
    Object.keys(X.doors).forEach(id=>{ const D=X.doors[id]; if(!D.at) return; x.fillStyle=D.col; x.beginPath(); x.arc(...P(D.at.x,D.at.z),8,0,7); x.fill();
      x.strokeStyle='#fff'; x.lineWidth=2; x.stroke(); });
    const cam=H.cam; if(!cam) return; const d=new V3(); cam.getWorldDirection(d);
    x.save(); x.translate(...P(cam.position.x,cam.position.z)); x.rotate(Math.atan2(d.x,-d.z)); x.fillStyle='#fff';
    x.beginPath(); x.moveTo(0,-13); x.lineTo(8,8); x.lineTo(0,4); x.lineTo(-8,8); x.closePath(); x.fill(); x.restore(); }

  /* ---------- doors: walk up → "Enter …", or tap ---------- */
  W.open=function(p){ const d=(p&&p.door)||{}; const name=d.name||p.name||'the room', url=String(d.url||'').trim();
    if(CORE.EDIT||!(window.HEXBAKE)){ if(CORE.toast) CORE.toast(url?('In the real world this opens '+name+'.'):('Give '+name+' a room link in the editor.')); return false; }
    if(CORE.post&&CORE.post({trio:'open', room:url, name, from:p.id})) return true;
    if(/^https?:\/\//i.test(url)){ location.href=url; return true; }
    if(CORE.toast) CORE.toast(name+' isn’t linked yet'); return false; };
  function chipBoot(X){ if(X.chip) return; const b=document.createElement('button'); b.id='hexWorldEnter';
    b.style.cssText='position:fixed;z-index:31;left:50%;bottom:calc(104px + env(safe-area-inset-bottom));transform:translateX(-50%) translateY(20px);opacity:0;pointer-events:none;'+
      'transition:opacity .25s,transform .25s;font:800 15px Manrope,Helvetica,Arial,sans-serif;letter-spacing:.02em;color:#fff;background:rgba(10,9,18,.86);'+
      'border:1.5px solid #fff;border-radius:999px;padding:13px 24px;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)';
    b.onclick=e=>{ e.stopPropagation(); if(X.near) W.open(X.near.p); };
    document.body.appendChild(b); X.chip=b; }
  function wireTaps(H){ if(W._tapWired||!H.canvas) return; W._tapWired=1;
    const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); let dn=null;
    H.canvas.addEventListener('pointerdown',e=>{ dn=[e.clientX,e.clientY]; },true);
    H.canvas.addEventListener('click',e=>{ const X=H._world; if(!X||X.dead||CORE.EDIT) return;
      if(dn&&Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>10) return; if(CORE.REELOPEN||CORE.EGGOPEN) return;
      ptr.x=e.clientX/innerWidth*2-1; ptr.y=-(e.clientY/innerHeight)*2+1; ray.setFromCamera(ptr,H.cam);
      let best=null; Object.keys(X.doors).forEach(id=>{ const D=X.doors[id]; if(!D.at) return; const g=CORE.PROPG[id];
        [D.mesh,g].forEach(o=>{ if(!o) return; const h=ray.intersectObject(o,true)[0]; if(h&&h.distance<60&&(!best||h.distance<best.d)) best={d:h.distance,D}; }); });
      if(!best) return; if(CORE.eggLive&&CORE.eggLive(best.D.p.id)) return;
      e.stopImmediatePropagation(); W.open(best.D.p); },true); }
  /* arrow keys walk too (W A S D still do) — in the editor they nudge a picked model instead */
  function keysBoot(){ if(W._keys) return; W._keys=1; const MAP={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};
    const on=(e,v)=>{ if(!CORE.WORLDON) return; const k=MAP[(e.key||'').toLowerCase()]; if(!k||!CORE.NAV) return;
      if(/INPUT|TEXTAREA|SELECT/.test((e.target&&e.target.tagName)||'')) return; if(v&&CORE.EDITSEL&&CORE.EDITSEL()) return;
      CORE.NAV.keys[k]=v; if(v) e.preventDefault(); };
    addEventListener('keydown',e=>on(e,true)); addEventListener('keyup',e=>on(e,false)); }

  /* ---------- lights: only the ones near you are on ---------- */
  function gatherLights(H){ const X=H._world, S=H._mood, skip=new Set(); (S&&S.ups||[]).forEach(u=>skip.add(u.sp));
    X.lights=[]; H.scene.traverse(o=>{ if((o.isSpotLight||o.isPointLight)&&!skip.has(o)&&!o.userData.wpool) X.lights.push(o); }); }
  const LP=new V3();
  function fadeLights(H){ const X=H._world, c=H.cam&&H.cam.position; if(!c) return;
    X.lights.forEach(L=>{ const u=L.userData; if(u._wL===undefined||Math.abs(L.intensity-u._wL)>1e-6) u._wB=L.intensity;
      L.getWorldPosition(LP); const d=LP.distanceTo(c), k=d<34?1:d>58?0:1-(d-34)/24;
      L.intensity=u._wB*k*k; u._wL=L.intensity; }); }

  /* ---------- the weight read-out (editor) ---------- */
  W.weight=function(){ let tris=0; const tex=new Set(); let models=0;
    W.props().forEach(p=>{ const g=CORE.PROPG[p.id]; if(!g) return; models++;
      g.traverse(o=>{ if(!o.isMesh||!o.geometry) return; const G=o.geometry; tris+=(G.index?G.index.count:(G.attributes.position?G.attributes.position.count:0))/3;
        (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(!m) return; ['map','normalMap','roughnessMap','emissiveMap','metalnessMap'].forEach(k=>{ if(m[k]&&m[k].image) tex.add(m[k]); }); }); }); });
    let px=0; tex.forEach(t=>{ const i=t.image; px+=(i.width||0)*(i.height||0); });
    const lights=(window.HEX&&window.HEX._world)?window.HEX._world.lights.length:0;
    const lvl=tris>300000||px>6*4194304?'red':(tris>150000||px>3*4194304?'amber':'green');
    return {tris:Math.round(tris), textures:tex.size, mpx:px/1048576, models, lights, level:lvl}; };


  /* ================= v72 · THE MAP: ground pieces on an 8 × 8 grid of 16 m squares =================
     M.world.map = {cells:[64 × null | {id, rot} | {cover:<anchor index>}]}   (rot = quarter turns clockwise; north = −z)
     M.world.lib = [{id, name, f:'N'|'C', e:'RCRC', size:1|2, asset}]       (pieces from the Blender kit, .glb)
     Built-in pieces (W.KIT) are stand-ins drawn here until the real kit arrives. Every piece is drawn ONCE and
     repeated (InstancedMesh per piece × material), so a whole map costs a handful of draw calls. */
  const SQ=16, NG=8, GH=SQ*NG/2;
  W.SQ=SQ; W.NG=NG;
  const KM={}; const km=(k,c,o)=>KM[k]||(KM[k]=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.9},o||{})));
  const MT={grass:()=>km('grass',0x3c6b3a), grass2:()=>km('grass2',0x4d7d3f), path:()=>km('path',0x7a6146), pave:()=>km('pave',0x77757e), walk:()=>km('walk',0x8c8a94),
    road:()=>km('road',0x2b2a31), line:()=>KM.line||(KM.line=new THREE.MeshBasicMaterial({color:0xe9e2b0})), trunk:()=>km('trunk',0x4a3424), leaf:()=>km('leaf',0x2f5e33), leaf2:()=>km('leaf2',0x3f7a3a),
    bush:()=>km('bush',0x3b6d36), rock:()=>km('rock',0x76737c,{flatShading:true}), water:()=>km('water',0x2f6fa8,{roughness:.15,metalness:.3}), lot:()=>km('lot',0x5b5650),
    bench:()=>km('bench',0x4a3b2e), pole:()=>km('pole',0x1c1b22,{metalness:.6,roughness:.4}), lamp:()=>KM.lamp||(KM.lamp=new THREE.MeshBasicMaterial({color:0xffe2a6,toneMapped:false})), edge:()=>km('edge',0xa19f9a), flower:()=>km('flower',0xd86fa8)};
  const kb=(g,w,h,d,m,x,y,z)=>{ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); g.add(o); return o; };
  const kc=(g,r1,r2,h,m,x,y,z,s)=>{ const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,s||8),m); o.position.set(x,y,z); g.add(o); return o; };
  let SEED=1; const rnd=()=>{ SEED=(SEED*16807)%2147483647; return SEED/2147483647; };
  function tree(g,x,z,s,alt){ s=s||1; kc(g,.18*s,.25*s,2*s,MT.trunk(),x,s,z,6);
    [[1.6,3.6,3.4],[1.2,2.6,4.8]].forEach(([r,h,y])=>{ const c=new THREE.Mesh(new THREE.ConeGeometry(r*s,h*s,7),alt?MT.leaf2():MT.leaf()); c.position.set(x,y*s,z); g.add(c); }); }
  function bush(g,x,z,s){ s=s||1; const b=new THREE.Mesh(new THREE.IcosahedronGeometry(.9*s,0),MT.bush()); b.position.set(x,.55*s,z); b.scale.y=.7; g.add(b); }
  function lampAt(g,x,z){ kc(g,.07,.1,5,MT.pole(),x,2.5,z,6); const h=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),MT.lamp()); h.position.set(x,5.05,z); g.add(h); }
  const gnd=(g,m)=>kb(g,SQ,.1,SQ,m,0,-.05,0);
  const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
  function roadP(g,ed,cul){ gnd(g,MT.walk()); const rd=(x,z,w,d)=>kb(g,w,.12,d,MT.road(),x,0,z); rd(0,0,10,10);
    ed.forEach((e,i)=>{ if(e!=='R') return; const [dx,dz]=DIRS[i]; rd(dx*6.5,dz*6.5,dx?3:10,dz?3:10); for(let k=0;k<2;k++){ const t=2.2+k*3.3; kb(g,dx?1.4:.18,.02,dz?1.4:.18,MT.line(),dx*t,.07,dz*t); } });
    if(cul){ const c=new THREE.Mesh(new THREE.CylinderGeometry(6.5,6.5,.12,28),MT.road()); c.position.set(0,0,1.5); g.add(c); }
    const nR=ed.filter(e=>e==='R').length;
    if(nR===2&&ed[0]==='R'&&ed[2]==='R'){ lampAt(g,-6.5,0); lampAt(g,6.5,0); } else if(nR===2&&ed[1]==='R'&&ed[2]==='R') lampAt(g,-6.5,-6.5); else { lampAt(g,-6.5,-6.5); lampAt(g,6.5,6.5); }
    if(nR===4) [[0,-5.4,1],[0,5.4,1],[-5.4,0,0],[5.4,0,0]].forEach(([x,z,h])=>{ for(let k=-2;k<=2;k++) kb(g,h?.6:1.6,.02,h?1.6:.6,MT.line(),x+(h?k*1.6:0),.07,z+(h?0:k*1.6)); }); }
  function pathP(g,ed){ gnd(g,MT.grass()); const pd=(x,z,w,d)=>kb(g,w,.11,d,MT.path(),x,0,z); pd(0,0,3,3);
    ed.forEach((e,i)=>{ if(e!=='P') return; const [dx,dz]=DIRS[i]; pd(dx*4.75,dz*4.75,dx?6.5:3,dz?6.5:3); });
    [[-5,-5],[5,-5],[-5,5],[5,5],[-6.5,0],[6.5,0],[0,6.5],[0,-6.5]].forEach(([x,z],i)=>{
      const blocked=ed.some((e,j)=>e==='P'&&((DIRS[j][0]&&Math.sign(x)===DIRS[j][0]&&Math.abs(z)<2)||(DIRS[j][1]&&Math.sign(z)===DIRS[j][1]&&Math.abs(x)<2)));
      if(!blocked){ if(i%3) bush(g,x,z); else tree(g,x,z,.95,i%2); } }); }
  W.KIT=[
   {id:'N01',f:'N',name:'Meadow',e:'NNNN',b:g=>{ gnd(g,MT.grass2()); for(let i=0;i<26;i++) kb(g,.35,.25,.35,i%3?MT.flower():MT.grass(),(rnd()-.5)*14,.1,(rnd()-.5)*14); kb(g,.9,.6,.8,MT.rock(),4,.3,-3); }},
   {id:'N02',f:'N',name:'Bushes',e:'NNNN',b:g=>{ gnd(g,MT.grass()); for(let i=0;i<9;i++) bush(g,(rnd()-.5)*13,(rnd()-.5)*13,.8+rnd()*.6); }},
   {id:'N03',f:'N',name:'Light forest',e:'NNNN',b:g=>{ gnd(g,MT.grass()); [[-4.5,-4],[3.5,-5],[5,2.5],[-3,4.5],[.5,.5],[-6,.5]].forEach(([x,z],i)=>tree(g,x,z,1+rnd()*.25,i%2)); bush(g,2,5.5); bush(g,-1,-6); }},
   {id:'N04',f:'N',name:'Dense forest',e:'NNNN',b:g=>{ gnd(g,MT.grass()); for(let i=0;i<15;i++) tree(g,(rnd()-.5)*13.5,(rnd()-.5)*13.5,.9+rnd()*.4,i%2); for(let i=0;i<5;i++) bush(g,(rnd()-.5)*13,(rnd()-.5)*13); }},
   {id:'N05',f:'N',name:'Path straight',e:'PNPN',b:g=>pathP(g,['P','N','P','N'])},
   {id:'N06',f:'N',name:'Path corner',e:'PPNN',b:g=>pathP(g,['P','P','N','N'])},
   {id:'N07',f:'N',name:'Path fork',e:'PPPN',b:g=>pathP(g,['P','P','P','N'])},
   {id:'N08',f:'N',name:'Clearing',e:'NNNN',b:g=>{ gnd(g,MT.grass2()); for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; tree(g,Math.cos(a)*6.4,Math.sin(a)*6.4,.9,i%2); } }},
   {id:'N09',f:'N',name:'Rocks & hill',e:'NNNN',b:g=>{ gnd(g,MT.grass()); const h=new THREE.Mesh(new THREE.SphereGeometry(5.5,16,10,0,Math.PI*2,0,Math.PI/2),MT.grass2()); h.scale.y=.45; g.add(h);
     [[3,2],[-2,3.5],[4,-3]].forEach(([x,z])=>kb(g,1.4,1,1.2,MT.rock(),x,.8,z)); tree(g,-5.5,-5,1); }},
   {id:'N10',f:'N',name:'Pond',e:'NNNN',b:g=>{ gnd(g,MT.grass()); const w=new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.2,.08,28),MT.water()); w.position.y=.02; w.scale.z=.8; g.add(w);
     for(let i=0;i<8;i++){ const a=i/8*6.28; kb(g,.7,.4,.6,MT.rock(),Math.cos(a)*5.6,.2,Math.sin(a)*4.6); } bush(g,-6.5,-6); tree(g,6,6,.9); }},
   {id:'C01',f:'C',name:'Road straight',e:'RCRC',b:g=>roadP(g,['R','C','R','C'])},
   {id:'C02',f:'C',name:'Road corner',e:'RRCC',b:g=>roadP(g,['R','R','C','C'])},
   {id:'C03',f:'C',name:'T-junction',e:'RRRC',b:g=>roadP(g,['R','R','R','C'])},
   {id:'C04',f:'C',name:'Crossroads',e:'RRRR',b:g=>roadP(g,['R','R','R','R'])},
   {id:'C05',f:'C',name:'Cul-de-sac',e:'RCCC',b:g=>roadP(g,['R','C','C','C'],true)},
   {id:'C07',f:'C',name:'Boulevard',e:'RCRC',b:g=>{ roadP(g,['R','C','R','C']); tree(g,-6.5,-5,.75); tree(g,6.5,5,.75,1); }},
   {id:'C08',f:'C',name:'Plaza',e:'CCCC',b:g=>{ gnd(g,MT.pave()); kc(g,2.2,2.4,.6,MT.edge(),0,.3,0,20); kc(g,1.9,1.9,.1,MT.water(),0,.62,0,20);
     [[-5,-5],[5,-5],[-5,5],[5,5]].forEach(([x,z])=>{ kb(g,1.6,.8,1.6,MT.edge(),x,.4,z); bush(g,x,z,.7); }); kb(g,2.4,.45,.6,MT.bench(),0,.25,-5.5); kb(g,2.4,.45,.6,MT.bench(),0,.25,5.5); }},
   {id:'C09',f:'C',name:'Empty lot',e:'CCCC',b:g=>{ gnd(g,MT.walk()); kb(g,14,.12,14,MT.lot(),0,0,0); }},
   {id:'C10',f:'C',name:'City park',e:'CCCC',b:g=>{ gnd(g,MT.walk()); kb(g,14,.13,14,MT.grass2(),0,0,0); kb(g,14,.15,2,MT.pave(),0,0,0); kb(g,2,.15,14,MT.pave(),0,0,0);
     [[-4,-4],[4,-4],[-4,4],[4,4]].forEach(([x,z],i)=>tree(g,x,z,.85,i%2)); kb(g,2,.45,.6,MT.bench(),-3.5,.25,1.6); }},
   {id:'C11',f:'C',name:'Parking lot',e:'CCCC',b:g=>{ gnd(g,MT.walk()); kb(g,14,.12,14,MT.road(),0,0,0); for(let k=-3;k<=3;k++){ kb(g,.15,.02,4.5,MT.line(),k*2,.08,-4); kb(g,.15,.02,4.5,MT.line(),k*2,.08,4); } lampAt(g,0,0); }},
   {id:'C12',f:'C',name:'Town edge',e:'CNNN',b:g=>{ gnd(g,MT.grass()); kb(g,SQ,.12,6,MT.walk(),0,0,-5); kb(g,SQ,.2,.25,MT.edge(),0,.05,-2); tree(g,-4,4,.9); bush(g,4,3); bush(g,0,6); lampAt(g,5,-5); }}];
  W.KIT.forEach(k=>{ k.kit='orig'; });
  /* ================= v73 · the REALISTIC kit — room-quality textures (colour + bumps + shine), same edges as the Original kit =================
     Textures: window.HEXKITTEX in the builder; a baked world carries them in M.world.kittex (only when a Realistic piece is used).
     Lamps: the bulb is the only part that glows; a small pool of real lights follows you to the nearest lamps (phones stay smooth). */
  W.KITS=[{id:'orig',name:'Original'},{id:'real',name:'Realistic'}];
  W.LOW=(function(){ try{ return matchMedia('(pointer:coarse)').matches||Math.min(screen.width,screen.height)<820; }catch(e){ return false; } })();
  let KTSRC=null; const RTX={}; let TXP=0; const TXW=[];
  W.texBusy=()=>TXP>0; W.texReady=()=>new Promise(r=>{ if(TXP<=0) r(); else TXW.push(r); });   /* v75: the tray waits for textures before taking a piece's picture */
  W.useKitTex=src=>{ if(src&&!KTSRC) KTSRC=src; };
  function rtex(k,srgb){ if(RTX[k]) return RTX[k]; const src=KTSRC||window.HEXKITTEX||{}; if(!src[k]) return null;
    TXP++; const t=new THREE.TextureLoader().load(src[k],()=>{ if(--TXP<=0){ TXP=0; const w=TXW.splice(0); w.forEach(f=>f()); } },undefined,()=>{ if(--TXP<=0){ TXP=0; TXW.splice(0).forEach(f=>f()); } }); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.anisotropy=W.LOW?2:8; if(srgb) t.colorSpace=THREE.SRGBColorSpace; return RTX[k]=t; }
  let RM=null;
  function RMat(){ if(RM) return RM; const S=o=>new THREE.MeshStandardMaterial(Object.assign({roughness:1,metalness:0},o));
    RM={asphalt:S({map:rtex('asphalt_col',1),normalMap:rtex('asphalt_nrm'),roughnessMap:rtex('asphalt_rgh')}),
      slab:S({map:rtex('slab_col',1),normalMap:rtex('slab_nrm'),roughnessMap:rtex('slab_rgh')}),
      curb:S({map:rtex('curb_col',1),normalMap:rtex('curb_nrm'),roughness:.8}),
      ground:S({map:rtex('ground_col',1),normalMap:rtex('ground_nrm'),roughnessMap:rtex('ground_rgh')}),
      bark:S({map:rtex('bark_col',1),normalMap:rtex('bark_nrm'),roughness:.95}), rock:S({map:rtex('rock_col',1),normalMap:rtex('rock_nrm'),roughness:.9}),
      leaves:S({map:rtex('leaves',1),alphaTest:.5,side:THREE.DoubleSide,roughness:.8}), tuft:S({map:rtex('tuft',1),alphaTest:.4,side:THREE.DoubleSide,roughness:.9}),
      paint:S({map:rtex('paint',1),transparent:true,roughness:.7,polygonOffset:true,polygonOffsetFactor:-2,depthWrite:false}),
      pole:S({color:0x22232a,metalness:.85,roughness:.38}), iron:S({color:0x2a2a2e,metalness:.7,roughness:.55}),
      dirt:S({map:rtex('dirt_col',1),normalMap:rtex('dirt_nrm'),roughness:.96}), bed:S({map:rtex('dirt_col',1),normalMap:rtex('dirt_nrm'),color:0x6a5f55,roughness:.9,side:THREE.DoubleSide}),
      flowers:S({map:rtex('flowers',1),alphaTest:.45,side:THREE.DoubleSide,roughness:.85}), fern:S({map:rtex('fern',1),alphaTest:.45,side:THREE.DoubleSide,roughness:.85}),
      water:new THREE.MeshStandardMaterial({color:0x2a5a63,emissive:0x0b1c20,roughness:.05,metalness:.15,normalMap:rtex('water_nrm'),normalScale:new THREE.Vector2(.35,.35),transparent:true,opacity:.94}),
      lily:S({color:0x3d6b2a,roughness:.55,side:THREE.DoubleSide}), hydrant:S({color:0xa8261f,roughness:.45,metalness:.35}), bin:S({color:0x2c3a33,roughness:.6,metalness:.4}),
      glass:new THREE.MeshStandardMaterial({color:0xfff2d6,emissive:0xffcf8a,emissiveIntensity:3,roughness:.2,toneMapped:false})};
    RM.glass.userData.lampGlass=true;
    /* v79: batch 2 nature — birch bark + autumn leaves drawn here (seeded, same every load) */
    { let sd=11; const r=()=>{ sd=(sd*16807)%2147483647; return sd/2147483647; };
      const bc=document.createElement('canvas'); bc.width=64; bc.height=256; const bx=bc.getContext('2d'); bx.fillStyle='#e8e4d8'; bx.fillRect(0,0,64,256); bx.fillStyle='#d6d1c2'; for(let i=0;i<20;i++) bx.fillRect(0,r()*256,64,1+r()*2);
      bx.fillStyle='#1f1d1b'; for(let i=0;i<36;i++){ const y=r()*256, w=5+r()*22; bx.fillRect(r()*64,y,w,1+r()*3); }
      const bt=new THREE.CanvasTexture(bc); bt.colorSpace=THREE.SRGBColorSpace; bt.wrapS=bt.wrapT=THREE.RepeatWrapping; RM.birch=S({map:bt,roughness:.8});
      const leafT=cols=>{ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'); for(let i=0;i<80;i++){ x.fillStyle=cols[i%cols.length]; x.beginPath(); x.ellipse(12+r()*104,12+r()*104,5+r()*7,3+r()*4,r()*3,0,6.3); x.fill(); } const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; };
      RM.autumn=S({map:leafT(['#e8892c','#f2b23a','#d9572a','#b8401f']),alphaTest:.5,side:THREE.DoubleSide,roughness:.8});
      RM.autumn2=S({map:leafT(['#c43a24','#e06a2a','#f0a23a','#8f2a1c']),alphaTest:.5,side:THREE.DoubleSide,roughness:.8});
      RM.birchleaf=S({map:leafT(['#9cc24a','#b5d35a','#7fa83a','#c9dc6e']),alphaTest:.5,side:THREE.DoubleSide,roughness:.8});
      RM.litter=S({map:leafT(['#c8742a','#a8441f','#d99a3a','#7a3a1c']),alphaTest:.5,roughness:.9}); }
    /* v80: batch 2 gothic — weathered stone, dead bark, swamp, mist */
    RM.deadbark=S({map:RM.bark.map,normalMap:RM.bark.normalMap,color:0x6b625a,roughness:.97});
    RM.stone=S({normalMap:RM.rock.normalMap,color:0x6a6f76,roughness:.95}); RM.darkstone=S({normalMap:RM.rock.normalMap,color:0x45494f,roughness:.95});
    RM.mud=S({map:RM.dirt.map,normalMap:RM.dirt.normalMap,color:0x6b5d48,roughness:.97}); RM.moss=S({map:RM.ground.map,normalMap:RM.ground.normalMap,color:0x7d8a66,roughness:1});
    RM.reed=S({map:RM.tuft.map,alphaTest:.4,side:THREE.DoubleSide,color:0xb3a874,roughness:.9});
    RM.swamp=new THREE.MeshStandardMaterial({color:0x22301f,emissive:0x060a05,roughness:.06,metalness:.25,normalMap:RM.water.normalMap,normalScale:new THREE.Vector2(.3,.3)});
    { const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d'), gr=x.createRadialGradient(64,64,0,64,64,64); gr.addColorStop(0,'rgba(190,204,212,.8)'); gr.addColorStop(.5,'rgba(190,204,212,.3)'); gr.addColorStop(1,'rgba(190,204,212,0)'); x.fillStyle=gr; x.fillRect(0,0,128,128);
      const t=new THREE.CanvasTexture(c); RM.mist=new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide,fog:true}); }
    return RM; }
  W.realMat=RMat;
  const uvm=(g,w,d,tile)=>{ const uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*w/tile,uv.getY(i)*d/tile); return g; };
  const rplane=(w,d,tile)=>{ const g=new THREE.PlaneGeometry(w,d); g.rotateX(-Math.PI/2); return uvm(g,w,d,tile); };
  function cards(n,size,rx,ry,cy,place){ const list=[], up=new V3(); for(let i=0;i<n;i++){ const q=new THREE.PlaneGeometry(size,size); const th=rnd()*Math.PI*2, ph=Math.acos(rnd()*2-1);
      const p=new V3(Math.sin(ph)*Math.cos(th)*rx,Math.cos(ph)*ry*.85,Math.sin(ph)*Math.sin(th)*rx);
      const mt=new THREE.Matrix4().lookAt(new V3(),new V3(rnd()-.5,rnd()-.5,rnd()-.5).normalize(),new V3(0,1,0)); mt.setPosition(p.x,p.y+cy,p.z); q.applyMatrix4(mt);
      const nr=q.attributes.normal, ps=q.attributes.position; for(let k=0;k<nr.count;k++){ up.set(ps.getX(k),ps.getY(k)-cy,ps.getZ(k)).normalize(); nr.setXYZ(k,up.x,up.y*.8+.2,up.z); }
      if(place) q.applyMatrix4(place); list.push(q); } return list; }
  function joinGeo(list){ const pos=[],nor=[],uv=[]; list.forEach(G0=>{ const G=G0.index?G0.toNonIndexed():G0; pos.push(...G.attributes.position.array); nor.push(...G.attributes.normal.array); uv.push(...G.attributes.uv.array); });
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3)); g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); return g; }
  function forestReal(g){ const m=RMat(); g.add(new THREE.Mesh(rplane(SQ,SQ,8),m.ground));
    const leaf=[], bark=[];
    const tree=(x,z,s)=>{ const pl=new THREE.Matrix4().compose(new V3(x,0,z),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),rnd()*6.28),new V3(s,s,s));
      const tr=uvm(new THREE.CylinderGeometry(.13,.24,5.2,10),1,1,.5); tr.translate(0,2.6,0); tr.applyMatrix4(pl); bark.push(tr);
      for(let k=0;k<3;k++){ const b=uvm(new THREE.CylinderGeometry(.04,.08,1.6,6),1,1,.5), a=k*2.1+rnd(); b.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.sin(a)*.9,0,-Math.cos(a)*.9)).setPosition(Math.cos(a)*.45,3.6+k*.45,Math.sin(a)*.45)); b.applyMatrix4(pl); bark.push(b); }
      leaf.push(...cards(70,1.5,2,1.8,5.6,pl), ...cards(26,1.5,1.3,1.1,7.1,pl)); };
    [[-4.5,-4],[3.5,-5],[5,2.5],[-3,4.5],[.5,.5],[-6,.5]].forEach(([x,z])=>tree(x,z,.9+rnd()*.3));
    [[2,5.5,1],[-1,-6,.9],[6.4,-1.5,.8]].forEach(([x,z,s])=>leaf.push(...cards(26,1.5,.95*s,.55*s,.6*s,new THREE.Matrix4().makeTranslation(x,0,z))));
    g.add(new THREE.Mesh(joinGeo(bark),m.bark)); g.add(new THREE.Mesh(joinGeo(leaf),m.leaves));
    [[4,-2,1],[-5.6,5.6,1.4],[-1.5,2.8,.7]].forEach(([x,z,s])=>{ const geo=new THREE.IcosahedronGeometry(.6*s,2), p=geo.attributes.position;
      for(let i=0;i<p.count;i++){ const k=.8+rnd()*.35; p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.7,p.getZ(i)*k); } geo.computeVertexNormals(); const r=new THREE.Mesh(geo,m.rock); r.position.set(x,.15*s,z); g.add(r); });
    const tf=[]; for(let i=0;i<(W.LOW?34:60);i++){ const x=(rnd()-.5)*15, z=(rnd()-.5)*15, sz=.5+rnd()*.5, a=rnd()*3;
      for(let k=0;k<2;k++){ const q=new THREE.PlaneGeometry(.9*sz,.9*sz); q.translate(0,.45*sz,0); q.rotateY(a+k*Math.PI/2); q.translate(x,0,z); tf.push(q); } }
    g.add(new THREE.Mesh(joinGeo(tf),m.tuft)); }
  let LAMPS=null;   /* bulbs of the piece being built, in its own frame */
  /* v75: a street lamp standing at (x, y, z), its arm reaching toward (tx, tz) (or along ±x when given a face) */
  function rlamp(g,x,z,face,y,tx,tz){ const m=RMat(), L=new THREE.Group(); y=y||0; L.position.set(x,y,z);
    const rot=(tx!=null)?Math.atan2(-(tz-z),tx-x):(face<0?Math.PI:0); L.rotation.y=rot;
    const add=(geo,mat,px,py,pz,rz)=>{ const o=new THREE.Mesh(geo,mat); o.position.set(px,py,pz); if(rz) o.rotation.z=rz; L.add(o); };
    add(new THREE.CylinderGeometry(.07,.11,5.4,12),m.pole,0,2.7,0); add(new THREE.CylinderGeometry(.16,.2,.4,12),m.pole,0,.2,0);
    add(new THREE.CylinderGeometry(.04,.04,1.3,8),m.pole,.6,5.3,0,Math.PI/2); add(new THREE.CylinderGeometry(.12,.38,.28,16,1,true),m.pole,1.2,5.24,0);
    add(new THREE.SphereGeometry(.17,14,10),m.glass,1.2,5.08,0);
    if(LAMPS) LAMPS.push([x+Math.cos(rot)*1.2,y+5.0,z-Math.sin(rot)*1.2]); g.add(L); }
  /* ---------- v75 · Realistic streets: asphalt on top of the floor, raised sidewalks with real curbs ---------- */
  const SWH=.15, ASY=.02, PNY=.034;   /* sidewalk height, asphalt, paint */
  const arcPts=(cx,cz,r,a0,a1,n)=>{ const o=[]; for(let i=0;i<=n;i++){ const a=a0+(a1-a0)*i/n; o.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]); } return o; };
  /* a raised block from a flat outline [[x,z]…]: top = slab (or `top`), sides = curb stone. Sides on the tile edge or the middle seams stay hidden. */
  function slabPoly(g,pts,top,uvT){ const m=RMat(); top=top||m.slab; uvT=uvT||3;
    const P=pts.map(p=>new THREE.Vector2(p[0],p[1])), tri=THREE.ShapeUtils.triangulateShape(P,[]), pos=[], uv=[];
    tri.forEach(([a,b,c])=>{ let A=pts[a],B=pts[b],C=pts[c]; const cy=(B[1]-A[1])*(C[0]-A[0])-(B[0]-A[0])*(C[1]-A[1]); if(cy<0){ const t=B; B=C; C=t; }
      [A,B,C].forEach(q=>{ pos.push(q[0],SWH,q[1]); uv.push(q[0]/uvT,-q[1]/uvT); }); });
    const tg=new THREE.BufferGeometry(); tg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); tg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); tg.computeVertexNormals();
    g.add(new THREE.Mesh(tg,top));
    let ar=0; for(let i=0;i<pts.length;i++){ const p=pts[i], q=pts[(i+1)%pts.length]; ar+=p[0]*q[1]-q[0]*p[1]; }
    const wp=[], wn=[], wu=[], same=(a,b,k)=>Math.abs(a[k]-b[k])<1e-6&&(Math.abs(Math.abs(a[k])-8)<1e-6||Math.abs(a[k])<1e-6); let run=0;
    for(let i=0;i<pts.length;i++){ const p=pts[i], q=pts[(i+1)%pts.length]; if(same(p,q,0)||same(p,q,1)) continue;
      const dx=q[0]-p[0], dz=q[1]-p[1], L=Math.hypot(dx,dz); if(L<1e-6) continue; let nx=dz/L, nz=-dx/L; if(ar<0){ nx=-nx; nz=-nz; }
      const v=[[p[0],0,p[1],run],[q[0],0,q[1],run+L],[q[0],SWH,q[1],run+L],[p[0],SWH,p[1],run]];
      let order=[0,1,2,0,2,3]; const e1=[v[1][0]-v[0][0],0,v[1][2]-v[0][2]], cr=[-e1[2]*SWH, 0, e1[0]*SWH];   /* (v1-v0)×(v3-v0) */
      if(cr[0]*nx+cr[2]*nz<0) order=[0,2,1,0,3,2];
      order.forEach(k=>{ const w=v[k]; wp.push(w[0],w[1],w[2]); wn.push(nx,0,nz); wu.push(w[3]/1.2,w[1]/1.2); }); run+=L; }
    if(wp.length){ const wg=new THREE.BufferGeometry(); wg.setAttribute('position',new THREE.Float32BufferAttribute(wp,3)); wg.setAttribute('normal',new THREE.Float32BufferAttribute(wn,3)); wg.setAttribute('uv',new THREE.Float32BufferAttribute(wu,2)); g.add(new THREE.Mesh(wg,m.curb)); } }
  /* the sidewalk in one corner quarter of a road piece. ed = [N,E,S,W] edges, sx/sz = which quarter */
  function walkQuarter(g,ed,sx,sz){ const ez=ed[sz<0?0:2], ex=ed[sx>0?1:3]; let A;
    if(ez==='R'&&ex==='R') A=[[5,8],...arcPts(6.5,6.5,1.5,Math.PI,Math.PI*1.5,6),[8,5],[8,8]];
    else if(ez==='R') A=[[5,0],[8,0],[8,8],[5,8]];
    else if(ex==='R') A=[[0,5],[0,8],[8,8],[8,5]];
    else A=[[0,8],[8,8],[8,0],[5,0],...arcPts(1,1,4,0,Math.PI/2,10),[0,5]];
    slabPoly(g,A.map(([a,b])=>[a*sx,b*sz])); }
  function paint(g,x,z,w,d,ry){ const o=new THREE.Mesh(rplane(w,d,1),RMat().paint); o.position.set(x,PNY,z); if(ry) o.rotation.y=ry; g.add(o); return o; }
  function dashes(g,pts){ let carry=0; for(let i=0;i<pts.length-1;i++){ const [x0,z0]=pts[i], [x1,z1]=pts[i+1], L=Math.hypot(x1-x0,z1-z0), ry=Math.atan2(x1-x0,z1-z0);
      let t=carry; while(t<L){ const e=Math.min(L,t+2.2), c=(t+e)/2; if(e-t>.4) paint(g,x0+(x1-x0)*c/L,z0+(z1-z0)*c/L,.15,e-t,ry); t+=4; } carry=t-L; } }
  function zebra(g,cx,cz,roadZ){ for(let k=-4;k<=4;k++){ const o=k*1.05; if(roadZ) paint(g,cx+o,cz,.55,2.6); else paint(g,cx,cz+o,2.6,.55); } }
  function roadBase(g,ed){ const m=RMat(); const a=new THREE.Mesh(rplane(SQ,SQ,4),m.asphalt); a.position.y=ASY; g.add(a);
    [-1,1].forEach(sx=>[-1,1].forEach(sz=>walkQuarter(g,ed,sx,sz))); }
  function hydrant(g,x,z){ const m=RMat(), H=new THREE.Group(); H.position.set(x,SWH,z);
    const add=(geo,y)=>{ const o=new THREE.Mesh(geo,m.hydrant); o.position.y=y; H.add(o); return o; };
    add(new THREE.CylinderGeometry(.15,.17,.62,12),.31); add(new THREE.SphereGeometry(.16,12,8,0,Math.PI*2,0,Math.PI/2),.62);
    const n=add(new THREE.CylinderGeometry(.06,.06,.42,8),.42); n.rotation.z=Math.PI/2; g.add(H); }
  function bin(g,x,z){ const m=RMat(); const b=new THREE.Mesh(new THREE.CylinderGeometry(.27,.24,.86,14),m.bin); b.position.set(x,SWH+.43,z); g.add(b);
    const l=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,.06,14),m.iron); l.position.set(x,SWH+.89,z); g.add(l); }
  function roadReal(g){ const m=RMat(); roadBase(g,['R','C','R','C']);
    [-1,1].forEach(s=>{ paint(g,s*4.55,0,.14,SQ); rlamp(g,s*6.9,0,-s,SWH); });
    dashes(g,[[0,-8],[0,8]]);
    const mh=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.03,20),m.iron); mh.position.set(2.4,ASY+.012,3.2); g.add(mh);
    const gr=new THREE.Mesh(new THREE.BoxGeometry(.5,.03,.9),m.iron); gr.position.set(-4.62,ASY+.012,-5); g.add(gr); bin(g,-6.2,5.4); }
  function crosswalkReal(g){ roadBase(g,['R','C','R','C']);
    [-1,1].forEach(s=>{ paint(g,s*4.55,-5.4,.14,5.2); paint(g,s*4.55,5.4,.14,5.2); paint(g,s*2.5,s*2.6,5,.4); rlamp(g,s*6.9,s*-2.4,-s,SWH); });
    dashes(g,[[0,-8],[0,-3.2]]); dashes(g,[[0,3.2],[0,8]]); zebra(g,0,0,true); bin(g,6.3,3.6); hydrant(g,-6.1,4.8); }
  function cornerReal(g){ roadBase(g,['R','R','C','C']);
    dashes(g,[[0,-8],[0,-5],...arcPts(5,-5,5,Math.PI,Math.PI/2,12).slice(1),[8,0]]);
    rlamp(g,-5.6,5.6,1,SWH,-1,1); rlamp(g,6.9,-6.9,1,SWH,4,-4); hydrant(g,-7,2.5); bin(g,2.5,7); }
  function teeReal(g){ roadBase(g,['R','R','R','C']);
    dashes(g,[[0,-8],[0,8]]); zebra(g,6.5,0,false); paint(g,4.7,2.6,.4,5);
    rlamp(g,-6.9,0,1,SWH); rlamp(g,6.9,-6.9,1,SWH,4,-4); rlamp(g,6.9,6.9,1,SWH,4,4); bin(g,-6.3,-4); hydrant(g,-6.2,4.5); }
  function crossReal(g){ roadBase(g,['R','R','R','R']);
    zebra(g,0,-6.5,true); zebra(g,0,6.5,true); zebra(g,-6.5,0,false); zebra(g,6.5,0,false);
    rlamp(g,-6.9,-6.9,1,SWH,-4,-4); rlamp(g,6.9,6.9,1,SWH,4,4); hydrant(g,6.8,-6.6); }
  function culReal(g){ const m=RMat(); const a=new THREE.Mesh(rplane(SQ,SQ,4),m.asphalt); a.position.y=ASY; g.add(a);
    const cz=.5, r=6.2, z0=cz-Math.sqrt(r*r-25), t0=Math.atan2(z0-cz,-5), t1=Math.atan2(z0-cz,5)-Math.PI*2;
    slabPoly(g,[[-8,-8],[-5,-8],...arcPts(0,cz,r,t0,t1,28),[5,-8],[8,-8],[8,8],[-8,8]]);
    const isl=arcPts(0,cz,2.1,0,Math.PI*2,20).slice(0,-1); slabPoly(g,isl,m.ground,4);
    const leaf=[], bark=[]; rtree(leaf,bark,0,cz,.75); g.add(new THREE.Mesh(joinGeo(bark),m.bark)); g.add(new THREE.Mesh(joinGeo(leaf),m.leaves));
    const tf=[]; for(let i=0;i<10;i++){ const a=rnd()*6.28, d=.4+rnd()*1.4; tuft(tf,Math.cos(a)*d,cz+Math.sin(a)*d,.6,SWH); } g.add(new THREE.Mesh(joinGeo(tf),m.tuft));
    [-1,1].forEach(s=>paint(g,s*4.55,-6,.14,4)); dashes(g,[[0,-8],[0,-4]]);
    rlamp(g,-6.6,-5,1,SWH,-3,-5); rlamp(g,6.6,3.5,1,SWH,3,2); bin(g,-6.4,5.8); }
  /* ---------- v75 · Realistic nature: shared trees, rocks, tufts, flowers, ferns, dirt paths, water ---------- */
  function rtree(leaf,bark,x,z,s){ const pl=new THREE.Matrix4().compose(new V3(x,0,z),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),rnd()*6.28),new V3(s,s,s));
    const tr=uvm(new THREE.CylinderGeometry(.13,.24,5.2,10),1,1,.5); tr.translate(0,2.6,0); tr.applyMatrix4(pl); bark.push(tr);
    for(let k=0;k<3;k++){ const b=uvm(new THREE.CylinderGeometry(.04,.08,1.6,6),1,1,.5), a=k*2.1+rnd(); b.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.sin(a)*.9,0,-Math.cos(a)*.9)).setPosition(Math.cos(a)*.45,3.6+k*.45,Math.sin(a)*.45)); b.applyMatrix4(pl); bark.push(b); }
    leaf.push(...cards(70,1.5,2,1.8,5.6,pl), ...cards(26,1.5,1.3,1.1,7.1,pl)); }
  function rbush(leaf,x,z,s){ leaf.push(...cards(26,1.5,.95*s,.55*s,.6*s,new THREE.Matrix4().makeTranslation(x,0,z))); }
  function rrock(g,x,z,s,y){ const geo=new THREE.IcosahedronGeometry(.6*s,2), p=geo.attributes.position;
    for(let i=0;i<p.count;i++){ const k=.8+rnd()*.35; p.setXYZ(i,p.getX(i)*k,p.getY(i)*k*.7,p.getZ(i)*k); } geo.computeVertexNormals(); const r=new THREE.Mesh(geo,RMat().rock); r.position.set(x,(y||0)+.15*s,z); g.add(r); return r; }
  function tuft(list,x,z,sz,y,h){ const a=rnd()*3; h=h||1; for(let k=0;k<2;k++){ const q=new THREE.PlaneGeometry(.9*sz,.9*sz*h); q.translate(0,.45*sz*h+(y||0),0); q.rotateY(a+k*Math.PI/2); q.translate(x,0,z); list.push(q); } }
  function rlog(bark,x,z,len,a){ const c=uvm(new THREE.CylinderGeometry(.26,.3,len,10),1,1,.5); c.rotateZ(Math.PI/2); c.rotateY(a); c.translate(x,.26,z); bark.push(c); }
  function groundReal(g){ g.add(new THREE.Mesh(rplane(SQ,SQ,8),RMat().ground)); }
  function finish(g,lists){ const m=RMat(); Object.keys(lists).forEach(k=>{ if(lists[k].length) g.add(new THREE.Mesh(joinGeo(lists[k]),m[k])); }); }
  function meadowReal(g){ groundReal(g); const L={tuft:[],flowers:[],leaves:[],bark:[]};
    for(let i=0;i<(W.LOW?70:130);i++) tuft(L.tuft,(rnd()-.5)*15.4,(rnd()-.5)*15.4,.5+rnd()*.55);
    for(let i=0;i<(W.LOW?40:80);i++){ const cx=(rnd()-.5)*14, cz=(rnd()-.5)*14; tuft(L.flowers,cx,cz,1+rnd()*.6); if(rnd()<.5) tuft(L.flowers,cx+(rnd()-.5)*.8,cz+(rnd()-.5)*.8,.8+rnd()*.5); }
    rtree(L.leaves,L.bark,4.6,-4.2,1.05); rbush(L.leaves,-5,4.5,1.1); rbush(L.leaves,-4,5.6,.8);
    finish(g,L); rrock(g,1.5,3,.9); rrock(g,-5.5,-3,.7); }
  function denseReal(g){ groundReal(g); const L={leaves:[],bark:[],fern:[],tuft:[]};
    [[-5.5,-5.5],[-1.5,-6],[3,-6.2],[6.2,-3.5],[-6.2,-1.2],[-2.5,-2.2],[1.8,-1.6],[5.8,1.2],[-4.8,3],[-.8,2.2],[3.2,3.8],[6.2,6.2],[-6.4,6.4],[-1.6,6.4]]
      .forEach(([x,z])=>rtree(L.leaves,L.bark,x+(rnd()-.5),z+(rnd()-.5),1.05+rnd()*.35));
    [[0,-4,1],[4.5,-1,.9],[-3.5,5.5,1.1],[2,6.6,.8],[-6.5,-3.5,.9]].forEach(([x,z,s])=>rbush(L.leaves,x,z,s));
    for(let i=0;i<(W.LOW?18:32);i++) tuft(L.fern,(rnd()-.5)*15,(rnd()-.5)*15,1.3+rnd()*.7);
    for(let i=0;i<(W.LOW?20:36);i++) tuft(L.tuft,(rnd()-.5)*15,(rnd()-.5)*15,.45+rnd()*.4);
    rlog(L.bark,1.2,4.6,4.4,.6); finish(g,L); rrock(g,-3.2,-.2,1.3); rrock(g,4.8,4.6,.9); rrock(g,.4,4.9,.5,.3); }
  /* a dirt path: a ribbon along pts, 2.6 m wide, grass creeping in at its edges */
  function ribbon(pts,w,y){ const pos=[], uv=[], idx=[]; let run=0;
    for(let i=0;i<pts.length;i++){ const p=pts[i], a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)]; let tx=b[0]-a[0], tz=b[1]-a[1]; const l=Math.hypot(tx,tz); tx/=l; tz/=l;
      if(i) run+=Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]); const ww=w/2*(1+(rnd()-.5)*.18);
      pos.push(p[0]-tz*ww,y,p[1]+tx*ww, p[0]+tz*ww,y,p[1]-tx*ww); uv.push(0,run/3, w/3,run/3);
      if(i){ const k=i*2; idx.push(k-2,k,k-1, k-1,k,k+1); } }
    const G=new THREE.BufferGeometry(); G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); G.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); G.setIndex(idx); G.computeVertexNormals();
    const n=G.attributes.normal; for(let i=0;i<n.count;i++) n.setXYZ(i,0,1,0); return G; }
  const lineN=(f,n)=>{ const o=[]; for(let i=0;i<=n;i++) o.push(f(i/n)); return o; };
  function pathReal(g,lines){ groundReal(g); const m=RMat(), L={leaves:[],bark:[],tuft:[],flowers:[]};
    lines.forEach((pts,k)=>{ g.add(new THREE.Mesh(ribbon(pts,2.6,.015+k*.004),m.dirt));
      pts.forEach((p,i)=>{ if(i%2) return; const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)]; let tx=b[0]-a[0], tz=b[1]-a[1]; const l=Math.hypot(tx,tz)||1; tx/=l; tz/=l;
        [-1,1].forEach(s=>{ const d=1.25+rnd()*.35; tuft(L.tuft,p[0]-tz*d*s,p[1]+tx*d*s,.45+rnd()*.35); }); }); });
    const near=(x,z,r)=>lines.some(pts=>pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<r));
    const spots=[[-5.2,-5.2],[5.2,-5.2],[-5.2,5.2],[5.2,5.2],[-6.4,0],[6.4,0],[0,6.4],[0,-6.4],[-3.2,-6.6],[3.4,6.6],[6.6,-3],[-6.6,3]];
    spots.forEach(([x,z],i)=>{ if(near(x,z,3.4)) return; if(i%4===0) rtree(L.leaves,L.bark,x,z,.8+rnd()*.25); else if(i%4===1) rbush(L.leaves,x,z,.9+rnd()*.4); else { tuft(L.flowers,x,z,1.1); tuft(L.flowers,x+.6,z-.4,.9); } });
    for(let i=0;i<(W.LOW?40:80);i++){ const x=(rnd()-.5)*15, z=(rnd()-.5)*15; if(!near(x,z,1.9)) tuft(L.tuft,x,z,.45+rnd()*.45); }
    finish(g,L); for(let i=0;i<5;i++){ const x=(rnd()-.5)*14, z=(rnd()-.5)*14; if(!near(x,z,2)) rrock(g,x,z,.35+rnd()*.4); } }
  const wig=(t,amp)=>Math.sin(t*Math.PI)*amp;
  const pathNS=()=>lineN(t=>[wig(t,.9),-8+16*t],32);
  /* v75: the pond sits in a low grassy rim so nothing dips under the world floor */
  function pondReal(g){ const m=RMat(), RX=4.8, RZ=3.9, cz=0, n=56;
    const ring=(k0,y0,k1,y1,mat,us)=>{ const bp=[], bu=[], bi=[]; for(let i=0;i<=n;i++){ const a=i/n*Math.PI*2, c=Math.cos(a), s=-Math.sin(a);
        bp.push(c*RX*k0,y0,cz+s*RZ*k0, c*RX*k1,y1,cz+s*RZ*k1); if(us){ bu.push(c*RX*k0/us,-(cz+s*RZ*k0)/us, c*RX*k1/us,-(cz+s*RZ*k1)/us); } else bu.push(i/n*8,0, i/n*8,.5); if(i){ const k=i*2; bi.push(k-2,k,k-1, k-1,k,k+1); } }
      const G=new THREE.BufferGeometry(); G.setAttribute('position',new THREE.Float32BufferAttribute(bp,3)); G.setAttribute('uv',new THREE.Float32BufferAttribute(bu,2)); G.setIndex(bi); G.computeVertexNormals(); g.add(new THREE.Mesh(G,mat)); };
    const sh=new THREE.Shape(); sh.moveTo(-8,-8); sh.lineTo(8,-8); sh.lineTo(8,8); sh.lineTo(-8,8); sh.lineTo(-8,-8);
    const hole=new THREE.Path(); hole.absellipse(0,cz,RX*1.45,RZ*1.45,0,Math.PI*2,true); sh.holes.push(hole);
    const gg=new THREE.ShapeGeometry(sh,n); gg.rotateX(-Math.PI/2); const gp=gg.attributes.position, gu=gg.attributes.uv; for(let i=0;i<gp.count;i++) gu.setXY(i,gp.getX(i)/8,-gp.getZ(i)/8);
    g.add(new THREE.Mesh(gg,m.ground));
    ring(1.45,0,1,.32,m.ground,8); ring(1,.32,.72,.04,m.bed);
    const fl=new THREE.Mesh(new THREE.CircleGeometry(1,40),m.bed); fl.rotation.x=-Math.PI/2; fl.scale.set(RX*.73,RZ*.73,1); fl.position.set(0,.04,cz); g.add(fl);
    const wg=new THREE.CircleGeometry(1,48); wg.rotateX(-Math.PI/2); wg.scale(RX*.91,1,RZ*.91); const wp=wg.attributes.position, wu=wg.attributes.uv; for(let i=0;i<wp.count;i++) wu.setXY(i,wp.getX(i)/4,-wp.getZ(i)/4);
    const wt=new THREE.Mesh(wg,m.water); wt.position.set(0,.22,cz); g.add(wt);
    const lp=[]; for(let i=0;i<9;i++){ const a=rnd()*6.28, d=.3+rnd()*.5, r=.26+rnd()*.2; const q=new THREE.CircleGeometry(r,10,.3,6.28-.6); q.rotateX(-Math.PI/2); q.rotateY(rnd()*6.28); q.translate(Math.cos(a)*RX*d,.232,cz+Math.sin(a)*RZ*d); lp.push(q); }
    g.add(new THREE.Mesh(joinGeo(lp),m.lily));
    const L={leaves:[],bark:[],tuft:[],fern:[],flowers:[]};
    for(let i=0;i<24;i++){ const a=rnd()*6.28; if(Math.cos(a)>.55&&Math.sin(a)>-.2) continue; const k=.9+rnd()*.12; tuft(L.tuft,Math.cos(a)*RX*k,cz+Math.sin(a)*RZ*k,.7+rnd()*.4,.18,2.1); }
    for(let i=0;i<50;i++){ const x=(rnd()-.5)*15.4, z=(rnd()-.5)*15.4; if((x*x)/(RX*RX*2.2)+((z-cz)*(z-cz))/(RZ*RZ*2.2)<1) continue; tuft(L.tuft,x,z,.5+rnd()*.4); }
    rtree(L.leaves,L.bark,6.6,-6.4,1); rtree(L.leaves,L.bark,-6.6,-6.2,.9); rbush(L.leaves,-6.8,6.2,1.1); rbush(L.leaves,6.8,6.6,.9);
    for(let i=0;i<5;i++) tuft(L.fern,6.2+(rnd()-.5)*2,-5.2+(rnd()-.5)*2,1.3); tuft(L.flowers,-2,6.9,1.1); tuft(L.flowers,3.5,-6.9,1.1); tuft(L.flowers,-7,1.5,1.1);
    finish(g,L);
    for(let i=0;i<10;i++){ const a=(i/10)*6.28+rnd()*.3; if(Math.cos(a)<-.4&&Math.sin(a)<.2) continue; rrock(g,Math.cos(a)*RX*1.02,cz-Math.sin(a)*RZ*1.02,.6+rnd()*.5,.18); } }
  /* ---------- v79 · Realistic kit batch 2: streams, flower meadow, birch grove, autumn forest, boulder hill ---------- */
  /* a stream: raised grassy banks, a muddy bed and water at .2 m — nothing dips under the world floor. Edge 'W' only joins another stream. */
  function bankStrip(pts,prof,mat,list){ const pos=[], uv=[], idx=[], n=prof.length; let run=0;
    for(let i=0;i<pts.length;i++){ const p=pts[i], a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)]; let tx=b[0]-a[0], tz=b[1]-a[1]; const l=Math.hypot(tx,tz)||1; tx/=l; tz/=l;
      if(i) run+=Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]);
      prof.forEach(([o,y])=>{ pos.push(p[0]-tz*o,y,p[1]+tx*o); uv.push(o/3,run/3); });
      if(i) for(let k=0;k<n-1;k++){ const A=(i-1)*n+k, B=i*n+k; idx.push(A,A+1,B, A+1,B+1,B); } }
    const G=new THREE.BufferGeometry(); G.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); G.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2)); G.setIndex(idx); G.computeVertexNormals();
    const nr=G.attributes.normal; for(let i=0;i<nr.count;i++) if(nr.getY(i)<0) nr.setXYZ(i,-nr.getX(i),-nr.getY(i),-nr.getZ(i));
    return G; }
  const W0=1.4, W1=2.2, W2=3.3, BK=.32, WY=.2, WW=1.98;
  function streamBed(g,lines,pool){ const m=RMat();
    const near=(x,z,r)=>lines.some(pts=>pts.some(p=>Math.hypot(p[0]-x,p[1]-z)<r))||(pool&&Math.hypot(x-pool[0],z-pool[1])<pool[2]+r);
    /* the grass around: a ground with the stream's corridor left open */
    const cell=1, gpos=[], guv=[]; for(let x=-8;x<8;x+=cell) for(let z=-8;z<8;z+=cell){ const cx=x+cell/2, cz=z+cell/2; if(near(cx,cz,W2-.75)) continue;
      gpos.push(x,0,z, x,0,z+cell, x+cell,0,z, x+cell,0,z, x,0,z+cell, x+cell,0,z+cell); guv.push(x/8,-z/8, x/8,-(z+cell)/8, (x+cell)/8,-z/8, (x+cell)/8,-z/8, x/8,-(z+cell)/8, (x+cell)/8,-(z+cell)/8); }
    const GG=new THREE.BufferGeometry(); GG.setAttribute('position',new THREE.Float32BufferAttribute(gpos,3)); GG.setAttribute('uv',new THREE.Float32BufferAttribute(guv,2)); GG.computeVertexNormals(); g.add(new THREE.Mesh(GG,m.ground));
    lines.forEach(pts=>{ g.add(new THREE.Mesh(bankStrip(pts,[[-W2,0],[-W1,BK]],m.ground),m.ground)); g.add(new THREE.Mesh(bankStrip(pts,[[W1,BK],[W2,0]],m.ground),m.ground));
      g.add(new THREE.Mesh(bankStrip(pts,[[-W1,BK],[-W0,.04],[W0,.04],[W1,BK]],m.bed),m.bed));
      g.add(new THREE.Mesh(bankStrip(pts,[[-WW,WY],[WW,WY]],m.water),m.water)); });
    return near; }
  const sCurve=t=>Math.sin(2*Math.PI*t)*Math.sin(Math.PI*t)*1.3;
  const streamNS=()=>lineN(t=>[sCurve(t),-8+16*t],40);
  function streamSides(g,near){ const L={leaves:[],bark:[],tuft:[],fern:[],flowers:[]};
    for(let i=0;i<(W.LOW?50:90);i++){ const x=(rnd()-.5)*15.4, z=(rnd()-.5)*15.4; if(near(x,z,W2-.4)) continue; tuft(L.tuft,x,z,.5+rnd()*.45); }
    [[-5.6,-5.2],[5.6,4.6],[-5.6,4.4],[5.4,-5.4]].forEach(([x,z],i)=>{ if(near(x,z,3.2)) return; if(i%2) rbush(L.leaves,x,z,1); else rtree(L.leaves,L.bark,x,z,.85+rnd()*.25); });
    return L; }
  function streamReal(g,lines,pool){ const near=streamBed(g,lines,pool), L=streamSides(g,near), m=RMat();
    lines.forEach(pts=>pts.forEach((p,i)=>{ if(i%3) return; const a=pts[Math.max(0,i-1)], b=pts[Math.min(pts.length-1,i+1)]; let tx=b[0]-a[0], tz=b[1]-a[1]; const l=Math.hypot(tx,tz)||1; tx/=l; tz/=l;
      [-1,1].forEach(sd=>{ const d=W1-.15+rnd()*.5; tuft(L.tuft,p[0]-tz*d*sd,p[1]+tx*d*sd,.6+rnd()*.4,BK*.8,1.8); if(rnd()<.35) rrock(g,p[0]-tz*(W1-.3)*sd,p[1]+tx*(W1-.3)*sd,.45+rnd()*.35,BK*.4); }); }));
    finish(g,L); }
  function streamEndReal(g){ const R=3.4, cz=1.2, pts=lineN(t=>[0,-8+(8+cz-R+.6)*t],16); const m=RMat();
    const near=streamBed(g,[pts],[0,cz,R-1.7]);
    /* the pool the stream feeds: a round rim like the pond */
    const n=48, ring=(k0,y0,k1,y1,mat)=>{ const bp=[], bu=[], bi=[]; for(let i=0;i<=n;i++){ const a=i/n*Math.PI*2, c=Math.cos(a), s=Math.sin(a);
        bp.push(c*k0,y0,cz+s*k0, c*k1,y1,cz+s*k1); bu.push(c*k0/3,s*k0/3, c*k1/3,s*k1/3); if(i){ const k=i*2; bi.push(k-2,k,k-1, k-1,k,k+1); } }
      const G=new THREE.BufferGeometry(); G.setAttribute('position',new THREE.Float32BufferAttribute(bp,3)); G.setAttribute('uv',new THREE.Float32BufferAttribute(bu,2)); G.setIndex(bi); G.computeVertexNormals();
      const nr=G.attributes.normal; for(let i=0;i<nr.count;i++) if(nr.getY(i)<0) nr.setXYZ(i,-nr.getX(i),-nr.getY(i),-nr.getZ(i)); g.add(new THREE.Mesh(G,mat)); };
    ring(R+1.6,0,R+.7,BK,m.ground); ring(R+.7,BK,R-.3,.04,m.bed);
    const fl=new THREE.Mesh(new THREE.CircleGeometry(R-.3,36),m.bed); fl.rotation.x=-Math.PI/2; fl.position.set(0,.04,cz); g.add(fl);
    const wg=new THREE.CircleGeometry(R+.2,40); wg.rotateX(-Math.PI/2); const wp=wg.attributes.position, wu=wg.attributes.uv; for(let i=0;i<wp.count;i++) wu.setXY(i,wp.getX(i)/4,-wp.getZ(i)/4);
    const wt=new THREE.Mesh(wg,m.water); wt.position.set(0,WY,cz); g.add(wt);
    const lp=[]; for(let i=0;i<6;i++){ const a=rnd()*6.28, d=rnd()*R*.6, r=.24+rnd()*.18; const q=new THREE.CircleGeometry(r,10,.3,6.28-.6); q.rotateX(-Math.PI/2); q.rotateY(rnd()*6.28); q.translate(Math.cos(a)*d,WY+.012,cz+Math.sin(a)*d); lp.push(q); }
    g.add(new THREE.Mesh(joinGeo(lp),m.lily));
    const L=streamSides(g,near); for(let i=0;i<20;i++){ const a=rnd()*6.28; if(Math.sin(a)<-.7) continue; tuft(L.tuft,Math.cos(a)*(R+.4),cz+Math.sin(a)*(R+.4),.7+rnd()*.4,BK*.7,2); }
    for(let i=0;i<7;i++){ const a=rnd()*6.28; if(Math.sin(a)<-.6) continue; rrock(g,Math.cos(a)*(R+.5),cz+Math.sin(a)*(R+.5),.5+rnd()*.4,BK*.4); }
    finish(g,L); }
  function flowerMeadowReal(g){ groundReal(g); const L={tuft:[],flowers:[],leaves:[],bark:[]};
    for(let i=0;i<(W.LOW?60:110);i++) tuft(L.tuft,(rnd()-.5)*15.4,(rnd()-.5)*15.4,.45+rnd()*.45);
    for(let i=0;i<(W.LOW?110:220);i++) tuft(L.flowers,(rnd()-.5)*15.2,(rnd()-.5)*15.2,.8+rnd()*.6);
    rbush(L.leaves,5.6,-5.4,1); finish(g,L); rrock(g,-4.5,3.8,.6); }
  /* tall white trunks, light canopies */
  function birch(L,x,z,s){ const pl=new THREE.Matrix4().compose(new V3(x,0,z),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),rnd()*6.28),new V3(s,s,s));
    const tr=uvm(new THREE.CylinderGeometry(.09,.15,6.6,8),1,1,.5); tr.translate(0,3.3,0); tr.applyMatrix4(pl); L.birch.push(tr);
    L.birchleaf.push(...cards(46,1.3,1.4,2,5.8,pl), ...cards(18,1.2,.9,1,7.2,pl)); }
  function birchReal(g){ groundReal(g); const L={birch:[],birchleaf:[],fern:[],tuft:[]};
    [[-5.8,-5.6],[-2,-6.2],[2.6,-5.2],[6.2,-6],[-6.4,-1.6],[-2.8,-2.2],[1,-1.4],[4.8,-1.8],[-5,2.4],[-1.2,2.6],[2.8,2.2],[6.4,2.8],[-6.2,6.2],[-2.6,6.4],[1.6,6.2],[5.6,6.4]]
      .forEach(([x,z])=>birch(L,x*.88+(rnd()-.5)*.8,z*.88+(rnd()-.5)*.8,.9+rnd()*.3));
    for(let i=0;i<(W.LOW?22:40);i++) tuft(L.fern,(rnd()-.5)*15,(rnd()-.5)*15,1.1+rnd()*.6);
    for(let i=0;i<(W.LOW?30:55);i++) tuft(L.tuft,(rnd()-.5)*15,(rnd()-.5)*15,.45+rnd()*.4);
    finish(g,L); rrock(g,.4,4.4,.6); }
  function autumnReal(g){ groundReal(g); const L={autumn:[],autumn2:[],bark:[],litter:[],tuft:[]};
    [[-5.5,-5],[-1,-6],[3.6,-5.6],[6.2,-1.8],[-6,0],[-2,-1.6],[2,.4],[5.6,3.6],[-4.6,4.6],[-.4,4.8],[3.2,6.6]]
      .forEach(([x,z],i)=>{ const s=1+rnd()*.3, pl=new THREE.Matrix4().compose(new V3(x*.82+(rnd()-.5)*.6,0,z*.82+(rnd()-.5)*.6),new THREE.Quaternion().setFromAxisAngle(new V3(0,1,0),rnd()*6.28),new V3(s,s,s));
        const tr=uvm(new THREE.CylinderGeometry(.14,.26,5.2,10),1,1,.5); tr.translate(0,2.6,0); tr.applyMatrix4(pl); L.bark.push(tr);
        (i%3?L.autumn:L.autumn2).push(...cards(70,1.5,2.1,1.8,5.6,pl), ...cards(26,1.5,1.3,1.1,7.1,pl)); });
    for(let i=0;i<(W.LOW?50:100);i++){ const q=new THREE.PlaneGeometry(.55,.55); q.rotateX(-Math.PI/2); q.rotateY(rnd()*6.28); q.translate((rnd()-.5)*15.4,.012+rnd()*.006,(rnd()-.5)*15.4); L.litter.push(q); }
    for(let i=0;i<(W.LOW?16:30);i++) tuft(L.tuft,(rnd()-.5)*15,(rnd()-.5)*15,.45+rnd()*.35);
    rlog(L.bark,-3.5,2.4,3.8,1.1); finish(g,L); rrock(g,4.4,-3.6,.8); }
  /* a smooth boulder: noise from the position, so the faces join */
  function boulder(g,x,z,s,y){ const geo=new THREE.IcosahedronGeometry(s,3), p=geo.attributes.position, nr=geo.attributes.normal, sq=.62+rnd()*.15, ph=rnd()*6;
    for(let i=0;i<p.count;i++){ const X=p.getX(i),Y=p.getY(i),Z=p.getZ(i), k=1+.16*Math.sin(X*2.1/s+Z*1.3/s+ph)*Math.cos(Y*2.7/s+X*.9/s)+.07*Math.sin(Z*5.3/s+Y*4.1/s); p.setXYZ(i,X*k,Y*k*sq,Z*k); }
    for(let i=0;i<p.count;i++){ const v=new V3(p.getX(i),p.getY(i)/(sq*sq),p.getZ(i)).normalize(); nr.setXYZ(i,v.x,v.y,v.z); }
    const r=new THREE.Mesh(geo,RMat().rock); r.position.set(x,(y||0)+s*sq*.55,z); r.rotation.y=rnd()*6.28; g.add(r); return r; }
  function boulderHillReal(g){ groundReal(g); const m=RMat(), R=6.2, Hh=2.3, cx=-.6, cz=-.6;
    const hg=new THREE.CircleGeometry(R,48,0,Math.PI*2); hg.rotateX(-Math.PI/2); const hp=hg.attributes.position, hu=hg.attributes.uv;
    const sub=new THREE.PlaneGeometry(2*R,2*R,40,40); sub.rotateX(-Math.PI/2); const sp=sub.attributes.position, su=sub.attributes.uv;
    for(let i=0;i<sp.count;i++){ const x=sp.getX(i), z=sp.getZ(i), d=Math.hypot(x,z)/R, h=d<1?Hh*Math.pow(Math.cos(d*Math.PI/2),1.6):-.01; sp.setY(i,h); su.setXY(i,(x+cx)/8,-(z+cz)/8); }
    sub.computeVertexNormals(); const hill=new THREE.Mesh(sub,m.ground); hill.position.set(cx,0,cz); g.add(hill);
    const hy=(x,z)=>{ const d=Math.hypot(x-cx,z-cz)/R; return d<1?Hh*Math.pow(Math.cos(d*Math.PI/2),1.6):0; };
    [[cx+.3,cz-.2,1.9],[cx-2.6,cz+1.8,1.3],[cx+2.4,cz+2,1.1],[4.8,-5,1.6],[-5.6,-5.2,1],[5.8,5.2,.8],[-5.8,5.4,.7],[cx+1.6,cz-2.6,.9]].forEach(([x,z,s])=>boulder(g,x,z,s,hy(x,z)-s*.25));
    const L={leaves:[],bark:[],tuft:[],flowers:[]}; rtree(L.leaves,L.bark,5.6,-.4,.9); rbush(L.leaves,-6,1.6,1);
    for(let i=0;i<(W.LOW?50:90);i++){ const x=(rnd()-.5)*15.4, z=(rnd()-.5)*15.4, y=hy(x,z); tuft(L.tuft,x,z,.45+rnd()*.4,y); }
    for(let i=0;i<14;i++){ const x=(rnd()-.5)*15, z=(rnd()-.5)*15; tuft(L.flowers,x,z,.9,hy(x,z)); }
    finish(g,L); }
  /* ---------- v80 · Realistic kit batch 2: GOTHIC — dead forest, graveyard, swamp (tiles) ---------- */
  const Mx=(x,y,z,rx,ry,rz,sx,sy,sz)=>new THREE.Matrix4().compose(new V3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0)),new V3(sx||1,sy||sx||1,sz||sx||1));
  const put=(list,geo,m)=>{ geo.applyMatrix4(m); list.push(geo); return geo; };
  /* a dead tree: branching bare limbs + a few roots, all into one list (shape 0 upright · 1 twisted · 2 leaning) */
  function deadTreeGeo(list,x,z,s,shape,maxD){ maxD=maxD||5; const tw=shape===1?1.75:1.3, lean=shape===2?.42:(rnd()-.5)*.2, base=Mx(x,0,z,0,rnd()*6.28,0,s,s,s);
    const limb=(m,len,r,depth)=>{ const c=uvm(new THREE.CylinderGeometry(r*.55,r,len,6),1,1,.5); c.translate(0,len/2,0); put(list,c,m.clone().premultiply(base));
      if(depth<maxD){ const n=2+(rnd()<.35?1:0); for(let i=0;i<n;i++){ const q=new THREE.Matrix4().makeTranslation(0,len*(.82+rnd()*.18),0).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((rnd()-.5)*tw,rnd()*6.28,(rnd()-.5)*tw*.6)));
        limb(m.clone().multiply(q),len*(.58+rnd()*.17),r*.6,depth+1); } } };
    limb(new THREE.Matrix4().makeRotationZ(lean),3.6,.36,0);
    for(let k=0;k<4;k++){ const a=k*1.6+rnd(), c=uvm(new THREE.CylinderGeometry(.05,.17,1.7,5),1,1,.5); put(list,c,Mx(Math.cos(a)*.55,.12,Math.sin(a)*.55,Math.sin(a)*1.28,0,-Math.cos(a)*1.28).premultiply(base)); } }
  function mistGeo(list,n,y){ for(let i=0;i<n;i++){ const q=new THREE.PlaneGeometry(5+rnd()*3,5+rnd()*3); q.rotateX(-Math.PI/2); q.translate((rnd()-.5)*10.5,y+rnd()*.7,(rnd()-.5)*10.5); list.push(q); } }
  function deadForestReal(g){ const m=RMat(); g.add(new THREE.Mesh(rplane(SQ,SQ,8),m.mud)); const L={deadbark:[],reed:[],mist:[],tuft:[]};
    [[-5.4,-5],[-.6,-6],[4.6,-5.4],[6,-.6],[-6,.6],[-2,-1.6],[2.2,.8],[5.2,5],[-4.6,4.8],[.4,5.6]].forEach(([x,z],i)=>deadTreeGeo(L.deadbark,x*.72+(rnd()-.5)*.6,z*.72+(rnd()-.5)*.6,.85+rnd()*.35,i%3,4));
    for(let i=0;i<4;i++) rlog(L.deadbark,(rnd()-.5)*11,(rnd()-.5)*11,2.6+rnd()*1.6,rnd()*3);
    for(let i=0;i<(W.LOW?24:46);i++) tuft(L.reed,(rnd()-.5)*15,(rnd()-.5)*15,.5+rnd()*.5,0,1.3);
    mistGeo(L.mist,W.LOW?5:9,.35); finish(g,L); rrock(g,3.6,3.2,.8); rrock(g,-3.4,2.6,.6); }
  function headstoneGeo(L,x,z,kind){ const r=(rnd()-.5)*.3, t=(rnd()-.5)*.2;
    if(kind===0){ const sh=new THREE.Shape(); sh.moveTo(-.4,0); sh.lineTo(-.4,.72); sh.absarc(0,.72,.4,Math.PI,0,true); sh.lineTo(.4,0); sh.lineTo(-.4,0);
      const G=new THREE.ExtrudeGeometry(sh,{depth:.14,bevelEnabled:false}); G.translate(0,-.06,-.07); put(L.stone,G,Mx(x,0,z,0,r,t)); }
    else if(kind===1){ put(L.stone,new THREE.BoxGeometry(.16,1.45,.16),Mx(x,.66,z,0,r,t)); put(L.stone,new THREE.BoxGeometry(.72,.16,.16),Mx(x,1.02,z,0,r,t)); }
    else { put(L.darkstone,new THREE.BoxGeometry(.85,.5,1.9),Mx(x,.25,z,0,r)); put(L.darkstone,new THREE.BoxGeometry(.95,.08,2),Mx(x,.54,z,0,r)); } }
  function ironFenceGeo(L,x0,z0,x1,z1,h,posts){ h=h||1.6; const len=Math.hypot(x1-x0,z1-z0), n=Math.round(len/.2), a=-Math.atan2(z1-z0,x1-x0);
    for(let i=0;i<=n;i++){ const t=i/n, x=x0+(x1-x0)*t, z=z0+(z1-z0)*t; put(L.iron,new THREE.CylinderGeometry(.022,.022,h,5),Mx(x,h/2,z)); put(L.iron,new THREE.ConeGeometry(.05,.16,4),Mx(x,h+.08,z)); }
    [.25,h-.2].forEach(y=>put(L.iron,new THREE.BoxGeometry(len,.05,.04),Mx((x0+x1)/2,y,(z0+z1)/2,0,a)));
    if(posts!==false){ const k=Math.max(1,Math.round(len/2.6)); for(let i=0;i<=k;i++){ const t=i/k; put(L.darkstone,new THREE.BoxGeometry(.32,h+.3,.32),Mx(x0+(x1-x0)*t,(h+.3)/2,z0+(z1-z0)*t)); put(L.darkstone,new THREE.BoxGeometry(.4,.08,.4),Mx(x0+(x1-x0)*t,h+.34,z0+(z1-z0)*t)); } } }
  function gasLampGeo(L,x,z){ put(L.iron,new THREE.CylinderGeometry(.09,.15,3.4,8),Mx(x,1.7,z)); put(L.iron,new THREE.CylinderGeometry(.22,.26,.3,8),Mx(x,.15,z));
    put(L.glass,new THREE.CylinderGeometry(.24,.15,.5,6),Mx(x,3.68,z)); put(L.iron,new THREE.ConeGeometry(.34,.3,6),Mx(x,4.08,z)); if(LAMPS) LAMPS.push([x,3.68,z]); }
  function graveyardReal(g){ const m=RMat(); g.add(new THREE.Mesh(rplane(SQ,SQ,8),m.moss)); const L={stone:[],darkstone:[],iron:[],deadbark:[],mist:[],tuft:[],glass:[]};
    for(let r=0;r<4;r++) for(let c=0;c<5;c++){ if(rnd()<.16) continue; const x=-5.6+c*2.2+(rnd()-.5)*.4, z=-3.6+r*2.5+(rnd()-.5)*.3; if(x>2.4&&z<-1) continue; headstoneGeo(L,x,z,(r*5+c)%6===0?2:(c+r)%3===0?1:0); }
    const F=7.7; ironFenceGeo(L,-F,-F,F,-F); ironFenceGeo(L,-F,-F,-F,F); ironFenceGeo(L,F,-F,F,F); ironFenceGeo(L,-F,F,-1.6,F); ironFenceGeo(L,1.6,F,F,F);
    /* the crypt in the far corner */
    put(L.darkstone,new THREE.BoxGeometry(3,2.6,3.2),Mx(4.9,1.3,-4.9)); const rf=new THREE.ConeGeometry(2.5,1.4,4); rf.rotateY(Math.PI/4); put(L.darkstone,rf,Mx(4.9,3.3,-4.9));
    put(L.stone,new THREE.BoxGeometry(.5,3.1,.5),Mx(3.6,1.55,-3.2)); put(L.stone,new THREE.BoxGeometry(.5,3.1,.5),Mx(6.2,1.55,-3.2)); put(L.iron,new THREE.BoxGeometry(1.1,1.9,.08),Mx(4.9,.95,-3.26));
    gasLampGeo(L,-2.4,6.7); gasLampGeo(L,2.4,6.7);
    deadTreeGeo(L.deadbark,-5.4,-5.2,1,1,4); for(let i=0;i<(W.LOW?20:40);i++) tuft(L.tuft,(rnd()-.5)*15,(rnd()-.5)*15,.4+rnd()*.35);
    mistGeo(L.mist,W.LOW?4:7,.3); finish(g,L); }
  function swampReal(g){ const m=RMat(); g.add(new THREE.Mesh(rplane(SQ,SQ,8),m.mud)); const RX=5.6, RZ=4.9, n=48;
    /* low rim + still dark water, the same build as the pond so nothing sits under the floor */
    const ring=(k0,y0,k1,y1,mat)=>{ const bp=[], bu=[], bi=[]; for(let i=0;i<=n;i++){ const a=i/n*Math.PI*2, c=Math.cos(a), s2=Math.sin(a), w=1+.08*Math.sin(a*3+1);
        bp.push(c*RX*k0*w,y0,s2*RZ*k0*w, c*RX*k1*w,y1,s2*RZ*k1*w); bu.push(c*k0,s2*k0, c*k1,s2*k1); if(i){ const k=i*2; bi.push(k-2,k-1,k, k-1,k+1,k); } }
      const G=new THREE.BufferGeometry(); G.setAttribute('position',new THREE.Float32BufferAttribute(bp,3)); G.setAttribute('uv',new THREE.Float32BufferAttribute(bu,2)); G.setIndex(bi); G.computeVertexNormals();
      const nr=G.attributes.normal; for(let i=0;i<nr.count;i++) if(nr.getY(i)<0) nr.setXYZ(i,-nr.getX(i),-nr.getY(i),-nr.getZ(i)); g.add(new THREE.Mesh(G,mat)); };
    ring(1.22,.004,1,.22,m.mud); const wg=new THREE.CircleGeometry(1,48); wg.rotateX(-Math.PI/2); wg.scale(RX*1.04,1,RZ*1.04); const wp=wg.attributes.position, wu=wg.attributes.uv; for(let i=0;i<wp.count;i++) wu.setXY(i,wp.getX(i)/4,-wp.getZ(i)/4);
    const wt=new THREE.Mesh(wg,m.swamp); wt.position.y=.16; g.add(wt);
    const L={deadbark:[],reed:[],mist:[],lily:[],tuft:[]};
    for(let i=0;i<5;i++){ const a=i/5*6.28+rnd()*.6; deadTreeGeo(L.deadbark,Math.cos(a)*RX*.9,Math.sin(a)*RZ*.9,.7+rnd()*.3,1+(i%2),4); }
    deadTreeGeo(L.deadbark,-5.6,5.6,.75,2,4); deadTreeGeo(L.deadbark,5.6,-5.4,.65,1,4);
    for(let i=0;i<(W.LOW?40:80);i++){ const a=rnd()*6.28, k=.85+rnd()*.35; tuft(L.reed,Math.cos(a)*RX*k,Math.sin(a)*RZ*k,.55+rnd()*.4,.1,2.4); }
    for(let i=0;i<7;i++){ const a=rnd()*6.28, d=rnd()*.7, q=new THREE.CircleGeometry(.3+rnd()*.2,10,.3,6.28-.6); q.rotateX(-Math.PI/2); q.rotateY(rnd()*6.28); q.translate(Math.cos(a)*RX*d,.172,Math.sin(a)*RZ*d); L.lily.push(q); }
    rlog(L.deadbark,1.4,-.6,3.4,.5); mistGeo(L.mist,W.LOW?5:9,.4); finish(g,L); }
  W.KIT.push(
   {id:'C01R',kit:'real',f:'C',name:'Road straight',e:'RCRC',b:roadReal},
   {id:'C13R',kit:'real',f:'C',name:'Crosswalk',e:'RCRC',b:crosswalkReal},
   {id:'C02R',kit:'real',f:'C',name:'Road corner',e:'RRCC',b:cornerReal},
   {id:'C03R',kit:'real',f:'C',name:'T-junction',e:'RRRC',b:teeReal},
   {id:'C04R',kit:'real',f:'C',name:'Crossroads',e:'RRRR',b:crossReal},
   {id:'C05R',kit:'real',f:'C',name:'Dead end',e:'RCCC',b:culReal},
   {id:'N01R',kit:'real',f:'N',name:'Meadow',e:'NNNN',b:meadowReal},
   {id:'N03R',kit:'real',f:'N',name:'Light forest',e:'NNNN',b:forestReal},
   {id:'N04R',kit:'real',f:'N',name:'Dense forest',e:'NNNN',b:denseReal},
   {id:'N05R',kit:'real',f:'N',name:'Dirt path',e:'PNPN',b:g=>pathReal(g,[pathNS()])},
   {id:'N06R',kit:'real',f:'N',name:'Path corner',e:'PPNN',b:g=>pathReal(g,[arcPts(8,-8,8,Math.PI,Math.PI/2,24)])},
   {id:'N07R',kit:'real',f:'N',name:'Path fork',e:'PPPN',b:g=>pathReal(g,[pathNS(),lineN(t=>[.9+7.1*t,wig(t,.7)],16)])},
   {id:'N10R',kit:'real',f:'N',name:'Pond',e:'NNNN',b:pondReal},
   {id:'N11R',kit:'real',f:'N',name:'Stream',e:'WNWN',b:g=>streamReal(g,[streamNS()])},   /* v79 */
   {id:'N12R',kit:'real',f:'N',name:'Stream bend',e:'WWNN',b:g=>streamReal(g,[arcPts(8,-8,8,Math.PI,Math.PI/2,32)])},
   {id:'N13R',kit:'real',f:'N',name:'Stream pool',e:'WNNN',b:streamEndReal},
   {id:'N14R',kit:'real',f:'N',name:'Flower meadow',e:'NNNN',b:flowerMeadowReal},
   {id:'N15R',kit:'real',f:'N',name:'Birch grove',e:'NNNN',b:birchReal},
   {id:'N16R',kit:'real',f:'N',name:'Autumn forest',e:'NNNN',b:autumnReal},
   {id:'N17R',kit:'real',f:'N',name:'Boulder hill',e:'NNNN',b:boulderHillReal},
   {id:'N18R',kit:'real',f:'N',name:'Dead forest',e:'NNNN',b:deadForestReal},   /* v80 · gothic */
   {id:'N19R',kit:'real',f:'N',name:'Graveyard',e:'NNNN',b:graveyardReal},
   {id:'N20R',kit:'real',f:'N',name:'Swamp',e:'NNNN',b:swampReal});
  /* ---------- v80 · gothic MODELS (Models → in a World): chapel ruin, iron gate, iron fence, gas lamp, three dead trees ---------- */
  const FLICK=[];   /* gas-lamp glows that flicker (W.tick) */
  function gothBuild(p,fn){ SEED=String((p&&p.id)||'g').split('').reduce((a,c)=>a*31+c.charCodeAt(0),7)%2147483647||1; const g=new THREE.Group(), L={}; const add=k=>(L[k]=L[k]||[]);
    fn(g,add); finish(g,L); g.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } }); return g; }
  function archGeo(w,h,d,thick){ const sh=new THREE.Shape(), o=thick||.6; sh.moveTo(-w/2-o,0); sh.lineTo(-w/2-o,h+w*.95); sh.lineTo(w/2+o,h+w*.95); sh.lineTo(w/2+o,0); sh.lineTo(w/2,0); sh.lineTo(w/2,h);
    sh.quadraticCurveTo(w/2,h+w*.55,0,h+w*.8); sh.quadraticCurveTo(-w/2,h+w*.55,-w/2,h); sh.lineTo(-w/2,0); sh.lineTo(-w/2-o,0); const G=new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false}); G.translate(0,0,-d/2); return uvm(G,1,1,3); }
  if(CORE.PRIMS){
    CORE.PRIMS.gchapel={label:'Chapel ruin', world:true, goth:true, build(p){ return gothBuild(p,(g,A)=>{
      put(A('darkstone'),new THREE.BoxGeometry(10,.4,16),Mx(0,.2,0));
      put(A('stone'),archGeo(3.2,4.6,.9,1.9),Mx(0,.4,7.4));                                         /* the west front: tall pointed doorway */
      const gb=new THREE.Shape(); gb.moveTo(-4.95,0); gb.lineTo(4.95,0); gb.lineTo(0,4.4); gb.lineTo(-4.95,0); const GG=new THREE.ExtrudeGeometry(gb,{depth:.9,bevelEnabled:false}); GG.translate(0,0,-.45); put(A('stone'),GG,Mx(0,.4+4.6+3.2*.95,7.4));
      put(A('stone'),new THREE.TorusGeometry(1.05,.18,8,28),Mx(0,10.2,7.9)); for(let k=0;k<4;k++) put(A('stone'),new THREE.BoxGeometry(.1,2.1,.1),Mx(0,10.2,7.9,0,0,k*Math.PI/4));
      [-1,1].forEach(sd=>{ put(A('stone'),new THREE.BoxGeometry(.9,9.6,.9),Mx(sd*4.6,5.2,7.4)); put(A('stone'),new THREE.ConeGeometry(.6,1.8,4),Mx(sd*4.6,10.9,7.4,0,Math.PI/4));
        for(let k=0;k<3;k++){ const z=4.2-k*4.6, keep=k<2||sd<0; const ar=archGeo(1.8,3.3,.8,.7); put(A('stone'),ar,Mx(sd*4.6,.4,z,0,Math.PI/2,0,1,keep?1:.5,1)); }
        put(A('stone'),new THREE.BoxGeometry(.9,sd<0?3.4:1.6,.9),Mx(sd*4.6,.4+(sd<0?1.7:.8),-7.4)); });
      put(A('stone'),new THREE.BoxGeometry(5.4,2.2,.8),Mx(-1.6,1.5,-7.6));                              /* what's left of the east wall */
      for(let i=0;i<14;i++) put(A(i%3?'stone':'darkstone'),new THREE.DodecahedronGeometry(.25+rnd()*.4,0),Mx((rnd()-.5)*8,.5,(rnd()-.5)*13,rnd()*3,rnd()*3,0));
      g.userData.door={x:0,z:7.4}; }); }};
    CORE.PRIMS.ggate={label:'Iron gate', world:true, goth:true, build(p){ return gothBuild(p,(g,A)=>{
      [-2,2].forEach(x=>{ put(A('darkstone'),new THREE.BoxGeometry(.7,3.2,.7),Mx(x,1.6,0)); put(A('darkstone'),new THREE.BoxGeometry(.85,.22,.85),Mx(x,3.31,0)); put(A('stone'),new THREE.SphereGeometry(.3,12,8),Mx(x,3.72,0)); });
      for(let i=0;i<15;i++){ const x=-1.6+i*(3.2/14), h=2.25+Math.sin(i/14*Math.PI)*.65; put(A('iron'),new THREE.CylinderGeometry(.025,.025,h,5),Mx(x,h/2,0)); put(A('iron'),new THREE.ConeGeometry(.055,.18,4),Mx(x,h+.09,0)); }
      put(A('iron'),new THREE.TorusGeometry(1.62,.045,6,28,Math.PI),Mx(0,2.2,0)); [.32,1.15].forEach(y=>put(A('iron'),new THREE.BoxGeometry(3.25,.06,.06),Mx(0,y,0))); }); }};
    CORE.PRIMS.gfence={label:'Iron fence', world:true, goth:true, build(p){ return gothBuild(p,(g,A)=>{ const L={iron:A('iron'),darkstone:A('darkstone')}; ironFenceGeo(L,-4,0,4,0,1.8); }); }};
    CORE.PRIMS.glamp={label:'Gas lamp', world:true, goth:true, build(p){ const g=gothBuild(p,(g,A)=>{ const L={iron:A('iron'),glass:[]}; gasLampGeo(L,0,0); });
      const gm=new THREE.MeshBasicMaterial({color:0xffc27a,toneMapped:false}); const gl=new THREE.Mesh(new THREE.CylinderGeometry(.23,.14,.48,6),gm); gl.position.y=3.68; g.add(gl);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:0xffb466,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.8})); sp.scale.setScalar(2.6); sp.position.y=3.68; g.add(sp);
      const pool=new THREE.Mesh(new THREE.CircleGeometry(3,32),ADD(0xffb26a,{opacity:.18,map:glowTex()})); pool.rotation.x=-Math.PI/2; pool.position.y=.03; g.add(pool);
      FLICK.push({g,sp,pool,gm,ph:rnd()*9,gone:0}); return g; }};
    [['gdead1','Dead tree',0],['gdead2','Twisted dead tree',1],['gdead3','Leaning dead tree',2]].forEach(([k,label,sh])=>{
      CORE.PRIMS[k]={label, world:true, goth:true, build(p){ return gothBuild(p,(g,A)=>deadTreeGeo(A('deadbark'),0,0,1.25,sh)); }}; });
  }
  W.flick=function(){ const t=performance.now()/1000; for(let i=FLICK.length-1;i>=0;i--){ const F=FLICK[i]; if(!F.g.parent){ if(++F.gone>300) FLICK.splice(i,1); continue; } F.gone=0;
    const k=.82+.12*Math.sin(t*7.3+F.ph)+.07*Math.sin(t*13.1+F.ph*2)+(Math.sin(t*1.7+F.ph)>.96?-.35:0); F.sp.material.opacity=.8*k; F.pool.material.opacity=.18*k; F.gm.color.setRGB(1,.76*k+.1,.48*k); } };
  const KITLAMPS={};
  const KBY={}; W.KIT.forEach(k=>{ k.size=1; KBY[k.id]=k; });
  W.MATCH={N:'NPC',P:'P',C:'CN',R:'R',W:'W'};   /* v79: W = a stream, joins only a stream */
  W.piece=(id,M)=>KBY[id]||(((M&&M.world&&M.world.lib)||[]).find(L=>L.id===id))||null;
  /* ================= v77 · OUTSIDE KITS — art-style kits built to the Coded Kit Spec (Block Town, Neon City…) =================
     A kit file calls TRIOKIT.register({id,name,textures,pieces,props}) (or queues itself on TRIOKIT_QUEUE). Its pieces join the map tray
     as their own kit tab; its props become Models (World). K follows the spec; K.lamp / K.door also take the (group, position) form. */
  const KITREG={}, KITWET=new Set();
  W.kitReady=id=>{ const k=KITREG[id]; return (k&&!k._readyDone)?k._ready:null; };
  function kitK(kit){ const TX={}, MC={}; let seed=1, root=null; const T=THREE;
    const pos=(a,b,c)=>{ if(a&&a.isObject3D){ const v=(b&&b.isVector3)?b.clone():new T.Vector3(...((b&&b.pos)||[0,0,0])); for(let o=a;o&&o!==root;o=o.parent){ o.updateMatrix(); v.applyMatrix4(o.matrix); } return [v.x,v.y,v.z]; } return [+a||0,+b||0,+c||0]; };
    const K={THREE:T, SQ:SQ, low:!!W.LOW,
      rnd(){ seed=(seed*16807)%2147483647; return seed/2147483647; },
      tex(name){ if(TX[name]) return TX[name]; const src=(kit.textures||{})[name]; if(!src) return null; const t=new T.TextureLoader().load(src); t.wrapS=t.wrapT=T.RepeatWrapping;
        if(!/_(nrm|rgh|ao|n)$/.test(name)) t.colorSpace=T.SRGBColorSpace; t.anisotropy=W.LOW?2:8; return TX[name]=t; },
      mat(o){ const k=JSON.stringify(o,(key,v)=>v&&v.isTexture?v.uuid:v); return MC[k]||(MC[k]=new T.MeshStandardMaterial(Object.assign({roughness:.9,metalness:0},o))); },
      glow(color,strength){ return K.mat({color:'#000000',emissive:color,emissiveIntensity:strength==null?2:strength,toneMapped:false}); },
      uv(geo,metres){ geo=geo.index?geo.toNonIndexed():geo; geo.computeVertexNormals(); const p=geo.attributes.position, n=geo.attributes.normal, a=[];
        for(let i=0;i<p.count;i++){ const ax=Math.abs(n.getX(i)), ay=Math.abs(n.getY(i)), az=Math.abs(n.getZ(i)); let u,v;
          if(ay>=ax&&ay>=az){ u=p.getX(i); v=-p.getZ(i); } else if(ax>=az){ u=p.getZ(i); v=p.getY(i); } else { u=p.getX(i); v=p.getY(i); } a.push(u/metres,v/metres); }
        geo.setAttribute('uv',new T.Float32BufferAttribute(a,2)); return geo; },
      lamp(a,b,c){ if(!LAMPS) return; const v=pos(a,b,c), o=(a&&a.isObject3D)?c:(arguments[3]||null); if(o&&o.color) v.c=o.color; if(o&&o.tag) v.tag=o.tag; LAMPS.push(v); },   /* v82: a lamp can carry its own colour (Ember: blue / ember / flame) */
      door(a,b,c,f){ if(a&&a.isObject3D){ const d=b||{}; K._door={p:pos(a,new T.Vector3(...(d.pos||[0,0,0]))),f:d.ry||0}; } else K._door={p:[+a||0,+b||0,+c||0],f:f||0}; }};
    K._begin=(id,g)=>{ seed=String(id).split('').reduce((x,ch)=>x*31+ch.charCodeAt(0),7)%2147483647||1; root=g||null; K._door=null; };
    return K; }
  W.addKit=function(kit){ if(!kit||!kit.id||KITREG[kit.id]||!Array.isArray(kit.pieces)) return; KITREG[kit.id]=kit; const K=kitK(kit); kit._K=K;
    kit._ready=Promise.resolve(kit.ready?kit.ready(K):null).catch(()=>{}).then(()=>{ kit._readyDone=true; }); kit._readyDone=!kit.ready;
    if(!W.KITS.some(k=>k.id===kit.id)) W.KITS.push({id:kit.id,name:kit.name||kit.id,outside:true});
    kit.pieces.forEach(pc=>{ if(!pc||!pc.id||KBY[pc.id]) return; const e={id:pc.id, kit:kit.id, f:pc.family==='C'?'C':'N', name:pc.name||pc.id, e:String(pc.edges||'NNNN').toUpperCase().slice(0,4), size:pc.size===2?2:1,
        b:g=>{ K._begin(pc.id,g); try{ pc.build(g,K); }catch(err){ console.warn('kit piece',pc.id,err); } g.traverse(o=>{ if(o.isMesh&&o.material&&o.material.userData&&o.material.userData.kitRole) KITWET.add(o.material); }); }};
      if(+pc.sink>0){ e.sink=Math.min(3,+pc.sink); if(Array.isArray(pc.hole)&&pc.hole.length>2) e.hole=pc.hole.map(q=>[+q[0]*SQ/16,+q[1]*SQ/16]); }   /* v85 (Spec v1.1): a sunken piece */
      W.KIT.push(e); KBY[e.id]=e; });
    (kit.props||[]).forEach(pr=>{ if(!pr||!pr.id||!CORE.PRIMS) return; const key='kit_'+pr.id;
      CORE.PRIMS[key]={label:pr.name||pr.id, world:true, kitProp:kit.id, kitName:kit.name||kit.id, def:pr, build(p){ const g=new THREE.Group(); const o=(p&&p.kit)||{};
          K._begin(pr.id,g); try{ pr.build(g,K,{look:o.look, parts:o.parts||{}, extras:o.extras||{}}); }catch(err){ console.warn('kit prop',pr.id,err); }
          if(Array.isArray(pr.parts)&&o.parts) pr.parts.forEach(pt=>{ const c=o.parts[pt.label]&&o.parts[pt.label].colour; if(!c) return; g.traverse(m=>{ if(m.isMesh&&m.name===pt.mesh){ m.material=m.material.clone(); m.material.color.set(c); } }); });
          const scr=CORE.findScreen&&CORE.findScreen(g); if(scr){ const bb=new THREE.Box3().setFromObject(scr).getSize(new THREE.Vector3()); scr.userData.screenAspect=Math.max(bb.x,bb.z)/Math.max(.01,bb.y); scr.userData.screenFlipY=true; }
          if(K._door){ const d=new THREE.Object3D(); d.name='DOOR_'+pr.id; d.userData.ownDoor=false; d.position.set(K._door.p[0],0,K._door.p[2]); g.add(d); }
          g.userData.kitDoor=!!K._door; return g; }}; });
    if(CORE.onKit) try{ CORE.onKit(kit); }catch(e){} };
  window.TRIOKIT=window.TRIOKIT&&window.TRIOKIT.register?window.TRIOKIT:{register:k=>W.addKit(k)};
  (window.TRIOKIT_QUEUE||[]).splice(0).forEach(k=>W.addKit(k));
  W.kitOf=id=>{ const p=KBY[id]; return p&&p.kit; };
  W.edges=(pc,rot)=>{ const e=String(pc&&pc.e||'NNNN').toUpperCase().split(''); for(let i=0;i<(rot||0);i++) e.unshift(e.pop()); return e; };
  W.emptyMap=()=>({cells:Array.from({length:NG*NG},()=>null)});
  W.cellXZ=(i,size)=>{ const o=size===2?SQ:SQ/2; return [-GH+o+(i%NG)*SQ, -GH+o+Math.floor(i/NG)*SQ]; };
  /* a model file's parts, ready to repeat: [{geo, mat, m (matrix in the piece's frame), block}] */
  const TPL={};   /* asset id → Promise<parts> */
  W.BUF=id=>{ const A=window.HEXBAKE&&window.HEXBAKE.assets, src=A&&A[id]; if(!src) return Promise.resolve(null);
    if(/^data:/.test(src)) return Promise.resolve(CORE.b64buf(src)); return fetch(src).then(r=>r.arrayBuffer()).catch(()=>null); };
  function partsOf(root){ root.updateMatrixWorld(true); const out=[];
    root.traverse(o=>{ if(!o.isMesh||!o.geometry||o.isSkinnedMesh) return; let q=o, blk=false; while(q&&q!==root.parent){ if(/^BLOCK_/i.test(q.name||'')) blk=true; q=q.parent; }
      out.push({geo:o.geometry, mat:o.material, m:o.matrixWorld.clone(), block:blk}); });
    return out; }
  function mergeByMat(g){ g.updateMatrixWorld(true); const by=new Map();
    g.traverse(o=>{ if(!o.isMesh) return; const G=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()); G.applyMatrix4(o.matrixWorld); if(!by.has(o.material)) by.set(o.material,[]); by.get(o.material).push(G); });
    const out=[]; by.forEach((list,mat)=>{ let n=0; list.forEach(G=>n+=G.attributes.position.count);
      const P=new Float32Array(n*3), N=new Float32Array(n*3), U=new Float32Array(n*2); let k=0;
      const hasC=list.some(G=>G.attributes.color), C=hasC?new Float32Array(n*3).fill(1):null;   /* v77.1: vertex colours (Block Town) survive the merge */
      if(C){ let o=0; list.forEach(G=>{ const c=G.attributes.color, m=G.attributes.position.count; if(c) for(let i=0;i<m;i++){ C[(o+i)*3]=c.getX(i); C[(o+i)*3+1]=c.getY(i); C[(o+i)*3+2]=c.getZ(i); } o+=m; }); }
      list.forEach(G=>{ if(!G.attributes.normal) G.computeVertexNormals(); P.set(G.attributes.position.array,k*3); N.set(G.attributes.normal.array,k*3); if(G.attributes.uv) U.set(G.attributes.uv.array,k*2); k+=G.attributes.position.count; G.dispose(); });
      const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(P,3)); geo.setAttribute('normal',new THREE.BufferAttribute(N,3)); geo.setAttribute('uv',new THREE.BufferAttribute(U,2));   /* v73: uvs kept for the Realistic kit */
      if(C) geo.setAttribute('color',new THREE.BufferAttribute(C,3));
      out.push({geo, mat, m:new THREE.Matrix4(), block:false}); });
    return out; }
  const KITPARTS={};
  W.buildPiece=function(id,M){ const pc=W.piece(id,M), g=new THREE.Group(); if(!pc) return g;
    if(pc.b){ SEED=id.split('').reduce((a,c)=>a*31+c.charCodeAt(0),7)%2147483647||1; LAMPS=[]; pc.b(g); g.userData.lamps=LAMPS; KITLAMPS[id]=LAMPS; LAMPS=null; return g; }
    W.parts(pc).then(parts=>{ (parts||[]).forEach(P=>{ if(P.block) return; const m=new THREE.Mesh(P.geo,P.mat); m.matrixAutoUpdate=false; m.matrix.copy(P.m); g.add(m); }); g.userData.ready=true; if(g.userData.onReady) g.userData.onReady(g); });
    return g; };
  W.parts=function(pc){
    if(pc.b){ if(!KITPARTS[pc.id]) KITPARTS[pc.id]=Promise.resolve(mergeByMat(W.buildPiece(pc.id))); return KITPARTS[pc.id]; }
    if(!pc.asset) return Promise.resolve([]);
    if(!TPL[pc.asset]) TPL[pc.asset]=Promise.resolve((CORE.WORLDBUF||W.BUF)(pc.asset)).then(buf=>new Promise(res=>{ if(!buf){ res([]); return; }
      try{ CORE.gltfLoader().parse(buf.slice(0),'',gl=>res(partsOf(gl.scene||gl.scenes[0])),()=>res([])); }catch(e){ res([]); } }));
    return TPL[pc.asset]; };
  /* ---------- v85 · SUNKEN PIECES + WALKING ON THE GROUND ----------
     A sunken piece (Spec v1.1: pc.sink, pc.hole) gets its outline cut out of the world floor so its bowl shows.
     Every piece's walkable surfaces are measured once (every 25 cm, upward faces, no leaves/glass/water) into a height map;
     the camera then walks on them: steps/slopes up to 0.42 m between samples, anything taller or a deeper drop is a wall. */
  const HMAP={}, HRES=.25, STEP=.42, NOSURF=[];
  function groundHoles(X,sunk){ const key=JSON.stringify(sunk.map(q=>[q.pc.id,q.x,q.z,q.r])); if(X.hkey===key) return; X.hkey=key;
    const sh=new THREE.Shape(); sh.moveTo(-HALF,-HALF); sh.lineTo(HALF,-HALF); sh.lineTo(HALF,HALF); sh.lineTo(-HALF,HALF); sh.lineTo(-HALF,-HALF);
    sunk.forEach(q=>{ const half=SQ*q.size/2, out=(q.pc.hole&&q.pc.hole.length>2)?q.pc.hole:[[-half+1,-half+1],[half-1,-half+1],[half-1,half-1],[-half+1,half-1]];
      const c=Math.cos(-q.r*Math.PI/2), sn=Math.sin(-q.r*Math.PI/2);
      const pts=out.map(([hx,hz])=>{ const wx=q.x+hx*c+hz*sn, wz=q.z-hx*sn+hz*c; return new THREE.Vector2(wx,-wz); });   /* the floor plane's own frame: (x, −z) */
      sh.holes.push(new THREE.Path(pts)); });
    const G=sunk.length?new THREE.ShapeGeometry(sh,4):new THREE.PlaneGeometry(TILE,TILE); if(sunk.length){ const P=G.attributes.position, U=G.attributes.uv; for(let i=0;i<P.count;i++) U.setXY(i,(P.getX(i)+HALF)/TILE,(P.getY(i)+HALF)/TILE); }
    X.ground.geometry.dispose(); X.ground.geometry=G; }
  function heightMap(pc,parts){ const size=pc.size===2?2:1, span=SQ*size, half=span/2, n=Math.round(span/HRES)+1, B=Math.ceil(span), bk=new Array(B*B);
    const A=new V3(), Bv=new V3(), Cv=new V3(), e1=new V3(), e2=new V3(), nv=new V3();
    (parts||[]).forEach(P=>{ if(P.block) return; const mt=Array.isArray(P.mat)?P.mat[0]:P.mat; if(!mt||mt.transparent||mt.alphaTest>0||mt.visible===false) return;
      const G=P.geo, pos=G.attributes.position, idx=G.index, tri=idx?idx.count/3:pos.count/3;
      for(let t=0;t<tri;t++){ const a=idx?idx.getX(t*3):t*3, b=idx?idx.getX(t*3+1):t*3+1, c=idx?idx.getX(t*3+2):t*3+2;
        A.fromBufferAttribute(pos,a).applyMatrix4(P.m); Bv.fromBufferAttribute(pos,b).applyMatrix4(P.m); Cv.fromBufferAttribute(pos,c).applyMatrix4(P.m);
        nv.crossVectors(e1.subVectors(Bv,A),e2.subVectors(Cv,A)); const L=nv.length(); if(L<1e-9||Math.abs(nv.y)/L<.3) continue;   /* only floors, steps, slopes */
        const x0=Math.max(0,Math.floor(Math.min(A.x,Bv.x,Cv.x)+half)), x1=Math.min(B-1,Math.floor(Math.max(A.x,Bv.x,Cv.x)+half)), z0=Math.max(0,Math.floor(Math.min(A.z,Bv.z,Cv.z)+half)), z1=Math.min(B-1,Math.floor(Math.max(A.z,Bv.z,Cv.z)+half));
        if(x1<x0||z1<z0) continue; const T=[A.x,A.y,A.z,Bv.x,Bv.y,Bv.z,Cv.x,Cv.y,Cv.z];
        for(let i=x0;i<=x1;i++) for(let j=z0;j<=z1;j++){ const k=j*B+i; (bk[k]||(bk[k]=[])).push(T); } } });
    const data=new Array(n*n);
    for(let j=0;j<n;j++) for(let i=0;i<n;i++){ const x=-half+i*HRES, z=-half+j*HRES, bi=Math.min(B-1,Math.max(0,Math.floor(x+half))), bj=Math.min(B-1,Math.max(0,Math.floor(z+half))), L=bk[bj*B+bi]; if(!L) continue; const hs=[];
      for(const T of L){ const d=(T[5]-T[8])*(T[0]-T[6])+(T[6]-T[3])*(T[2]-T[8]); if(Math.abs(d)<1e-12) continue;
        const u=((T[5]-T[8])*(x-T[6])+(T[6]-T[3])*(z-T[8]))/d, v=((T[8]-T[2])*(x-T[6])+(T[0]-T[6])*(z-T[8]))/d, w=1-u-v; if(u<-1e-4||v<-1e-4||w<-1e-4) continue;
        hs.push(u*T[1]+v*T[4]+w*T[7]); }
      if(hs.length){ hs.sort((a,b)=>a-b); const o=[]; hs.forEach(h=>{ if(!o.length||h-o[o.length-1]>.04) o.push(h); }); data[j*n+i]=o; } }
    return {n,half,data}; }
  W.heightMaps=HMAP;
  /* the surfaces under (x, z) in the world: the piece there, its turn, its height map */
  function surfAt(X,x,z){ const L=X&&X.walk; if(!L) return null;
    for(let k=0;k<L.length;k++){ const w=L[k]; if(Math.abs(x-w.x)>w.half||Math.abs(z-w.z)>w.half) continue; const Hm=HMAP[w.id]; if(!Hm) return null;
      const dx=x-w.x, dz=z-w.z, c=Math.cos(w.r*Math.PI/2), s=Math.sin(w.r*Math.PI/2), lx=dx*c-dz*s, lz=dx*s+dz*c;   /* undo the piece's turn */
      const i=Math.round((lx+Hm.half)/HRES), j=Math.round((lz+Hm.half)/HRES); if(i<0||j<0||i>=Hm.n||j>=Hm.n) return null; return Hm.data[j*Hm.n+i]||NOSURF; }
    return null; }
  /* where your feet land at (x, z) coming from height foot: the highest surface you can step onto, or NaN = a wall / a drop */
  function footAt(X,x,z,foot){ const hs=surfAt(X,x,z); if(!hs) return 0; if(!hs.length) return foot;
    let best=null; for(let k=hs.length-1;k>=0;k--){ if(hs[k]<=foot+STEP){ best=hs[k]; break; } }
    if(best==null) return NaN; if(best<foot-STEP) return NaN; return Math.max(best,-3.2); }
  CORE.groundStep=function(ox,oz,nx,nz,st){ const H=window.HEX, X=H&&H._world; if(!X||X.dead||!CORE.WORLDON) return null; const foot=st.foot||0;
    let f=footAt(X,nx,nz,foot); if(!isNaN(f)){ st.foot=f; return {x:nx,z:nz}; }
    f=footAt(X,nx,oz,foot); if(!isNaN(f)){ st.foot=f; return {x:nx,z:oz}; }   /* slide along the wall */
    f=footAt(X,ox,nz,foot); if(!isNaN(f)){ st.foot=f; return {x:ox,z:nz}; }
    return {x:ox,z:oz}; };
  CORE.groundHere=function(x,z,st){ const H=window.HEX, X=H&&H._world; if(!X||X.dead||!CORE.WORLDON) return 0; const hs=surfAt(X,x,z); if(!hs) return 0; if(!hs.length) return st.foot||0;
    const f=footAt(X,x,z,st.foot||0); if(!isNaN(f)) return f; let b=hs[0]; hs.forEach(h=>{ if(Math.abs(h-(st.foot||0))<Math.abs(b-(st.foot||0))) b=h; }); return b; };   /* arrived somewhere (start spot, a door): stand on the nearest surface */
  /* lay the map down in the world: one InstancedMesh per piece part */
  const RY=new THREE.Vector3(0,1,0);
  function syncTiles(H){ const X=H._world, M=H._mood&&H._mood.M, Wc=M&&M.world; if(!X||!Wc) return;
    const map=Wc.map||{cells:[]}, key=JSON.stringify(map.cells)+'|'+JSON.stringify((Wc.lib||[]).map(L=>[L.id,L.asset,L.size]));
    if(X.tkey===key) return; X.tkey=key; const ver=(X.tver=(X.tver||0)+1);
    if(X.tiles){ X.g.remove(X.tiles); X.tiles.traverse(o=>{ if(o.isInstancedMesh) o.dispose(); }); } X.tiles=new THREE.Group(); X.tiles.name='worldMap'; X.g.add(X.tiles); X.tileBlocks=[]; X.lampPts=[]; lampFX(X);
    const use={}; (map.cells||[]).forEach((c,i)=>{ if(!c||!c.id) return; const pc=W.piece(c.id,M); if(!pc) return; (use[c.id]||(use[c.id]={pc,at:[]})).at.push([i,c.rot||0]); });
    X.ground.visible=(map.cells||[]).filter(c=>c).length<NG*NG;
    X.walk=[]; const sunk=[];   /* v85: where each piece lies (for walking on it) and which ones dig below the floor */
    Object.keys(use).forEach(id=>{ const U=use[id], size=U.pc.size===2?2:1; U.at.forEach(([i,r])=>{ const [x,z]=W.cellXZ(i,size); const w={id,x,z,r,half:SQ*size/2}; X.walk.push(w); if(U.pc.sink>0) sunk.push({pc:U.pc,x,z,r,size}); }); });
    groundHoles(X,sunk);
    Object.keys(use).forEach(id=>{ const U=use[id]; W.parts(U.pc).then(parts=>{ if(X.tver!==ver||X.dead) return; const size=U.pc.size===2?2:1;
      const cellM=U.at.map(([i,r])=>{ const [x,z]=W.cellXZ(i,size); return new THREE.Matrix4().makeRotationY(-r*Math.PI/2).setPosition(x,0,z); });
      (parts||[]).forEach(P=>{ if(P.block){ cellM.forEach(cm=>{ if(!P.geo.boundingBox) P.geo.computeBoundingBox(); X.tileBlocks.push(P.geo.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(cm,P.m))); }); return; }
        const im=new THREE.InstancedMesh(P.geo,P.mat,cellM.length); const t=new THREE.Matrix4();
        cellM.forEach((cm,k)=>{ t.multiplyMatrices(cm,P.m); im.setMatrixAt(k,t); }); im.instanceMatrix.needsUpdate=true; im.computeBoundingSphere&&im.computeBoundingSphere(); im.frustumCulled=false;
        X.tiles.add(im); });
      if(!HMAP[id]) setTimeout(()=>{ if(!HMAP[id]) HMAP[id]=heightMap(U.pc,parts); },0);   /* v85: the walking surface, measured once per piece */
      const lp=KITLAMPS[id]; if(lp&&lp.length){ cellM.forEach(cm=>lp.forEach(q=>{ const v=new V3(q[0],q[1],q[2]).applyMatrix4(cm); if(q.c) v.c=q.c; X.lampPts.push(v); })); lampFX(X); } }); }); }
  W.syncTiles=syncTiles;
  function lampFX(X){ if(X.halos){ X.g.remove(X.halos); X.halos.geometry.dispose(); X.halos=null; } const pts=X.lampPts||[]; if(!pts.length) return;
    const g=new THREE.BufferGeometry().setFromPoints(pts), cc=new THREE.Color(), col=new Float32Array(pts.length*3);   /* v82: each halo takes its lamp's colour */
    pts.forEach((v,i)=>{ cc.set(v.c||0xffc887); col[i*3]=cc.r; col[i*3+1]=cc.g; col[i*3+2]=cc.b; }); g.setAttribute('color',new THREE.BufferAttribute(col,3));
    X.halos=new THREE.Points(g,new THREE.PointsMaterial({map:glowTex(),vertexColors:true,size:2.6,sizeAttenuation:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    X.halos.frustumCulled=false; X.g.add(X.halos);
    if(!X.pool){ X.pool=[]; for(let i=0;i<(W.LOW?4:6);i++){ const L=new THREE.PointLight(0xffd29a,0,20,2); L.userData.wpool=true; X.g.add(L); X.pool.push(L); } } }
  const PV=new V3();
  function lampTick(H){ const X=H._world, M=H._mood&&H._mood.M, Wc=M&&M.world; if(!X||!X.pool||!Wc) return; const c=H.cam&&H.cam.position; if(!c) return;
    const on=Wc.lamps!=='off', day=((CORE.skyCfg(M).sky)||'night')==='day', pts=(X.lampPts||[]).slice().sort((a,b)=>a.distanceToSquared(c)-b.distanceToSquared(c));
    X.pool.forEach((L,i)=>{ const p=pts[i]; if(!p||!on){ L.intensity=0; return; } L.position.copy(p); if(L.userData.c!==(p.c||'')){ L.userData.c=p.c||''; L.color.set(p.c||0xffd29a); } const d=p.distanceTo(c), k=d<30?1:d>55?0:1-(d-30)/25; L.intensity=(day?.6:2.6)*k; });
    if(X.halos){ X.halos.visible=on; X.halos.material.opacity=day?.35:1; }
    const g=RM&&RM.glass; if(g){ g.emissiveIntensity=on?3.2:0; g.color.set(on?0xfff2d6:0x8f8a80); } }
  /* wet streets: darker, glassier asphalt + sheen on the slabs; a soft reflection world from the mood */
  function wetSync(H){ const M=H._mood&&H._mood.M, Wc=M&&M.world; if(!Wc||(!RM&&!KITWET.size)) return; const wet=Wc.wet==='wet', env=CORE.moodEnv?CORE.moodEnv(H):null;
    const key=(wet?1:0)+'|'+!!env+'|'+KITWET.size; if(H._world.wkey===key) return; H._world.wkey=key;
    KITWET.forEach(m=>{ const u=m.userData; if(u._dryR==null){ u._dryR=m.roughness; u._dryC=m.color.clone(); u._dryE=m.envMapIntensity; }   /* v77: outside kits' streets get wet too */
      const road=u.kitRole==='asphalt'; m.envMap=env; m.roughness=wet?u._dryR*(road?.38:.6):u._dryR; m.color.copy(u._dryC).multiplyScalar(wet?(road?.62:.8):1); m.envMapIntensity=wet?(road?(W.LOW?1:1.5):.8):(u._dryE==null?1:u._dryE); m.needsUpdate=true; });
    if(!RM) return;
    RM.asphalt.envMap=env; RM.slab.envMap=env; RM.asphalt.roughness=wet?.32:1; RM.asphalt.color.setScalar(wet?.62:1); RM.asphalt.envMapIntensity=wet?(W.LOW?1:1.5):.35;
    RM.slab.roughness=wet?.55:1; RM.slab.color.setScalar(wet?.8:1); RM.slab.envMapIntensity=wet?.8:.3; RM.asphalt.needsUpdate=RM.slab.needsUpdate=true;
    if(RM.water){ RM.water.envMap=env; RM.water.envMapIntensity=.8; RM.water.needsUpdate=true; } }   /* v75: ponds reflect the sky */
  /* where two pieces don't join: [{i, side}] (side 1 = east, 2 = south) */
  W.edgeIssues=function(map,M){ const cells=(map&&map.cells)||[], out=[];
    const owner=i=>{ const c=cells[i]; if(!c) return null; if(c.cover!=null) return {a:c.cover,c:cells[c.cover]}; return {a:i,c}; };
    const edgeAt=(i,side)=>{ const o=owner(i); if(!o||!o.c||!o.c.id) return null; const pc=W.piece(o.c.id,M); if(!pc) return null; return {a:o.a,e:W.edges(pc,o.c.rot)[side]}; };
    for(let i=0;i<NG*NG;i++){ const cx=i%NG, cz=Math.floor(i/NG);
      [[1,0,1,3],[0,1,2,0]].forEach(([dx,dz,mine,theirs])=>{ const nx=cx+dx, nz=cz+dz; if(nx>=NG||nz>=NG) return; const A=edgeAt(i,mine), B=edgeAt(nz*NG+nx,theirs);
        if(!A||!B||A.a===B.a) return; if(W.MATCH[A.e].indexOf(B.e)<0||W.MATCH[B.e].indexOf(A.e)<0) out.push({i,side:mine}); }); }
    return out; };
  /* turn pieces so every edge joins (used for the sample town) */
  W.solve=function(ids){ const rots=ids.map(()=>0), ok=(a,b)=>W.MATCH[a].indexOf(b)>=0&&W.MATCH[b].indexOf(a)>=0, E=i=>W.edges(KBY[ids[i]],rots[i]);
    const fits=i=>{ const cx=i%NG, cz=Math.floor(i/NG); if(cx>0&&!ok(E(i)[3],E(i-1)[1])) return false; if(cz>0&&!ok(E(i)[0],E(i-NG)[2])) return false; return true; };
    const go=i=>{ if(i===ids.length) return true; for(let r=0;r<4;r++){ rots[i]=r; if(fits(i)&&go(i+1)) return true; } return false; };
    go(0); return rots; };
  W.SAMPLE=['N04 N04 N03 N05 N03 N05 N04 N04','N04 N03 N02 N05 N01 N05 N10 N04','N02 N01 N02 N06 N05 N06 N01 N03','C02 C01 C01 C03 C01 C01 C02 N02',
    'C01 C08 C10 C01 C09 C09 C01 N01','C03 C01 C01 C04 C01 C01 C04 C05','C01 C09 C11 C01 C09 C10 C01 N03','C02 C01 C01 C03 C01 C01 C02 N04'];
  W.sampleMap=function(){ const ids=W.SAMPLE.join(' ').split(' '), rots=W.solve(ids); return {cells:ids.map((id,i)=>({id,rot:rots[i]}))}; };

  /* ---------- apply / remove ---------- */
  W.apply=function(H, M){
    const Wc=M&&M.world;
    if(!Wc){ W.remove(H); return; }
    const S=H._mood; if(!S) return;
    CORE.WORLDON=true; CORE.WORLDREAL=true;
    let X=H._world; if(!X||X.dead){ X=H._world=build(H); if(CORE.NAV) CORE.NAV.pos.init=false; }   /* arrive at the world's start spot */
    X.cfg=Wc;
    const RM=CORE.room(H);
    if(!X.clamp0){ X.clamp0=RM.clamp; X.arr0=RM.arrivalZ;
      RM.clamp=(x,z,inset)=>{ const lim=HALF-(inset||0); x=Math.max(-lim,Math.min(lim,x)); z=Math.max(-lim,Math.min(lim,z));
        if((inset||0)>=.8&&X.blocks.length){ const q=pushOut(X,x,z,.45); x=Math.max(-lim,Math.min(lim,q.x)); z=Math.max(-lim,Math.min(lim,q.z)); }
        return {x,z}; };
      RM.arrivalZ=()=>{ X.pendStart=true; const s=(X.cfg&&X.cfg.start)||{}; return s.z==null?40:+s.z; }; }
    /* the sky's own dressing for a big place: further fog, no floating platform */
    const sk=(CORE.skyCfg(M).sky)||'night';
    const FOG={night:[0x0b0820,0x07061a],galaxy:[0x070a1c,0x03050f],day:[0xc9def2,0x9cc7f0],image:[0x101018,0x08080c]}[sk]||[0x0b0820,0x07061a];
    H.scene.fog=new THREE.Fog(FOG[0],sk==='day'?140:46,sk==='day'?900:250); H.scene.background=new THREE.Color(FOG[1]);
    const rim=new THREE.Color((M.open&&M.open.rim)||'#f5d400'); X.edgeMat.color.copy(rim).multiplyScalar(1.6); X.edgeHalo.color.copy(rim);
    X.next.visible=Wc.next!==false;
    X.moon.intensity=sk==='day'?0:.55+(M.light==null?.07:+M.light)*1.6;
    if(Wc.map!==false) mapBoot(X); if(X.mapEl) X.mapEl.style.display=Wc.map===false?'none':'';
    chipBoot(X); wireTaps(H); keysBoot();
    if(Wc.kittex) W.useKitTex(Wc.kittex);   /* v73: a baked world brings its own kit textures */
    hideHex(H); syncGround(H,true); syncTiles(H); scanProps(H); gatherLights(H); wetSync(H); lampTick(H);
    if(!X.ticking&&H.onFrame){ X.ticking=true; X.tick=()=>W.tick(H); H.onFrame.push(X.tick); }
  };
  W.tick=function(H){ const X=H._world; if(!X||X.dead) return; X.t++;
    hideHex(H);
    X.grid.visible=!!CORE.EDIT;
    if(X.pendStart&&CORE.NAV&&CORE.NAV.pos.init){ X.pendStart=false; const s=(X.cfg&&X.cfg.start)||{};
      CORE.NAV.pos.x=+s.x||0; if(H.setYaw) H.setYaw(+s.yaw||0); }
    const now=performance.now();
    if(now-(X.lastScan||0)>450){ X.lastScan=now; syncGround(H); syncTiles(H); scanProps(H); }
    if(now-(X.lastLights||0)>900){ X.lastLights=now; gatherLights(H); }
    if(now-(X.lastLamp||0)>250){ X.lastLamp=now; wetSync(H); lampTick(H); }
    if(RM&&RM.water&&RM.water.normalMap){ const t=now*.000012; RM.water.normalMap.offset.set(t,t*.7); }   /* v75: a slow ripple */
    fadeLights(H); W.flick();   /* v80: gas lamps flicker */
    /* the nearest door within a few steps offers to take you in */
    let near=null, nd=1e9; const c=H.cam&&H.cam.position;
    if(c) Object.keys(X.doors).forEach(id=>{ const D=X.doors[id]; if(!D.at) return; const d=Math.hypot(c.x-D.at.x,c.z-D.at.z); if(d<4.2&&d<nd){ nd=d; near=D; } });
    if(near!==X.near){ X.near=near; const b=X.chip;
      if(b){ if(near){ b.textContent='Enter '+((near.p.door&&near.p.door.name)||near.p.name||'')+'  ›'; b.style.borderColor=near.col; b.style.boxShadow='0 0 24px '+near.col; }
        b.style.opacity=near?1:0; b.style.pointerEvents=near?'auto':'none'; b.style.transform='translateX(-50%) translateY('+(near?0:20)+'px)'; } }
    const tt=performance.now()/1000;
    Object.keys(X.doors).forEach(id=>{ const D=X.doors[id]; if(!D.mesh) return; const k=.8+.2*Math.sin(tt*2.2+id.length); D.mesh.userData.mats[1].opacity=.7*k+.15; });
    if(X.t%2===0) drawMap(H); };
  W.remove=function(H){ const X=H&&H._world; if(!X||X.dead) return;
    X.dead=true; CORE.WORLDON=false; CORE.WORLDREAL=false;
    if(X.g.parent) X.g.parent.remove(X.g);
    Object.keys(X.doors).forEach(id=>dropDoor(X,id));
    const RM=CORE.room(H); if(X.clamp0){ RM.clamp=X.clamp0; RM.arrivalZ=X.arr0; }
    if(X.tick&&H.onFrame){ const i=H.onFrame.indexOf(X.tick); if(i>=0) H.onFrame.splice(i,1); }
    [X.mapEl,X.chip].forEach(n=>{ if(n&&n.parentNode) n.parentNode.removeChild(n); });
    X.lights.forEach(L=>{ if(L.userData._wB!==undefined) L.intensity=L.userData._wB; });
    if(H.floor) H.floor.visible=true; (H.walls||[]).forEach(w=>{ w.visible=true; });
    H._world=null; };
})();
