/* ============================================================
   THE HEX — PROP CORE
   Shared by stage mode and by baked rooms. Builds props (built-in
   primitives, image planes, .glb models), contact shadows and the
   payload envelope that Phase 2 (tap → popup → collect) fills in.
   Ships in every baked room; the stage EDITOR does not.
   ============================================================ */
(function(){
if(typeof THREE==='undefined') return;
const CORE = window.HEXCORE = {};

/* ---------- the room's shape ----------
   Every wall placement in the engine, the editor and the room shell asks this
   object instead of assuming six walls. 'hex' returns exactly the numbers the
   event space has always used — so the Death By Romy room cannot move — and
   'box' is the four-wall room: front/back 2:1, sides 3:1, floor 2:3. */
CORE.makeRoom=function(shape){
  const H=4.6;
  let R;
  if(shape==='box'){
    const W=2*H, D=3*H;                               /* 9.2 wide, 13.8 deep */
    R={ shape:'box', n:4, H:H, W:W, D:D,
        th:   i=>i*Math.PI/2,                         /* 0 front, 1 right, 2 back, 3 left */
        dist: i=>(i%2===0)?D/2:W/2,
        len:  i=>(i%2===0)?W:D,
        clamp:(x,z,inset)=>({ x:Math.max(-W/2+inset,Math.min(W/2-inset,x)),
                              z:Math.max(-D/2+inset,Math.min(D/2-inset,z)) }),
        perimeter:(t,inset)=>{
          const w=W-2*inset, d=D-2*inset, P=2*(w+d);
          let s=((t%1)+1)%1*P;                        /* start front-centre, run clockwise */
          const legs=[ [w/2,  (u)=>({x:u,        z:-d/2})],
                       [d,    (u)=>({x:w/2,      z:-d/2+u})],
                       [w,    (u)=>({x:w/2-u,    z:d/2})],
                       [d,    (u)=>({x:-w/2,     z:d/2-u})],
                       [w/2,  (u)=>({x:-w/2+u,   z:-d/2})] ];
          for(let k=0;k<legs.length;k++){ if(s<=legs[k][0]) return legs[k][1](s); s-=legs[k][0]; }
          return {x:0,z:-d/2};
        } };
  } else {
    const RR=10, APO=RR*Math.cos(Math.PI/6);         /* the numbers the hex has always had */
    R={ shape:'hex', n:6, H:H, R:RR, APO:APO,
        th:   i=>i*Math.PI/3,
        dist: ()=>APO,
        len:  ()=>RR,
        clamp:(x,z,inset)=>{ const lim=APO-inset, r=Math.hypot(x,z);
                             return r>lim?{x:x*lim/r,z:z*lim/r}:{x:x,z:z}; },
        perimeter:(t,inset)=>{ const a=t*Math.PI*2;
                               return {x:Math.sin(a)*(APO-inset), z:-Math.cos(a)*(APO-inset)}; } };
  }
  /* a point on wall i: `along` metres to the right of its centre, `inset` in from it */
  R.wallPoint=function(i,along,y,inset){
    const t=R.th(i), a=R.dist(i)-(inset||0), g=along||0;
    return new THREE.Vector3(Math.sin(t)*a+Math.cos(t)*g, y, -Math.cos(t)*a+Math.sin(t)*g);
  };
  R.normal =i=>new THREE.Vector3(-Math.sin(R.th(i)),0,Math.cos(R.th(i)));   /* into the room */
  R.tangent=i=>new THREE.Vector3( Math.cos(R.th(i)),0,Math.sin(R.th(i)));   /* along the wall */
  R.aspect =i=>R.len(i)/R.H;
  /* arrival: stand near the back wall, facing the front one */
  R.arrivalZ=portrait=>R.dist(R.shape==='box'?2:3)-(portrait?0.7:2.2);
  return R;
};
/* the current room — the shell sets it; anything asked before that gets the hex */
/* v67: one loader recipe — opens compressed (EXT_meshopt_compression) models too */
CORE.gltfLoader=function(){ const L=new THREE.GLTFLoader(); if(window.MeshoptDecoder&&L.setMeshoptDecoder) L.setMeshoptDecoder(window.MeshoptDecoder); return L; };
CORE.room=function(H){ return (H&&H.ROOM)||CORE._hexRoom||(CORE._hexRoom=CORE.makeRoom('hex')); };

/* ---------- shared bits ---------- */
const blobTex = (img)=>{ const t=new THREE.Texture(img); t.colorSpace=THREE.SRGBColorSpace;
  t.anisotropy=4; t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; t.needsUpdate=true; return t; };

let SHADOW_TEX=null;
function shadowTex(){
  if(SHADOW_TEX) return SHADOW_TEX;
  const c=document.createElement('canvas'); c.width=c.height=128;
  const g=c.getContext('2d');
  const r=g.createRadialGradient(64,64,2,64,64,62);
  r.addColorStop(0,'rgba(0,0,0,.72)'); r.addColorStop(.55,'rgba(0,0,0,.3)'); r.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=r; g.fillRect(0,0,128,128);
  SHADOW_TEX=new THREE.CanvasTexture(c); return SHADOW_TEX;
}
CORE.shadowTex=shadowTex;

/* lights only exist if a prop asks to be lit — the room itself is unlit by design */
let LIGHTS=null;
function ensureLights(scene){
  if(LIGHTS) return LIGHTS;
  /* two lights, not three — every extra light recompiles and re-shades every lit mesh */
  LIGHTS=new THREE.Group();
  LIGHTS.add(new THREE.HemisphereLight(0x9d8bff,0x120c2e,1.35));
  const k=new THREE.DirectionalLight(0xfff2d0,1.15); k.position.set(4,7,3); LIGHTS.add(k);
  LIGHTS.visible=!CORE.MOODON;          /* v43.1: a Mood Room lights its models with its own light, never these */
  scene.add(LIGHTS); return LIGHTS;
}
CORE.ensureLights=ensureLights;
CORE.propLights=()=>LIGHTS;

/* ---------- built-in primitive props ---------- */
const DARK=0x14102c, DARK2=0x1c1638, GOLD=0xfbbf24, VIO=0x8b7bff, TEAL=0x2dd4bf;
function box(w,h,d,col){ return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
  new THREE.MeshBasicMaterial({color:col===undefined?DARK:col})); }
function cyl(rt,rb,h,col,seg){ return new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||14),
  new THREE.MeshBasicMaterial({color:col===undefined?DARK:col})); }
function edge(mesh,col,op){
  const e=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({color:col===undefined?VIO:col,transparent:true,opacity:op===undefined?.55:op}));
  mesh.add(e); return mesh;
}
function glowPlate(w,h,col){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
    new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));
  return m;
}

const PRIMS={
  speaker:{label:'Speaker stack', build(){ const g=new THREE.Group();
    const a=edge(box(.9,1.15,.8,DARK)); a.position.y=.575; g.add(a);
    const b=edge(box(.84,.9,.76,DARK2)); b.position.y=1.6; g.add(b);
    [.42,1.55].forEach(y=>{ const c=cyl(.24,.24,.06,0x0a0818,20); c.rotation.x=Math.PI/2; c.position.set(0,y,.41); g.add(c); });
    const s=glowPlate(.7,.05,GOLD); s.position.set(0,1.06,.405); g.add(s);
    return g; }},
  wedge:{label:'Monitor wedge', build(){ const g=new THREE.Group();
    const m=edge(box(1.1,.42,.62,DARK)); m.rotation.x=-.36; m.position.y=.23; g.add(m);
    const s=glowPlate(.8,.04,TEAL); s.position.set(0,.42,.24); s.rotation.x=-.36; g.add(s); return g; }},
  case:{label:'Road case', build(){ const g=new THREE.Group();
    const m=edge(box(1.25,.72,.72,DARK2),GOLD,.5); m.position.y=.36; g.add(m);
    [-.6,.6].forEach(x=>{ const h=box(.06,.72,.06,GOLD); h.position.set(x,.36,.37); g.add(h); });
    return g; }},
  riser:{label:'Riser / stage box', build(){ const g=new THREE.Group();
    const m=edge(box(2.2,.45,1.6,DARK)); m.position.y=.225; g.add(m);
    const s=glowPlate(2.2,.03,VIO); s.position.set(0,.44,0); s.rotation.x=-Math.PI/2; g.add(s); return g; }},
  truss:{label:'Truss tower', build(){ const g=new THREE.Group(); const H=3.2;
    [[-.22,-.13],[.22,-.13],[0,.24]].forEach(([x,z])=>{ const c=cyl(.035,.035,H,0x2a2350,8); c.position.set(x,H/2,z); g.add(c); });
    for(let i=1;i<7;i++){ const r=new THREE.Mesh(new THREE.TorusGeometry(.26,.018,6,3),
      new THREE.MeshBasicMaterial({color:0x2a2350})); r.rotation.x=Math.PI/2; r.position.y=i*(H/7); g.add(r); }
    return g; }},
  can:{label:'Light can', build(){ const g=new THREE.Group();
    const c=edge(cyl(.17,.2,.42,DARK2),GOLD,.5); c.position.y=.21; c.rotation.x=.5; g.add(c);
    const l=glowPlate(.3,.3,GOLD); l.position.set(0,.34,.2); l.rotation.x=.5; g.add(l);
    const st=cyl(.05,.07,.5,0x1a1436,10); st.position.y=-.25; g.add(st); return g; }},
  pillar:{label:'Glow pillar', build(){ const g=new THREE.Group();
    const c=cyl(.18,.22,2.6,0x120d30,18); c.position.y=1.3; g.add(c);
    const s=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,2.4,18,1,true),
      new THREE.MeshBasicMaterial({color:VIO,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
    s.position.y=1.3; g.add(s); return g; }},
  crate:{label:'Crate', build(){ const g=new THREE.Group();
    const m=edge(box(.8,.8,.8,DARK2)); m.position.y=.4; g.add(m); return g; }},
  mic:{label:'Mic stand', build(){ const g=new THREE.Group();
    const b=cyl(.28,.3,.04,0x1a1436,18); b.position.y=.02; g.add(b);
    const p=cyl(.028,.028,1.45,0x2a2350,10); p.position.y=.75; g.add(p);
    const bm=cyl(.022,.022,.42,0x2a2350,8); bm.rotation.z=Math.PI/2; bm.position.set(.2,1.44,0); g.add(bm);
    const h=box(.09,.16,.09,0x0f0b24); h.position.set(.4,1.42,0); g.add(h); return g; }},
  orb:{label:'Glow orb', build(){ const g=new THREE.Group();
    const s=new THREE.Mesh(new THREE.SphereGeometry(.3,20,14),
      new THREE.MeshBasicMaterial({color:0xc9bfff})); s.position.y=.3; g.add(s);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:shadowTex(),color:VIO,transparent:true,
      opacity:.0,blending:THREE.AdditiveBlending,depthWrite:false}));
    sp.material.opacity=.55; sp.scale.setScalar(1.6); sp.position.y=.3; g.add(sp); return g; }}
};
CORE.PRIMS=PRIMS;

/* ---------- prop record → THREE object ---------- */
function normalize(obj,target){
  const bb=new THREE.Box3().setFromObject(obj);
  const sz=new THREE.Vector3(); bb.getSize(sz);
  const big=Math.max(sz.x,sz.y,sz.z)||1;
  const s=(target||1.6)/big;
  obj.scale.setScalar(s);
  const bb2=new THREE.Box3().setFromObject(obj);
  const c=new THREE.Vector3(); bb2.getCenter(c);
  obj.position.x-=c.x; obj.position.z-=c.z; obj.position.y-=bb2.min.y;   /* feet on the floor */
  const wrap=new THREE.Group(); wrap.add(obj); return wrap;
}
function unlitify(root){
  root.traverse(o=>{ if(o.isMesh&&o.material){
    const src=Array.isArray(o.material)?o.material[0]:o.material;
    if(!o.userData._lit) o.userData._lit=src;
    const m=new THREE.MeshBasicMaterial({map:src.map||null,
      color:src.color?src.color.clone():new THREE.Color(0xffffff),
      transparent:!!src.transparent, opacity:src.opacity===undefined?1:src.opacity,
      side:src.side===undefined?THREE.FrontSide:src.side, alphaTest:src.alphaTest||0});
    o.material=m;
  }});
}
function relight(root){
  root.traverse(o=>{ if(o.isMesh&&o.userData._lit) o.material=o.userData._lit; });
}
CORE.unlitify=unlitify; CORE.relight=relight;
/* the single place that decides how a prop is shaded. The editor's toggle and
   every rebuild (project restore, baked room) both come through here, so a prop
   saved as lit comes back lit. */
CORE.setLit=function(p, g, scene){
  if(!g) return;
  if(g.userData.glowMats) CORE.unglow(g);
  if(p.lit){ CORE.ensureLights(scene||g.parent||null); relight(g); }
  else unlitify(g);
  g.traverse(o=>{ if(o.isMesh&&o.material&&o.material.userData) o.material.userData._base=undefined; });
  CORE.apply(p,g);
  if(p.glow&&p.glow.on) CORE.glowApply(p,g);
};

/* ---------- v44 · GLOW on any model (the Mood Lab cross, for every prop) ----------
   p.glow = {on, color, strength, light, mode:'steady'|'flicker'|'breathe'|'pulse'|'strobe'}
   The model's surfaces burn brighter than white (so the halo blooms round them) and a real
   light inside it throws that colour onto the room. The behaviour drives both. */
CORE.glowDefaults=function(){ return {on:true, color:'#fff3c4', strength:2.2, light:1, mode:'steady'}; };
CORE.GLOWS=[];
const STENCILK=['stencilWrite','stencilRef','stencilFunc','stencilFail','stencilZFail','stencilZPass'];
const copyStencil=(a,b)=>{ if(a&&b&&a.stencilWrite){ STENCILK.forEach(k=>b[k]=a[k]); b.needsUpdate=true; } };
CORE.unglow=function(g){
  if(!g) return;
  g.traverse(o=>{ if(o.isMesh&&o.userData._preGlow){ copyStencil(o.material,o.userData._preGlow); o.material=o.userData._preGlow; o.userData._preGlow=null; } });
  if(g.userData.glowLight){ const L=g.userData.glowLight; if(L.target&&L.target.parent===g) g.remove(L.target); g.remove(L); g.userData.glowLight=null; }
  g.userData.glowMats=null;
  CORE.GLOWS=CORE.GLOWS.filter(e=>e.g!==g);
};
CORE.glowApply=function(p, g, opts){
  if(!g) return;
  CORE.unglow(g);
  const G=p&&p.glow; if(!G||!G.on||p.type==='playme') return;
  const mats=[], sh=g.userData.shadow;
  g.traverse(o=>{ if(!o.isMesh||!o.material||o===sh||(o.userData&&(o.userData.eggBubble||o.userData.grab||o.userData.isScreen))) return;
    const src=Array.isArray(o.material)?o.material[0]:o.material;
    o.userData._preGlow=o.material;
    const m=new THREE.MeshBasicMaterial({map:src.map||null, color:0xffffff, toneMapped:false,
      transparent:!!src.transparent, opacity:src.opacity==null?1:src.opacity, side:src.side==null?THREE.FrontSide:src.side, alphaTest:src.alphaTest||0});
    copyStencil(src,m); m.userData.glow=true; o.material=m; mats.push(m); });
  /* the light sits in the middle of the model */
  /* v66.1: measured in the model's OWN space (not the world) — a set that's still being placed, or a project
     being opened, has stale world positions, and the light ended up in the middle of the room aiming back */
  const bb=new THREE.Box3(), tmpB=new THREE.Box3(), M4=new THREE.Matrix4();
  g.traverse(o=>{ if(!o.isMesh||o===sh||!o.geometry) return;
    if(!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    M4.identity(); let q=o; while(q&&q!==g){ q.updateMatrix(); M4.premultiply(q.matrix); q=q.parent; }
    if(q!==g) return; tmpB.copy(o.geometry.boundingBox).applyMatrix4(M4); bb.union(tmpB); });
  const cl=bb.isEmpty()?new THREE.Vector3(0,1,0):bb.getCenter(new THREE.Vector3());   /* local to g */
  g.updateMatrixWorld(true); const c=g.localToWorld(cl.clone());
  let L;
  if(opts&&opts.inSet){
    /* inside a set the light only shines INTO the set — a wide cone pointing away from the window,
       so nothing spills through the wall onto the room's floor */
    L=new THREE.SpotLight(new THREE.Color(G.color||'#fff3c4'), 1, opts.dist||11, 1.2, .9, 1.6);
    L.position.copy(cl);
    const dir=new THREE.Vector3(0,-.5,-1).normalize().applyQuaternion(g.quaternion.clone().invert());
    const tg=new THREE.Object3D(); tg.position.copy(L.position).add(dir.multiplyScalar(2)); g.add(tg); L.target=tg; L.userData.glowK=1.6;
  } else L=new THREE.PointLight(new THREE.Color(G.color||'#fff3c4'), 1, (opts&&opts.dist)||11, 1.6);
  L.userData.glowLight=true; if(!L.position.lengthSq()) L.position.copy(cl); g.add(L);
  g.userData.glowLight=L; g.userData.glowMats=mats;
  CORE.GLOWS.push({p:p, g:g, seed:Math.random()*100});
  CORE.glowTick(true);
  if(!CORE._glowTicking&&window.HEX&&window.HEX.onFrame){ CORE._glowTicking=true; window.HEX.onFrame.push(()=>CORE.glowTick()); }
};
CORE.glowFactor=function(mode, t, s){
  if(mode==='flicker'){ const n=(Math.sin(t*7.3+s)+Math.sin(t*13.1+s*1.7)+Math.sin(t*29.7+s*.3))/3;
    let f=.8+.2*n; if(Math.sin(t*.9+s)>.94) f-=.45; return Math.max(.15,Math.min(1.15,f)); }
  if(mode==='breathe') return .4+.6*(.5+.5*Math.sin(t*1.7+s));
  if(mode==='strobe') return ((t*7+s)%1)<.35?1.15:.04;
  if(mode==='pulse'){ let b=.5; try{ const d=window.HEX&&window.HEX.levels&&window.HEX.levels(); if(d) b=(d[1]+d[2]+d[3])/765; }catch(e){}
    return .25+1.1*b; }
  return 1;
};
const _gc=new THREE.Color();
CORE.glowTick=function(){
  const t=performance.now()/1000;
  /* a glow lives while its model is in the scene; one that was built but never placed is let go after 5 s */
  CORE.GLOWS=CORE.GLOWS.filter(e=>{ let o=e.g; while(o.parent) o=o.parent; const live=!!o.isScene;
    if(live) e.seen=true; else if(!e.born) e.born=t;
    return live||(!e.seen&&t-(e.born||t)<5); });
  CORE.GLOWS.forEach(e=>{ const G=e.p.glow; if(!G||!G.on) return;
    const gk=e.g.userData.glowK==null?1:e.g.userData.glowK;
    const f=CORE.glowFactor(G.mode,t,e.seed)*gk, k=(G.strength==null?2.2:+G.strength)*f;
    _gc.set(G.color||'#fff3c4');
    (e.g.userData.glowMats||[]).forEach(m=>m.color.copy(_gc).multiplyScalar(k));
    const L=e.g.userData.glowLight; if(L){ L.color.copy(_gc); L.intensity=3.2*(L.userData.glowK||1)*(G.light==null?1:+G.light)*f; L.visible=G.light>0; } });
};
/* ---------- v49 · TRIGGERS: tap one thing → other things change ----------
   p.trig = {on, mode:'once'|'toggle', acts:[{t:<propId>|'uplights', w:'glowOn'|'glowOff'|'show'|'hide'|'on'|'off', fade:s, delay:s}]}
   Start states live on the things themselves: p.glow.start==='off' (dark · waits), p.startHidden, mood.upsStart==='off'.
   A 'switch' prop is a glint you place just to be tapped. Everything ships in bakes; nothing talks to a server. */
CORE.PROPG={};                      /* prop id → its group, for triggers */
CORE.SETG={};                       /* 'set:'+model id → every live copy of that set model (a set can fly into more than one window) */
const liveG=g=>{ let o=g; while(o&&o.parent) o=o.parent; return !!(o&&o.isScene); };
CORE.trigGroups=function(id){
  if(String(id).indexOf('set:')===0){ const L=(CORE.SETG[id]||[]).filter(liveG); CORE.SETG[id]=L; return L; }
  return CORE.PROPG[id]?[CORE.PROPG[id]]:[];
};
CORE.TRIGFIRED={};
CORE.ANIMS=[];
CORE.animTo=function(get,set,to,dur,delay){
  const now=performance.now()/1000;
  CORE.ANIMS=CORE.ANIMS.filter(a=>a.set!==set);
  CORE.ANIMS.push({get,set,to,dur:Math.max(0,+dur||0),t0:now+(+delay||0),from:null});
  if(!CORE._animTicking&&window.HEX&&window.HEX.onFrame){ CORE._animTicking=true; window.HEX.onFrame.push(()=>CORE.animTick()); }
};
CORE.animTick=function(){
  const t=performance.now()/1000;
  CORE.ANIMS=CORE.ANIMS.filter(a=>{ if(t<a.t0) return true;
    if(a.from===null) a.from=a.get();
    const k=a.dur>0?Math.min(1,(t-a.t0)/a.dur):1, e=k*k*(3-2*k);
    a.set(a.from+(a.to-a.from)*e); return k<1; });
};
const showSet=g=>v=>{ g.userData.showK=v; g.visible=v>.001; const s=g.userData.baseScale||1; g.scale.setScalar(s*(.001+.999*v)); };
/* in the builder a thing that starts hidden stays visible as a faint ghost, so you can still find and select it */
CORE.ghost=function(g,on){ if(!g) return; const sh=g.userData.shadow;
  g.traverse(o=>{ if(!o.isMesh||!o.material||o===sh||(o.userData&&o.userData.trigHit)) return; const m=o.material;
    if(on){ if(!m.userData._gop) m.userData._gop=[m.transparent,m.opacity,m.depthWrite]; m.transparent=true; m.opacity=.22; m.depthWrite=false; }
    else if(m.userData._gop){ [m.transparent,m.opacity,m.depthWrite]=m.userData._gop; m.userData._gop=null; }
    m.needsUpdate=true; });
  g.userData.ghosted=!!on;
};
CORE.startState=function(p,g){                 /* where a thing begins, before any trigger */
  if(!g) return;
  g.userData.baseScale=p.scale||1;
  g.userData.glowK=(p.glow&&p.glow.on&&p.glow.start==='off')?0:1;
  g.scale.setScalar(p.scale||1); g.userData.showK=1; g.visible=true;
  CORE.ghost(g,false);
  if(p.startHidden){ if(CORE.EDIT) CORE.ghost(g,true); else showSet(g)(0); }
};
CORE.upK=function(H,v){ const S=H&&H._mood; if(!S) return 1; if(v!==undefined){ S.upK=v; CORE.applyUpK(H); } return S.upK==null?1:S.upK; };
CORE.applyUpK=function(H){ const S=H&&H._mood; if(!S||!S.ups) return; const M=S.M||{}, k=S.upK==null?1:S.upK, us=M.upStrength==null?1:+M.upStrength;
  S.ups.forEach(u=>{ u.sp.intensity=6*us*k; }); if(S.lens) S.lens.color.set(M.upColor||'#e8e39a').multiplyScalar(2.2*Math.max(.05,k)); };
CORE.trigAct=function(a, H, reverse){
  let w=a.w; if(reverse) w=({glowOn:'glowOff',glowOff:'glowOn',show:'hide',hide:'show',on:'off',off:'on',eggOn:'eggOff',eggOff:'eggOn',open:'close',close:'open'})[w]||w;
  const fade=a.fade==null?2:+a.fade, delay=a.delay||0;
  if(a.t==='uplights'){ CORE.animTo(()=>CORE.upK(H), v=>CORE.upK(H,v), w==='off'?0:1, fade, delay); return; }
  if(a.t==='search'){ CORE.animTo(()=>CORE.SEARCHK==null?1:CORE.SEARCHK, v=>{ CORE.SEARCHK=v; }, w==='off'?0:1, fade, delay); return; }   /* v74: every event searchlight */
  if(a.t==='sky'){ CORE.animTo(()=>CORE.skyK(H), v=>CORE.skyK(H,v), w==='close'?0:1, fade, delay); return; }
  if(String(a.t).indexOf('win:')===0){ const k=String(a.t).slice(4); CORE.animTo(()=>CORE.winK(k), v=>CORE.winK(k,v), w==='close'?0:1, fade, delay); return; }   /* v65: a window opens */          /* v57: the roof opens */
  if(a.t==='vibe'){ CORE.animTo(()=>CORE.vibeK(), v=>CORE.vibeK(v), w==='off'?0:1, fade, delay); return; }            /* v57: the visualizers wake */
  if(w==='eggOn'||w==='eggOff'){ const tk=a.t; if(!CORE.EGGSET[tk]) CORE.EGGSET[tk]=v=>{ CORE.EGGK[tk]=v; };   /* v52: an Easter egg appears */
    CORE.animTo(()=>CORE.eggVis(tk), CORE.EGGSET[tk], w==='eggOn'?1:0, fade, delay); return; }
  CORE.trigGroups(a.t).forEach(g=>{
  if(w==='glowOn'||w==='glowOff') CORE.animTo(()=>g.userData.glowK==null?1:g.userData.glowK, v=>{ g.userData.glowK=v; }, w==='glowOn'?1:0, fade, delay);
  if(w==='show'||w==='hide'){ if(g.userData.baseScale==null) g.userData.baseScale=g.scale.x;
    if(g.userData.ghosted){ CORE.ghost(g,false); if(w==='show') showSet(g)(0); }
    CORE.animTo(()=>g.userData.showK==null?1:g.userData.showK, showSet(g), w==='show'?1:0, fade, delay); }
  });
};
/* v83 · a model inside a window (set) can set things off too: it acts as a pseudo-prop 'set:'+model id */
CORE.SETS=CORE.SETS||[]; const SETTP={};
CORE.setTrigList=function(){ const out=[]; (CORE.SETS||[]).forEach(st=>(st.models||[]).forEach(M=>{ if(!M.trig||!M.trig.on) return; const id='set:'+M.id;
    const o=SETTP[id]||(SETTP[id]={id, type:'setmodel'}); o.trig=M.trig; o.egg=M.egg; out.push(o); })); return out; };
CORE.trigAll=function(){ return ((CORE.TRIGPROPS&&CORE.TRIGPROPS())||[]).concat(CORE.setTrigList()); };
const trigPid=id=>{ id=String(id||''); if(id.indexOf('prop:')===0) return id.slice(5); const k=id.indexOf(':m:'); return k>=0?'set:'+id.slice(k+3):null; };
CORE.trigFire=function(p, H){
  const T=p&&p.trig; if(!T||!T.on) return false;
  const nowT=performance.now(); if(CORE.TRIGLAST&&CORE.TRIGLAST[p.id]&&nowT-CORE.TRIGLAST[p.id]<500) return false;   /* model + its glint in one tap = one moment */
  (CORE.TRIGLAST||(CORE.TRIGLAST={}))[p.id]=nowT;
  const was=!!CORE.TRIGFIRED[p.id];
  if(was&&T.mode!=='toggle') return false;
  CORE.TRIGFIRED[p.id]=!was;
  (T.acts||[]).forEach(a=>CORE.trigAct(a,H,was));
  if(p.type==='switch'&&T.mode!=='toggle'){ const g=CORE.PROPG[p.id]; if(g) CORE.animTo(()=>g.userData.showK==null?1:g.userData.showK, showSet(g), 0, .8, .2); }
  try{ if(CORE.HOSTED) parent.postMessage({trio:'trigger', id:p.id}, '*'); }catch(e){}
  return true;
};
/* ---------- v57 · the song, the sky, the visualizers ----------
   An egg can hold a song: its pop-up shows "play track". Playing it can set off the model's moment
   (trig.when==='song'): the roof fades away (sky opens) and the room's own visualizers wake up and ride the track. */
CORE.skyStart=function(H){ const S=H&&H._mood; return (S&&S.M&&S.M.ceiling==='off')?1:0; };
CORE.skyK=function(H,v){ const S=H&&H._mood; if(!S||!S.ceil) return 1;
  if(v===undefined) return S.skyK==null?CORE.skyStart(H):S.skyK;
  v=Math.max(0,Math.min(1,v)); S.skyK=v;
  const m=S.ceil.material, base=S.M&&S.M.ceiling!=='off';
  m.transparent=v>0.001; m.opacity=1-v; m.depthWrite=v<0.001; m.needsUpdate=true;
  S.ceil.visible=base&&v<0.999;
  const OPN=!!(S.open&&S.open.on), C=CORE.skyCfg(S.M), NIGHT=(C.sky||'night')==='night';
  if(H.stars&&!OPN){ H.stars.visible=NIGHT&&v>0.01; if(H.stars.material){ if(H.stars.userData.op0==null) H.stars.userData.op0=H.stars.material.opacity; H.stars.material.opacity=H.stars.userData.op0*v; } }
  if(H.aurora&&H.AUR&&!OPN){ H.aurora.visible=NIGHT&&C.glow!==false&&v>0.01; if(H.AUR.bri) H.AUR.bri.value=v; }   /* v61: the breathing glow has its switch here too */
  if(S.skyp&&!OPN) S.skyp.sky.visible=v>0.001||(H.walls||[]).some(w=>w.material&&w.material.alphaMap);   /* v61: a closed roof doesn't draw the sky (phones) — unless a cut window looks out */
  CORE.skyLight(H);
  (CORE.SKYHOOKS||[]).forEach(f=>{ try{ f(H,v); }catch(e){} });   /* v66: add-ons that follow the roof */
  return v; };
CORE.SKYHOOKS=[];
CORE.vibeK=function(v){ const F=window.HEXFX; if(!F||!F.setK) return 1; if(v===undefined) return F.getK(); F.setK(v); return v; };
CORE.SONGBY=null;
CORE.playSong=function(url, H){ H=H||window.HEX; if(!H||!H.audioEl||!url) return false;
  const a=H.audioEl;
  try{ if(a.getAttribute('data-song')!==url){ a.src=CORE.playableURL?CORE.playableURL(url):url; a.setAttribute('data-song',url); a.currentTime=0; }
    a.muted=false; a.loop=false; if(H.setDrive) H.setDrive('auto');
    if(Object.prototype.hasOwnProperty.call(a,'play')) delete a.play;   /* the room's own track was switched off — this song is chosen by the fan */
    const st=H._startAudio0||H.startAudio; const p=st?st():a.play(); if(p&&p.catch) p.catch(()=>{}); }catch(e){ return false; }
  return true; };
CORE.stopSong=function(H){ H=H||window.HEX; const a=H&&H.audioEl; if(!a||!a.getAttribute('data-song')) return; try{ a.pause(); a.currentTime=0; }catch(e){} };
/* the play button in a pop-up: the song plays, and the model's "when its song plays" moment goes */
/* v58 · the room reacts when the egg is put away (collect, ✕, tap the room or play track — all the same) */
CORE.eggDone=function(id, H, song){ H=H||window.HEX;
  const pid=trigPid(id); if(!pid) return;   /* v83: a window model's egg too */
  const p=CORE.trigAll().find(q=>q.id===pid);
  if(!p||!p.trig||!p.trig.on) return;
  if(p.trig.when==='song'&&!song) return;                      /* a song moment waits for play */
  if(CORE.TRIGLAST) CORE.TRIGLAST[p.id]=0; CORE.trigFire(p,H); };
/* is this model's egg out there to be found right now? then a tap opens the egg, and the room waits */
CORE.eggLive=function(pid){ const L=CORE.ROOMEGGS.userData.eggs||[]; const E=L.find(e=>e.tk===pid);
  if(!E||!E.egg||!E.egg.on||CORE.EGGGONE[E.id]) return false;
  return CORE.eggVis(E.tk, E.egg.start==='off')>=.5; };
CORE.songPressed=function(id, H){ H=H||window.HEX;
  const pid=trigPid(id); if(!pid) return;
  const p=CORE.trigAll().find(q=>q.id===pid);
  if(p&&p.trig&&p.trig.on&&p.trig.when==='song'){ CORE.TRIGLAST&&(CORE.TRIGLAST[p.id]=0); CORE.trigFire(p,H); } };
CORE.trigReset=function(props, H, sets){
  CORE.TRIGFIRED={}; CORE.TRIGLAST={}; CORE.SEARCHK=null; CORE.ANIMS=[]; CORE.EGGK={}; CORE.EGGGONE={}; CORE.EGGFOUND={}; CORE.EGGSOLVED={}; CORE.GLINTS.forEach(sp=>{ sp.userData.found=false; });
  CORE.skyK(H, CORE.skyStart(H)); Object.keys(CORE.WINPANES).forEach(k=>CORE.winK(k,0)); CORE.vibeK(CORE.VIBESTART==null||CORE.VIBESTART?1:(CORE.EDIT?.3:0)); CORE.stopSong(H);
  (props||[]).forEach(p=>{ const g=CORE.PROPG[p.id]; if(g){ if(g.userData.baseScale) g.scale.setScalar(g.userData.baseScale); CORE.startState(p,g); } });
  (sets||[]).forEach(st=>(st.models||[]).forEach(M=>CORE.trigGroups('set:'+M.id).forEach(g=>CORE.startState({scale:1,glow:M.glow,startHidden:M.startHidden},g))));
  if(H&&H._mood) CORE.upK(H, (H._mood.M&&H._mood.M.upsStart==='off')?0:1);
};
/* the switch: a small burning point with a soft halo, and a generous invisible hit ball */
CORE.switchMesh=function(){
  const g=new THREE.Group();
  const core=new THREE.Mesh(new THREE.SphereGeometry(.07,16,12), new THREE.MeshBasicMaterial({color:new THREE.Color('#fff3c4').multiplyScalar(2.6),toneMapped:false}));
  core.position.y=1.1; g.add(core);
  const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d');
  const r=x.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,'rgba(255,243,196,.9)'); r.addColorStop(.35,'rgba(255,236,170,.35)'); r.addColorStop(1,'rgba(255,236,170,0)');
  x.fillStyle=r; x.fillRect(0,0,64,64);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
  halo.scale.setScalar(.6); halo.position.y=1.1; g.add(halo); g.userData.halo=halo;
  const hit=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8), new THREE.MeshBasicMaterial({visible:false})); hit.position.y=1.1; hit.userData.trigHit=true; g.add(hit);
  return g;
};
/* published rooms: a tap on a trigger fires it */
CORE.trigWire=function(H, props){
  if(!H||!H.canvas||CORE._trigWired) return; CORE._trigWired=true; CORE.TRIGPROPS=props;
  const ray=new THREE.Raycaster(), v=new THREE.Vector2(); let down=null;
  H.canvas.addEventListener('pointerdown',e=>{ down={x:e.clientX,y:e.clientY}; });
  H.canvas.addEventListener('pointerup',e=>{ if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>8) return; down=null;
    v.x=e.clientX/innerWidth*2-1; v.y=-(e.clientY/innerHeight)*2+1; ray.setFromCamera(v,H.cam);
    const vis=g=>{ for(let o=g;o;o=o.parent) if(o.visible===false) return false; return true; };
    const list=(props()||[]).concat(CORE.setTrigList()).filter(p=>p.trig&&p.trig.on&&p.trig.when!=='song'&&!CORE.eggLive(p.id)&&CORE.trigGroups(p.id).some(vis));   /* v83: window models too */
    let best=null; list.forEach(p=>CORE.trigGroups(p.id).filter(vis).forEach(g=>{ const sh=g.userData.shadow;
      let h=ray.intersectObject(g,true).filter(q=>q.object!==sh)[0], d=h?h.distance:null;
      if(d==null){ const bb=new THREE.Box3(); g.traverse(o=>{ if(o.isMesh&&o!==sh) bb.expandByObject(o); });   /* open or thin models: their box counts too */
        const hit=bb.isEmpty()?null:ray.ray.intersectBox(bb.expandByScalar(.08), new THREE.Vector3()); if(hit) d=hit.distanceTo(ray.ray.origin)+.5; }
      if(d!=null&&(!best||d<best.d)) best={d,p}; }));
    if(best) CORE.trigFire(best.p,H); });
  /* a waiting switch breathes so it reads as tappable */
  H.onFrame.push(()=>{ const t=performance.now()/1000; (props()||[]).forEach(p=>{ if(p.type!=='switch') return; const g=CORE.PROPG[p.id]; if(g&&g.userData.halo) g.userData.halo.scale.setScalar(.5+.12*Math.sin(t*2.4)); }); });
};
/* builds the visual for a prop record; calls back when async (glb) finishes */
CORE.build=function(p, assets, scene, done){
  const finish=(obj)=>{
    const g=new THREE.Group();
    g.add(obj);
    /* contact shadow */
    const sh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),
      new THREE.MeshBasicMaterial({map:shadowTex(),transparent:true,depthWrite:false,opacity:.85}));
    sh.rotation.x=-Math.PI/2; sh.position.y=.012; g.add(sh); g.userData.shadow=sh;
    const bb=new THREE.Box3().setFromObject(obj); const sz=new THREE.Vector3(); bb.getSize(sz);
    sh.scale.setScalar(Math.max(.5,Math.max(sz.x,sz.z)*1.7));
    g.userData.propId=p.id; g.userData.isProp=true;
    obj.traverse(o=>{ o.userData.propId=p.id; o.userData.isProp=true; });
    scene.add(g);
    if(p.lit&&p.type==='glb'){ CORE.ensureLights(scene); relight(g); }
    CORE.apply(p,g);
    if(p.glow&&p.glow.on) CORE.glowApply(p,g);
    CORE.screenApply(p,g);                                                   /* v70: clips on its SCREEN */
    if(obj.userData.halo) g.userData.halo=obj.userData.halo;
    CORE.PROPG[p.id]=g; CORE.startState(p,g);
    if(done) done(g);
  };

  if(p.type==='switch'){ finish(CORE.switchMesh()); return; }
  if(p.type==='playme'){ finish(CORE.playmeMesh(p, assets)); return; }
  if(p.type==='prim'){
    const def=PRIMS[p.kind]||PRIMS.crate;
    finish(def.build(p));   /* v77: kit models read their own settings (look, parts, extras) */
    return;
  }
  if(p.type==='image'){
    const a=assets[p.asset];
    const g=new THREE.Group();
    if(a&&a.img){
      const ar=(a.img.naturalWidth||1)/(a.img.naturalHeight||1);
      const h=1.4, w=h*ar;
      const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
        new THREE.MeshBasicMaterial({map:blobTex(a.img),transparent:true,side:THREE.DoubleSide}));
      m.position.y=h/2; g.add(m);
    }
    finish(g);
    return;
  }
  if(p.type==='glb'){
    const a=assets[p.asset];
    if(!a||!a.buf||!THREE.GLTFLoader){ finish(PRIMS.crate.build()); return; }
    try{
      CORE.gltfLoader().parse(a.buf.slice(0), '', (gltf)=>{
        const root=gltf.scene||gltf.scenes[0];
        unlitify(root);
        /* v70: a model with a SCREEN part (an arcade, a TV…) comes in at its real size the first time */
        if(p.sizeAuto===undefined&&(CORE.findScreen(root)||CORE.WORLDREAL)){ const sz=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());   /* v71: in a World every model comes in at its real size */
          const big=Math.max(sz.x,sz.y,sz.z); if(big>.2&&big<(CORE.WORLDREAL?2000:12)){ p.size=+big.toFixed(2); } p.sizeAuto=true; }
        finish(normalize(root, p.size||1.6));
      }, ()=>{ finish(PRIMS.crate.build()); });
    }catch(e){ finish(PRIMS.crate.build()); }
    return;
  }
  finish(PRIMS.crate.build());
};

/* ================= v70 · SCREENS — a model with a part named SCREEN plays clips on it =================
   The arcade cabinet (and any TV, jukebox…): the artist names the glass "SCREEN", UVs filling the image.
   p.screen={clips:[assetIds], tap:'arcade'|'none'}. Clips play muted, one after another (one clip loops),
   on a white unlit material so the colours stay true — and only while the model is in view.
   Tapping a model whose screen says "arcade" asks the page to open the arcade. */
CORE.findScreen=function(root){ let m=null; root.traverse(o=>{ if(m||!o.isMesh) return; let q=o; while(q&&q!==root.parent){ if(String(q.name||'').toUpperCase()==='SCREEN'){ m=o; return; } q=q.parent; } }); return m; };
CORE.SCREENS={}; CORE.SCREENURL=null;   /* the page / builder sets SCREENURL(id) → a playable url */
CORE.screenStop=function(id){ const S=CORE.SCREENS[id]; if(!S) return; S.stopped=true; try{ S.v.pause(); S.v.removeAttribute('src'); S.v.load(); if(S.v.parentNode) S.v.parentNode.removeChild(S.v); }catch(e){} if(S.tex) S.tex.dispose(); delete CORE.SCREENS[id]; };
CORE.screenApply=function(p,g){
  if(!p||(p.type!=='glb'&&p.type!=='prim')||!g) return; const scr=CORE.findScreen(g); CORE.screenStop(p.id);   /* v76: built-in big screens too */
  if(!scr) return; g.userData.hasScreen=true; scr.userData.isScreen=true;
  if(!scr.userData._screen0) scr.userData._screen0=scr.material;
  const twins=[]; g.traverse(o=>{ if(o.isMesh&&o.userData.screenTwin){ if(!o.userData._screen0) o.userData._screen0=o.material; twins.push(o); } });   /* v76: a two-sided screen */
  const S0=p.screen||{}, list=(S0.clips||[]).map(id=>CORE.SCREENURL&&CORE.SCREENURL(id)).filter(Boolean);
  if(!list.length){ scr.material=scr.userData._screen0; twins.forEach(o=>{ o.material=o.userData._screen0; }); return; }
  const v=document.createElement('video'); v.muted=true; v.defaultMuted=true; v.playsInline=true; v.setAttribute('playsinline',''); v.setAttribute('muted','');
  v.preload='auto'; v.crossOrigin='anonymous';
  v.style.cssText='position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none'; try{ document.body.appendChild(v); }catch(e){}   /* v77.1: Chrome only decodes a <video> reliably while it lives in the page (same as the wall tiles) */
  const S={v, list, idx:0, mesh:scr, g, p, want:false};
  v.addEventListener('error',()=>{ if(S.stopped||!v.getAttribute('src')) return; S.err=true; if(CORE.onScreenErr) try{ CORE.onScreenErr(p); }catch(e){} });
  { const bb=new THREE.Box3().setFromObject(scr).getSize(new THREE.Vector3()), big=Math.max(bb.x,bb.y,bb.z); S.far=Math.max(18,big*4.5); }
  S.always=p.type==='prim'&&!!(CORE.PRIMS[p.kind]&&CORE.PRIMS[p.kind].big)&&!(CORE.PRIMS[p.kind].board);   /* v78: the big screens (jumbotron, tower, drive-in, banner plane) loop all the time — you can see them from anywhere */   /* v76: a jumbotron plays from across the plaza */
  const load=i=>{ S.idx=i%list.length; v.src=CORE.playableURL?CORE.playableURL(list[S.idx]):list[S.idx]; v.loop=list.length===1; if(S.want) v.play().catch(()=>{}); };
  v.addEventListener('ended',()=>{ if(list.length>1) load(S.idx+1); });
  load(0);
  const t=new THREE.VideoTexture(v); t.colorSpace=THREE.SRGBColorSpace; t.flipY=!!scr.userData.screenFlipY; S.tex=t;   /* v77: kit screens use three's UVs (top at top) */
  const sa=scr.userData.screenAspect; if(sa){ S.crop=()=>{ if(!v.videoWidth) return; const va=v.videoWidth/(v.videoHeight||1);   /* v76: the clip fills the screen (cropped, never stretched) */
    if(va>sa){ t.repeat.set(sa/va,1); t.offset.set((1-sa/va)/2,0); } else { t.repeat.set(1,va/sa); t.offset.set(0,(1-va/sa)/2); } S.cropped=true; }; v.addEventListener('loadedmetadata',S.crop); }
  scr.material=new THREE.MeshBasicMaterial({map:t, toneMapped:false, color:0xffffff, side:scr.userData.screenDouble?THREE.DoubleSide:THREE.FrontSide});   /* v78: a banner shows the clip on both faces */ twins.forEach(o=>{ o.material=scr.material; });
  CORE.SCREENS[p.id]=S; CORE.screenTick(window.HEX); if(S0.tap&&S0.tap!=='none') CORE.screenWire(window.HEX);
};
/* play only while the model is in view and near-ish — phones stay smooth */
CORE.screenTick=function(H){ if(CORE._scrTick||!H||!H.cam) return; CORE._scrTick=1;
  const fr=new THREE.Frustum(), M=new THREE.Matrix4(), B=new THREE.Box3(), P=new THREE.Vector3(); let n=0;
  setInterval(()=>{ H.cam.updateMatrixWorld(); M.multiplyMatrices(H.cam.projectionMatrix,H.cam.matrixWorldInverse); fr.setFromProjectionMatrix(M);
    Object.keys(CORE.SCREENS).forEach(id=>{ const S=CORE.SCREENS[id]; if(!S.g.parent){ CORE.screenStop(id); return; }
      B.setFromObject(S.mesh); const on=S.g.visible!==false&&!B.isEmpty()&&(S.always||(fr.intersectsBox(B)&&B.getCenter(P).distanceTo(H.cam.position)<(S.far||18)));
      if(S.crop&&!S.cropped&&S.v.videoWidth) S.crop();   /* v76 */
      S.want=on; if(on&&S.v.paused) S.v.play().catch(()=>{}); else if(!on&&!S.v.paused) S.v.pause(); }); }, 400); };   /* a timer, not a frame hook: a sleeping room still pauses its screens */
CORE.arcadeOpen=function(p){
  if(CORE.post({trio:'open', board:'arcade', from:p&&p.id||''})) return true;   /* inside a Trio page: the page draws the arcade */
  CORE.toast&&CORE.toast('the arcade opens here inside the Trio page'); return false; };
CORE.screenWire=function(H){
  if(CORE._scrWired||!H||!H.canvas) return; CORE._scrWired=1;
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); let dn=null;
  H.canvas.addEventListener('pointerdown',e=>{ dn=[e.clientX,e.clientY]; },true);
  H.canvas.addEventListener('click',e=>{
    if(CORE.EDIT) return;                                   /* in the builder a tap selects the model */
    if(dn&&Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>10) return;
    if(CORE.REELOPEN||CORE.EGGOPEN) return;
    ptr.x=e.clientX/innerWidth*2-1; ptr.y=-(e.clientY/innerHeight)*2+1; ray.setFromCamera(ptr,H.cam);
    let best=null; Object.keys(CORE.SCREENS).forEach(id=>{ const S=CORE.SCREENS[id]; if(!S.g.parent||!(S.p.screen&&(S.p.screen.tap==='arcade'||S.p.screen.tap==='chat'))) return;
      const h=ray.intersectObject(S.g,true)[0]; if(h&&(!best||h.distance<best.d)) best={d:h.distance,S}; });
    if(!best) return;
    const shown=m=>{ for(let o=m;o;o=o.parent) if(o.visible===false) return false; return true; };   /* v76: a World's hidden walls never block */
    const walls=(H.walls||[]).filter(m=>m.material&&!(m.material.alphaTest>0)&&shown(m)); const w=ray.intersectObjects(walls,false)[0]; if(w&&w.distance<best.d-.05) return;
    if(CORE.eggLive&&CORE.eggLive(best.S.p.id)) return;     /* its egg goes first */
    e.stopImmediatePropagation(); if(best.S.p.screen.tap==='chat'){ if(!CORE.post({trio:'open', board:'chat', from:best.S.p.id})) CORE.toast&&CORE.toast('the fan board opens here inside the Trio page'); } else CORE.arcadeOpen(best.S.p);   /* v76: or the fan board */
  },true);
};
/* pushes a prop record's transform/appearance onto its object */
/* ---------- PLAY ME tiles: a neutral glass tile — the game's picture + PLAY ME + its name. Tap → the game. ---------- */
CORE.playmeCanvas=function(p, img){
  const c=document.createElement('canvas'); c.width=640; c.height=200; const g=c.getContext('2d');
  const r=36, W=640, H=200;
  const rr=(x,y,w,h,q)=>{ g.beginPath(); g.moveTo(x+q,y); g.arcTo(x+w,y,x+w,y+h,q); g.arcTo(x+w,y+h,x,y+h,q); g.arcTo(x,y+h,x,y,q); g.arcTo(x,y,x+w,y,q); g.closePath(); };
  g.clearRect(0,0,W,H);
  rr(4,4,W-8,H-8,r); g.fillStyle='rgba(12,12,16,.80)'; g.fill(); g.lineWidth=4; g.strokeStyle='rgba(255,255,255,.62)'; g.stroke();
  const A=24, S=H-48;                                            /* the game's picture, square, left */
  g.save(); rr(A,A,S,S,22); g.clip();
  if(img&&(img.naturalWidth||img.width)){ const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height, k=Math.max(S/iw,S/ih);
    g.drawImage(img,A+(S-iw*k)/2,A+(S-ih*k)/2,iw*k,ih*k); }
  else { g.fillStyle='rgba(255,255,255,.12)'; g.fillRect(A,A,S,S); g.fillStyle='rgba(255,255,255,.85)';
    g.font='900 64px Manrope,Helvetica,Arial,sans-serif'; g.textAlign='center'; g.textBaseline='middle';
    g.fillText(String(p.game&&p.game.name||'?').trim().charAt(0).toUpperCase()||'?',A+S/2,A+S/2+4); }
  g.restore();
  g.textAlign='left'; g.textBaseline='alphabetic'; g.fillStyle='#ffffff';
  g.font='900 58px Anton,Impact,"Arial Narrow",Arial,sans-serif'; g.fillText('PLAY ME',A+S+30,98);
  let nm=String(p.game&&p.game.name||'').toUpperCase(); g.font='800 26px Manrope,Helvetica,Arial,sans-serif'; g.fillStyle='rgba(255,255,255,.72)';
  while(nm&&g.measureText(nm).width>W-(A+S+30)-28) nm=nm.slice(0,-1);
  if(nm!==String(p.game&&p.game.name||'').toUpperCase()&&nm) nm=nm.slice(0,-1)+'…';
  g.fillText(nm,A+S+32,146);
  return c;
};
CORE.playmeMesh=function(p, assets){
  const a=p.asset&&assets?assets[p.asset]:null, img=a&&a.img;
  const g=new THREE.Group(); g.userData.isPlayme=true;
  const c=CORE.playmeCanvas(p,img); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  if(img&&img.complete===false) img.addEventListener('load',()=>{ const c2=CORE.playmeCanvas(p,img); t.image=c2; t.needsUpdate=true; },{once:true});
  const w=1.6, h=.5;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({map:t,transparent:true,alphaTest:.02,side:THREE.DoubleSide,toneMapped:false}));
  m.position.y=h/2; m.userData.playmeFace=true; g.add(m);
  if(p.glow!==false){                                             /* a soft neutral halo, not a colour */
    const cv=document.createElement('canvas'); cv.width=cv.height=64; const q=cv.getContext('2d');
    const gr=q.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,.55)'); gr.addColorStop(1,'rgba(255,255,255,0)'); q.fillStyle=gr; q.fillRect(0,0,64,64);
    const halo=new THREE.Mesh(new THREE.PlaneGeometry(w*1.45,h*2.1), new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.55,side:THREE.DoubleSide}));
    halo.position.set(0,h/2,-.01); g.add(halo); }
  return g;
};
/* free-standing / over-a-model tiles turn to face you; wall tiles stay flat on the wall */
CORE.PLAYMES=[];
CORE.playmeTick=function(H){ if(CORE._pmTick||!H||!H.onFrame) return; CORE._pmTick=1;
  const v=new THREE.Vector3();
  H.onFrame.push(()=>{ CORE.PLAYMES=CORE.PLAYMES.filter(o=>o.g&&o.g.parent); CORE.PLAYMES.forEach(o=>{ if(o.p.wall!=null||o.p.face===false) return;
    o.g.getWorldPosition(v); o.g.rotation.set(0,Math.atan2(H.cam.position.x-v.x,H.cam.position.z-v.z),0); }); }); };
CORE.playmeOpen=function(p, H){
  const u=p.game&&p.game.url; if(!u||!/^https?:\/\//i.test(u)) return;
  /* inside a Trio page, the page opens games; on its own, the room opens it full screen */
  if(CORE.post({trio:'open', board:'game', url:u, title:(p.game.name||'')})) return;
  if(H&&H.openGame) H.openGame(u, p.game.name||'');
};
CORE.playmeWire=function(H){
  if(CORE._pmWired||!H||!H.canvas) return; CORE._pmWired=1; CORE.playmeTick(H);
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); let dn=null;
  H.canvas.addEventListener('pointerdown',e=>{ dn=[e.clientX,e.clientY]; },true);
  H.canvas.addEventListener('click',e=>{
    if(dn&&Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>10) return;
    if(CORE.REELOPEN||CORE.EGGOPEN) return;
    const hit=CORE.playmeAt(H,e.clientX,e.clientY,ray,ptr); if(!hit) return;
    e.stopImmediatePropagation(); CORE.playmeOpen(hit, H);
  },true);
};
CORE.playmeAt=function(H,x,y,ray,ptr){
  ray=ray||new THREE.Raycaster(); ptr=ptr||new THREE.Vector2();
  ptr.x=x/innerWidth*2-1; ptr.y=-(y/innerHeight)*2+1; ray.setFromCamera(ptr,H.cam);
  let best=null; CORE.PLAYMES.forEach(o=>{ if(!o.g.parent) return; let f=null; o.g.traverse(c=>{ if(!f&&c.userData.playmeFace) f=c; }); if(!f) return;
    const h=ray.intersectObject(f,false)[0]; if(h&&(!best||h.distance<best.d)) best={d:h.distance,p:o.p}; });
  if(!best) return null;
  /* a wall in the way wins */
  const walls=(H.walls||[]).filter(m=>m.material&&!(m.material.alphaTest>0));
  const w=ray.intersectObjects(walls,false)[0]; if(w&&w.distance<best.d-.05) return null;
  return best.p;
};
CORE.apply=function(p,g){
  if(!g) return;
  g.position.set(p.pos[0],p.pos[1],p.pos[2]);
  g.rotation.set(p.rot[0],p.rot[1],p.rot[2]);
  g.scale.setScalar(p.scale||1); g.userData.baseScale=p.scale||1;
  if(g.userData.showK!=null&&g.userData.showK<1) g.scale.setScalar((p.scale||1)*(.001+.999*g.userData.showK));
  if(g.userData.shadow){ g.userData.shadow.visible=p.shadow!==false && p.wall==null; }
  const col=new THREE.Color(p.tint||'#ffffff');
  g.traverse(o=>{ if(o.isMesh&&o.material&&o.material.color&&o!==g.userData.shadow){
    const m=o.material;
    if(!m.userData) m.userData={};
    if(m.userData._base===undefined) m.userData._base=m.color.clone();
    m.color.copy(m.userData._base).multiply(col).multiplyScalar(p.bright===undefined?1:p.bright);
    if(p.opacity!==undefined&&p.opacity<1){ m.transparent=true; m.opacity=p.opacity; }
  }});
};

/* ---------- tile racks: 5 uniform tiles pinned to a wall ----------
   Photo wall and video wall are the same rig with a different payload.
   Ships in baked rooms; the editor just re-uses these builders. */
CORE.RACKS={
  photo:{ label:'Photo wall', wall:5, count:5, aspect:9/16, w:1.52, gap:.36, y:2.32, stand:.09,
          spec:'1080 × 1920 (9:16)' },
  video:{ label:'Video wall', wall:4, count:5, aspect:9/16, w:1.52, gap:.36, y:2.32, stand:.09,
          spec:'1080 × 1920 (9:16) · mp4 / h.264' }
};
CORE.newTile=function(i){ return {i:i, asset:null, url:'', fit:'cover', scale:1, ox:0, oy:0,
  rot:0, tint:'#ffffff', bright:1, title:'', payload:null}; };
CORE.newRack=function(kind){ const d=CORE.RACKS[kind];
  const t=[]; for(let i=0;i<d.count;i++) t.push(CORE.newTile(i));
  return {kind:kind, wall:d.wall, tiles:t}; };

CORE.buildRack=function(rack, HEXREF, scene){
  if(rack.wall===-1) return [];                 /* v42: a Mood Room can hide a rack */
  const d=CORE.RACKS[rack.kind], RM=CORE.room(HEXREF);
  const h=d.w/d.aspect;
  const nrm=RM.normal(rack.wall);
  const span=d.count*d.w+(d.count-1)*d.gap;
  const out=[];
  for(let i=0;i<d.count;i++){
    const along=-span/2+d.w/2+i*(d.w+d.gap);
    const g=new THREE.Group();
    g.position.copy(RM.wallPoint(rack.wall, along, d.y, d.stand));
    g.lookAt(g.position.x+nrm.x, d.y, g.position.z+nrm.z);
    /* backing plate so an empty tile still reads as a frame */
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(d.w,h),
      new THREE.MeshBasicMaterial({color:0x0e0a24,transparent:true,opacity:.92}));
    g.add(plate);
    const art=new THREE.Mesh(new THREE.PlaneGeometry(d.w*.94,h*.94),
      new THREE.MeshBasicMaterial({color:0x1a1436,transparent:true}));
    art.position.z=.012; g.add(art);
    const fr=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(d.w,h)),
      new THREE.LineBasicMaterial({color:0xfbbf24,transparent:true,opacity:.45}));
    fr.position.z=.02; g.add(fr);
    g.userData.tile={kind:rack.kind,i:i}; g.userData.isTile=true;
    art.userData.tile=g.userData.tile; art.userData.isTile=true;
    plate.userData.tile=g.userData.tile; plate.userData.isTile=true;
    g.userData.art=art; g.userData.frame=fr;
    scene.add(g); out.push(g);
  }
  return out;
};

/* play badge for video tiles — drawn once, reused */
let PLAYTEX=null;
CORE.playTex=function(){
  if(PLAYTEX) return PLAYTEX;
  const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d');
  g.fillStyle='rgba(7,6,13,.62)'; g.beginPath(); g.arc(64,64,44,0,6.284); g.fill();
  g.strokeStyle='rgba(251,191,36,.9)'; g.lineWidth=4; g.stroke();
  g.fillStyle='#fbbf24'; g.beginPath(); g.moveTo(52,40); g.lineTo(94,64); g.lineTo(52,88); g.closePath(); g.fill();
  PLAYTEX=new THREE.CanvasTexture(c); return PLAYTEX;
};
CORE.addPlayBadge=function(g){
  if(g.userData.badge) return g.userData.badge;
  const s=new THREE.Mesh(new THREE.PlaneGeometry(.42,.42),
    new THREE.MeshBasicMaterial({map:CORE.playTex(),transparent:true,depthWrite:false}));
  s.position.z=.03; g.add(s); g.userData.badge=s; return s;
};

/* one video element per tile: loops silently on the wall, tap for sound.
   The element has to live in the document for reliable decoding. */
/* Chrome will not reliably decode a <video> from a data: URL — it loads, reports
   no error, and never produces a frame. Anything baked in has to be handed over
   as a blob: URL instead. This was the black-banner bug. */
CORE.playableURL=function(src){
  if(!src||src.slice(0,5)!=='data:') return src;
  try{
    const c=src.indexOf(','), head=src.slice(5,c), b64=head.indexOf(';base64')>=0;
    const mime=head.split(';')[0]||'video/mp4';
    const body=src.slice(c+1);
    let bytes;
    if(b64){ const bin=atob(body); bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i); }
    else { bytes=new TextEncoder().encode(decodeURIComponent(body)); }
    return URL.createObjectURL(new Blob([bytes],{type:mime}));
  }catch(e){ return src; }
};
CORE.videoFor=function(src, onReady){
  const v=document.createElement('video');
  v.src=CORE.playableURL(src); v.crossOrigin='anonymous'; v.loop=true; v.muted=true; v.autoplay=true;
  v.playsInline=true; v.setAttribute('playsinline',''); v.setAttribute('muted','');
  v.setAttribute('autoplay',''); v.preload='auto';
  v.style.cssText='position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
  document.body.appendChild(v);
  const go=()=>{ v.play().catch(()=>{}); if(onReady) onReady(v); };
  if(v.readyState>=2) go(); else v.addEventListener('loadeddata',go,{once:true});
  setTimeout(()=>{ v.play().catch(()=>{}); },300);
  return v;
};
CORE.videoTex=function(v){
  const t=new THREE.VideoTexture(v);
  t.colorSpace=THREE.SRGBColorSpace; t.minFilter=THREE.LinearFilter; t.magFilter=THREE.LinearFilter;
  t.generateMipmaps=false; return t;
};

/* ---------- moving surfaces: a looping clip on a wall, banner or the floor ----------
   Uses the texture matrix rather than a canvas, so it costs nothing per frame. */
CORE.slotAspect=function(id){
  if(id==='floor') return 1;
  if(id.indexOf('banner')===0) return 4.6/0.9;
  const m=/^wall(\d)$/.exec(id), RM=CORE.room(window.HEX);
  return m?RM.aspect(+m[1]):10/4.6;
};
CORE.meshForSlot=function(H,id){
  if(!H) return null;
  if(id==='floor') return H.floor;
  if(id==='bannerA') return H.banners&&H.banners[0];
  if(id==='bannerB') return H.banners&&H.banners[1];
  const m=/^wall(\d)$/.exec(id);
  return m?(H.walls&&H.walls[+m[1]])||null:null;
};
CORE.fitVideoTex=function(tex, v, aspect, o){
  const va=(v.videoWidth||16)/(v.videoHeight||9);
  const sc=(o&&o.scale)?o.scale:1;
  let rx,ry;
  if(va>aspect){ rx=aspect/va; ry=1; } else { rx=1; ry=va/aspect; }
  rx/=sc; ry/=sc;
  tex.repeat.set(rx,ry);
  tex.offset.set((1-rx)/2+((o&&o.ox)||0), (1-ry)/2-((o&&o.oy)||0));
  tex.needsUpdate=true;
};
CORE.SURFVID={};
CORE.applySurfaceVideo=function(H, id, src, o){
  const mesh=CORE.meshForSlot(H,id); if(!mesh||!src) return null;
  const v=CORE.videoFor(src);
  const tex=CORE.videoTex(v);
  tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
  const asp=CORE.slotAspect(id);
  const refit=()=>CORE.fitVideoTex(tex,v,asp,o);
  if(v.videoWidth) refit(); else v.addEventListener('loadedmetadata',refit,{once:true});
  mesh.material.map=tex;
  mesh.material.color.set((o&&o.tint)||'#ffffff')
    .multiplyScalar((o&&o.bright)===undefined?1:o.bright);
  mesh.material.needsUpdate=true;
  const rec={video:v, tex:tex, refit:refit, obj:mesh};
  CORE.SURFVID[id]=rec;
  return rec;
};

/* every moving thing in the room, for the culler */
CORE.allVideos=function(tiles){
  return function(){
    const out=[];
    Object.keys(CORE.SURFVID).forEach(k=>{ const r=CORE.SURFVID[k]; if(r&&r.video) out.push(r); });
    const t=(typeof tiles==='function')?tiles():tiles;
    Object.keys(t||{}).forEach(k=>(t[k]||[]).forEach(g=>{
      if(g.userData&&g.userData.video) out.push({obj:g, video:g.userData.video}); }));
    return out;
  };
};



/* ---------- placeable stage lighting ----------
   The Hex is unlit by design: every surface is MeshBasicMaterial, which is why it
   flies. Lights therefore land on nothing until surfaces are switched to a shaded
   material — that swap is a deliberate, reversible choice (CORE.setSurfacesLit).
   Beams are faked with an additive cone: real volumetrics are not worth the cost. */
CORE.LIGHTKINDS={
  spot:{label:'Spotlight'},
  point:{label:'Bulb / glow'},
  key:{label:'Key light'},
  search:{label:'Event searchlight'}   /* v74: a sweeping sky beam on a little trailer */
};
CORE.newLight=function(id,kind){
  return {id:id, isLight:true, kind:kind||'spot', name:'',
    pos:[0,4.2,-2], target:[0,0,-4],
    color:'#ffffff', intensity:kind==='key'?1.1:2.6, distance:16, angle:19, penumbra:.5,
    decay:1.1, beam:kind==='spot', beamOpacity:.055, showCan:false, pulse:false};
};

let AMBIENT=null;
CORE.ambient=function(scene, level){
  if(!AMBIENT){ AMBIENT=new THREE.AmbientLight(0xbfb4ff, 1); scene.add(AMBIENT); }
  if(level!==undefined) AMBIENT.intensity=level;
  return AMBIENT;
};

CORE.EDIT=false;      /* stage mode sets this; a baked room leaves it false */
CORE.buildLight=function(L, scene){
  if(L.kind==='search') return CORE.buildSearch(L, scene);   /* v74 */
  const g=new THREE.Group();
  g.userData.lightId=L.id; g.userData.isLightRig=true;
  let light;
  if(L.kind==='point') light=new THREE.PointLight(0xffffff,1,10,1);
  else if(L.kind==='key') light=new THREE.DirectionalLight(0xffffff,1);
  else light=new THREE.SpotLight(0xffffff,1,10,.5,.5,1);
  g.add(light);
  if(light.target){ g.add(light.target); }
  g.userData.light=light;

  /* the can: a grab handle while staging, real set dressing only if asked for */
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.11,.15,.34,14),
    new THREE.MeshBasicMaterial({color:0x0f0b22}));
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.145,.016,8,18),
    new THREE.MeshBasicMaterial({color:0x2a2350}));
  ring.rotation.x=Math.PI/2; ring.position.y=-.15;
  const yoke=new THREE.Mesh(new THREE.TorusGeometry(.2,.014,6,16,Math.PI),
    new THREE.MeshBasicMaterial({color:0x2a2350}));
  yoke.rotation.y=Math.PI/2;
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.115,16),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95,
      blending:THREE.AdditiveBlending,depthWrite:false}));
  lens.position.y=-.172; lens.rotation.x=Math.PI/2;
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:shadowTex(),color:0xffffff,
    transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));
  halo.scale.setScalar(.9); halo.position.y=-.16;
  const fixture=new THREE.Group();
  [body,ring,yoke,lens,halo].forEach(x=>fixture.add(x));
  fixture.userData.lens=lens; fixture.userData.halo=halo;
  g.add(fixture); g.userData.fixture=fixture;

  /* additive beam */
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.09,1,1,20,1,true),
    new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.13,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
  beam.geometry.translate(0,-.5,0);          /* pivot at the lamp */
  g.add(beam); g.userData.beam=beam;

  g.traverse(o=>{ o.userData.lightId=L.id; o.userData.isLightRig=true; });
  scene.add(g);
  CORE.applyLight(L,g);
  return g;
};

const _v1=new THREE.Vector3(), _v2=new THREE.Vector3();
CORE.applyLight=function(L,g){
  if(!g) return;
  if(g.userData.search){ CORE.applySearch(L,g); return; }   /* v74 */
  const light=g.userData.light, beam=g.userData.beam, fix=g.userData.fixture;
  const col=new THREE.Color(L.color||'#ffffff');
  g.position.set(0,0,0);
  light.position.set(L.pos[0],L.pos[1],L.pos[2]);
  light.color.copy(col);
  light.intensity=(L.intensity===undefined?2:L.intensity)*(g.userData.pulseMul||1);
  if(light.isSpotLight){
    light.distance=L.distance||0;
    light.angle=(L.angle||26)*Math.PI/180;
    light.penumbra=L.penumbra===undefined?.45:L.penumbra;
    light.decay=L.decay===undefined?1.1:L.decay;
    light.target.position.set(L.target[0],L.target[1],L.target[2]);
    light.target.updateMatrixWorld();
  } else if(light.isPointLight){
    light.distance=L.distance||0;
    light.decay=L.decay===undefined?1.1:L.decay;
  } else if(light.target){
    light.target.position.set(L.target[0],L.target[1],L.target[2]);
    light.target.updateMatrixWorld();
  }
  if(fix){
    /* while staging it is the handle you grab; in a baked room it only exists if
       Adam asked for a real can to be part of the set */
    fix.visible = CORE.EDIT ? true : (L.showCan===true||L.fixture===true);
    fix.position.copy(light.position);
    _v1.set(L.target[0],L.target[1],L.target[2]);
    fix.lookAt(_v1); fix.rotateX(-Math.PI/2);
    if(fix.userData.lens) fix.userData.lens.material.color.copy(col);
    if(fix.userData.halo) fix.userData.halo.material.color.copy(col);
  }
  if(beam){
    const isSpot=light.isSpotLight;
    beam.visible=(L.beam!==false)&&isSpot;
    if(beam.visible){
      _v1.set(L.pos[0],L.pos[1],L.pos[2]);
      _v2.set(L.target[0],L.target[1],L.target[2]);
      const len=Math.max(.5,_v1.distanceTo(_v2));
      const rad=Math.tan((L.angle||26)*Math.PI/180)*len;
      beam.position.copy(_v1);
      beam.scale.set(Math.max(.05,rad),len,Math.max(.05,rad));
      beam.lookAt(_v2); beam.rotateX(-Math.PI/2);
      beam.material.color.copy(col);
      beam.material.opacity=(L.beamOpacity===undefined?.13:L.beamOpacity)*(g.userData.pulseMul||1);
    }
  }
};


/* ================= v74 · EVENT SEARCHLIGHTS — a light type like the others (Lighting → + Event searchlight) =================
   L.kind='search'; L.pos = where the trailer stands (on the ground); L.search={speed:'slow'|'medium'|'fast', swing:deg, tilt:deg, len:m, base:bool, start:'on'|'off'}.
   L.color, L.intensity (= how bright the beam is), L.pulse rides the song like any light. No real light is cast — it's a beam of haze,
   so any number of them costs next to nothing. A trigger target "the event searchlights" fades them all on / off (CORE.SEARCHK). */
CORE.SEARCHES=[]; CORE.SEARCHK=null;
CORE.searchDefaults=()=>({speed:'medium',swing:50,tilt:16,len:70,base:true,start:'on'});
const SEARCHVS='varying float vy; varying vec3 vn,vv; void main(){ vy=uv.y; vec4 mv=modelViewMatrix*vec4(position,1.); vn=normalize(normalMatrix*normal); vv=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }';
const SEARCHFS='uniform vec3 col; uniform float k; varying float vy; varying vec3 vn,vv; void main(){ float edge=pow(clamp(abs(dot(vn,vv)),0.,1.),1.6); float a=clamp(pow(clamp(vy,0.,1.),1.4)*.30*edge*k,0.,1.); gl_FragColor=vec4(max(col*a,vec3(0.)),a); }';
CORE.buildSearch=function(L, scene){
  const g=new THREE.Group(); g.userData.lightId=L.id; g.userData.isLightRig=true; g.userData.search=true; g.userData.L=L;
  const dark=new THREE.MeshStandardMaterial({color:0x1c1b22,metalness:.7,roughness:.4});
  const base=new THREE.Group(); g.add(base);
  const tb=new THREE.Mesh(new THREE.BoxGeometry(1.6,.7,1.1),dark); tb.position.y=.55; base.add(tb);
  [[.82,.35],[-.82,.35],[.82,-.35],[-.82,-.35]].forEach(([x,z])=>{ const w=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.18,14),dark); w.rotation.z=Math.PI/2; w.position.set(x,.28,z); base.add(w); });
  const yoke=new THREE.Group(); yoke.position.y=1; g.add(yoke); const head=new THREE.Group(); yoke.add(head);
  head.add(new THREE.Mesh(new THREE.CylinderGeometry(.55,.48,1.1,20),dark));
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.5,20),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})); lens.rotation.x=-Math.PI/2; lens.position.y=.56; head.add(lens);
  const bm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{col:{value:new THREE.Color()},k:{value:1}},vertexShader:SEARCHVS,fragmentShader:SEARCHFS});
  const bg=new THREE.CylinderGeometry(1,.46/3.4,1,28,1,true); bg.translate(0,.5,0); const uv=bg.attributes.uv; for(let i=0;i<uv.count;i++) uv.setY(i,1-uv.getY(i));
  const beam=new THREE.Mesh(bg,bm); beam.position.y=.56; beam.frustumCulled=false; head.add(beam);
  Object.assign(g.userData,{base,yoke,head,lens,beam,bm,ph:(String(L.id).split('').reduce((a,c)=>a*31+c.charCodeAt(0),7)%628)/100});
  g.userData.fixture=base;                                  /* the trailer is the handle you grab in the builder */
  g.traverse(o=>{ o.userData.lightId=L.id; o.userData.isLightRig=true; });
  scene.add(g); CORE.SEARCHES.push(g); CORE.searchBoot(); CORE.applySearch(L,g); return g; };
CORE.applySearch=function(L,g){ const S=Object.assign(CORE.searchDefaults(),L.search||{}), u=g.userData, col=new THREE.Color(L.color||'#ffffff');
  u.L=L; g.position.set(L.pos[0],0,L.pos[2]); u.bm.uniforms.col.value.copy(col); u.lens.material.color.copy(col).multiplyScalar(2);
  const len=Math.max(10,+S.len||70), r=Math.max(.6,len*.038); u.beam.scale.set(r,len,r);
  u.base.visible=S.base!==false||!!CORE.EDIT; };
CORE.searchBoot=function(){ if(CORE._searchBooted) return; const H=window.HEX; if(!H||!H.onFrame){ setTimeout(CORE.searchBoot,300); return; } CORE._searchBooted=true;
  const SP={slow:.18,medium:.35,fast:.7};
  H.onFrame.push(()=>{ const t=performance.now()/1000; let day=false; try{ const M=H._mood&&H._mood.M; day=!!(M&&(CORE.skyCfg(M).sky)==='day'); }catch(e){}
    for(let i=CORE.SEARCHES.length-1;i>=0;i--){ const g=CORE.SEARCHES[i]; if(!g.parent){ CORE.SEARCHES.splice(i,1); continue; } const u=g.userData, L=u.L||{}, S=Object.assign(CORE.searchDefaults(),L.search||{});
      const on=CORE.SEARCHK==null?(S.start==='off'?0:1):CORE.SEARCHK, sp=SP[S.speed]||.35, sw=(+S.swing||0)*Math.PI/180, tl=(+S.tilt||0)*Math.PI/180;
      u.yoke.rotation.y=u.ph+Math.sin(t*sp+u.ph)*sw; u.head.rotation.x=tl+Math.sin(t*sp*1.5+u.ph*1.3)*tl*.6;
      const k=(L.intensity==null?1:+L.intensity)*(u.pulseMul||1)*on*(day?.3:1);
      u.bm.uniforms.k.value=k; u.beam.visible=k>.002; u.lens.visible=on>.02; } }); };

/* switch the room's own surfaces between "fullbright" and "catches light" */
CORE.setSurfacesLit=function(H, on){
  const list=[];
  (H.walls||[]).forEach(m=>list.push(m));
  if(H.floor) list.push(H.floor);
  (H.banners||[]).forEach(m=>list.push(m));
  if(CORE.TILES) Object.keys(CORE.TILES).forEach(k=>(CORE.TILES[k]||[]).forEach(g=>{
    if(g.userData.art) list.push(g.userData.art);
    if(g.children&&g.children[0]) list.push(g.children[0]);
  }));
  list.forEach(m=>{
    if(!m||!m.material||m.userData.mood) return;
    if(on){
      if(m.userData._flat) return;
      m.userData._flat=m.material;
      m.material=new THREE.MeshPhongMaterial({map:m.material.map||null,
        color:m.material.color?m.material.color.clone():new THREE.Color(0xffffff),
        transparent:m.material.transparent, opacity:m.material.opacity,
        shininess:6, specular:0x0d0a20, side:m.material.side});
    } else {
      if(!m.userData._flat) return;
      const flat=m.userData._flat;
      flat.map=m.material.map;                     /* keep whatever art is current */
      flat.color.copy(m.material.color);
      flat.needsUpdate=true;
      m.material=flat; m.userData._flat=null;
    }
    m.material.needsUpdate=true;
  });
};

CORE.hydrateLights=function(bake, scene, H){
  const out={};
  if(!bake) return out;
  if(bake.lit&&bake.lit.surfaces) CORE.setSurfacesLit(H, true);
  CORE.ambient(scene, bake.lit&&bake.lit.ambient!==undefined?bake.lit.ambient:.85);
  (bake.lights||[]).forEach(L=>{ out[L.id]=CORE.buildLight(L, scene); });
  if((bake.lights||[]).some(L=>L.pulse) && H.levels && H.onFrame){
    H.onFrame.push(CORE.lightPulser(H, ()=>bake.lights.map(L=>({L:L,g:out[L.id]}))));
  }
  return out;
};

/* lights that ride the song */
CORE.lightPulser=function(H, list){
  let n=0, bass=0;
  return function(){
    if((n++%2)!==0) return;
    const d=H.levels?H.levels():null; if(!d) return;
    const b=(d[1]+d[2]+d[3])/765;
    bass+=(b-bass)*.22;
    const items=list();
    for(let i=0;i<items.length;i++){
      const it=items[i]; if(!it||!it.L||!it.g||!it.L.pulse) continue;
      it.g.userData.pulseMul=.45+bass*1.65;
      CORE.applyLight(it.L,it.g);
    }
  };
};


/* ---------- wall boards ----------
   A game marquee on one wall and a live leaderboard on another, drawn as canvas
   textures sitting slightly proud of the wall. Canvas rather than a projected
   DOM panel: it stays legible from any angle, tilts with the wall, and costs one
   texture upload per change instead of per frame. */
CORE.BOARDS={};
const BW=1024, BH=472;                 /* chat board — 2.17:1 */
const GW=1400, GH=500;                 /* game marquee — the platform hero card, 2.8:1 */
const LW=1024, LH=330;                 /* standings card — 3.1:1, stacks under the marquee */
CORE.boardSize=function(kind){
  if(kind==='game')   return {w:GW,h:GH};
  if(kind==='leader') return {w:LW,h:LH};
  return {w:BW,h:BH};                  /* chat */
};

function rr(g,x,y,w,h,r){ g.beginPath();
  if(g.roundRect) g.roundRect(x,y,w,h,r);
  else { g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r);
         g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
}
function initials(n){ return String(n||'').slice(0,2).toUpperCase(); }

/* letter-spaced text, drawn by hand so it looks the same in every browser
   (ctx.letterSpacing is Chromium-only) */
function lsw(g,t,sp){ let w=0; for(let i=0;i<t.length;i++) w+=g.measureText(t[i]).width+sp; return w-sp; }
function ls(g,t,x,y,sp){ for(let i=0;i<t.length;i++){ g.fillText(t[i],x,y); x+=g.measureText(t[i]).width+sp; } return x; }

/* the key art that ships with the room; CORE.SWSART is appended at build time */
let DEFIMG=null, DEFTRY=false;
CORE.marqueeArt=function(onready){
  if(DEFIMG&&DEFIMG.naturalWidth) return DEFIMG;
  if(DEFTRY||!CORE.SWSART) return null;
  DEFTRY=true; DEFIMG=new Image();
  DEFIMG.onload=function(){ try{ onready&&onready(); }catch(e){} };
  DEFIMG.src=CORE.SWSART;
  return null;
};

/* Where the two buttons live on the marquee, in 0..1 of the canvas. Filled in
   every draw so a tap can be matched against them. */
CORE.BOARDHIT={};

/* ---------- v48 · BOARD COLOURS ----------
   Every board colour goes through TC(). No theme = the exact Trio colours as always; a theme maps each
   Trio colour to its role (panel / frame / title / text / accent / dim), keeping its transparency. */
CORE.BTHEME=null;
CORE.BOARDTHEMES={
  concrete:{panel:'#121212', frame:'#e7e2a0', title:'#e7e2a0', text:'#ece9df', accent:'#e7e2a0', dim:'#8d897f'},
  ink:{panel:'#050505', frame:'#ffffff', title:'#ffffff', text:'#f2f2f2', accent:'#ffffff', dim:'#8a8a8a'},
  blood:{panel:'#0e0505', frame:'#c0352f', title:'#ff5a4f', text:'#f3e6e3', accent:'#ff5a4f', dim:'#8f6f6b'},
  neon:{panel:'#04070d', frame:'#2de2ff', title:'#2de2ff', text:'#e8fbff', accent:'#ff3fd8', dim:'#6f8a94'}
};
CORE.boardTheme=function(t){ if(!t||!t.preset||t.preset==='trio') return null;
  return Object.assign({}, CORE.BOARDTHEMES[t.preset]||CORE.BOARDTHEMES.concrete, t.preset==='custom'?t:{}); };
const TCROLE={'#15122a':'panel','#0d0b1c':'panel','#120f24':'panel','#3a2d7a':'panel','#1a1436':'panel',
  '#fbbf24':'accent','#fde68a':'accent','#ffd76a':'accent','#ffe9b3':'accent',
  '#2dd4bf':'title','#8b7bff':'title','#5b4bd4':'frame',
  '#e9e4ff':'text','#c9bfff':'text','#b9b1e0':'text','#cfc7f2':'text','#f5f2ff':'text','#ffffff':'text','#fff':'text','#a79fd0':'text',
  '#6b6494':'dim','#8f87b8':'dim','#7d76a6':'dim'};
const TCRGB={'9,7,20':'panel','7,6,13':'panel','139,123,255':'frame','159,145,255':'frame','190,180,255':'frame','207,199,242':'frame','91,75,212':'frame',
  '251,191,36':'accent','255,255,255':'text'};
const _hex2=h=>{ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; };
function TC(s){
  const t=CORE.BTHEME; if(!t) return s;
  const k=String(s).toLowerCase().replace(/\s/g,'');
  if(TCROLE[k]&&t[TCROLE[k]]) return t[TCROLE[k]];
  const m=k.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  if(m){ const r=TCRGB[m[1]+','+m[2]+','+m[3]]; if(r&&t[r]){ const c=_hex2(t[r]); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+m[4]+')'; } }
  return s;
}
CORE.drawGameBoard=function(c, cfg, art, onready){
  cfg=cfg||{};
  const g=c.getContext('2d');
  if(!art) art=CORE.marqueeArt(onready);
  g.clearRect(0,0,GW,GH);

  /* card */
  const bgg=g.createLinearGradient(0,0,GW,GH);
  bgg.addColorStop(0,TC('#15122a')); bgg.addColorStop(.55,TC('#0d0b1c')); bgg.addColorStop(1,TC('#120f24'));
  g.fillStyle=bgg; rr(g,0,0,GW,GH,34); g.fill();
  g.strokeStyle=TC('rgba(139,123,255,.30)'); g.lineWidth=3; rr(g,1.5,1.5,GW-3,GH-3,33); g.stroke();

  /* ---- left: square key art ---- */
  const P=32, AS=GH-P*2, AX=P, AY=P;
  g.save(); rr(g,AX,AY,AS,AS,22); g.clip();
  if(art&&art.complete&&art.naturalWidth){
    const s=Math.max(AS/art.naturalWidth, AS/art.naturalHeight);
    const w=art.naturalWidth*s, h=art.naturalHeight*s;
    g.drawImage(art, AX+(AS-w)/2, AY+(AS-h)/2, w, h);
  } else {
    const ag=g.createLinearGradient(AX,AY,AX+AS,AY+AS);
    ag.addColorStop(0,TC('#3a2d7a')); ag.addColorStop(1,TC('#1a1436'));
    g.fillStyle=ag; g.fillRect(AX,AY,AS,AS);
    g.fillStyle=TC('rgba(255,255,255,.14)'); g.font='700 30px Manrope,sans-serif';
    g.textAlign='center'; g.fillText('key art', AX+AS/2, AY+AS/2+10); g.textAlign='left';
  }
  /* the badge sits on the art, bottom-left */
  const badge=(cfg.badge===undefined?'LIVE NOW · FLAGSHIP DROP':cfg.badge);
  if(badge){
    g.font='800 16px Manrope,sans-serif';
    const bw=lsw(g,badge,1.9)+52, bh=40, bx=AX+16, by=AY+AS-16-bh;
    g.fillStyle=TC('rgba(7,6,13,.82)'); rr(g,bx,by,bw,bh,20); g.fill();
    g.strokeStyle=TC('rgba(251,191,36,.45)'); g.lineWidth=1.5; rr(g,bx+.75,by+.75,bw-1.5,bh-1.5,19); g.stroke();
    g.fillStyle=TC('#fb4a6d'); g.beginPath(); g.arc(bx+20,by+bh/2,5.5,0,6.284); g.fill();
    g.fillStyle=TC('#ffd76a'); ls(g,badge,bx+34,by+bh/2+6,1.9);
  }
  g.restore();

  /* ---- right column ---- */
  const X=AX+AS+46, RIGHT=GW-P-8, CW=RIGHT-X;

  /* kicker */
  const kick=(cfg.kicker===undefined?'LIVE NOW · SURVIVAL · AHZ SOUNDTRACK':cfg.kicker)||'';
  let ky=94;
  if(kick){
    g.font='800 19px Manrope,sans-serif';
    const cut=kick.indexOf('·');
    let kx=X;
    g.fillStyle=TC('#fbbf24'); g.beginPath(); g.arc(kx+6,ky-6,6,0,6.284); g.fill(); kx+=22;
    if(cut>0){
      g.fillStyle=TC('#fbbf24'); kx=ls(g,kick.slice(0,cut).trim(),kx,ky,2.6);
      g.fillStyle=TC('#7d76a6'); ls(g,'  '+kick.slice(cut),kx,ky,2.6);
    } else { g.fillStyle=TC('#fbbf24'); ls(g,kick,kx,ky,2.6); }
  }

  /* title — Anton, shrunk to fit, wrapped to two lines only if it must */
  const t=String(cfg.title||'THE GAME').toUpperCase();
  const fit=function(str,size){ g.font=size+'px Anton,Impact,sans-serif'; return g.measureText(str).width; };
  let size=104;
  while(size>58 && fit(t,size)>CW) size-=2;
  let ty=ky+94;
  if(fit(t,size)>CW){
    /* two lines */
    const ws=t.split(' '); let a=ws.shift(), b=ws.join(' ');
    while(ws.length && fit(a+' '+ws[0],76)<CW) a+=' '+ws.shift();
    b=ws.join(' ');
    let s2=76; while(s2>46 && (fit(a,s2)>CW||fit(b,s2)>CW)) s2-=2;
    g.fillStyle=TC('#ffffff'); g.font=s2+'px Anton,Impact,sans-serif';
    g.fillText(a,X,ky+66); g.fillText(b,X,ky+66+s2*0.96);
    ty=ky+66+s2*0.96;
  } else {
    g.fillStyle=TC('#ffffff'); g.font=size+'px Anton,Impact,sans-serif';
    g.fillText(t,X,ty);
  }

  /* subtitle */
  const sub=(cfg.sub===undefined?'Move on the kick drum. Outlast the horde.':cfg.sub)||'';
  let fy=ty;
  if(sub){
    g.fillStyle=TC('#a79fd0'); g.font='700 25px Manrope,sans-serif';
    let ss=25; while(ss>17 && g.measureText(sub).width>CW){ ss-=1; g.font='700 '+ss+'px Manrope,sans-serif'; }
    g.fillText(sub,X,ty+46); fy=ty+46;
  }

  /* foot line sits under the copy, not under the buttons */
  const hint=cfg.hint||'';
  if(hint){ g.fillStyle=TC('#6b6494'); g.font='700 17px Manrope,sans-serif';
    ls(g,hint.toUpperCase(),X,fy+42,1.6); }

  /* buttons */
  const BYT=GH-P-88, BHt=74;
  g.font='800 23px Manrope,sans-serif';
  const play=(cfg.playLabel||'PLAY NOW');
  const pw=Math.max(236, lsw(g,play,2.4)+72);
  const pg=g.createLinearGradient(X,BYT,X,BYT+BHt);
  pg.addColorStop(0,TC('#fde68a')); pg.addColorStop(1,TC('#fbbf24'));
  g.fillStyle=pg; rr(g,X,BYT,pw,BHt,36); g.fill();
  g.fillStyle=TC('#07060d'); ls(g,play,X+(pw-lsw(g,play,2.4))/2,BYT+BHt/2+8,2.4);
  CORE.BOARDHIT.play=[X/GW, BYT/GH, pw/GW, BHt/GH];

  delete CORE.BOARDHIT.chal;
  if(cfg.chal!==false){
    const cl=(cfg.chalLabel||'CHALLENGE A FRIEND');
    g.font='800 21px Manrope,sans-serif';
    const cw=Math.min(RIGHT-(X+pw+18), lsw(g,cl,2.2)+92), cx=X+pw+18;
    if(cw>170){
      g.fillStyle=TC('rgba(139,123,255,.10)'); rr(g,cx,BYT,cw,BHt,36); g.fill();
      g.strokeStyle=TC('rgba(159,145,255,.62)'); g.lineWidth=2.5; rr(g,cx,BYT,cw,BHt,36); g.stroke();
      g.fillStyle=TC('#ffd76a'); g.font='700 24px Manrope,sans-serif'; g.fillText('⚡',cx+26,BYT+BHt/2+9);
      g.fillStyle=TC('#cfc7f2'); g.font='800 21px Manrope,sans-serif';
      ls(g,cl,cx+58,BYT+BHt/2+8,2.2);
      CORE.BOARDHIT.chal=[cx/GW, BYT/GH, cw/GW, BHt/GH];
    }
  }

  /* share glyph, top right */
  g.strokeStyle=TC('rgba(207,199,242,.55)'); g.lineWidth=2.5; g.lineCap='round';
  const sx=GW-P-22, sy=P+30;
  g.beginPath(); g.moveTo(sx-11,sy-2); g.lineTo(sx-11,sy+11); g.lineTo(sx+11,sy+11); g.lineTo(sx+11,sy-2); g.stroke();
  g.beginPath(); g.moveTo(sx,sy+5); g.lineTo(sx,sy-12); g.stroke();
  g.beginPath(); g.moveTo(sx-6,sy-6); g.lineTo(sx,sy-13); g.lineTo(sx+6,sy-6); g.stroke();
  g.textAlign='left';
};

/* The standings card. The reaction-feed strip that used to run along the bottom
   is gone — the chat board carries room talk now, and dropping it turns this
   into a wide, short card that stacks cleanly under the marquee at matching
   width. `lines` is still accepted so every existing caller keeps working. */
CORE.drawLeaderBoard=function(c, rows, lines, over){
  const g=c.getContext('2d');
  g.clearRect(0,0,LW,LH);
  g.fillStyle=TC('rgba(9,7,20,.94)'); rr(g,0,0,LW,LH,24); g.fill();
  g.strokeStyle=TC('rgba(139,123,255,.55)'); g.lineWidth=5; rr(g,3,3,LW-6,LH-6,22); g.stroke();
  g.fillStyle=TC('#2dd4bf'); g.font='800 23px Manrope,sans-serif';
  ls(g,'EVENT BOARD',40,56,5);
  g.fillStyle=over?TC('#fbbf24'):TC('#ff5470'); g.textAlign='right';
  g.font='800 23px Manrope,sans-serif';
  g.fillText(over?'FINAL':'LIVE', LW-40, 56);
  g.textAlign='left';
  g.strokeStyle=TC('rgba(139,123,255,.22)'); g.lineWidth=2;
  g.beginPath(); g.moveTo(40,76); g.lineTo(LW-40,76); g.stroke();

  const top=(rows||[]).slice(0,5);
  top.forEach(function(p,i){
    const y=120+i*47;
    if(p.you){ g.fillStyle=TC('rgba(251,191,36,.12)'); rr(g,32,y-31,LW-64,42,10); g.fill(); }
    g.fillStyle=i===0?TC('#fbbf24'):TC('#6b6494'); g.font='800 22px Manrope,sans-serif';
    g.fillText(String(i+1), 46, y);
    const ax=84;
    g.fillStyle=i===0?TC('#fbbf24'):TC('#5b4bd4');
    g.beginPath(); g.arc(ax+16,y-8,17,0,6.284); g.fill();
    g.fillStyle=i===0?TC('#07060d'):TC('#fff'); g.font='800 16px Manrope,sans-serif';
    g.textAlign='center'; g.fillText(initials(p.n), ax+16, y-2); g.textAlign='left';
    g.fillStyle=p.you?TC('#fbbf24'):TC('#e9e4ff'); g.font='700 27px Manrope,sans-serif';
    g.fillText(String(p.n).slice(0,18), ax+46, y);
    g.fillStyle=TC('#c9bfff'); g.font='800 25px Manrope,sans-serif'; g.textAlign='right';
    g.fillText(Number(p.s||0).toLocaleString(), LW-46, y); g.textAlign='left';
  });
  if(!top.length){
    g.fillStyle=TC('#6b6494'); g.font='700 24px Manrope,sans-serif';
    g.fillText('no scores yet — be first', 46, 136);
  }
};

/* ---------- the chat board ----------
   The live board's sibling: same mesh, same canvas trick, different draw. It
   renders whatever it is handed and never filters — moderation happens before
   a line ever reaches here (see claude/trio-eventspace-live-contract.md). */
const ROLECOL={ artist:'#fbbf24', me:'#fbbf24', mod:'#2dd4bf', system:'#6b6494', fan:'#e9e4ff' };
/* THE FAN BOARD on the wall (mock approved 9/25, panel 1): heading, "N signed", the four newest
   lines (yours gold), and a "tap to read & sign" pill. Rows come from the page; a tap on the board
   asks the page to open its sign sheet. Text only — every line was typed by a fan. */
CORE.drawFanBoard=function(c, lines, opts){
  const g=c.getContext('2d');
  g.clearRect(0,0,BW,BH);
  g.fillStyle=TC('rgba(9,7,20,.94)'); rr(g,0,0,BW,BH,26); g.fill();
  g.strokeStyle=TC('rgba(139,123,255,.55)'); g.lineWidth=5; rr(g,3,3,BW-6,BH-6,24); g.stroke();
  g.fillStyle=TC('#2dd4bf'); g.font='800 24px Manrope,sans-serif';
  ls(g, String(opts.title&&opts.title!=='THE ROOM'?opts.title:'FAN BOARD').toUpperCase().slice(0,24), 40, 62, 6);
  const n=(opts.count!=null&&isFinite(opts.count))?+opts.count:(lines||[]).length;
  if(n>0){ g.textAlign='right'; g.fillStyle=TC('#8f87b8'); g.font='700 20px Manrope,sans-serif';
    g.fillText(n+' signed', BW-40, 62); g.textAlign='left'; }
  g.strokeStyle=TC('rgba(139,123,255,.22)'); g.lineWidth=2;
  g.beginPath(); g.moveTo(40,82); g.lineTo(BW-40,82); g.stroke();
  const rows=(lines||[]).slice(0,4);
  if(!rows.length){
    g.fillStyle=TC('#8f87b8'); g.font='700 26px Manrope,sans-serif';
    g.fillText('be the first to sign', 46, 170);
  }
  rows.forEach(function(m,i){
    const y=136+i*52, me=m.role==='me';
    if(me){ g.fillStyle=TC('rgba(251,191,36,.12)'); rr(g,30,y-33,BW-60,46,12); g.fill();
      g.strokeStyle=TC('rgba(251,191,36,.45)'); g.lineWidth=1.5; rr(g,30,y-33,BW-60,46,12); g.stroke(); }
    g.fillStyle=me?TC('#fbbf24'):TC('#8b7bff'); g.font='800 23px Manrope,sans-serif';
    const nm=String(m.name||'').toUpperCase().slice(0,14);
    g.fillText(nm, 46, y);
    const tx=46+g.measureText(nm).width+14;
    g.fillStyle=me?TC('#fde68a'):TC('#e9e4ff'); g.font='700 23px Manrope,sans-serif';
    let t=String(m.text||''); const maxW=BW-46-tx;
    if(g.measureText(t).width>maxW){ while(t.length&&g.measureText(t+'…').width>maxW) t=t.slice(0,-1); t+='…'; }
    g.fillText(t, tx, y);
  });
  /* the pill — purple glass, never yellow */
  const pw=520, ph=66, px=(BW-pw)/2, py=BH-ph-30;
  const gr=g.createLinearGradient(0,py,0,py+ph);
  gr.addColorStop(0,TC('rgba(139,123,255,.62)')); gr.addColorStop(1,TC('rgba(91,75,212,.5)'));
  g.fillStyle=gr; rr(g,px,py,pw,ph,ph/2); g.fill();
  g.strokeStyle=TC('rgba(190,180,255,.6)'); g.lineWidth=2; rr(g,px,py,pw,ph,ph/2); g.stroke();
  g.fillStyle=TC('#f5f2ff'); g.font='800 22px Manrope,sans-serif';
  const label='TAP TO READ & SIGN', lw=lsw(g,label,3.5);
  ls(g,label,(BW-lw)/2,py+ph/2+8,3.5);
};

CORE.drawChatBoard=function(c, lines, opts){
  opts=opts||{};
  if(opts.fan) return CORE.drawFanBoard(c, lines, opts);
  const g=c.getContext('2d');
  g.clearRect(0,0,BW,BH);
  g.fillStyle=TC('rgba(9,7,20,.94)'); rr(g,0,0,BW,BH,26); g.fill();
  g.strokeStyle=TC('rgba(139,123,255,.55)'); g.lineWidth=5; rr(g,3,3,BW-6,BH-6,24); g.stroke();

  g.fillStyle=TC('#8b7bff'); g.font='800 24px Manrope,sans-serif';
  ls(g, (opts.title||'THE ROOM'), 40, 62, 6);
  const n=opts.count;
  if(n!==undefined){
    g.textAlign='right';
    g.fillStyle=TC('#6b6494'); g.font='700 18px Manrope,sans-serif';
    const cw=g.measureText(String(n)+' in').width;
    g.fillText(String(n)+' in', BW-40, 62);
    g.font='800 20px Manrope,sans-serif'; g.fillStyle=TC('#ff6b8a');
    const lx=BW-40-cw-22;
    g.fillText('LIVE', lx, 62);
    const lw=g.measureText('LIVE').width;
    g.textAlign='left';
    g.fillStyle=TC('#fb4a6d'); g.beginPath(); g.arc(lx-lw-16,55,7,0,6.284); g.fill();
  }
  g.strokeStyle=TC('rgba(139,123,255,.22)'); g.lineWidth=2;
  g.beginPath(); g.moveTo(40,82); g.lineTo(BW-40,82); g.stroke();

  const rows=(lines||[]).slice(-7);
  if(!rows.length){
    g.fillStyle=TC('#6b6494'); g.font='700 23px Manrope,sans-serif';
    g.fillText('chat opens when the room does', 46, 146);
    return;
  }
  /* newest at the bottom, list growing upward — reads as a live feed */
  const step=51, bottom=BH-42;
  rows.forEach(function(m,i){
    const y=opts.top?(146+i*step):(bottom-(rows.length-1-i)*step), role=m.role||'fan';   /* top: newest first from the header down */
    const fade=Math.max(.42, 1-(opts.top?i:(rows.length-1-i))*0.085);   /* top:true = newest first, brightest on top */
    g.globalAlpha=fade;
    if(role==='artist'||role==='me'){
      g.fillStyle=TC('rgba(251,191,36,.13)'); rr(g,32,y-30,BW-64,44,12); g.fill();
      g.strokeStyle=TC('rgba(251,191,36,.34)'); g.lineWidth=1.5; rr(g,32,y-30,BW-64,44,12); g.stroke();
    }
    if(role==='system'){
      g.fillStyle=TC('#6b6494'); g.font='700 20px Manrope,sans-serif';
      g.fillText('· '+String(m.text||'').slice(0,74), 46, y);
      g.globalAlpha=1; return;
    }
    const ax=46;
    g.fillStyle=(role==='artist'||role==='me')?TC('#fbbf24'):(role==='mod'?TC('#2dd4bf'):TC('#5b4bd4'));
    g.beginPath(); g.arc(ax+17,y-8,17,0,6.284); g.fill();
    g.fillStyle=(role==='artist'||role==='me')?TC('#07060d'):TC('#fff'); g.font='800 15px Manrope,sans-serif';
    g.textAlign='center'; g.fillText(initials(m.name), ax+17, y-2); g.textAlign='left';
    g.fillStyle=TC(ROLECOL[role]||ROLECOL.fan); g.font='800 21px Manrope,sans-serif';
    const nm=String(m.name||'').slice(0,14);
    g.fillText(nm, ax+44, y);
    let tx=ax+44+g.measureText(nm).width+16;
    if(role==='artist'){
      g.fillStyle=TC('#fbbf24'); g.font='800 12px Manrope,sans-serif';
      const bw=lsw(g,'ARTIST',1.4)+18;
      g.globalAlpha=fade*.9; rr(g,tx,y-17,bw,22,11); g.stroke();
      g.globalAlpha=fade; ls(g,'ARTIST',tx+9,y-2,1.4); tx+=bw+14;
    }
    g.fillStyle=role==='artist'?TC('#ffe9b3'):(role==='me'?TC('#fde68a'):TC('#b9b1e0')); g.font='700 21px Manrope,sans-serif';
    let t=String(m.text||'');
    const room=BW-40-tx;
    if(g.measureText(t).width>room){
      while(t.length>4 && g.measureText(t+'…').width>room) t=t.slice(0,-1);
      t+='…';
    }
    g.fillText(t, tx, y);
    g.globalAlpha=1;
  });
};

/* ---------- key art as a wall backdrop ----------
   Adam wanted the Soundwave Survival art ON the wall, not only inside the card.
   This paints it full-bleed across the marquee wall with a scrim so the hero
   card still reads on top. It installs itself as that slot's *default* dress,
   so anything Adam stages on that wall still wins. */
CORE.keyArtWallTex=function(img, opts){
  opts=opts||{};
  const W=1536, H=Math.round(W/((opts&&opts.aspect)||(10/4.6)));
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const g=c.getContext('2d');
  g.fillStyle='#07060d'; g.fillRect(0,0,W,H);
  if(img&&img.naturalWidth){
    const s=Math.max(W/img.naturalWidth, H/img.naturalHeight);
    const w=img.naturalWidth*s, h=img.naturalHeight*s;
    g.drawImage(img,(W-w)/2,(H-h)/2,w,h);
    /* scrim: darker in the middle where the card sits, lighter at the edges */
    const dim=(opts.dim===undefined?.62:opts.dim);
    g.fillStyle='rgba(7,6,13,'+dim+')'; g.fillRect(0,0,W,H);
    const v=g.createRadialGradient(W/2,H/2,H*0.18,W/2,H/2,W*0.62);
    v.addColorStop(0,'rgba(7,6,13,.55)'); v.addColorStop(1,'rgba(7,6,13,.05)');
    g.fillStyle=v; g.fillRect(0,0,W,H);
  }
  const t=new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;
  return t;
};
CORE.KEYART={};
CORE.installKeyArtDefault=function(H, slotId, opts){
  if(!H||!H.defaultMap) return;
  if(!H._defMapRaw) H._defMapRaw=H.defaultMap;
  const raw=H._defMapRaw;
  H.defaultMap=function(id){
    if(CORE.KEYART.slot===id && CORE.KEYART.tex) return CORE.KEYART.tex;
    return raw(id);
  };
  if(CORE.KEYART.slot===slotId && CORE.KEYART.tex) return;
  CORE.KEYART.slot=slotId;
  const wi=+String(slotId).replace('wall','');
  const o2=Object.assign({}, opts||{}, {aspect:CORE.room(H).aspect(wi)});
  const build=function(img){
    CORE.KEYART.tex=CORE.keyArtWallTex(img, o2);
    if(opts&&opts.onready) opts.onready();
  };
  const a=CORE.marqueeArt(function(){ build(CORE.marqueeArt()); });
  build(a||null);
};
CORE.clearKeyArtDefault=function(H){
  if(H&&H._defMapRaw){ H.defaultMap=H._defMapRaw; }
  CORE.KEYART={};
};

/* ---------- a crowd, for demos ----------
   Stage dressing only. Nothing here talks to a server, and no score it makes
   is a record — it exists so the boards look alive while Adam shows the room. */
const SIMNAMES=['MAXVOLT','KAYZEE','NOVA_7','DRIFTKING','HEXHEAD','BASSFACE',
  'LILRUIN','ZEPHYR','VANTA','SIRENX','GLITCHR','ORION','TEMPO','MOTHLIGHT'];
const SIMCHAT=['this room goes stupid hard','ok the walls are insane',
  'who is top rn','beat that','i cannot survive past wave 4','the drop tho',
  'first time here this is wild','turn it up','someone take maxvolt down',
  'that key art is sick','my thumbs hurt','romy we love you',
  'best event of the year','wave 7 is not real','how do i get the skin'];
const SIMARTIST=['yo what is up hex','you all sound incredible tonight',
  'top of the board gets a shoutout','one more run then i am jumping in',
  'thank you for being here seriously'];
CORE.liveSim=function(opt){
  opt=opt||{};
  const st={on:false, rows:[], chat:[], lines:[], count:0, t:null, tick:0};
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const seed=function(){
    const names=SIMNAMES.slice().sort(()=>Math.random()-.5).slice(0,7);
    st.rows=names.map((n,i)=>({n:n, s:4200+Math.round(Math.random()*900)+ (7-i)*1400}));
    st.rows.sort((a,b)=>b.s-a.s);
    st.count=18+Math.floor(Math.random()*26);
    /* open already full — a chat board with three lines on it looks dead */
    const used={};
    const line=()=>{ let t; let n=0; do{ t=pick(SIMCHAT); }while(used[t]&&++n<8); used[t]=1;
      return {name:pick(SIMNAMES), text:t, role:'fan'}; };
    st.chat=[{name:'TRIO',text:'the room is open',role:'system'},
             line(), line(),
             {name:opt.artist||'ROMY',text:SIMARTIST[0],role:'artist'},
             line(), line(), line()];
    st.lines=['welcome to the room'];
  };
  const emit=function(){
    if(opt.onBoard) try{ opt.onBoard(st.rows.slice(), false); }catch(e){}
    if(opt.onChat)  try{ opt.onChat(st.chat.slice(), st.count); }catch(e){}
    if(opt.onLine)  try{ opt.onLine(st.lines.slice()); }catch(e){}
  };
  const step=function(){
    st.tick++;
    /* somebody scores */
    const i=Math.floor(Math.random()*st.rows.length);
    if(st.rows[i]){
      const was=st.rows.slice().sort((a,b)=>b.s-a.s)[0];
      st.rows[i].s+=180+Math.round(Math.random()*1400);
      st.rows.sort((a,b)=>b.s-a.s);
      if(st.rows[0].n!==was.n){
        st.lines.push(st.rows[0].n+' just took #1');
        st.chat.push({name:'TRIO',text:st.rows[0].n+' just took #1',role:'system'});
      }
    }
    if(st.tick%2===0) st.chat.push({name:pick(SIMNAMES),text:pick(SIMCHAT),role:'fan'});
    if(st.tick%9===0) st.chat.push({name:opt.artist||'ROMY',text:pick(SIMARTIST),role:'artist'});
    if(st.tick%7===0){ st.count+=(Math.random()>.35?1:-1);
      if(st.count<6) st.count=6;
      st.lines.push(st.count+' players in'); }
    if(st.chat.length>24) st.chat=st.chat.slice(-24);
    if(st.lines.length>6) st.lines=st.lines.slice(-6);
    emit();
  };
  st.start=function(){
    if(st.on) return st; st.on=true;
    if(!st.rows.length) seed();
    emit();
    st.t=setInterval(step, opt.every||1100);
    return st;
  };
  st.stop=function(){ st.on=false; if(st.t) clearInterval(st.t); st.t=null; return st; };
  st.reset=function(){ seed(); emit(); return st; };
  return st;
};

CORE.buildWallBoard=function(kind, wallIdx, H, scene, size){
  const key=kind+':'+wallIdx;
  if(CORE.BOARDS[key]) return CORE.BOARDS[key];
  const d=CORE.boardSize(kind);
  const c=document.createElement('canvas'); c.width=d.w; c.height=d.h;
  const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
  const w=(size&&size.w)||6.0, h=w*(d.h/d.w);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
    new THREE.MeshBasicMaterial({map:tex,transparent:true}));
  const RM=CORE.room(H), nb=RM.normal(wallIdx);
  /* raised above the wall top → it hangs out in the air like the banners (1.3 m in),
     otherwise it sits on the wall face exactly as before */
  const by=(size&&size.y)||2.35, hang=by>((H&&H.WALL_H)||4.6);
  m.position.copy(RM.wallPoint(wallIdx, 0, by, hang?1.3:0.10));
  m.lookAt(m.position.x+nb.x, m.position.y, m.position.z+nb.z);
  m.userData.boardKind=kind; m.userData.isBoard=true;
  scene.add(m);
  const rec={mesh:m, canvas:c, tex:tex, kind:kind, wall:wallIdx};
  CORE.BOARDS[key]=rec;
  return rec;
};
/* ==================== THE GAME SCREEN (free-floating) ====================
   The game marquee, taken off the wall: a 16:9 picture you place anywhere — over a TV model, say —
   with a "TAP TO PLAY" pill floating above it that bobs and breathes to draw the eye. Tapping the
   picture or the pill plays, exactly like the wall marquee (inside a Trio page: asks the page). */
CORE.pillTex=function(){
  const c=document.createElement('canvas'); c.width=1024; c.height=256; const x=c.getContext('2d');
  const gr=x.createLinearGradient(0,48,0,208); gr.addColorStop(0,'rgba(150,132,255,.97)'); gr.addColorStop(1,'rgba(91,75,212,.95)');
  x.fillStyle=gr; rr(x,112,48,800,160,80); x.fill();
  x.strokeStyle='rgba(225,218,255,.9)'; x.lineWidth=6; rr(x,112,48,800,160,80); x.stroke();
  x.fillStyle='#fff'; x.font='400 88px Anton,Impact,sans-serif'; x.textAlign='center'; x.textBaseline='middle';
  x.font='400 88px Anton,Impact,sans-serif'; const tw=x.measureText('TAP TO PLAY').width, tx=512+30;
  x.fillText('TAP TO PLAY',tx,134);
  const ax=tx-tw/2-58; x.beginPath(); x.moveTo(ax,106); x.lineTo(ax+40,130); x.lineTo(ax,154); x.closePath(); x.fill();   /* drawn, not a glyph */
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return {tex:t, canvas:c};
};
CORE.glowTex=function(){
  const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d');
  const r=x.createRadialGradient(64,64,4,64,64,64); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.45,'rgba(255,255,255,.35)'); r.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=r; x.fillRect(0,0,128,128); const t=new THREE.CanvasTexture(c); return t;
};
CORE.screenPlaceholder=function(){
  const c=document.createElement('canvas'); c.width=1280; c.height=720; const x=c.getContext('2d');
  x.fillStyle='#0b0918'; x.fillRect(0,0,1280,720); x.strokeStyle='rgba(139,123,255,.7)'; x.lineWidth=8; x.setLineDash([28,18]); x.strokeRect(24,24,1232,672);
  x.fillStyle='#8f87b8'; x.font='800 52px Manrope,sans-serif'; x.textAlign='center'; x.fillText('+ screen art · 16:9',640,380);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
};
CORE.buildFreeScreen=function(cfg, H, scene, img){
  const key='game:free'; if(CORE.BOARDS[key]) return CORE.BOARDS[key];
  const F=cfg.free||{x:0,y:2.2,z:0,ry:0,w:3.2};
  const w=F.w||3.2, h=w*9/16;
  let tex, vid=null;
  if(img&&img.video){                         /* a loop: silent, plays only in view, sleeps with the room */
    vid=CORE.videoFor(img.video); vid.muted=true; tex=CORE.videoTex(vid); }
  else if(img){ tex=new THREE.Texture(img); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=4;
    if(img.complete===false) img.addEventListener('load',()=>{ tex.needsUpdate=true; },{once:true}); else tex.needsUpdate=true; }
  else tex=CORE.screenPlaceholder();
  const g=new THREE.Group(); g.position.set(F.x||0, F.y||2.2, F.z||0); g.rotation.y=(F.ry||0)*Math.PI/180;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshBasicMaterial({map:tex, side:THREE.DoubleSide}));
  m.userData.boardKind='game'; m.userData.isBoard=true; g.add(m);
  const P=CORE.pillTex(), pw=Math.max(1.2,Math.min(2.6,w*.62)), ph=pw/4;
  const pill=new THREE.Mesh(new THREE.PlaneGeometry(pw,ph), new THREE.MeshBasicMaterial({map:P.tex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  pill.position.set(0, h/2+ph*.5+.22, .02); pill.userData.boardKind='game'; g.add(pill);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(pw*1.5,ph*2.6), new THREE.MeshBasicMaterial({map:CORE.glowTex(),color:0x9d8bff,transparent:true,opacity:.5,
    blending:THREE.AdditiveBlending,depthWrite:false}));
  glow.position.set(0, pill.position.y, .005); g.add(glow);
  scene.add(g);
  if(CORE.SURFVID.gamescreen&&CORE.SURFVID.gamescreen.video){ try{ const o=CORE.SURFVID.gamescreen.video; o.pause(); o.removeAttribute('src'); o.load(); o.remove(); }catch(e){} }
  if(vid) CORE.SURFVID.gamescreen={obj:m, video:vid}; else delete CORE.SURFVID.gamescreen;   /* the culler + sleep see it */
  const rec={mesh:m, group:g, pill:pill, glow:glow, canvas:null, tex:tex, kind:'game', wall:null, free:true, baseY:pill.position.y, ph:ph, video:vid};
  CORE.BOARDS[key]=rec;
  /* bob + breathe — about one cycle every 1.8 s */
  if(!CORE.PILLANIM&&H&&H.onFrame){ CORE.PILLANIM=true; const t0=performance.now();
    H.onFrame.push(function(){ const r=CORE.BOARDS['game:free']; if(!r) return;
      const t=(performance.now()-t0)/1000*3.5, s=Math.sin(t);
      r.pill.position.y=r.baseY+s*r.ph*.16; const k=1+s*.045; r.pill.scale.set(k,k,1);
      r.glow.position.y=r.pill.position.y; r.glow.material.opacity=.28+.3*(.5+.5*s); }); }
  return rec;
};
CORE.clearBoards=function(scene){
  Object.keys(CORE.BOARDS).forEach(function(k){
    scene.remove(CORE.BOARDS[k].group||CORE.BOARDS[k].mesh); delete CORE.BOARDS[k]; });
};
CORE.boardByKind=function(kind){
  const k=Object.keys(CORE.BOARDS).filter(function(x){ return CORE.BOARDS[x].kind===kind; });
  return k.length?CORE.BOARDS[k[0]]:null;
};

/* tap the game marquee -> launch it. PLAY NOW and CHALLENGE A FRIEND are
   separate zones: the UV of the hit is matched against the rects the draw
   recorded. Anywhere else on the card still plays, so a fan cannot miss. */
CORE.hitZone=function(uv){
  if(!uv) return null;
  const x=uv.x, y=1-uv.y, H=CORE.BOARDHIT;
  const inr=r=>r&&x>=r[0]&&x<=r[0]+r[2]&&y>=r[1]&&y<=r[1]+r[3];
  if(inr(H.chal)) return 'chal';
  if(inr(H.play)) return 'play';
  return 'card';
};
CORE.wireBoards=function(H, getCfg){
  if(CORE.BOARDWIRED) return; CORE.BOARDWIRED=true;
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2();
  H.canvas.addEventListener('click',function(e){
    const g=CORE.boardByKind('game'); if(!g) return;
    ptr.x=e.clientX/innerWidth*2-1; ptr.y=-(e.clientY/innerHeight)*2+1;
    ray.setFromCamera(ptr,H.cam);
    const hit=g.free?ray.intersectObjects([g.mesh,g.pill],false):ray.intersectObject(g.mesh,false);
    if(!hit.length) return;
    const cfg=getCfg?getCfg():null;
    const zone=g.free?'card':CORE.hitZone(hit[0].uv);
    if(zone==='chal'){
      try{ window.dispatchEvent(new CustomEvent('hex:challenge',{detail:{cfg:cfg}})); }catch(e2){}
      if(CORE.onChallenge){ try{ CORE.onChallenge(cfg); }catch(e3){} }
      return;
    }
    if(CORE.post({trio:'open', board:'game'})) return;          /* hosted: the page opens the game */
    if(cfg&&cfg.url&&H.openGame) H.openGame(cfg.url, cfg.title||'');
  });
};

/* ---------- the turntable ----------
   Hit go and the room turns itself: camera parked dead centre, tilted up a
   touch toward the banner line, one steady revolution. Velocity is a trapezoid
   — it eases on and off over the first and last slice and holds a constant
   rate through the middle, so it reads as steady rather than as an ease curve.
   Any real input takes control back instantly. */
function spinEase(p, e){
  if(e<=0.0001) return p;
  const a=e, b=1-e, norm=1-e;
  let v;
  if(p<=a)      v=(p*p)/(2*a);
  else if(p<=b) v=a/2+(p-a);
  else{ const q=p-b; v=a/2+(b-a)+(q-(q*q)/(2*e)); }
  return Math.min(1, v/norm);
}
CORE.ORBIT=null;
CORE.orbitBoot=function(H, getCfg){
  if(CORE.ORBIT) return CORE.ORBIT;
  const st={running:false, p:0, dur:24, turns:1, tilt:0.10, loop:false,
            fromYaw:0, keepPitch:0, navWas:true, posWas:null, t0:0, onChange:null};
  CORE.ORBIT=st;
  const cfg=()=>Object.assign({dur:24,turns:1,tilt:0.10,loop:false,button:true},
                              (getCfg&&getCfg())||{});

  /* the button — ships in baked rooms too */
  const btn=document.createElement('button');
  btn.id='hexSpin'; btn.type='button';
  btn.innerHTML='<i></i>360';
  btn.style.display='none';
  document.body.appendChild(btn);
  st.btn=btn;
  btn.addEventListener('click',function(e){ e.stopPropagation(); st.running?st.stop():st.start(); });
  st.showButton=function(b){ btn.style.display=b?'':'none'; };

  const setPitchTo=function(target){
    if(!H.getPitch||!H.addPitch) return;
    H.addPitch(target-H.getPitch());
  };

  st.start=function(over){
    const c=Object.assign(cfg(), over||{});
    st.dur=Math.max(4,+c.dur||24); st.turns=Math.max(1,+c.turns||1);
    st.tilt=+c.tilt; st.loop=!!c.loop;
    const nav=CORE.NAV;
    if(nav){
      st.navWas=nav.enabled;
      st.posWas={x:nav.pos.x, z:nav.pos.z};
      nav.pos.x=0; nav.pos.z=0; nav.pos.init=true;   /* dead centre */
      nav.enabled=false;
      nav.move.f=0; nav.move.t=0; nav.padF=0; nav.padS=0;
    }
    st.keepPitch=H.getPitch?H.getPitch():0;
    setPitchTo(st.tilt);
    st.fromYaw=H.getYaw?H.getYaw():0;
    st.p=0; st.t0=performance.now(); st.running=true;
    btn.classList.add('on'); btn.innerHTML='<i></i>STOP';
    document.body.classList.add('hexspinning');          /* a clean screen for recording — only STOP stays */
    if(st.onChange) st.onChange(true);
    return st;
  };
  st.stop=function(restore){
    if(!st.running) return st;
    st.running=false;
    const nav=CORE.NAV;
    if(nav){
      nav.enabled=(st.navWas!==false);
      if(restore&&st.posWas){ nav.pos.x=st.posWas.x; nav.pos.z=st.posWas.z; }
    }
    if(restore) setPitchTo(st.keepPitch);
    btn.classList.remove('on'); btn.innerHTML='<i></i>360';
    document.body.classList.remove('hexspinning');
    if(st.onChange) st.onChange(false);
    return st;
  };

  /* a real input means "I've got it from here" */
  const grab=function(){ if(st.running) st.stop(false); };
  window.addEventListener('keydown',function(e){
    if(e.key==='Escape'){ grab(); return; }
    if(/^(w|a|s|d|q|e|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/i.test(e.key)) grab();
  });
  if(H.canvas) H.canvas.addEventListener('pointerdown',grab);

  H.onFrame.push(function(){
    if(!st.running) return;
    const nav=CORE.NAV;
    if(nav){
      nav.pos.x=0; nav.pos.z=0;                       /* hold dead centre */
      if(Math.abs(nav.padF||0)>.2||Math.abs(nav.padS||0)>.2||
         Math.abs(nav.move.f)>.2||Math.abs(nav.move.t)>.2){ grab(); return; }
    }
    const el=(performance.now()-st.t0)/1000;
    let p=el/st.dur;
    if(p>=1){
      if(st.loop){ st.t0=performance.now(); p=0; }
      else{
        if(H.setYaw) H.setYaw(st.fromYaw+Math.PI*2*st.turns);
        st.stop(false); return;
      }
    }
    st.p=p;
    const a=spinEase(p, 0.08);
    if(H.setYaw) H.setYaw(st.fromYaw + Math.PI*2*st.turns*a);
  });
  return st;
};

/* ---------- walking, for every room ----------
   The stager had this; a baked room did not. Same code now drives both, so the
   room a fan opens moves exactly like the one Adam staged. */
CORE.navBoot=function(H, opt){
  if(CORE.NAV) return CORE.NAV;
  opt=opt||{};
  const st={eye:1.7,speed:1,turn:1,enabled:true,pos:{x:0,z:0,init:false},
            move:{f:0,t:0},keys:{},dead:.14,padF:0,padS:0};
  CORE.NAV=st;

  const wrap=document.createElement('div'); wrap.id='hexNav';
  const pad=document.createElement('div'); pad.id='hexStick';
  const knob=document.createElement('i'); pad.appendChild(knob);
  wrap.appendChild(pad);
  document.body.appendChild(wrap);
  st.el=wrap; st.pad=pad;

  let id=null;
  const at=e=>{
    const r=pad.getBoundingClientRect();
    let dx=e.clientX-(r.left+r.width/2), dy=e.clientY-(r.top+r.height/2);
    const max=r.width/2-14, m=Math.hypot(dx,dy);
    if(m>max){ dx*=max/m; dy*=max/m; }
    knob.style.transform='translate('+dx+'px,'+dy+'px)';
    st.move.t=dx/max; st.move.f=-dy/max;
  };
  pad.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation();
    id=e.pointerId; pad.setPointerCapture(id); pad.classList.add('live'); at(e); });
  pad.addEventListener('pointermove',e=>{ if(id===e.pointerId) at(e); });
  const off=()=>{ if(id===null) return; id=null; pad.classList.remove('live');
    knob.style.transform=''; st.move.f=st.move.t=0; };
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>pad.addEventListener(t,off));

  addEventListener('keydown',e=>{
    if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||'')) return;
    const k=(e.key||'').toLowerCase();
    if('wasdqe'.indexOf(k)>=0&&k){ st.keys[k]=true; e.preventDefault(); }
  });
  addEventListener('keyup',e=>{ const k=(e.key||'').toLowerCase();
    if(st.keys[k]!==undefined) st.keys[k]=false; });

  const V=new THREE.Vector3(), Rv=new THREE.Vector3();
  let last=0;
  H.onFrame.push(()=>{
    const now=performance.now(), dt=Math.min(.05,(now-(last||now))/1000); last=now;
    if(!st.pos.init){ st.pos.init=true; st.pos.x=0;
      st.pos.z=CORE.room(H).arrivalZ(H.portrait?H.portrait():false); }
    let mv=false;
    if(st.enabled){
      let f=Math.abs(st.move.f)>st.dead?st.move.f:0;
      let t=Math.abs(st.move.t)>st.dead?st.move.t:0;
      let s=0;
      if(st.keys.w) f+=1; if(st.keys.s) f-=1;
      if(st.keys.a) t-=1; if(st.keys.d) t+=1;
      if(st.keys.q) s-=1; if(st.keys.e) s+=1;
      f+=st.padF||0; s+=st.padS||0;          /* controller left stick */
      f=Math.max(-1,Math.min(1,f)); t=Math.max(-1,Math.min(1,t)); s=Math.max(-1,Math.min(1,s));
      if(t&&H.addYaw) H.addYaw(t*2.1*st.turn*dt);
      if(f||s){
        H.cam.getWorldDirection(V); V.y=0; V.normalize();
        Rv.set(-V.z,0,V.x);
        const sp=3.2*st.speed*dt;
        st.pos.x+=V.x*f*sp+Rv.x*s*sp; st.pos.z+=V.z*f*sp+Rv.z*s*sp;
        const ox=st.pos.x-(V.x*f*sp+Rv.x*s*sp), oz=st.pos.z-(V.z*f*sp+Rv.z*s*sp);
        const cl=CORE.room(H).clamp(st.pos.x,st.pos.z,.8);
        st.pos.x=cl.x; st.pos.z=cl.z;
        mv=true; if(CORE.groundStep){ const g=CORE.groundStep(ox,oz,st.pos.x,st.pos.z,st); if(g){ st.pos.x=g.x; st.pos.z=g.z; } }   /* v85: walk on the ground — steps, hills, bridges, down into bowls */
      }
    }
    if(CORE.groundHere&&CORE.WORLDON){ if(!mv) st.foot=CORE.groundHere(st.pos.x,st.pos.z,st); }
    else st.foot=0;
    st.fy=(st.fy||0)+((st.foot||0)-(st.fy||0))*Math.min(1,dt*9);
    H.cam.position.set(st.pos.x,st.eye+st.fy,st.pos.z);
  });
  CORE.padBoot(H, st);
  return st;
};


/* ---------- game controller ----------
   Standard Gamepad API, polled each frame: works on Xbox (Edge), on a PC or
   Steam Deck with a pad, and on Android TV. Twin-stick, the way a console
   player expects: left stick moves, right stick looks.
   On Xbox the controller doubles as a browser cursor until the player presses
   the ☰ menu button and picks "game controller mode" — so we say so on screen
   the moment a pad shows up. */
CORE.padBoot=function(H, st){
  if(CORE.PAD) return CORE.PAD;
  const pad={on:false, id:'', dead:.18, lookSpeed:2.6, hintShown:false};
  CORE.PAD=pad;

  const hint=document.createElement('div');
  hint.id='hexPadHint';
  hint.innerHTML='<b>Controller connected</b><s>press ☰ and choose <b>game controller mode</b></s>';
  document.body.appendChild(hint);
  const showHint=()=>{ hint.classList.add('on');
    clearTimeout(hint._t); hint._t=setTimeout(()=>hint.classList.remove('on'), 9000); };

  addEventListener('gamepadconnected',e=>{
    pad.on=true; pad.id=(e.gamepad&&e.gamepad.id)||'';
    if(!pad.hintShown){ pad.hintShown=true; showHint(); }
  });
  addEventListener('gamepaddisconnected',()=>{ pad.on=false; });

  const dz=v=>Math.abs(v)>pad.dead?(v-Math.sign(v)*pad.dead)/(1-pad.dead):0;
  let lastA=false;

  H.onFrame.push(function(){
    if(!navigator.getGamepads) return;
    let g=null;
    const list=navigator.getGamepads();
    for(let i=0;i<list.length;i++){ if(list[i]&&list[i].connected){ g=list[i]; break; } }
    if(!g){ pad.move=null; return; }
    if(!pad.on){ pad.on=true; if(!pad.hintShown){ pad.hintShown=true; showHint(); } }

    const ax=g.axes||[];
    const lx=dz(ax[0]||0), ly=dz(ax[1]||0);
    const rx=dz(ax[2]||0), ry=dz(ax[3]||0);

    /* left stick drives the same rig the on-screen joystick does */
    st.padF = -ly;          /* push up = forward */
    st.padS =  lx;          /* left stick sideways = strafe */

    /* right stick looks */
    const dt=1/60;
    if(rx&&H.addYaw)   H.addYaw(rx*pad.lookSpeed*st.turn*dt);
    if(ry&&H.addPitch) H.addPitch(-ry*pad.lookSpeed*.5*dt);

    /* A selects whatever is in the middle of the screen */
    const a=!!(g.buttons&&g.buttons[0]&&g.buttons[0].pressed);
    if(a&&!lastA){
      try{
        const ev=new MouseEvent('click',{bubbles:true,cancelable:true,
          clientX:Math.round(innerWidth/2), clientY:Math.round(innerHeight/2)});
        H.canvas.dispatchEvent(ev);
      }catch(err){}
    }
    lastA=a;
  });
  return pad;
};

/* ---------- keep only the video you can actually see decoding ----------
   Seven clips decoding at once will eat a laptop. Anything outside the view
   is paused; a clip you gave the sound to keeps running regardless. */
CORE.videoCuller=function(H, list){
  const fr=new THREE.Frustum(), mat=new THREE.Matrix4(), box=new THREE.Box3();
  let n=0;
  return function(){
    if((n++%12)!==0) return;                       /* ~5×/sec, not every frame */
    mat.multiplyMatrices(H.cam.projectionMatrix, H.cam.matrixWorldInverse);
    fr.setFromProjectionMatrix(mat);
    const items=list();
    for(let i=0;i<items.length;i++){
      const it=items[i]; const v=it.video; if(!v) continue;
      if(it.keepPlaying){ if(v.paused) v.play().catch(()=>{}); continue; }
      let vis=true;
      try{ box.setFromObject(it.obj); vis=fr.intersectsBox(box); }catch(e){}
      if(vis&&v.paused) v.play().catch(()=>{});
      else if(!vis&&!v.paused) v.pause();
    }
  };
};

/* an empty payload envelope — Phase 2 fills type/title/body/collect */
CORE.newProp=function(id,type,kind){
  return {id:id, name:'', type:type, kind:kind||null, asset:null,
    pos:[0,0,-2], rot:[0,0,0], scale:1, size:1.6, tint:'#ffffff', bright:1, opacity:1,
    shadow:true, lit:false, wall:null, payload:null};
};

/* paint one tile from its record */
CORE.applyTile=function(g, t, assets, kind){
  if(!g) return;
  const art=g.userData.art; if(!art) return;
  const src=(t.asset&&assets[t.asset])?assets[t.asset]:null;
  const url=t.url||(src?src.url:null);
  if(kind==='video'&&url){
    if(g.userData.vurl!==url){
      g.userData.vurl=url;
      const v=CORE.videoFor(url);
      v.muted=true;
      art.material.map=CORE.videoTex(v);
      art.material.color.set(0xffffff); art.material.needsUpdate=true;
      g.userData.video=v;
    }
  } else if(src&&src.img){
    const tex=new THREE.Texture(src.img); tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=4; tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping; tex.needsUpdate=true;
    art.material.map=tex; art.material.color.set(0xffffff); art.material.needsUpdate=true;
  } else if(src&&src.canvas){
    const tex=new THREE.CanvasTexture(src.canvas); tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=4; art.material.map=tex; art.material.color.set(0xffffff); art.material.needsUpdate=true;
  }
  if(art.material.map){
    art.material.color.set(t.tint||'#ffffff').multiplyScalar(t.bright===undefined?1:t.bright);
    art.material.needsUpdate=true;
  }
};
/* ==================== THE ROOM SLEEPS ====================
   The portal's law: nothing full-screen ever draws over a live 3-D room. sleep(true)
   stops the render loop outright (the shell's frame() parks itself) and pauses every
   video texture; sleep(false) picks up on the next frame. The scene stays in memory. */
CORE.SLEEPWHY={};
CORE.sleep=function(on, why){                 /* reasons: ui (reel/photo), game, cover (the page), hidden (tab/lock) */
  why=why||'ui'; if(on) CORE.SLEEPWHY[why]=1; else delete CORE.SLEEPWHY[why];
  const s=Object.keys(CORE.SLEEPWHY).length>0;
  window.HEXSLEEP=s;
  try{ if(s) CORE.allVideos(CORE.TILES||{})().forEach(r=>{ if(r.video&&!r.video.paused) r.video.pause(); }); }catch(e){}
  if(!s&&window.HEXWAKE){ const f=window.HEXWAKE; window.HEXWAKE=null; requestAnimationFrame(f); }
};
/* a phone call, a lock, a switch away: same as cover — nothing draws */
document.addEventListener('visibilitychange',()=>{ CORE.sleep(document.hidden,'hidden'); });

/* ==================== HOSTED: the page is the brain, the room is the stage ====================
   Opened inside a Trio page (play.triomusic.co/<event>/, rooms.triomusic.co/<artist>/) the room
   talks only in messages (TRIO-ROOM-CONTRACT-v1 + TRIO-EVENT-SPACE-ADDENDUM-v1): no splash, no
   audio of its own, no database, nothing fetched. Rows in, taps out. Opened on its own (the
   builder's fan preview, a file on a laptop) it behaves exactly as it always has. */
CORE.HOSTED=(function(){ try{ return window.parent!==window; }catch(e){ return true; } })();
CORE.toast=function(t){ let d=document.getElementById('hexToast'); if(!d){ d=document.createElement('div'); d.id='hexToast';
    d.style.cssText='position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:60;padding:10px 16px;border-radius:999px;background:rgba(10,8,20,.82);color:#f5f2ff;font:700 12px Manrope,Arial;letter-spacing:.06em;pointer-events:none;transition:opacity .4s;opacity:0';
    document.body.appendChild(d); } d.textContent=t; d.style.opacity='1'; clearTimeout(d._t); d._t=setTimeout(()=>{ d.style.opacity='0'; },2200); };   /* v70 */
CORE.post=function(m){ if(!CORE.HOSTED) return false; try{ window.parent.postMessage(m,'*'); }catch(e){} return true; };
/* an event room opened on its own (fan preview, a file): no splash, no music of its own — straight into the room.
   The event page owns the door and the song; the room is just the room. */
CORE.directBoot=function(H){
  if(CORE.DIRECTBOOTED||!H) return; CORE.DIRECTBOOTED=true;
  if(!H._startAudio0) H._startAudio0=H.startAudio;   /* v57: an egg's song can still play */
  try{ const au=H.audioEl; if(au){ au.pause(); au.removeAttribute('src'); au.load(); au.play=()=>Promise.resolve(); } }catch(e){}
  H.startAudio=()=>Promise.resolve();
  const sp=document.getElementById('splash'); if(sp) sp.classList.add('gone');
  setTimeout(()=>{ const b=document.getElementById('enter'); if(b) b.click();
    const m=document.getElementById('mute'); if(m) m.style.display='none'; },0);
};
/* the sky glow (the aurora above the walls): on/off, the built-in colours or one of your own, brightness */
CORE.applyAurora=function(H, A){
  if(!H||!H.aurora||!H.AUR) return; A=A||{};
  H.aurora.visible=(A.on!==false)&&!(H._mood&&H._mood.on);
  H.AUR.solo.value=A.color?1:0; if(A.color) H.AUR.sc.value.set(A.color);
  H.AUR.bri.value=(A.bright==null)?1:Math.max(0,+A.bright||0);
  if(H._mood&&H._mood.on&&H._mood.ceil&&!(H._mood.open&&H._mood.open.on)) CORE.skyK(H, CORE.skyK(H));   /* v61: a mood room's sky keeps its own glow switch */
};
/* ================= v42 · THE MOOD ROOM =================
   A layer over the hexagon: real textures, a dark room, uplights, a ceiling and a halo.
   Only a look with `mood` ever calls this, so Event Space and Room Space never change.
   M = {look, light, halo, walls, floor, ceiling, bump, shine, ups, upColor, upStrength, artGlow}
   tex = { '<pack>_col'|'_nrm'|'_rgh': dataURL }  (the builder's library, or what a bake carried) */
CORE.MOODLOOKS={dark:.07, dusk:.25, gallery:.75};
CORE.moodDefaults=function(){ return {look:'dark', light:.07, halo:.6, walls:'concrete', floor:'concrete',
  ceiling:'on', bump:1, shine:.4, ups:6, upColor:'#e8e39a', upStrength:1, artGlow:'off'}; };
CORE.moodPacks=function(M){ const s={}; [M.walls,M.floor,'concrete',M.ceilTex].forEach(p=>{ if(p&&p!=='plain') s[p]=1; }); return Object.keys(s); };
const MOODTEXC={};
function moodTex(tex,key,srgb,rx,ry){
  const id=key+'@'+rx+'x'+ry;
  if(MOODTEXC[id]) return MOODTEXC[id];
  if(!tex||!tex[key]) return null;
  const t=new THREE.TextureLoader().load(tex[key], srgb?(tx=>{ try{ /* v62: how bright the texture is on average, so a colour can tint it true */
      const c=document.createElement('canvas'); c.width=c.height=32; const g=c.getContext('2d'); g.drawImage(tx.image,0,0,32,32);
      const d=g.getImageData(0,0,32,32).data; let L=0; const lin=v=>{ v/=255; return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4); };
      for(let i=0;i<d.length;i+=4) L+=.2126*lin(d[i])+.7152*lin(d[i+1])+.0722*lin(d[i+2]);
      const avg=tx.userData.avg=Math.max(.02,L/(d.length/4));
      /* a grey "detail" copy of the texture, evened out around its average: colour × detail keeps the grain, not the dark */
      const N=256, c2=document.createElement('canvas'); c2.width=c2.height=N; const g2=c2.getContext('2d'); g2.drawImage(tx.image,0,0,N,N);
      const id=g2.getImageData(0,0,N,N), q=id.data;
      for(let i=0;i<q.length;i+=4){ const l=.2126*lin(q[i])+.7152*lin(q[i+1])+.0722*lin(q[i+2]); const v=Math.max(.15,Math.min(1.9,1+(l/avg-1)*.55))/2*255; q[i]=q[i+1]=q[i+2]=v; q[i+3]=255; }
      g2.putImageData(id,0,0); const dt=new THREE.CanvasTexture(c2); dt.wrapS=dt.wrapT=THREE.RepeatWrapping; dt.repeat.copy(tx.repeat); dt.anisotropy=8;
      dt.userData.moodTex=true; dt.userData.detail=true; tx.userData.detailTex=dt; }catch(e){ tx.userData.avg=.25; } }):undefined);
  t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry); t.anisotropy=8;
  if(srgb) t.colorSpace=THREE.SRGBColorSpace;
  t.userData.moodTex=true;
  return (MOODTEXC[id]=t);
}
CORE.moodPack=function(t,n,x,y){ return moodPack(t,n,x,y); };   /* v71: the world's ground wears the floor's pack */
function moodPack(tex,name,rx,ry){
  if(!name||name==='plain') return null;
  return {map:moodTex(tex,name+'_col',true,rx,ry), normalMap:moodTex(tex,name+'_nrm',false,rx,ry),
          roughnessMap:moodTex(tex,name+'_rgh',false,rx,ry), gloss:name==='gloss'};
}
CORE.applyMood=function(H, M, tex){
  if(!H||!H.scene||!M) return;
  const S=H._mood||(H._mood={on:true});
  S.on=true; S.M=M; S.tex=tex||S.tex||{};
  CORE.MOODON=true; if(CORE.propLights()) CORE.propLights().visible=false;   /* a lit model must never switch the room's light back on */
  const scene=H.scene, RM=CORE.room(H), WH=H.WALL_H||4.6;
  /* the event-space dressing goes: sky, stars, aurora, banners and their rigging (light poles stay a Vibe choice) */
  ['dome','stars','aurora','dock'].forEach(k=>{ if(H[k]) H[k].visible=false; });
  (H.rigs||[]).forEach(r=>r.visible=false);
  (H.banners||[]).forEach(b=>b.visible=false);
  if(H.hideDock) H.hideDock();
  scene.fog=new THREE.Fog(0x050506,16,40);
  scene.background=new THREE.Color(0x050506);
  /* empty walls and floor show the texture, not the purple dress */
  if(!S.origDefault){ S.origDefault=H.defaultMap;
    H.defaultMap=function(id){ if(CORE.KEYART&&CORE.KEYART.slot===id&&CORE.KEYART.tex) return CORE.KEYART.tex;
      const P=S.on&&S.cur&&S.cur[id]; return (P&&P.map)||S.origDefault(id); }; }
  const wp=moodPack(S.tex,M.walls,4,2.2), fp=moodPack(S.tex,M.floor,5,5);
  S.cur={floor:fp}; (H.walls||[]).forEach((w,i)=>{ S.cur['wall'+i]=wp; });
  const bump=M.bump==null?1:+M.bump;
  const toStd=(m,slot,P,base)=>{
    if(!m) return;
    let mat=m.material;
    const old=mat.map;
    const wasDefault=(!old||old===S.origDefault(slot)||(old.userData&&old.userData.moodTex))&&!(CORE.KEYART&&old&&old===CORE.KEYART.tex);
    if(!m.userData.mood){
      mat=new THREE.MeshStandardMaterial({color:mat.color?mat.color.clone():new THREE.Color(0xffffff),
        map:old||null, roughness:1, metalness:0, side:mat.side, transparent:mat.transparent, opacity:mat.opacity, alphaTest:mat.alphaTest||0, alphaMap:mat.alphaMap||null,
        emissive:0xffffff, emissiveIntensity:0});
      m.userData._preMood=m.material; m.material=mat; m.userData.mood=true; m.userData.moodSlot=slot; m.userData.moodC0=mat.color.getHex();   /* v62 */
    }
    m.userData.moodPack=P; m.userData.moodBase=base;
    if(wasDefault){ mat.map=P?P.map:null; if(!P) mat.color.set(base); }
    mat.needsUpdate=true;
  };
  (H.walls||[]).forEach((w,i)=>toStd(w,'wall'+i,wp,0x38364a));
  toStd(H.floor,'floor',fp,0x2b2a2e);
  if(H.floor){ H.floor.material.metalness=M.floor==='metal'?.55:0; }
  (H.walls||[]).forEach(w=>{ w.material.metalness=M.walls==='metal'?.45:0; });
  /* the ceiling — the same hexagon as the floor, lidding the walls */
  if(!S.ceil){
    const sh=new THREE.Shape(), R=(RM.R||10)*1.02;
    for(let i=0;i<6;i++){ const a=i*Math.PI/3; const x=Math.cos(a)*R, y=Math.sin(a)*R; i?sh.lineTo(x,y):sh.moveTo(x,y); }   /* v45.1: corners on the walls' corners */
    const g=new THREE.ShapeGeometry(sh); const uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++) uv.setXY(i,(uv.getX(i)+R)/(2*R),(uv.getY(i)+R)/(2*R));
    S.ceil=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x2a2a2a,roughness:1}));
    S.ceil.rotation.x=Math.PI/2; S.ceil.position.y=WH; S.ceil.userData.moodCeil=true; scene.add(S.ceil);
  }
  S.ceil.visible=M.ceiling!=='off';
  CORE.applySky(H, M);                                                     /* v61: a sky over every mood space */
  if(S.ceilWas!==undefined&&S.ceilWas!==M.ceiling) S.skyK=null; S.ceilWas=M.ceiling;   /* v61: changing the Roof setting starts the sky fresh */
  if(M.ceiling==='off') CORE.skyK(H,1); else CORE.skyK(H,S.skyK==null?0:S.skyK);   /* v57/v61: an open roof shows the sky */
  const cp=moodPack(S.tex,M.ceilTex||(M.walls==='plain'?'plain':'concrete'),4,4), cm=S.ceil.material;   /* v64: M.ceilTex = its own texture (null = as before) */
  cm.map=cp?cp.map:null; cm.normalMap=cp?cp.normalMap:null; cm.roughnessMap=cp?cp.roughnessMap:null;
  { const gl=!!(cp&&cp.gloss); cm.envMap=gl?CORE.moodEnv(H):null; cm.envMapIntensity=gl?.9:1; cm.metalness=M.ceilTex==='metal'?.45:0; }
  S.ceilPack=cp; S.ceilKey=null; cm.needsUpdate=true;   /* v62: its colour is set in moodSync */
  if(cm.normalMap) cm.normalScale.set(bump,bump);
  /* light: a soft sky/ground fill + the shared ambient, both set by Room light */
  if(!S.hemi){ S.hemi=new THREE.HemisphereLight(0xdcd8ff,0x1a1712,1); scene.add(S.hemi); }
  const lv=M.light==null?.07:+M.light;
  S.hemi.intensity=lv*1.6; CORE.ambient(scene, lv*.35);
  /* uplights: a can at the foot of a wall, washing up it */
  if(!S.ups){ S.ups=[];
    const canMat=new THREE.MeshStandardMaterial({color:0x111111,roughness:.6,metalness:.6});
    S.lens=new THREE.MeshBasicMaterial({color:0xe8e39a,toneMapped:false});
    for(let k=0;k<6;k++){
      const side=(k%2?1:-1);
      const base=RM.wallPoint(k, side*3.4, 0, .35), top=RM.wallPoint(k, side*3.4, 4.2, .05);
      const sp=new THREE.SpotLight(0xe8e39a,6,8,.62,.75,1.3); sp.position.copy(base).setY(.12);
      const tgt=new THREE.Object3D(); tgt.position.copy(top); scene.add(tgt); sp.target=tgt; scene.add(sp);
      const can=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.16,14),canMat); can.position.copy(base).setY(.08); scene.add(can);
      const lens=new THREE.Mesh(new THREE.CircleGeometry(.075,14),S.lens); lens.rotation.x=-Math.PI/2; lens.position.copy(base).setY(.161); scene.add(lens);
      S.ups.push({sp,can,lens,tgt});
    } }
  const n=+M.ups||0, uc=new THREE.Color(M.upColor||'#e8e39a'), us=M.upStrength==null?1:+M.upStrength;
  S.ups.forEach((u,k)=>{ const on=(n>=6)||(n===3&&k%2===0); u.sp.visible=u.can.visible=u.lens.visible=on;
    u.sp.color.copy(uc); u.sp.intensity=6*us; });
  S.lens.color.copy(uc).multiplyScalar(2.2);
  if(S.upK==null) S.upK=(M.upsStart==='off')?0:1;
  CORE.applyUpK(H);
  /* the halo (bloom) — the room renders through it; off = straight ACES */
  if(H.renderer){ H.renderer.toneMapping=THREE.ACESFilmicToneMapping; H.renderer.toneMappingExposure=1.1; }
  CORE.moodHalo(H, M.halo==null?.6:+M.halo);
  CORE.moodSync(H, true);
  if(!S.ticking&&H.onFrame){ S.ticking=true; H.onFrame.push(()=>CORE.moodSync(H)); }
  CORE.applyOpen(H, M);                                                   /* v59: Open Space */
  CORE.applyAddons(H, M);                                                 /* v63: the add-ons drawer */
  if(CORE.WORLD) CORE.WORLD.apply(H, M);                                  /* v71: World (its own file — only a world carries it) */
};
/* v63 · ADD-ONS — bespoke extras for one artist's room. Each lives in its own file (lib/addons/*.js, a
   <script data-addon> in the page) and registers CORE.ADDONS[key]={name, defaults, apply(H,cfg,M), remove(H)}.
   Nothing is built unless the room switches it on; a bake strips the add-on files it doesn't use. */
CORE.ADDONS=CORE.ADDONS||{};
CORE.applyAddons=function(H, M){ const A=(M&&M.addons)||{};
  Object.keys(CORE.ADDONS).forEach(k=>{ const a=CORE.ADDONS[k], c=A[k];
    try{ if(c&&c.on) a.apply(H,c,M); else a.remove(H); }catch(e){ console.warn('add-on '+k, e); } }); };
/* ================= v59 · OPEN SPACE =================
   The Mood Room on a floating platform in the night sky. The walls are still there — every slot keeps working —
   they're just invisible: wall art floats as a big panel, tiles / boards / posters / windows float where they hang,
   and the invisible walls are the edge you can't walk past. M.open = {rim:'#f5d400', islands:true} */
function openTex(c1){ const c=document.createElement('canvas'); c.width=c.height=128; const x=c.getContext('2d');
  const r=x.createRadialGradient(64,64,0,64,64,64); r.addColorStop(0,c1); r.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=r; x.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c); }
/* v60 · OPEN SPACE SKIES — night (the original, always there) · galaxy · day · my own 360 image; below: void · ocean · cloud sea */
const SKYNOISE='float hh(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}'+
 'float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hh(i),hh(i+vec3(1,0,0)),f.x),mix(hh(i+vec3(0,1,0)),hh(i+vec3(1,1,0)),f.x),f.y),mix(mix(hh(i+vec3(0,0,1)),hh(i+vec3(1,0,1)),f.x),mix(hh(i+vec3(0,1,1)),hh(i+vec3(1,1,1)),f.x),f.y),f.z);}'+
 'float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}';
const SKYFS=SKYNOISE+`
uniform int mode; uniform int below; uniform vec3 sun; uniform float band; varying vec3 p;
float cl(vec2 q){ vec2 w=vec2(fbm(vec3(q*.6,1.7)),fbm(vec3(q*.6+5.2,3.1))); return fbm(vec3(q+w*1.6,0.)); }
vec3 layer(vec3 d,float H,float scale,float cover,vec3 base,vec3 lit,out float a){
  float t=H/abs(d.y); vec2 q=d.xz*t/scale; float den=cl(q); den+=(fbm(vec3(q*4.,9.))-.5)*.12;
  float c=smoothstep(cover,cover+.16,den); float den2=cl(q+sun.xz*.09); float sh=clamp(1.-(den2-den)*5.5,0.,1.);
  float thick=smoothstep(cover,cover+.5,den); vec3 col=mix(base,lit,sh*.8+.2)*(1.-thick*.3);
  col+=lit*pow(max(dot(d,sun),0.),6.)*(1.-thick)*.5; a=c*clamp(1.-t/(scale*28.),0.,1.); return col; }
void main(){ vec3 d=p; float y=d.y; vec3 c=vec3(0.); float A=1.;
  if(mode==2){ vec3 top=vec3(.06,.27,.74),mid=vec3(.24,.55,.92),hor=vec3(.78,.88,.97);
    c=mix(hor,mid,smoothstep(0.,.22,y)); c=mix(c,top,smoothstep(.22,1.,y)); if(y<0.) c=mix(hor,vec3(.70,.82,.94),clamp(-y*4.,0.,1.));
    float sd=max(dot(d,sun),0.); c+=vec3(1.,.96,.88)*(pow(sd,1200.)*8.+pow(sd,90.)*.6+pow(sd,7.)*.14);
    if(y>.015){ float a; vec3 cc=layer(d,300.,420.,.43,vec3(.55,.62,.74),vec3(1.,.985,.96),a); a*=smoothstep(.015,.12,y); c=mix(c,cc,a*.95); }
    c=mix(c,hor,exp(-abs(y)*18.)*.55);
    vec3 tt=normalize(cross(sun,vec3(0,1,0))),bb=cross(tt,sun); vec3 qq=d-sun*dot(d,sun); float an=atan(dot(qq,bb),dot(qq,tt));
    c+=vec3(1.)*pow(abs(cos(an*4.)),60.)*pow(sd,300.)*2.5; c*=.78; }   /* the room's halo + ACES brighten it again */
  else if(mode==1||mode==4){ vec3 ax=normalize(vec3(1.,.28,.05)); float bd=pow(clamp(1.-abs(dot(d,ax)),0.,1.),5.)*band;
    float f=fbm(d*3.2),g=fbm(d*7.+3.),dust=smoothstep(.45,.75,fbm(d*5.5+9.));
    c=vec3(.01,.015,.05)+vec3(.02,.04,.1)*(1.-abs(y)); if(mode==4) c=mix(vec3(.04,.03,.11),vec3(.01,.008,.03),clamp(abs(y),0.,1.));
    vec3 neb=mix(vec3(.25,.12,.55),vec3(.05,.45,.75),g); neb=mix(neb,vec3(.9,.35,.6),smoothstep(.55,.8,f)*.6);
    c+=neb*bd*(1.+f*1.4)*(1.-dust*.6); c+=vec3(1.,.95,.9)*pow(bd,3.)*smoothstep(.55,.8,f)*.7;
    c+=vec3(.85,.9,1.)*(pow(hh(floor(d*900.)),420.)*3.+pow(hh(floor(d*400.)+7.),900.)*7.);
    if(mode==1) c+=vec3(.1,.5,.7)*exp(-abs(y)*14.)*.35; }
  else { A=0.; }                                   /* night / my own image: the sky is drawn by others */
  if(below==1&&y<-.02){ float a; bool day=mode==2;
    vec3 base=day?vec3(.62,.70,.82):vec3(.10,.12,.22), lit=day?vec3(1.,.99,.97):vec3(.42,.48,.70);
    vec3 cc=layer(-d,140.,360.,.40,base,lit,a); a*=smoothstep(.02,.10,-y); c=mix(c,cc,a); A=max(A,a); }
  if(A<.004) discard; gl_FragColor=vec4(c,A); }`;
CORE.SKYVS='varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
CORE.openSkyMat=function(){ return new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,transparent:true,
  uniforms:{mode:{value:0},below:{value:0},sun:{value:new THREE.Vector3(.55,.42,-.72).normalize()},band:{value:1}},vertexShader:CORE.SKYVS,fragmentShader:SKYFS}); };
CORE.SKYURL=null;                                   /* id → url for "my own image" (builder: its assets; bake: bake.assets) */
CORE.wallHasArt=function(w){ const m=w&&w.material; const t=m&&m.map; return !!(t&&!(t.userData&&t.userData.moodTex)); };
CORE.applyOpen=function(H, M){
  const S=H._mood; if(!S) return; const O=M&&M.open; const scene=H.scene, RM=CORE.room(H), R=(RM.R||10);
  if(!O){ if(S.open){ S.open.g.visible=false; S.open.on=false; (H.walls||[]).forEach(w=>{ w.visible=true; CORE.openWall(w,'solid'); }); } return; }
  if(!S.open){
    const g=new THREE.Group(); g.name='openSpace';
    const ADD=o=>Object.assign({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending},o);
    /* the glowing edge, right on the line where the walls stand */
    const pts=[]; for(let i=0;i<=6;i++){ const a=i*Math.PI/3; pts.push(new THREE.Vector3(Math.cos(a)*R,.03,Math.sin(a)*R)); }
    const rimMat=new THREE.MeshBasicMaterial({color:0xf5d400,toneMapped:false});
    const rim=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'catmullrom',0),180,.045,6),rimMat); g.add(rim);
    const halo=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,false,'catmullrom',0),180,.22,6),new THREE.MeshBasicMaterial(ADD({color:0xf5d400,opacity:.10})));g.add(halo);
    /* the underside: rock tapering to a point, so it reads as floating */
    const ug=new THREE.CylinderGeometry(R*1.005,1.1,7.5,6,4,true); const P=ug.attributes.position;
    for(let i=0;i<P.count;i++){ if(P.getY(i)>3.7) continue; const k=1+(Math.sin(i*12.9898)*43758.5453%1)*.13; P.setX(i,P.getX(i)*k); P.setZ(i,P.getZ(i)*k); P.setY(i,P.getY(i)+((Math.sin(i*78.233)*43758.5453%1)*.5)); }
    ug.computeVertexNormals();
    const under=new THREE.Mesh(ug,new THREE.MeshStandardMaterial({color:0x17151d,roughness:1,flatShading:true}));
    under.rotation.y=Math.PI/6; under.position.y=-3.77; g.add(under);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial(ADD({map:openTex('rgba(150,120,255,.85)'),fog:false}))); glow.position.set(0,-9,0); glow.scale.set(R*3.6,R*2,1); g.add(glow);
    /* specks drifting up out of the void */
    const n=360, dg=new THREE.BufferGeometry(), dp=new Float32Array(n*3);
    for(let i=0;i<n;i++){ const a=Math.random()*6.283, r=R*.4+Math.random()*R*2.2; dp[i*3]=Math.cos(a)*r; dp[i*3+1]=-14-Math.random()*40; dp[i*3+2]=Math.sin(a)*r; }
    dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
    const dust=new THREE.Points(dg,new THREE.PointsMaterial(ADD({map:openTex('rgba(255,240,180,1)'),size:.22,color:0xffe9a0,opacity:.55}))); g.add(dust);
    /* far-off floating islands */
    const isl=new THREE.Group(); const iMat=new THREE.MeshStandardMaterial({color:0x1d1a26,roughness:1,flatShading:true});
    [[-140,-14,-230,8],[175,16,-290,12],[250,-46,110,9],[-245,26,80,6],[40,-60,280,10]].forEach(([x,y,z,s])=>{
      const t=new THREE.Group(); const body=new THREE.Mesh(new THREE.CylinderGeometry(s,s*.12,s*1.3,6,1),iMat); t.add(body);
      const rp=[]; for(let i=0;i<=6;i++){ const a=i*Math.PI/3; rp.push(new THREE.Vector3(Math.cos(a)*s,s*.66,Math.sin(a)*s)); }
      const ir=new THREE.Line(new THREE.BufferGeometry().setFromPoints(rp),new THREE.LineBasicMaterial({color:0xb9a6ff,transparent:true,opacity:.75})); t.add(ir);
      const ig=new THREE.Sprite(new THREE.SpriteMaterial(ADD({map:openTex('rgba(150,120,255,.6)'),fog:false}))); ig.position.y=-s; ig.scale.set(s*4,s*2.4,1); t.add(ig);
      t.position.set(x,y,z); t.rotation.y=x*.01; isl.add(t); });
    g.add(isl);
    /* the uplights' beams, now that there's no wall to catch them */
    const beams=(S.ups||[]).map(u=>{ const c=new THREE.Mesh(new THREE.ConeGeometry(.75,9,20,1,true),new THREE.MeshBasicMaterial(ADD({color:0xf5d400,opacity:.04,side:THREE.DoubleSide})));
      c.position.copy(u.sp.position).setY(4.6); c.rotation.x=Math.PI; g.add(c); return {c,u}; });
    scene.add(g);
    S.open={g,rimMat,halo,isl,dust,beams,on:true,glow,under};
    if(H.onFrame) H.onFrame.push(()=>CORE.openTick(H));
  }
  const X=S.open; X.on=true; X.g.visible=true;
  const rc=new THREE.Color(O.rim||'#f5d400'); X.rimMat.color.copy(rc).multiplyScalar(1.6); X.halo.material.color.copy(rc);
  X.isl.visible=O.islands!==false;
  /* v60 · the open sky's own dressing — the sky itself is CORE.applySky (any mood space) */
  const sk=CORE.skyCfg(M).sky||'night';
  const FOG={night:[0x0b0820,0x07061a],galaxy:[0x070a1c,0x03050f],day:[0xc9def2,0x9cc7f0],image:[0x101018,0x08080c]}[sk]||[0x0b0820,0x07061a];
  scene.fog=new THREE.Fog(FOG[0],sk==='day'?160:70,sk==='day'?1100:520); scene.background=new THREE.Color(FOG[1]);
  X.dust.visible=sk!=='day'; X.glow.material.opacity=sk==='day'?.35:1; X.under.material.color.set(sk==='day'?0x6b6670:0x17151d);
  CORE.openTick(H, true);
};
/* v61 · THE SKY, for every mood space (Mood Room and Open Space). Settings: Open Space → M.open, Mood Room → M.sky.
   {sky:'night'|'galaxy'|'day'|'image', glow, skyImg, below (Open Space only)}. In a Mood Room you see it when the roof is open. */
CORE.skyCfg=function(M){ return M?(M.open||M.sky||{}):{}; };
CORE.skyParts=function(H){ const S=H._mood; if(S.skyp) return S.skyp; const scene=H.scene;
  const skyM=CORE.openSkyMat(); const sky=new THREE.Mesh(new THREE.SphereGeometry(880,64,32),skyM); sky.renderOrder=-1; sky.frustumCulled=false; scene.add(sky);
  const img=new THREE.Mesh(new THREE.SphereGeometry(900,64,32),new THREE.MeshBasicMaterial({side:THREE.BackSide,depthWrite:false,fog:false})); img.renderOrder=-2; img.frustumCulled=false; img.visible=false; scene.add(img);
  const sunL=new THREE.DirectionalLight(0xfff4e0,1.3); sunL.position.copy(skyM.uniforms.sun.value).multiplyScalar(60); sunL.visible=false; scene.add(sunL);
  const nc=document.createElement('canvas'); nc.width=nc.height=256; { const x=nc.getContext('2d'), im=x.createImageData(256,256);
    for(let j=0;j<256;j++) for(let i=0;i<256;i++){ const T=6.2831853/256, a=Math.sin(i*T*3+Math.sin(j*T*2)*2)*.5+Math.sin(j*T*5+i*T)*.35+Math.sin((i+j)*T*2)*.25,
      b=Math.cos(j*T*4+Math.sin(i*T*2)*2)*.5+Math.cos(i*T*6-j*T)*.3; const k=(j*256+i)*4; im.data[k]=128+a*55; im.data[k+1]=128+b*55; im.data[k+2]=255; im.data[k+3]=255; }
    x.putImageData(im,0,0); }
  const nt=new THREE.CanvasTexture(nc); nt.wrapS=nt.wrapT=THREE.RepeatWrapping; nt.repeat.set(70,70);
  const cubeRT=new THREE.WebGLCubeRenderTarget(256); const cubeCam=new THREE.CubeCamera(1,2000,cubeRT);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),new THREE.MeshStandardMaterial({color:0x0a1426,metalness:1,roughness:.08,envMap:cubeRT.texture,envMapIntensity:1.6,normalMap:nt,normalScale:new THREE.Vector2(.35,.35)}));
  sea.rotation.x=-Math.PI/2; sea.position.y=-14; sea.visible=false; scene.add(sea);
  S.skyp={sky,skyM,img,sunL,sea,nt,cubeRT,cubeCam};
  if(H.onFrame) H.onFrame.push(()=>{ if(sea.visible){ const t=performance.now()/1000; nt.offset.set((t*.004)%1,(t*.0025)%1); } });
  /* v68 · Sky drift — the sky turns slowly round the room (galaxy, clouds, stars, your own picture); the sun stays put */
  const sun0=skyM.uniforms.sun.value.clone(), Y=new THREE.Vector3(0,1,0);
  if(H.onFrame) H.onFrame.push(()=>{ const C=CORE.skyCfg(S.M), spd=CORE.SKYDRIFT[C.drift]||0;
    const a=spd?((performance.now()/1000)*spd)%(Math.PI*2):0;
    if(!spd&&!sky.rotation.y) return;
    sky.rotation.y=a; img.rotation.y=a; if(H.stars) H.stars.rotation.y=a; if(H.dome) H.dome.rotation.y=a;
    skyM.uniforms.sun.value.copy(sun0).applyAxisAngle(Y,-a); });
  return S.skyp; };
CORE.SKYDRIFT={slow:.006, medium:.02};   /* radians a second — slow ≈ one turn in 17 min, medium ≈ 5 min */
CORE.applySky=function(H, M){ const S=H&&H._mood; if(!S||!M) return; const P=CORE.skyParts(H), C=CORE.skyCfg(M), OPN=!!M.open;
  const sk=C.sky||'night', bl=OPN?(C.below||'void'):'void';
  if(H.cam&&H.cam.far<2000){ H.cam.far=2000; H.cam.updateProjectionMatrix(); }
  P.skyM.uniforms.mode.value={night:0,galaxy:1,day:2,image:3}[sk]||0; P.skyM.uniforms.below.value=bl==='clouds'?1:0;
  P.sea.visible=bl==='ocean'; P.img.visible=false; P.sky.visible=true;
  if(sk==='image'&&C.skyImg&&CORE.SKYURL){ const u=CORE.SKYURL(C.skyImg);
    if(u&&P.img.userData.src!==u){ P.img.userData.src=u; new THREE.TextureLoader().load(u,t=>{ t.colorSpace=THREE.SRGBColorSpace; t.wrapS=THREE.RepeatWrapping; t.repeat.x=-1;
      P.img.material.map=t; P.img.material.needsUpdate=true; CORE.skySea(H); }); }
    P.img.visible=!!P.img.userData.src; }
  CORE.skyLight(H);
  CORE.skySea(H); };
/* how open the sky is: Open Space always; a Mood Room by its roof (Ceiling or a trigger) */
CORE.skyLight=function(H){ const S=H&&H._mood, P=S&&S.skyp; if(!P) return; const M=S.M||{}, C=CORE.skyCfg(M), sk=C.sky||'night';
  const v=M.open?1:(S.skyK==null?CORE.skyStart(H):S.skyK);
  P.sunL.visible=sk==='day'&&v>0.01; P.sunL.intensity=1.3*v; };
CORE.skySea=function(H){ const S=H&&H._mood, X=S&&S.skyp; if(!X||!X.sea.visible||!H.renderer) return;
  const sk=CORE.skyCfg(S.M).sky||'night';
  const sc=new THREE.Scene(); const m=CORE.openSkyMat(); m.transparent=false;
  m.uniforms.mode.value=sk==='galaxy'?1:sk==='day'?2:4; m.uniforms.band.value=sk==='galaxy'?1:0;
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(500,48,24),m));
  if(sk==='image'&&X.img.material.map){ sc.add(new THREE.Mesh(new THREE.SphereGeometry(600,48,24),new THREE.MeshBasicMaterial({side:THREE.BackSide,map:X.img.material.map}))); m.visible=false; }
  X.cubeCam.update(H.renderer, sc);
  X.sea.material.color.set(sk==='day'?0x2a5a8a:0x0a1426); X.sea.material.envMapIntensity=sk==='day'?1.1:1.6; };
/* walls: art → a floating panel · builder → a faint ghost to click on · otherwise invisible */
CORE.openWall=function(w, mode){ const m=w.material; if(!m) return; if(m.userData._openMode===mode) return; m.userData._openMode=mode;
  if(mode==='ghost'){ if(!m.userData._openPre) m.userData._openPre=[m.transparent,m.opacity,m.depthWrite]; m.transparent=true; m.opacity=.08; m.depthWrite=false; }
  else if(m.userData._openPre){ [m.transparent,m.opacity,m.depthWrite]=m.userData._openPre; m.userData._openPre=null; }
  else if(m.opacity<1){ m.transparent=false; m.opacity=1; m.depthWrite=true; }   /* v61: a fresh material can inherit the ghost's opacity */
  m.needsUpdate=true; };
CORE.openTick=function(H, force){ const S=H._mood, X=S&&S.open; if(!X||!X.on) return; const O=S.M&&S.M.open||{};
  const showArt=O.walls!=='none';                       /* v59.1: "all invisible" hides art walls too */
  (H.walls||[]).forEach(w=>{ const art=CORE.wallHasArt(w)&&showArt;
    if(art){ w.visible=true; CORE.openWall(w,'solid'); } else if(CORE.EDIT){ w.visible=true; CORE.openWall(w,'ghost'); } else w.visible=false; });
  if(S.ceil&&S.M&&S.M.ceiling==='off') S.ceil.visible=false;
  const NIGHT=(O.sky||'night')==='night';   /* O = M.open in Open Space */
  if(H.aurora){ const want=NIGHT&&O.glow!==false; if(H.aurora.visible!==want) H.aurora.visible=want; }   /* v59.1: sky glow can go */
  if(H.stars&&H.stars.visible!==NIGHT) H.stars.visible=NIGHT; if(H.dome&&H.dome.visible!==NIGHT) H.dome.visible=NIGHT;   /* v60: other skies bring their own */

  const t=performance.now()/1000;
  X.dust.position.y=((t*.5)%12);   /* specks rise out of the void, never above the stage */
  const k=S.upK==null?1:S.upK;
  X.beams.forEach(b=>{ b.c.visible=b.u.sp.visible&&k>.02; b.c.material.opacity=.04*k; b.c.material.color.copy(b.u.sp.color); });
  X.isl.children.forEach((c,i)=>{ c.position.y+=Math.sin(t*.3+i)*.004; });
};
/* walls with art: the texture's bump shows faintly through it; "glows" lights the art from within */
/* v62 · colour: walls / floor / ceiling take any colour, tinting whatever texture they wear (null = original) */
CORE.moodColor=function(M, part){ const C=M&&M.color; return C&&C[part]?C[part]:null; };
CORE.tintFor=function(hex, P){ const c=new THREE.Color(hex); if(P&&P.map){ if(!P.map.userData.detailTex) return null; c.multiplyScalar(2); } return c; };   /* the detail map is stored at half */
CORE.moodSync=function(H, force){
  const S=H._mood; if(!S||!S.on) return;
  const M=S.M||{}, bump=M.bump==null?1:+M.bump, glow=M.artGlow==='on';
  const list=(H.walls||[]).concat(H.floor?[H.floor]:[]);
  for(let i=0;i<list.length;i++){
    const m=list[i]; if(!m||!m.userData.mood) continue;
    const mat=m.material; if(!mat||!mat.isMeshStandardMaterial) continue;   /* a video surface keeps its own */
    const P=m.userData.moodPack, map=mat.map, isArt=!!map&&!(map.userData&&map.userData.moodTex);
    const col=CORE.moodColor(M, m===H.floor?'floor':'walls'), avg=P&&P.map&&P.map.userData.detailTex?1:0;
    const key=(map?map.uuid:'-')+'|'+bump+'|'+glow+'|'+(P?P.map&&P.map.uuid:'-')+'|'+col+'|'+avg;
    if(!force&&m.userData.moodKey===key) continue;
    m.userData.moodKey=key;
    if(m.userData.moodC0==null) m.userData.moodC0=mat.color.getHex();
    const tint=(col&&!isArt)?CORE.tintFor(col,map?P:null):null;
    if(!isArt&&map&&P&&P.map){ const want=(tint&&P.map.userData.detailTex)||P.map; if(mat.map!==want){ mat.map=want; m.userData.moodKey=null; } }   /* v62: colour wears the detail copy */
    if(tint) mat.color.copy(tint);
    else if(!map&&!P) mat.color.set(m.userData.moodBase||0x38364a);
    else mat.color.setHex(m.userData.moodC0);
    mat.normalMap=P?P.normalMap:null;
    mat.roughnessMap=(P&&!isArt)?P.roughnessMap:null;
    const k=isArt?bump*.6:bump; mat.normalScale.set(k,k);
    mat.emissiveMap=isArt?map:null; mat.emissiveIntensity=(isArt&&glow)?.55:0;
    if(m===H.floor){ mat.roughness=1-(M.shine==null?.4:+M.shine)*.75; }
    const gl=!!(P&&P.gloss&&!isArt);                       /* v59.1: the glossy pack reflects a soft night sky */
    mat.envMap=gl?CORE.moodEnv(H):null; mat.envMapIntensity=gl?.9:1; if(gl&&m===H.floor) mat.roughness=Math.min(mat.roughness,.55);
    mat.needsUpdate=true;
  }
  const cm=S.ceil&&S.ceil.material; if(cm){ const col=CORE.moodColor(M,'ceil'), P=S.ceilPack, avg=P&&P.map&&P.map.userData.detailTex?1:0, key=col+'|'+avg+'|'+(P?1:0);
    if(force||S.ceilKey!==key){ S.ceilKey=key; const t=col?CORE.tintFor(col,P):null;
      if(P) cm.map=(t&&P.map.userData.detailTex)||P.map;
      if(t) cm.color.copy(t); else cm.color.set(P?0xffffff:0x1d1c22).multiplyScalar(.35); cm.needsUpdate=true; } }
};
/* v59.1 · a soft reflection world for glossy surfaces: dark purple sky, a few light strips — built once */
CORE.moodEnv=function(H){ const S=H&&H._mood; if(!S||!H.renderer) return null; if(S.env) return S.env;
  const sc=new THREE.Scene();
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 p;void main(){float y=p.y;vec3 c=mix(vec3(.05,.035,.12),vec3(.012,.01,.03),clamp(y,0.,1.));c=mix(c,vec3(.02,.015,.04),clamp(-y,0.,1.));gl_FragColor=vec4(c,1.);}'})));
  /* v66.1: no more tall "studio light" strips — on a glossy floor they showed up as phantom beams. Real lights still shine. */
  const top=new THREE.Mesh(new THREE.CircleGeometry(8,24),new THREE.MeshBasicMaterial({color:new THREE.Color(.6,.5,1).multiplyScalar(1.2)})); top.position.y=40; top.rotation.x=Math.PI/2; sc.add(top);
  const pm=new THREE.PMREMGenerator(H.renderer); S.env=pm.fromScene(sc,.03).texture; pm.dispose(); return S.env; };
CORE.moodHalo=function(H, k){
  const S=H._mood; if(!S) return;
  if(!(k>0)){ H.post=null; return; }
  if(!S.post){
    const fsq=new THREE.Mesh(new THREE.PlaneGeometry(2,2)), fsc=new THREE.Scene(); fsc.add(fsq);
    const fcam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const vs='varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
    const bright=new THREE.ShaderMaterial({uniforms:{t:{value:null},th:{value:.85}},vertexShader:vs,fragmentShader:
      'varying vec2 vUv; uniform sampler2D t; uniform float th; void main(){ vec3 c=texture2D(t,vUv).rgb; float l=max(c.r,max(c.g,c.b)); gl_FragColor=vec4(c*smoothstep(th,th+.6,l),1.); }'});
    const blur=new THREE.ShaderMaterial({uniforms:{t:{value:null},d:{value:new THREE.Vector2()}},vertexShader:vs,fragmentShader:
      'varying vec2 vUv; uniform sampler2D t; uniform vec2 d; void main(){ vec3 c=texture2D(t,vUv).rgb*.227;'+
      'c+=texture2D(t,vUv+d*1.385).rgb*.316; c+=texture2D(t,vUv-d*1.385).rgb*.316; c+=texture2D(t,vUv+d*3.23).rgb*.07; c+=texture2D(t,vUv-d*3.23).rgb*.07; gl_FragColor=vec4(c,1.); }'});
    const comp=new THREE.ShaderMaterial({uniforms:{base:{value:null},bl:{value:null},k:{value:1},ex:{value:1.1}},vertexShader:vs,fragmentShader:
      'varying vec2 vUv; uniform sampler2D base; uniform sampler2D bl; uniform float k; uniform float ex;'+
      'vec3 aces(vec3 x){ x*=ex*.6; return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }'+
      'void main(){ vec3 c=texture2D(base,vUv).rgb+texture2D(bl,vUv).rgb*k; c=aces(c); c=pow(c,vec3(1./2.2)); gl_FragColor=vec4(c,1.); }'});
    const sz=new THREE.Vector2(); let rtS=null,rtA=null,rtB=null,W=0,Hh=0;
    const opt={type:THREE.HalfFloatType};
    S.post={comp:comp, run:function(){
      const r=H.renderer; r.getDrawingBufferSize(sz);
      if(sz.x!==W||sz.y!==Hh||!rtS){ W=sz.x; Hh=sz.y; [rtS,rtA,rtB].forEach(t=>t&&t.dispose());
        rtS=new THREE.WebGLRenderTarget(W,Hh,Object.assign({samples:r.capabilities.isWebGL2?4:0,stencilBuffer:true},opt));
        const bw=Math.max(2,W>>2), bh=Math.max(2,Hh>>2);
        rtA=new THREE.WebGLRenderTarget(bw,bh,opt); rtB=new THREE.WebGLRenderTarget(bw,bh,opt); }
      r.setRenderTarget(rtS); r.clear(true,true,true); r.render(H.scene,H.cam);
      fsq.material=bright; bright.uniforms.t.value=rtS.texture; r.setRenderTarget(rtA); r.render(fsc,fcam);
      for(let i=0;i<2;i++){
        fsq.material=blur; blur.uniforms.t.value=rtA.texture; blur.uniforms.d.value.set(1/rtA.width,0); r.setRenderTarget(rtB); r.render(fsc,fcam);
        blur.uniforms.t.value=rtB.texture; blur.uniforms.d.value.set(0,1/rtA.height); r.setRenderTarget(rtA); r.render(fsc,fcam); }
      fsq.material=comp; comp.uniforms.base.value=rtS.texture; comp.uniforms.bl.value=rtA.texture;
      r.setRenderTarget(null); r.render(fsc,fcam);
    }};
  }
  S.post.comp.uniforms.k.value=k/.6*1.1*.909;      /* 0.6 on the slider = the Mood Lab's halo */
  H.post=S.post.run;
};
CORE.hostBoot=function(H){
  if(!CORE.HOSTED||CORE.HOSTBOOTED||!H) return; CORE.HOSTBOOTED=true;
  try{ H.quietEnter&&H.quietEnter(); }catch(e){}
  ['#splash','#evchip','#timer','#mute','#spinhint','#trioCta','#rail'].forEach(sel=>{
    const n=document.querySelector(sel); if(n){ n.style.display='none'; n.classList.add('gone'); } });
  /* the page owns the music: the room's own track never plays */
  if(!H._startAudio0) H._startAudio0=H.startAudio;   /* v57: an egg's song can still play */
  try{ const au=H.audioEl; if(au){ au.pause(); au.removeAttribute('src'); au.load(); au.play=()=>Promise.resolve(); } }catch(e){}
  H.startAudio=()=>Promise.resolve();
  /* ready after the first frame (the page's loading screen covers us until then) */
  let sent=false; const ready=()=>{ if(sent) return; sent=true; CORE.post({trio:'ready'}); };
  requestAnimationFrame(()=>requestAnimationFrame(ready)); setTimeout(ready,2500);
  const txt=(v,n)=>String(v==null?'':v).slice(0,n);
  addEventListener('message',e=>{
    if(e.source!==window.parent) return;
    const d=e.data||{}; if(!d||typeof d!=='object') return;
    if(d.trio==='cover')   CORE.sleep(true,'cover');
    if(d.trio==='uncover') CORE.sleep(false,'cover');
    if(d.trio==='levels'&&window.HEXFX&&window.HEXFX.feed) window.HEXFX.feed(+d.b||0,+d.m||0,+d.t||0);
    if(d.trio==='board'&&Array.isArray(d.rows)&&H.onBoard){
      if(CORE.SIM&&CORE.SIM.stop) try{ CORE.SIM.stop(); }catch(err){}
      H.onBoard(d.rows.slice(0,50).map(r=>({n:txt(r&&r.name,18), s:Math.max(0,Math.floor(+(r&&r.score)||0)), you:!!(r&&r.you)})), !!d.over);
    }
    if(d.trio==='signatures'&&Array.isArray(d.rows)){ CORE.SIGROWS=CORE.sigClean(d.rows); if(CORE.SIGFEED) CORE.SIGFEED(CORE.SIGROWS); }   /* v86: approved signatures from the page */
    if(d.trio==='chat'&&Array.isArray(d.rows)&&H.onChat){
      if(CORE.SIM&&CORE.SIM.stop) try{ CORE.SIM.stop(); }catch(err){}
      /* newest first from the page → newest on top of the wall; yours in gold. Drawn with fillText only. */
      H.onChat(d.rows.slice(0,7).map(r=>({name:txt(r&&r.name,14), text:txt(r&&r.txt,140), role:(r&&r.you)?'me':'fan'})), undefined,
        {top:true, count:(d.count!=null&&isFinite(+d.count))?Math.max(0,Math.floor(+d.count)):d.rows.length});
    }
    if(d.trio==='chat'&&Array.isArray(d.rows)&&CORE.CHATFEED) CORE.CHATFEED.forEach(f=>{ try{ f(d.rows.slice(0,7).map(r=>({name:txt(r&&r.name,14), text:txt(r&&r.txt,140), role:(r&&r.you)?'me':'fan'})), (d.count!=null&&isFinite(+d.count))?Math.max(0,Math.floor(+d.count)):d.rows.length); }catch(err){} });   /* v76: the fan board wall */
  });
  /* taps out: the chat board and the live board ask the page to open its sheet / the game */
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); let dn=null;
  H.canvas.addEventListener('pointerdown',e=>{ dn=[e.clientX,e.clientY]; },true);
  H.canvas.addEventListener('click',e=>{
    if(dn&&Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>10) return;
    if(window.HEXSLEEP) return;
    ptr.x=e.clientX/innerWidth*2-1; ptr.y=-(e.clientY/innerHeight)*2+1; ray.setFromCamera(ptr,H.cam);
    const c=CORE.boardByKind('chat'), l=CORE.boardByKind('leader');
    if(c&&ray.intersectObject(c.mesh,false).length){ CORE.post({trio:'open', board:'chat'}); return; }
    if(l&&ray.intersectObject(l.mesh,false).length){ CORE.post({trio:'open', board:'game'}); return; }
  });
};

/* ==================== THE REEL ====================
   Tap a video tile → the room's clips full-screen, one per screen, swipe up/down —
   the same vertical feed the portal's 3-D rooms open. Starts on the clip you tapped,
   loops each clip, tap to pause. The room sleeps underneath and wakes on close. */
CORE.reelList=function(){
  const out=[]; ((CORE.TILES&&CORE.TILES.video)||[]).forEach(g=>{
    if(g&&g.userData&&g.userData.vurl){
      const v=g.userData.video;           /* reuse the blob: URL the wall already plays — never re-decode a data: URL */
      out.push({g:g, src:(v&&(v.currentSrc||v.src))||g.userData.vurl}); } });
  return out;
};
CORE.openReel=function(start, label, listIn, kind){
  const IMG=kind==='img';                     /* the same swipe feed, for photos */
  const list=listIn||CORE.reelList(); if(!list.length) return;
  if(!document.getElementById('hexReelCss')){
    const st=document.createElement('style'); st.id='hexReelCss';
    st.textContent=
      '#hexReel{position:fixed;inset:0;z-index:90;background:#07060d;display:none}'+
      '#hexReel.on{display:block}'+
      '#hexReel .rs{position:absolute;inset:0;overflow-y:scroll;scroll-snap-type:y mandatory;'+
        '-webkit-overflow-scrolling:touch;scrollbar-width:none;overscroll-behavior:contain}'+
      '#hexReel .rs::-webkit-scrollbar{display:none}'+
      '#hexReel .sl{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;'+
        'display:flex;align-items:center;justify-content:center;background:#000}'+
      '#hexReel video{width:100%;height:100%;object-fit:cover;max-width:min(100vw,calc(100vh*9/16));}'+
      '#hexReel img.ph{max-width:calc(100vw - 24px);max-height:calc(100% - 120px);object-fit:contain;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.6)}'+
      '#hexReel .mt{position:absolute;left:18px;right:80px;bottom:calc(26px + env(safe-area-inset-bottom));'+
        'font:800 13px Manrope,sans-serif;color:#f5f2ff;letter-spacing:.04em;text-shadow:0 2px 12px rgba(0,0,0,.7)}'+
      '#hexReel .mt s{display:block;text-decoration:none;font-weight:700;font-size:11px;color:#8f87b8;margin-top:4px;letter-spacing:.14em}'+
      '#hexReel .x{position:absolute;right:14px;top:calc(14px + env(safe-area-inset-top));z-index:2;width:44px;height:44px;'+
        'border-radius:50%;border:1px solid rgba(139,123,255,.45);background:rgba(7,6,13,.6);color:#f5f2ff;'+
        'font:700 20px Manrope,sans-serif;line-height:42px;text-align:center;cursor:pointer;backdrop-filter:blur(6px)}'+
      '#hexReel .vl{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:1;'+
        'background:#07060d;font:800 12px Manrope,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#fbbf24;'+
        'transition:opacity .35s;pointer-events:none}'+
      '#hexReel .vl.off{opacity:0}'+
      '#hexReel .hint{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(64px + env(safe-area-inset-bottom));'+
        'font:700 10px Manrope,sans-serif;letter-spacing:.2em;color:rgba(245,242,255,.55);text-transform:uppercase;z-index:2;'+
        'transition:opacity .6s;pointer-events:none}';
    document.head.appendChild(st);
  }
  let R=document.getElementById('hexReel');
  if(!R){ R=document.createElement('div'); R.id='hexReel'; document.body.appendChild(R); }
  R.innerHTML='';
  const sc=document.createElement('div'); sc.className='rs'; R.appendChild(sc);
  const veil=document.createElement('div'); veil.className='vl'; veil.textContent='pulling up the thread…'; R.appendChild(veil);
  const x=document.createElement('button'); x.className='x'; x.setAttribute('aria-label','Back to the room'); x.textContent='✕'; R.appendChild(x);
  const hint=document.createElement('div'); hint.className='hint'; hint.textContent= list.length>1?'swipe for more':''; R.appendChild(hint);
  const vids=[];
  const unveil=()=>veil.classList.add('off'); setTimeout(unveil,2500);
  list.forEach((it,i)=>{
    const s=document.createElement('div'); s.className='sl';
    if(IMG){ const im=document.createElement('img'); im.alt=''; im.src=it.src; im.className='ph';
      im.addEventListener('load',unveil,{once:true});
      s.addEventListener('click',e=>{ if(e.target===s) close(); });   /* tap the dark around a photo to close */
      const mt=document.createElement('div'); mt.className='mt'; const t=document.createElement('span'); t.textContent=label||'';
      const n=document.createElement('s'); n.textContent=(i+1)+' / '+list.length; mt.appendChild(t); mt.appendChild(n);
      s.appendChild(im); s.appendChild(mt); sc.appendChild(s); vids.push(null); return; }
    const v=document.createElement('video');
    v.muted=true; v.setAttribute('muted',''); v.playsInline=true; v.setAttribute('playsinline','');
    v.loop=true; v.preload=(i===start)?'auto':'none';     /* the tapped clip loads; the rest wait until reached */
    if(/\.mp4(\?|$)/i.test(it.src)&&!/^(blob|data):/.test(it.src)) v.poster=it.src.replace(/\.mp4(\?|$)/i,'.jpg$1');  /* <clip>.jpg beside <clip>.mp4 */
    v.src=it.src;
    v.addEventListener('playing',unveil,{once:true});
    v.addEventListener('click',()=>{ if(v.paused) v.play().catch(()=>{}); else v.pause(); });
    const mt=document.createElement('div'); mt.className='mt';
    const t=document.createElement('span'); t.textContent=label||'';   /* text, never HTML */
    const n=document.createElement('s'); n.textContent=(i+1)+' / '+list.length;
    mt.appendChild(t); mt.appendChild(n);
    s.appendChild(v); s.appendChild(mt); sc.appendChild(s); vids.push(v);
  });
  let cur=-1;
  const activate=i=>{ if(i===cur) return; cur=i;
    vids.forEach((v,j)=>{ if(!v) return; if(j===i){ v.preload='auto'; v.play().catch(()=>{}); } else v.pause(); });
    if(i>0) hint.style.opacity='0'; };
  sc.addEventListener('scroll',()=>{ const i=Math.round(sc.scrollTop/Math.max(1,sc.clientHeight)); activate(Math.max(0,Math.min(vids.length-1,i))); },{passive:true});
  const close=()=>{ vids.forEach(v=>{ if(!v) return; try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){} });
    R.classList.remove('on'); R.innerHTML=''; CORE.REELOPEN=false; CORE.sleep(false);
    removeEventListener('keydown',esc); };
  const esc=e=>{ if(e.key==='Escape') close(); };
  x.addEventListener('click',close); addEventListener('keydown',esc);
  CORE.REELOPEN=true; CORE.sleep(true);
  R.classList.add('on');
  const jump=()=>{ sc.scrollTop=start*sc.clientHeight; };
  jump(); activate(start);
  requestAnimationFrame(()=>{ jump(); activate(start); });      /* after first layout — snap can reset an early scroll */
};

/* tap a photo tile → lightbox; tap anywhere to close. The room sleeps under it too. */
CORE.openPhoto=function(src){
  let L=document.getElementById('hexLight');
  if(!L){ L=document.createElement('div'); L.id='hexLight';
    L.style.cssText='position:fixed;inset:0;z-index:90;background:rgba(7,6,13,.94);display:flex;align-items:center;'+
      'justify-content:center;cursor:pointer;padding:env(safe-area-inset-top) 12px env(safe-area-inset-bottom)';
    document.body.appendChild(L); }
  L.innerHTML=''; const im=document.createElement('img'); im.src=src; im.alt='';
  im.style.cssText='max-width:100%;max-height:100%;object-fit:contain;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6)';
  L.appendChild(im); L.style.display='flex'; CORE.REELOPEN=true; CORE.sleep(true);
  L.onclick=()=>{ L.style.display='none'; L.innerHTML=''; CORE.REELOPEN=false; CORE.sleep(false); };
};

/* ==================== ROOM TABS (phones first) ====================
   A row of tabs for the parts of the room — ▶ Play · Fan board · Clips · Photos · Leaderboard · 360.
   A tab glides you (about a second) to stand in front of that part, facing it. It only takes you
   there: the thing itself still opens with a tap, and you're left standing where you were when it
   closes. Tabs are built from what the room actually has. Joystick moves to the bottom right on phones. */
CORE.roomTabs=function(H, bake){
  if(CORE.TABS||!H) return; const B=(bake&&bake.boards)||{};
  const filled=k=>(((bake.racks||{})[k]||{}).tiles||[]).some(t=>t&&(t.asset||t.url));
  const T=[];
  if(B.game&&B.game.on!==false) T.push(['game','Play']);
  if(B.chat&&B.chat.on) T.push(['chat', B.chat.style==='fan'?'Fan board':'Chat']);
  if(filled('video')) T.push(['clips','Clips']);
  if(filled('photo')) T.push(['photos','Photos']);
  if(B.leader&&B.leader.on!==false) T.push(['leader','Leaderboard']);
  T.push(['spin','360']);
  if(!document.getElementById('hexTabsCss')){ const st=document.createElement('style'); st.id='hexTabsCss'; st.textContent=
    '#hexTabs{position:fixed;z-index:45;left:152px;right:16px;bottom:calc(22px + env(safe-area-inset-bottom));display:flex;flex-wrap:wrap;gap:7px;align-items:flex-end;pointer-events:none}#hexTabs button{pointer-events:auto}'+   /* the strip never blocks what sits beside it */
    '#hexTabs button{padding:9px 13px;border-radius:999px;font:800 11px Manrope,sans-serif;letter-spacing:.06em;color:#f5f2ff;white-space:nowrap;cursor:pointer;'+
      'background:rgba(12,10,28,.62);border:1px solid rgba(190,180,255,.35);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}'+
    '#hexTabs button.on{background:linear-gradient(180deg,rgba(150,132,255,.95),rgba(91,75,212,.92));border-color:rgba(225,218,255,.8);box-shadow:0 6px 20px rgba(91,75,212,.55)}'+
    'body.hastabs #rail{bottom:calc(18px + env(safe-area-inset-bottom))}'+   /* desktop: the reaction feed has the right side, the tabs the left */
    'body.hastabs #hexSpin{display:none!important}body.hastabs.hexspinning #hexSpin{display:flex!important}body.hexspinning #hexTabs{visibility:hidden}'+
    '@media (max-width:820px){#hexNav{left:auto!important;right:18px!important;bottom:calc(24px + env(safe-area-inset-bottom))!important}'+
      '#hexTabs{left:12px;right:128px;bottom:calc(26px + env(safe-area-inset-bottom))}body.hastabs #rail{bottom:calc(150px + env(safe-area-inset-bottom))}}';   /* phone: the feed sits above the joystick */
    document.head.appendChild(st); }
  const row=document.createElement('div'); row.id='hexTabs';
  const V=THREE.Vector3;
  const spot=function(k){
    const C=CORE, pick=k==='game'?C.boardByKind('game'):k==='chat'?C.boardByKind('chat'):k==='leader'?C.boardByKind('leader'):null;
    let obj=pick&&pick.mesh, face=null;
    if(k==='clips'||k==='photos'){ const L=(C.TILES&&C.TILES[k==='clips'?'video':'photo'])||[];
      const full=L.filter(g=>g&&g.userData&&(g.userData.vurl||(g.userData.art&&g.userData.art.material.map))); const use=full.length?full:L;
      obj=use[Math.floor((use.length-1)/2)]; }
    if(!obj) return null;
    const w=new V(); obj.getWorldPosition(w);
    if(pick&&pick.free){ const q=new THREE.Quaternion(); pick.group.getWorldQuaternion(q); face=new V(0,0,1).applyQuaternion(q); }
    else face=new V(-w.x,0,-w.z);                 /* walls face the middle of the room */
    face.y=0; face.normalize();
    const portrait=innerWidth<innerHeight;
    const base={game:6.2,chat:9,leader:9,clips:6,photos:6}[k]||6;
    const d=portrait?base:base*.6;
    const p=w.clone().add(face.multiplyScalar(d)); const cl=CORE.room(H).clamp(p.x,p.z,.8);
    const dx=w.x-cl.x, dz=w.z-cl.z;
    return {x:cl.x, z:cl.z, yaw:Math.atan2(dx,-dz), pitch:Math.max(-.3,Math.min(.35,Math.atan2(w.y-1.7,Math.hypot(dx,dz))))};
  };
  let glide=null;
  const go=function(k,btn){
    if(k==='spin'){ const sp=CORE.ORBIT||CORE.orbitBoot(H,function(){ return (bake&&bake.orbit)||{}; }); glide=null;
      sp.running?sp.stop():sp.start(); [...row.children].forEach(b=>b.classList.remove('on')); return; }
    const s=spot(k), N=CORE.NAV; if(!s||!N) return;
    const y0=H.getYaw?H.getYaw():0; let dy=s.yaw-y0; dy=Math.atan2(Math.sin(dy),Math.cos(dy));   /* the short way round */
    glide={t0:performance.now(), x0:N.pos.x, z0:N.pos.z, y0:y0, dy:dy, p0:H.getPitch?H.getPitch():0, s:s};
    [...row.children].forEach(b=>b.classList.toggle('on',b===btn));
  };
  H.onFrame.push(function(){ if(!glide) return; const N=CORE.NAV; if(!N) return;
    let u=Math.min(1,(performance.now()-glide.t0)/1000); const e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
    N.pos.x=glide.x0+(glide.s.x-glide.x0)*e; N.pos.z=glide.z0+(glide.s.z-glide.z0)*e;
    if(H.setYaw) H.setYaw(glide.y0+glide.dy*e);
    if(H.addPitch&&H.getPitch) H.addPitch((glide.p0+(glide.s.pitch-glide.p0)*e)-H.getPitch());
    if(u>=1) glide=null; });
  /* walking or dragging clears the highlight — you've left that spot */
  addEventListener('pointerdown',e=>{ if(!row.contains(e.target)) [...row.children].forEach(b=>b.classList.remove('on')); },true);
  T.forEach(([k,t])=>{ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.dataset.k=k;
    if(k==='game'){ const NS='http://www.w3.org/2000/svg', sv=document.createElementNS(NS,'svg'), pa=document.createElementNS(NS,'path');
      sv.setAttribute('viewBox','0 0 10 12'); sv.setAttribute('width','9'); sv.setAttribute('height','11'); sv.setAttribute('aria-hidden','true');
      sv.style.cssText='margin-right:6px;vertical-align:-1px'; pa.setAttribute('d','M0 0L10 6L0 12Z'); pa.setAttribute('fill','currentColor');
      sv.appendChild(pa); b.insertBefore(sv,b.firstChild); }       /* a drawn ▶ — the text glyph shows as a gray box on iPhone */
    b.addEventListener('click',e=>{ e.stopPropagation(); go(k,b); }); row.appendChild(b); });
  document.body.appendChild(row); document.body.classList.add('hastabs');
  CORE.TABS={el:row, go:go, spot:spot};
};
/* ==================== WINDOWS & SETS ====================
   A wall can have a WINDOW: the see-through part of its wall art (a PNG with a transparent
   opening) becomes a real opening. Behind it sits a SET — a small staged box, built once in the
   set editor and dropped into any window: a flat FLOOR (top-down), an upright MIDDLE ground
   (transparent PNG), a BACKGROUND (image or looping video) at the back, 3D models standing on the
   floor, up to 3 lights, and a mood colour/brightness. Everything really sits at depth, so walking
   past the window gives true parallax.
   Set units: the window is 6 wide; a set is scaled to the real window's width. Origin = the window's
   bottom centre; +x across, +y up, -z into the box. */
CORE.SET_W=6;
CORE.windowRect=function(img){             /* the see-through bbox of a wall image, as fractions */
  try{
    const W=256, H=Math.max(8,Math.round(256*(img.naturalHeight||img.height)/(img.naturalWidth||img.width)));
    const c=document.createElement('canvas'); c.width=W; c.height=H; const g=c.getContext('2d');
    g.drawImage(img,0,0,W,H); const d=g.getImageData(0,0,W,H).data;
    let x0=W,y0=H,x1=-1,y1=-1,n=0;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ if(d[(y*W+x)*4+3]<128){ n++; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
    if(n<W*H*0.01) return null;              /* no real opening */
    return [x0/W,y0/H,(x1+1)/W,(y1+1)/H];
  }catch(e){ return null; }
};
CORE.setDefaults=function(st){
  st.depth=st.depth||4; if(st.floorLevel==null) st.floorLevel=0; if(!st.shape) st.shape='box'; st.mood=st.mood||{color:'#ffffff',i:.95};
  st.floor=st.floor||{}; st.middle=st.middle||{}; st.back=st.back||{};
  if(st.middle.dist==null) st.middle.dist=st.depth*.5; if(st.middle.size==null) st.middle.size=1; if(st.middle.y==null) st.middle.y=0;
  if(st.back.size==null) st.back.size=1; if(st.back.y==null) st.back.y=0;
  ['floor','middle','back'].forEach(k=>{ const L=st[k];
    if(L.fit==null) L.fit='cover'; if(L.scale==null) L.scale=1; if(L.ox==null) L.ox=0; if(L.oy==null) L.oy=0;
    if(L.rot==null) L.rot=0; if(L.tint==null) L.tint='#ffffff'; if(L.bright==null) L.bright=1; });
  st.models=st.models||[]; st.lights=st.lights||[]; st.spots=st.spots||[]; return st;
};
/* the same framing the walls get: fit / scale / across / up-down / rotate, drawn into the layer's plate */
CORE.frameImg=function(c, img, L, clear){
  const W=c.width, H=c.height, g=c.getContext('2d');
  g.clearRect(0,0,W,H); if(!clear){ g.fillStyle='#07060d'; g.fillRect(0,0,W,H); }
  const iw=img&&(img.naturalWidth||img.width), ih=img&&(img.naturalHeight||img.height); if(!iw||!ih) return;
  g.save(); g.translate(W/2+(L.ox||0)*W, H/2+(L.oy||0)*H); g.rotate((L.rot||0)*Math.PI/180);
  const k=L.scale||1;
  if(L.fit==='stretch') g.drawImage(img,-W/2*k,-H/2*k,W*k,H*k);
  else { const sc=(L.fit==='contain'?Math.min(W/iw,H/ih):Math.max(W/iw,H/ih))*k; g.drawImage(img,-iw*sc/2,-ih*sc/2,iw*sc,ih*sc); }
  g.restore();
};
/* redraw one layer after a framing change — no rebuild, instant while a slider moves */
CORE.reframeLayer=function(G, key, L, mood){
  const R=G&&G.userData.layers&&G.userData.layers[key]; if(!R) return;
  if(R.canvas){ CORE.frameImg(R.canvas, R.img, L, R.clear); R.tex.needsUpdate=true; }
  else if(R.tex&&R.video){ const k=L.scale||1; R.tex.repeat.set(1/k,1/k); R.tex.offset.set((1-1/k)/2-(L.ox||0)/k,(1-1/k)/2+(L.oy||0)/k); }
  const m=R.mesh.material, b=L.bright==null?1:L.bright, t=new THREE.Color(L.tint||'#ffffff');
  m.color.copy(t).multiplyScalar(b); m.emissive.copy(new THREE.Color(mood.color||'#ffffff')).multiply(t);
  m.emissiveIntensity=(mood.i==null?.95:mood.i)*b; m.needsUpdate=true;
};
/* res(id) → {img} | {video:url} | {buf} | null */
/* v46 · LIGHTS OUT: a dark set has no glow of its own and none of its lights — only glowing models light it.
   The set editor keeps a faint 6% so you can still see what you're placing. */
CORE.setMood=function(st, editor){ const m=st.mood||{};
  return st.dark?{color:m.color||'#ffffff', i:editor?.06:0}:m; };
CORE.buildSet=function(st, res, winH, opts){
  opts=opts||{}; st=CORE.setDefaults(st);
  /* floor height: 0 = level with the room floor (walk up to the window to see it), 1 = at the sill.
     opts.sill = how far the room floor sits below the sill, in set units */
  const D=st.depth, W=CORE.SET_W, sill=Math.max(0,opts.sill||0), fy=-(1-Math.min(1,Math.max(0,st.floorLevel)))*sill;
  const boxW=W+D*1.6, top=Math.max(winH,1)+D*.8, boxH=top-fy;
  const G=new THREE.Group(); G.userData.isSet=true;
  const C=new THREE.Group(); C.position.y=fy;            /* everything that stands on the set floor */
  const MD=CORE.setMood(st,!!(opts&&opts.editor)), mood=new THREE.Color(MD.color||'#ffffff'), mi=MD.i==null?.95:MD.i;
  const vids=[];
  const LAY={}; G.userData.layers=LAY; G.userData.eggs=[];
  const texOf=(r,key,pw,ph,clear)=>{ if(!r) return null; const L=st[key];
    if(r.video){ const v=CORE.videoFor(r.video); v.muted=true; vids.push(v); const t=CORE.videoTex(v);
      t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping; LAY[key]={tex:t,video:v}; return t; }
    if(r.img){ const c=document.createElement('canvas'); c.width=pw; c.height=Math.max(8,Math.round(ph));
      const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
      LAY[key]={tex:t,canvas:c,img:r.img,clear:!!clear};
      const draw=()=>{ CORE.frameImg(c,r.img,L,clear); t.needsUpdate=true; };
      if(r.img.complete===false||!(r.img.naturalWidth||r.img.width)) r.img.addEventListener('load',draw,{once:true}); else draw();
      return t; }
    return null; };
  const layer=(tex,cut)=>new THREE.MeshStandardMaterial({map:tex, emissive:mood.clone(), emissiveMap:tex, emissiveIntensity:tex?mi:0,
    color:tex?0xffffff:0x0b0918, roughness:.92, metalness:0, transparent:!!cut, alphaTest:cut?.04:0, depthWrite:!cut, side:THREE.DoubleSide});
  const dark=()=>new THREE.MeshStandardMaterial({color:0x07060d, roughness:1, metalness:0, emissive:mood.clone(), emissiveIntensity:mi*.035});
  const curve=st.shape==='curve';
  if(curve){
    /* the curved set: a half-round back wall ("orange wedge") on a half-round floor. The background
       wraps the whole curve — look to the side and it keeps going, no corners. */
    const a=boxW/2, b=D, arc=Math.PI*Math.sqrt((a*a+b*b)/2);
    const fg=new THREE.CircleGeometry(1,64,0,Math.PI);
    const fp=fg.attributes.position, fu=fg.attributes.uv;
    for(let i=0;i<fp.count;i++) fu.setXY(i,(fp.getX(i)+1)/2,fp.getY(i));
    const fl=new THREE.Mesh(fg, layer(texOf(res(st.floor.asset),'floor',1024,1024*b/(2*a),false),false));
    fl.scale.set(a,b,1); fl.rotation.x=-Math.PI/2; C.add(fl); if(LAY.floor) LAY.floor.mesh=fl;
    const wg=new THREE.CylinderGeometry(1,1,boxH,72,1,true,Math.PI/2,Math.PI);
    const wt=texOf(res(st.back.asset),'back',2048,2048*boxH/arc,false);
    const bk=new THREE.Mesh(wg, layer(wt,false)); bk.scale.set(-a,1,b); bk.position.y=fy+boxH/2; G.add(bk);
    if(!wt) bk.material=dark();
    G.userData.backMesh=bk; if(LAY.back) LAY.back.mesh=bk;
    const cg=new THREE.CircleGeometry(1,64,0,Math.PI);
    const ce=new THREE.Mesh(cg, dark()); ce.scale.set(a,b,1); ce.rotation.x=-Math.PI/2; ce.position.y=top; ce.material.side=THREE.DoubleSide; G.add(ce);
    G.add(C);
  } else {
  /* the box: floor, back, sides, ceiling — no edges ever show */
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(boxW,D), layer(texOf(res(st.floor.asset),'floor',1024,1024*D/boxW,false),false));
  fl.rotation.x=-Math.PI/2; fl.position.set(0,0,-D/2); C.add(fl); if(LAY.floor) LAY.floor.mesh=fl;
  const bh=boxW/2*st.back.size;
  const bk=new THREE.Mesh(new THREE.PlaneGeometry(boxW*st.back.size,bh), layer(texOf(res(st.back.asset),'back',2048,1024,false),false));
  bk.position.set(0,bh/2+st.back.y,-D+.02); C.add(bk); G.userData.backMesh=bk; if(LAY.back) LAY.back.mesh=bk;
  const backWall=new THREE.Mesh(new THREE.PlaneGeometry(boxW,boxH), dark()); backWall.position.set(0,fy+boxH/2,-D-.01); G.add(backWall);
  [-1,1].forEach(sd=>{ const w=new THREE.Mesh(new THREE.PlaneGeometry(D,boxH), dark());
    w.rotation.y=-sd*Math.PI/2; w.position.set(sd*boxW/2,fy+boxH/2,-D/2); G.add(w); });
  const ce=new THREE.Mesh(new THREE.PlaneGeometry(boxW,D), dark()); ce.rotation.x=Math.PI/2; ce.position.set(0,top,-D/2); G.add(ce);
  G.add(C);
  }
  /* the middle ground stands on the floor */
  const mt=texOf(res(st.middle.asset),'middle',1536,768,true);
  if(mt){ const mw=boxW*.8*st.middle.size, mh=mw/2;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(mw,mh), layer(mt,true)); LAY.middle.mesh=m;
    m.position.set(0,mh/2+st.middle.y,-Math.min(D-.15,Math.max(.2,st.middle.dist))); m.renderOrder=2; C.add(m); }
  /* lights (max 3) */
  (st.dark?[]:st.lights).slice(0,3).forEach(L=>{
    const col=new THREE.Color(L.color||'#ffffff'), I=L.i==null?2:L.i;
    let lt;
    if(L.kind==='point') lt=new THREE.PointLight(col,I,D*2.6,1.4);
    else { lt=new THREE.SpotLight(col,I*1.6,D*3.2,.55,.55,1.2);
      const t=new THREE.Object3D(); t.position.set(L.tx||0,L.ty||0,L.tz==null?-D*.6:L.tz); C.add(t); lt.target=t; }
    lt.position.set(L.x||0,L.y==null?boxH*.85:L.y,L.z==null?-.4:L.z); C.add(lt);
    if(opts.editor){ const can=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8), new THREE.MeshBasicMaterial({color:col}));
      can.position.copy(lt.position); C.add(can); }
  });
  /* models stand on the floor */
  st.models.forEach(M=>{ const r=res(M.asset); if(!r||!r.buf) return;
    CORE.build({id:'set:'+M.id,type:'glb',asset:'_m',pos:[M.x||0,M.y||0,M.z==null?-D*.55:M.z],rot:[0,(M.ry||0)*Math.PI/180,0],size:M.size||1.6,scale:1,shadow:!(M.y>.05),tint:'#ffffff',bright:1,opacity:1},
      {_m:{buf:r.buf}}, C, g=>{ if(M.lit!==false) g.traverse(o=>{ if(o.isMesh&&o.material&&o!==g.userData.shadow){
        const om=o.material, nm=new THREE.MeshStandardMaterial({map:om.map||null, color:om.color?om.color.clone():0xffffff,
          emissive:mood.clone(), emissiveMap:om.map||null, emissiveIntensity:mi*.55, roughness:.7, metalness:.05,
          transparent:om.transparent, opacity:om.opacity, side:om.side});
        o.material=nm; } });
        if(M.glow&&M.glow.on) CORE.glowApply({type:'glb',glow:M.glow}, g, {dist:Math.min(11,D*2.2), inSet:true});   /* v45: glow inside a set */
        (CORE.SETG['set:'+M.id]||(CORE.SETG['set:'+M.id]=[])).push(g);
        if(G.userData.stencil) CORE.stencilSet(g, G.userData.stencil);
        if(M.egg&&M.egg.on){   /* v84: the egg is placed on the model at full size (before a hidden start shrinks it) */ const bb=new THREE.Box3().setFromObject(g), top=new THREE.Vector3((bb.min.x+bb.max.x)/2,bb.max.y,(bb.min.z+bb.max.z)/2);
          C.worldToLocal(top); const gl=CORE.glintFor(M.egg, top.x, top.y+.18, top.z, C, G);
          const bub=CORE.eggBubble(bb, C, 1);
          const eid=(st.id||'s')+':m:'+M.id, tk='set:'+M.id; if(gl){ gl.userData.eggId=eid; gl.userData.tk=tk; gl.userData.eoff=M.egg.start==='off'; gl.userData.host=g; } G.userData.eggs.push({obj:g, egg:M.egg, id:eid, tk, glint:gl, bubble:bub}); }
        CORE.startState({scale:1, glow:M.glow, startHidden:M.startHidden}, g); });                                          /* v50: room triggers reach set models */
  });
  /* Easter egg spots: a tappable point anywhere in the set */
  (st.spots||[]).forEach(P=>{ if(!P.egg||!P.egg.on) return;
    const hit=new THREE.Mesh(new THREE.SphereGeometry(.42,10,8), new THREE.MeshBasicMaterial({visible:false}));
    hit.position.set(P.x||0,P.y==null?1:P.y,P.z==null?-D*.5:P.z); C.add(hit);
    const gl=CORE.glintFor(P.egg, hit.position.x, hit.position.y, hit.position.z, C, G);
    const eid=(st.id||'s')+':p:'+P.id; if(gl) gl.userData.eggId=eid; G.userData.eggs.push({obj:hit, egg:P.egg, id:eid, glint:gl, bubble:hit}); });
  Object.keys(LAY).forEach(k=>{ if(LAY[k].mesh) CORE.reframeLayer(G,k,st[k],MD); });
  G.userData.vids=vids; G.userData.dims={boxW,boxH,D,fy};
  return G;
};
/* ---------- Easter eggs: tap something in a set → a pop-up of whatever was loaded into it ---------- */
let GLOWTEX=null;
function glowTex(){ if(GLOWTEX) return GLOWTEX; const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d');
  const r=g.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(.18,'rgba(245,242,255,.95)');
  r.addColorStop(.42,'rgba(170,155,255,.45)'); r.addColorStop(1,'rgba(139,123,255,0)'); g.fillStyle=r; g.fillRect(0,0,64,64);
  GLOWTEX=new THREE.CanvasTexture(c); return GLOWTEX; }
CORE.GLINTS=[];
/* every egg gets an invisible tap bubble round its model, so a small thin model is as easy to tap as a big one.
   bb = the model's WORLD box; parent = where the bubble lives (the set's inner group, or the scene). */
CORE.eggBubble=function(bb, parent, cap){
  const c=new THREE.Vector3(), sz=new THREE.Vector3(); bb.getCenter(c); bb.getSize(sz);
  parent.updateMatrixWorld(true);
  const ws=new THREE.Vector3(); parent.getWorldScale(ws); const k=ws.x||1;              /* world → parent units */
  const r=Math.max(.45, Math.min(cap||1, .6*Math.max(sz.x,sz.y,sz.z)/k));
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8), new THREE.MeshBasicMaterial({visible:false}));
  parent.worldToLocal(c); m.position.copy(c); m.userData.eggBubble=true; parent.add(m); return m; };
/* v52 · an egg can start hidden (egg.start==='off') and be made to appear by a trigger.
   tk = the trigger id of what it sits on: a room prop's id, or 'set:'+model id. EGGK holds what triggers changed. */
CORE.EGGK={}; CORE.EGGSET={}; CORE.EGGGONE={};   /* v53: eggs collected for good (until reset / refresh) */
CORE.eggOffOf=function(tk){ let off=false; CORE.eggHosts().forEach(G=>(G.userData.eggs||[]).forEach(E=>{ if(E.tk===tk&&E.egg&&E.egg.start==='off') off=true; })); return off; };
CORE.eggVis=function(tk, off){ if(tk==null) return 1; const v=CORE.EGGK[tk]; if(v!=null) return v; return (off==null?CORE.eggOffOf(tk):off)?0:1; };
CORE.glintFor=function(egg, x, y, z, parent, G){
  if(egg.glint===false) return null;
  /* inside a set the glint draws over the set's own layers (never hidden behind a cut-out or a model) —
     the window's stencil still keeps it inside the opening */
  const inSet=!!G;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(), transparent:true, depthWrite:false, depthTest:!inSet, blending:THREE.AdditiveBlending}));
  sp.position.set(x,y,z); sp.scale.setScalar(.5); sp.userData.ph=Math.random()*6; if(inSet) sp.renderOrder=6; parent.add(sp);
  if(G&&G.userData.stencil) CORE.stencilSet(sp, G.userData.stencil);
  CORE.GLINTS.push(sp); return sp; };
CORE.glintTick=function(H){ if(CORE._glintOn||!H||!H.onFrame) return; CORE._glintOn=1;
  H.onFrame.push(()=>{ const t=performance.now()/1000;
    CORE.GLINTS=CORE.GLINTS.filter(sp=>{ if(!sp.parent) return false;
      const k=.5+Math.sin(t*2.4+sp.userData.ph)*.5; const f=sp.userData.found?.45:1;
      const gt=CORE.EGGGONE[sp.userData.eggId]; sp.userData.gk=gt?Math.max(0,1-(t-gt)/.6):1;   /* fades out over ~½ s */
      const ho=sp.userData.host, hk=(ho&&!CORE.EDIT)?(ho.userData.showK==null?1:ho.userData.showK):1;   /* v84: an egg comes and goes with its model */
      let vk=CORE.eggVis(sp.userData.tk, sp.userData.eoff)*sp.userData.gk*hk; if(CORE.EDIT&&vk<.25) vk=.25;   /* builder: a faint glint where a hidden egg waits */
      sp.visible=vk>.01; sp.scale.setScalar((.38+k*.22)*(f<1?.8:1)*(.4+.6*Math.min(1,vk))); sp.material.opacity=(.45+k*.55)*f*Math.min(1,vk); return true; }); }); };
CORE.EGGFOUND={}; CORE.EGGSOLVED={};   /* v69: answered quizzes, per egg */
/* eggs on things in the room itself (models, hung images) — one host, no window to look through */
CORE.ROOMEGGS={userData:{eggs:[], urlOf:null}};
CORE.eggHosts=()=>(CORE.WINSETS||[]).concat([CORE.ROOMEGGS]);
CORE.clearPropEgg=function(id){ const L=CORE.ROOMEGGS.userData.eggs; const i=L.findIndex(E=>E.id==='prop:'+id);
  if(i>=0){ const gl=L[i].glint, bu=L[i].bubble; if(gl&&gl.parent) gl.parent.remove(gl); if(bu&&bu.parent) bu.parent.remove(bu); L.splice(i,1); } };
CORE.propEgg=function(p, g, scene, H){
  CORE.clearPropEgg(p.id); if(!p||!g||!p.egg||!p.egg.on) return;
  const s0=g.scale.x, sk=g.userData.showK; if(sk!=null&&sk<1&&g.userData.baseScale) g.scale.setScalar(g.userData.baseScale);   /* v84: measure a hidden-at-start model at full size */
  g.updateMatrixWorld(true);
  const bb=new THREE.Box3(); g.traverse(o=>{ if(o.isMesh&&o!==g.userData.shadow) bb.expandByObject(o); });
  if(bb.isEmpty()) bb.setFromObject(g);
  g.scale.setScalar(s0); g.updateMatrixWorld(true);
  const gl=CORE.glintFor(p.egg,(bb.min.x+bb.max.x)/2,bb.max.y+.22,(bb.min.z+bb.max.z)/2,scene,null);
  if(gl){ gl.userData.host=g; gl.userData.eggId='prop:'+p.id; gl.userData.tk=p.id; gl.userData.eoff=p.egg.start==='off'; gl.scale.setScalar(.5); if(gl.userData.eoff&&CORE.EGGK[p.id]==null) gl.material.opacity=CORE.EDIT?.25:0, gl.visible=!!CORE.EDIT; }
  const bub=CORE.eggBubble(bb, scene, 1.2);
  CORE.ROOMEGGS.userData.eggs.push({obj:g, egg:p.egg, id:'prop:'+p.id, tk:p.id, glint:gl, bubble:bub});
  if(H) CORE.glintTick(H);
};
const eggEsc=t=>String(t==null?'':t);
/* ---------- v51 · THE FLOATING EASTER EGG ----------
   With an egg style set (Mood Rooms start with one), the egg opens as a glass card hanging in the room
   beside what you tapped — a thread of light back to it, a slow drift, no dimming, the room keeps playing.
   Phones bring it forward, low on the screen. The colours are the room's (per artist). */
CORE.EGGSTYLE=null;
CORE.EGGPRESETS={
  mood:{bg:'rgba(16,16,18,.80)', fg:'#ece9df', dim:'#a8a498', hot:'#e7e2a0', btn:'#e7e2a0', btnfg:'#0b0b0c'},
  trio:{bg:'rgba(18,16,42,.84)', fg:'#f5f2ff', dim:'#cfc7f2', hot:'#2dd4bf', btn:'#8b7bff', btnfg:'#ffffff'}
};
CORE.eggTheme=function(S){ S=S||{}; const base=CORE.EGGPRESETS[S.preset]||CORE.EGGPRESETS.mood;
  if(S.preset!=='custom') return base;
  const t=Object.assign({},CORE.EGGPRESETS.mood,S); if(t.bg&&t.bg[0]==='#'){ const c=_hex2(t.bg); t.bg='rgba('+c[0]+','+c[1]+','+c[2]+',.82)'; } return t; };
const eggFloatCss=function(){
  if(document.getElementById('hexEggFloatCss')) return;
  if(!document.getElementById('hexEggFonts')){ const f=document.createElement('link'); f.id='hexEggFonts'; f.rel='stylesheet';
    f.href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@600&family=IBM+Plex+Sans:wght@400;500&display=swap'; document.head.appendChild(f); }
  const st=document.createElement('style'); st.id='hexEggFloatCss';
  st.textContent='#hexEgg.fl{display:none;background:none;pointer-events:none;align-items:initial;justify-content:initial}#hexEgg.fl.on{display:block}'+
    '#hexEgg.fl svg.th{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}'+
    '#hexEgg.fl .c{position:fixed;left:0;top:0;margin:0;width:300px;max-height:calc(100% - 40px);pointer-events:auto;border-radius:16px;padding:16px 16px 14px;'+
    'background:var(--eb);color:var(--ef);border:1px solid var(--el);box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 0 40px var(--eg),0 30px 60px rgba(0,0,0,.55);'+
    'backdrop-filter:blur(12px) saturate(1.2);-webkit-backdrop-filter:blur(12px) saturate(1.2);font-family:"IBM Plex Sans",Helvetica,Arial,sans-serif;will-change:transform,opacity}'+
    '#hexEgg.fl .c:before{content:"";position:absolute;left:14px;right:14px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)}'+
    '#hexEgg.fl .k{font:600 9px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.18em;color:var(--eh);padding-right:36px}'+
    '#hexEgg.fl .x{right:12px;top:10px;width:28px;height:28px;border:1px solid var(--el);background:none;color:var(--ef);font:600 13px Arial}'+
    '#hexEgg.fl h3{margin:8px 0 10px;font:400 34px/1 "Bebas Neue","Arial Narrow",Impact,sans-serif;letter-spacing:.05em;color:var(--ef)}'+
    '#hexEgg.fl p{margin:0 0 12px;font:400 13px/1.5 "IBM Plex Sans",Helvetica,Arial,sans-serif;color:var(--ed)}'+
    '#hexEgg.fl img,#hexEgg.fl video{max-height:170px;border-radius:10px;border:1px solid var(--el);background:rgba(0,0,0,.35)}'+
    '#hexEgg.fl a.pl,#hexEgg.fl button.pl{border-radius:10px;padding:11px 0;font:600 10px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.12em;'+
    'background:var(--en);color:var(--et);border:1px solid var(--en)}'+
    '#hexEgg.fl button.pl.g{background:none;color:var(--ef);border-color:var(--el)}'+
    '@media (max-width:700px){#hexEgg.fl .c{width:auto;max-height:58%;overflow:auto}#hexEgg.fl h3{font-size:28px}}';
  document.head.appendChild(st);
};
/* where the card hangs, every frame, while it's open */
CORE.eggFloatTick=function(){
  const F=CORE.EGGF; if(!F) return; const H=window.HEX, c=F.card, th=F.path;
  const now=performance.now()/1000, phone=innerWidth<700;
  /* grow in / fold away */
  const k0=F.closing?Math.max(0,1-(now-F.closing)/.32):Math.min(1,(now-F.t0)/.5), k=k0*k0*(3-2*k0);
  if(F.closing&&k0<=0){ CORE.EGGF=null; F.done(); return; }
  let sx=innerWidth/2, sy=innerHeight*.45, seen=true;
  if(F.anchor&&H&&H.cam){ const v=F.anchor.clone().project(H.cam); seen=v.z<1&&Math.abs(v.x)<1.15&&Math.abs(v.y)<1.15;
    if(v.z<1){ sx=(v.x+1)/2*innerWidth; sy=(1-v.y)/2*innerHeight; } }
  const cw=c.offsetWidth||300, ch=c.offsetHeight||300, bob=Math.sin(now*1.15)*4;
  let x,y,tilt, tx,ty;
  if(phone){ x=12; y=innerHeight-ch-16-(window.visualViewport?0:0); tilt=0; tx=sx; ty=y; c.style.left='12px'; c.style.right='12px'; }
  else { const right=sx<innerWidth*.56; x=right?sx+70:sx-70-cw; x=Math.max(16,Math.min(innerWidth-cw-100,x)); y=Math.max(16,Math.min(innerHeight-ch-16,sy-ch*.55));
    tilt=right?-12:12; tx=right?x:x+cw; ty=y+Math.min(ch*.4,90); c.style.right='auto'; }
  c.style.left=(phone?12:x)+'px'; c.style.top=y+'px';
  const ox=(sx-(x+cw/2)), oy=(sy-(y+ch/2));            /* it grows out of the thing you tapped */
  c.style.transformOrigin=(cw/2+ox)+'px '+(ch/2+oy)+'px';
  c.style.transform='perspective(900px) translateY('+(bob*k)+'px) rotateY('+(tilt*k)+'deg) scale('+(.18+.82*k)+')';
  c.style.opacity=String(k);
  if(th){ const mx=(sx+tx)/2, my=Math.min(sy,ty)-30;
    th.setAttribute('d','M'+sx.toFixed(1)+' '+sy.toFixed(1)+' Q '+mx.toFixed(1)+' '+my.toFixed(1)+' '+tx.toFixed(1)+' '+(ty+bob*k).toFixed(1));
    th.style.opacity=String(seen?k*.85:0); if(F.dot){ F.dot.setAttribute('cx',sx.toFixed(1)); F.dot.setAttribute('cy',sy.toFixed(1)); F.dot.style.opacity=String(seen?k:0); } }
  requestAnimationFrame(CORE.eggFloatTick);
};
CORE.eggAnchor=function(r){
  try{ const o=(r&&(r.glint||r.obj)); if(!o) return null; o.updateMatrixWorld(true);
    if(r.glint) return r.glint.getWorldPosition(new THREE.Vector3());
    const bb=new THREE.Box3().setFromObject(o); if(bb.isEmpty()) return o.getWorldPosition(new THREE.Vector3());
    return new THREE.Vector3((bb.min.x+bb.max.x)/2, bb.min.y+(bb.max.y-bb.min.y)*.7, (bb.min.z+bb.max.z)/2); }catch(e){ return null; }
};
CORE.openEgg=function(egg, urlOf, id, total, H, opts){
  CORE.EGGCTX={egg, id, H:H||window.HEX};   /* v58: closing it (any way) is when the room reacts */
  if(!document.getElementById('hexEggCss')){ const st=document.createElement('style'); st.id='hexEggCss';
    st.textContent='#hexEgg{position:fixed;inset:0;z-index:92;display:none;align-items:flex-end;justify-content:center;background:rgba(7,6,13,.55);'+
      'font-family:Manrope,Helvetica,Arial,sans-serif}#hexEgg.on{display:flex}'+
      '#hexEgg .c{position:relative;width:min(560px,calc(100% - 28px));max-height:calc(100% - 90px - env(safe-area-inset-top));overflow:auto;overscroll-behavior:contain;'+
      'margin:0 0 calc(18px + env(safe-area-inset-bottom));border-radius:24px;background:rgba(18,16,42,.95);border:1px solid rgba(160,146,255,.7);'+
      'box-shadow:0 0 40px rgba(139,123,255,.35);padding:18px 18px 16px;box-sizing:border-box;color:#d9d3f5}'+
      '#hexEgg .k{font:800 9px Manrope,Arial;letter-spacing:.24em;color:#2dd4bf;text-transform:uppercase;padding-right:40px}'+
      '#hexEgg .x{position:absolute;right:12px;top:12px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(160,146,255,.6);'+
      'background:rgba(7,6,13,.6);color:#f5f2ff;font:700 15px Arial;cursor:pointer}'+
      '#hexEgg h3{margin:8px 0 10px;font:900 24px Anton,Impact,Arial;color:#f5f2ff;letter-spacing:.02em;line-height:1.1}'+
      '#hexEgg p{margin:0 0 12px;font:600 14px Manrope,Arial;line-height:1.5;white-space:pre-wrap}'+
      '#hexEgg img,#hexEgg video{display:block;width:100%;max-height:46vh;object-fit:contain;border-radius:14px;margin:0 0 12px;background:#07060d}'+
      '#hexEgg a.pl,#hexEgg button.pl{display:block;box-sizing:border-box;width:100%;text-align:center;text-decoration:none;border-radius:999px;padding:13px 0;margin:0 0 8px;'+
      'font:800 11px Manrope,Arial;letter-spacing:.14em;text-transform:uppercase;color:#f5f2ff;cursor:pointer;'+
      'background:linear-gradient(180deg,rgba(122,102,255,.55),rgba(139,123,255,.35));border:1px solid rgba(160,146,255,.8)}'+
      '#hexEgg button.pl.g{background:rgba(7,6,13,.5)}'+
      /* v69 · quiz */
      '#hexEgg .qz{margin:6px 0 4px}#hexEgg .qq{font:700 15px Manrope,Arial;margin:4px 0 12px;color:inherit}'+
      '#hexEgg button.pl.qa{text-transform:none;letter-spacing:.02em;font-size:13px}'+
      '#hexEgg button.pl.qa.no{background:rgba(220,40,60,.35)!important;border-color:#ff5a6e!important;color:#ffd6dc!important}'+
      '#hexEgg button.pl.qa.ok{background:rgba(40,200,120,.35)!important;border-color:#3ddc84!important;color:#eafff2!important}'+
      '#hexEgg .qz.solved button.pl.qa:not(.ok){opacity:.5}'+
      '#hexEgg .qm{text-align:center;font:700 12px Manrope,Arial;margin:2px 0 10px;min-height:1px}#hexEgg .qm.no{color:#ff8a98}#hexEgg .qm.ok{color:#7cf0b0;font-weight:800;font-size:13px}'+
      '#hexEgg button.pl.lk{opacity:.45;cursor:default}'+
      '#hexEgg button.pl.qok{background:linear-gradient(180deg,#3ddc84,#1fa865)!important;color:#05351c!important;border-color:#3ddc84!important}';
    document.head.appendChild(st); }
  let E=document.getElementById('hexEgg');
  if(!E){ E=document.createElement('div'); E.id='hexEgg'; document.body.appendChild(E);
    E.addEventListener('click',e=>{ if(e.target===E) CORE.closeEgg(); }); }
  const FL=!!(CORE.EGGSTYLE&&CORE.EGGSTYLE.float!==false);
  if(CORE.EGGF){ CORE.EGGF=null; }
  E.innerHTML=''; E.classList.toggle('fl',FL); const c=document.createElement('div'); c.className='c'; E.appendChild(c);
  let thPath=null, thDot=null;
  if(FL){ eggFloatCss(); const T=CORE.eggTheme(CORE.EGGSTYLE);
    const hx=T.hot&&T.hot[0]==='#'?_hex2(T.hot):[231,226,160];
    [['--eb',T.bg],['--ef',T.fg],['--ed',T.dim],['--eh',T.hot],['--en',T.btn],['--et',T.btnfg],
     ['--el','rgba('+hx.join(',')+',.32)'],['--eg','rgba('+hx.join(',')+',.18)']].forEach(([k,v])=>E.style.setProperty(k,v));
    const ns='http://www.w3.org/2000/svg', sv=document.createElementNS(ns,'svg'); sv.setAttribute('class','th');
    thPath=document.createElementNS(ns,'path'); thPath.setAttribute('fill','none'); thPath.setAttribute('stroke',T.hot); thPath.setAttribute('stroke-width','1.5');
    thPath.setAttribute('stroke-dasharray','3 6'); thPath.setAttribute('stroke-linecap','round'); thPath.style.filter='drop-shadow(0 0 4px '+T.hot+')';
    thDot=document.createElementNS(ns,'circle'); thDot.setAttribute('r','4'); thDot.setAttribute('fill',T.hot); thDot.style.filter='drop-shadow(0 0 8px '+T.hot+')';
    sv.appendChild(thPath); sv.appendChild(thDot); E.insertBefore(sv,c); }
  if(id) CORE.EGGFOUND[id]=1;
  const found=Object.keys(CORE.EGGFOUND).length;
  const k=document.createElement('div'); k.className='k'; k.textContent='easter egg'+(total>1?' · '+Math.min(found,total)+' of '+total+' found':''); c.appendChild(k);
  const x=document.createElement('button'); x.className='x'; x.textContent='✕'; x.setAttribute('aria-label','close'); x.onclick=()=>CORE.closeEgg(); c.appendChild(x);
  /* v69 · quiz: every question must be answered right before "collect" unlocks */
  const QK=id||'preview'; const QZ={left:0, bk:null};
  const quizzes=(egg.blocks||[]).filter(b=>b.t==='quiz'&&b.q&&String(b.q).trim()&&(b.answers||[]).filter(x=>x&&String(x).trim()).length>=2);
  QZ.left=quizzes.filter((b,i)=>!(CORE.EGGSOLVED[QK]&&CORE.EGGSOLVED[QK][i])).length;
  QZ.render=(c,b)=>{ const qi=quizzes.indexOf(b), done=!!(CORE.EGGSOLVED[QK]&&CORE.EGGSOLVED[QK][qi]);
    const box=document.createElement('div'); box.className='qz';
    const q=document.createElement('p'); q.className='qq'; q.textContent=eggEsc(b.q); box.appendChild(q);
    const msg=document.createElement('p'); msg.className='qm';
    (b.answers||[]).forEach((a,ai)=>{ if(!a||!String(a).trim()) return; const bt=document.createElement('button'); bt.className='pl qa'; bt.textContent=eggEsc(a);
      const right=ai===(+b.right||0);
      if(done&&right){ bt.classList.add('ok'); bt.textContent='✓  '+eggEsc(a); }
      bt.onclick=e=>{ e.stopPropagation(); if(box.classList.contains('solved')||bt.classList.contains('no')) return;
        if(right){ bt.classList.add('ok'); bt.textContent='✓  '+eggEsc(a); box.classList.add('solved'); msg.textContent='You got it!'; msg.className='qm ok';
          (CORE.EGGSOLVED[QK]||(CORE.EGGSOLVED[QK]={}))[qi]=1; QZ.left=Math.max(0,QZ.left-1); QZ.sync(); CORE.post({trio:'quiz', id:id||'', ok:true}); }
        else { bt.classList.add('no'); bt.textContent='✕  '+eggEsc(a); msg.textContent='Not quite — try again'; msg.className='qm no'; CORE.post({trio:'quiz', id:id||'', ok:false}); } };
      box.appendChild(bt); });
    if(done){ box.classList.add('solved'); msg.textContent='You got it!'; msg.className='qm ok'; }
    box.appendChild(msg); c.appendChild(box); };
  QZ.sync=()=>{ const k=QZ.bk; if(!k) return; const lock=QZ.left>0; k.disabled=lock; k.classList.toggle('lk',lock); k.classList.toggle('qok',!lock&&quizzes.length>0);
    k.textContent=lock?'🔒  answer to collect':'collect'; };
  if(CORE.EGGCTX&&quizzes.length) CORE.EGGCTX.unsolved=()=>QZ.left>0;
  (egg.blocks||[]).forEach(b=>{
    if(b.t==='title'&&b.text){ const h=document.createElement('h3'); h.textContent=eggEsc(b.text); c.appendChild(h); }
    else if(b.t==='text'&&b.text){ const p=document.createElement('p'); p.textContent=eggEsc(b.text); c.appendChild(p); }
    else if(b.t==='image'&&b.asset){ const u=urlOf(b.asset); if(u){ const im=document.createElement('img'); im.src=u; im.alt=''; c.appendChild(im); } }
    else if(b.t==='video'&&b.asset){ const u=urlOf(b.asset); if(u){ const v=document.createElement('video'); v.src=CORE.playableURL?CORE.playableURL(u):u;
      v.muted=true; v.loop=true; v.autoplay=true; v.playsInline=true; v.setAttribute('playsinline',''); v.setAttribute('muted',''); c.appendChild(v); v.play().catch(()=>{}); } }
    else if(b.t==='song'&&b.asset){ const u=urlOf(b.asset); if(u){ const btn=document.createElement('button'); btn.className='pl song';   /* v57 */
      const playing=()=>{ const a=window.HEX&&window.HEX.audioEl; return a&&!a.paused&&a.getAttribute('data-song')===u; };
      const lab=()=>{ btn.textContent=(playing()?'❚❚  playing':'▶  play track')+(b.text?' · '+eggEsc(b.text):''); };
      lab(); btn.onclick=e=>{ e.stopPropagation(); if(!playing()) CORE.playSong(u); if(QZ.left>0){ setTimeout(lab,300); return; } CORE.closeEgg({song:true}); };   /* v58: play → the card goes away → the room reacts */
      c.appendChild(btn); } }
    else if(b.t==='quiz'&&quizzes.indexOf(b)>=0){ QZ.render(c,b); }   /* v69: a question */
    else if(b.t==='link'&&/^https?:\/\/[^\s<>"']+$/i.test(b.url||'')){ const a=document.createElement('a'); a.className='pl'; a.href=b.url;
      a.target='_blank'; a.rel='noopener'; a.textContent=eggEsc(b.label||'open'); c.appendChild(a); }
  });
  const bk=document.createElement('button'); bk.className='pl g'; bk.textContent='collect'; QZ.bk=bk; QZ.sync();   /* v51.1: the demo word for collecting as you go (Adam) */ bk.onclick=()=>CORE.closeEgg(); c.appendChild(bk);   /* v58: collect and ✕ are the same thing */   /* v53: collected → its glint goes away */
  E.classList.add('on'); CORE.EGGOPEN=true;
  if(FL){ CORE.EGGF={card:c, path:thPath, dot:thDot, anchor:(opts&&opts.anchor)||null, t0:performance.now()/1000, closing:0, done:()=>{}}; requestAnimationFrame(CORE.eggFloatTick); }
  else CORE.sleep(true,'egg');
  CORE.post({trio:'egg', id:id||''});
  CORE.GLINTS.forEach(sp=>{ if(sp.userData.eggId&&CORE.EGGFOUND[sp.userData.eggId]) sp.userData.found=true; });
};
CORE.closeEgg=function(opt){ const E=document.getElementById('hexEgg'); if(!E) return;
  const X=CORE.EGGCTX; CORE.EGGCTX=null;
  if(X&&X.id&&CORE.EGGOPEN&&!(opt&&opt.quiet)&&!(X.unsolved&&X.unsolved())){   /* v69: a quiz egg only counts once it's answered right */
    if(X.egg&&X.egg.afterCollect==='gone') CORE.EGGGONE[X.id]=performance.now()/1000;   /* collected */
    CORE.eggDone(X.id, X.H, opt&&opt.song); }
  const fin=()=>{ E.querySelectorAll('video').forEach(v=>{ try{ v.pause(); v.removeAttribute('src'); v.load(); }catch(e){} });
    E.classList.remove('on'); E.innerHTML=''; CORE.EGGOPEN=false; };
  if(CORE.EGGF&&!CORE.EGGF.closing){ CORE.EGGF.closing=performance.now()/1000; CORE.EGGF.done=fin; return; }   /* it folds back into the thing */
  fin(); CORE.sleep(false,'egg'); };
/* a tap in the room: is it on an egg, and can you actually see that egg through its window? */
CORE.eggWire=function(H, getSets){
  if(CORE._eggWired||!H||!H.canvas) return; CORE._eggWired=1; CORE.glintTick(H);
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2(); let dn=null;
  H.canvas.addEventListener('pointerdown',e=>{ dn=[e.clientX,e.clientY]; },true);
  H.canvas.addEventListener('click',e=>{
    if(dn&&Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>10) return;
    if(CORE.EGGOPEN&&CORE.EGGF){ e.stopImmediatePropagation(); CORE.closeEgg(); return; }   /* tap the room: it folds away */
    if(CORE.REELOPEN||CORE.EGGOPEN) return;
    const r=CORE.eggAt(H, getSets(), e.clientX, e.clientY, ray, ptr); if(!r) return;
    e.stopImmediatePropagation();
    CORE.openEgg(r.egg, r.G.userData.urlOf||(()=>null), r.id, CORE.eggTotal(getSets()), H, {anchor:CORE.eggAnchor(r)});
    /* v58: the model's moment now waits until the egg is put away (see CORE.closeEgg) */
  },true);
};
CORE.eggTotal=function(sets){ let n=0; (sets||[]).forEach(G=>{ n+=(G.userData.eggs||[]).length; }); return n; };
CORE.eggAt=function(H, sets, x, y, ray, ptr){
  ray=ray||new THREE.Raycaster(); ptr=ptr||new THREE.Vector2();
  ptr.x=x/innerWidth*2-1; ptr.y=-(y/innerHeight)*2+1; ray.setFromCamera(ptr,H.cam);
  /* a tap on the model itself or on its glint wins; the invisible bubble round it is the fallback,
     so a big model's bubble never steals a tap meant for a small one beside it */
  let best=null, rank=9;
  (sets||[]).forEach(G=>{ (G.userData.eggs||[]).forEach(E=>{
    if(E.tk!=null&&CORE.eggVis(E.tk, !!(E.egg&&E.egg.start==='off'))<.5) return;
    if(!CORE.EDIT&&E.obj&&E.obj.userData&&E.obj.userData.showK!=null&&E.obj.userData.showK<.5) return;   /* v84: its model is hidden */
    if(CORE.EGGGONE[E.id]) return;   /* v53: already collected */   /* v52: a hidden egg can't be found yet */
    const tries=[[E.obj,0],[E.glint,0],[E.bubble,1]];
    tries.forEach(([o,rk])=>{ if(!o||!o.parent) return;
      if(rk===0&&o===E.bubble) return;
      let h=null; try{ h=ray.intersectObject(o,true).filter(q=>!(q.object.userData&&(q.object===E.obj.userData.shadow||(rk===0&&q.object.userData.eggBubble))))[0]; }catch(e){}
      if(!h) return;
      const W=G.userData.wall, R=G.userData.rect;
      if(W&&R){ const w=ray.intersectObject(W,false)[0];
        if(w&&w.distance<h.distance){ const u=w.uv.x, v=1-w.uv.y;
          if(u<R[0]||u>R[2]||v<R[1]||v>R[3]) return; } }     /* behind the solid part of the wall */
      if(rk<rank||(rk===rank&&(!best||h.distance<best.d))){ rank=rk; best={d:h.distance, egg:E.egg, id:E.id, G, obj:E.obj, glint:E.glint}; } }); }); });
  return best;
};
CORE.disposeSet=function(G){ if(!G) return;
  (G.userData.vids||[]).forEach(v=>{ try{ v.pause(); v.removeAttribute('src'); v.load(); v.remove(); }catch(e){} });
  if(G.parent) G.parent.remove(G); };
/* put a set behind a wall's window. rect = [u0,v0,u1,v1] fractions of the wall image */
CORE.placeSet=function(G, wallMesh, rect, len, wallH){
  const u0=rect[0],v0=rect[1],u1=rect[2],v1=rect[3];
  const W=(u1-u0)*len, s=W/CORE.SET_W;
  wallMesh.updateMatrixWorld(true);
  const p=wallMesh.localToWorld(new THREE.Vector3(((u0+u1)/2-.5)*len, (.5-v1)*wallH, -.02));
  const q=new THREE.Quaternion(); wallMesh.getWorldQuaternion(q);
  G.position.copy(p); G.quaternion.copy(q); G.scale.setScalar(s); G.userData.wall=wallMesh; G.userData.rect=rect;
  return {s, winH:(v1-v0)*wallH/s, sill:(1-v1)*wallH/s};
};
/* a set only ever shows THROUGH its window: the opening writes a stencil mark, the set draws only
   on that mark. Nothing pokes over the wall top or round a corner, whatever its size. */
CORE.stencilSet=function(root, ref){
  root.traverse(o=>{ const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];
    ms.forEach(m=>{ if(m.userData&&m.userData.portal) return; m.stencilWrite=true; m.stencilRef=ref; m.stencilFunc=THREE.EqualStencilFunc;
      m.stencilFail=m.stencilZFail=m.stencilZPass=THREE.KeepStencilOp; m.needsUpdate=true; }); });
};
CORE.mountSet=function(G, winH, ref){
  G.userData.stencil=ref; CORE.stencilSet(G, ref);
  const pm=new THREE.MeshBasicMaterial({colorWrite:false, depthWrite:false, stencilWrite:true, stencilRef:ref,
    stencilFunc:THREE.AlwaysStencilFunc, stencilZPass:THREE.ReplaceStencilOp, side:THREE.DoubleSide});
  pm.userData.portal=true;
  const s=G.scale.x||1, p=new THREE.Mesh(new THREE.PlaneGeometry(CORE.SET_W, winH), pm);
  p.position.set(0, winH/2, .035/s); p.renderOrder=-100; p.userData.portal=true; G.add(p); return p;
};
/* v43 · CUT WINDOWS (Mood Room): the builder makes the walls, so it can cut the opening itself —
   no see-through picture needed. c = {shape:'rect'|'round'|'arch'|'circle', w, h, x, y, frame:'none'|'thin'|'thick', fc}
   in metres: w × h, x = centre offset along the wall, y = sill height above the floor. */
CORE.cutDefaults=function(){ return {shape:'arch', w:4.2, h:2.6, x:0, y:.9, frame:'thin', fc:'#1b1a17'}; };
CORE.cutClamp=function(c, len, wallH){
  c.w=Math.max(.4,Math.min(len-.3,+c.w||1)); c.h=Math.max(.4,Math.min(wallH-.25,+c.h||1));
  const mx=len/2-.15-c.w/2; c.x=Math.max(-mx,Math.min(mx,+c.x||0));
  c.y=Math.max(.05,Math.min(wallH-.1-c.h,+c.y||0)); return c;
};
CORE.cutRect=function(c, len, wallH){
  return [.5+(c.x-c.w/2)/len, (wallH-(c.y+c.h))/wallH, .5+(c.x+c.w/2)/len, (wallH-c.y)/wallH];
};
/* the outline as points, y up, x from the wall centre */
CORE.cutPoly=function(shape, x0, y0, w, h){
  const P=[], N=40, cx=x0+w/2;
  const ell=(ex,ey,rx,ry,a0,a1)=>{ for(let i=0;i<=N;i++){ const a=a0+(a1-a0)*i/N; P.push([ex+Math.cos(a)*rx, ey+Math.sin(a)*ry]); } };
  if(shape==='circle'){ ell(cx,y0+h/2,w/2,h/2,0,Math.PI*2); P.pop(); }
  else if(shape==='arch'){ const ry=Math.min(w/2,h); P.push([x0,y0],[x0+w,y0]); ell(cx,y0+h-ry,w/2,ry,0,Math.PI); }
  else if(shape==='round'){ const r=Math.min(w,h)*.18, q=N/4|0;
    const arc=(ax,ay,a0)=>{ for(let i=0;i<=q;i++){ const a=a0+Math.PI/2*i/q; P.push([ax+Math.cos(a)*r, ay+Math.sin(a)*r]); } };
    arc(x0+w-r,y0+r,-Math.PI/2); arc(x0+w-r,y0+h-r,0); arc(x0+r,y0+h-r,Math.PI/2); arc(x0+r,y0+r,Math.PI); }
  else P.push([x0,y0],[x0+w,y0],[x0+w,y0+h],[x0,y0+h]);
  return P;
};
CORE.cutWindow=function(H, m, c, len, wallH){
  if(!m||!m.material||!c) return null;
  CORE.cutClamp(c,len,wallH);
  /* the hole: an alpha map over the whole wall (white = wall, black = opening) */
  const cw=512, ch=Math.max(64,Math.round(512*wallH/len));
  let cv=m.userData.cutCanvas; if(!cv){ cv=document.createElement('canvas'); m.userData.cutCanvas=cv; }
  cv.width=cw; cv.height=ch; const g=cv.getContext('2d');
  g.fillStyle='#fff'; g.fillRect(0,0,cw,ch); g.fillStyle='#000'; g.beginPath();
  CORE.cutPoly(c.shape, c.x-c.w/2, c.y, c.w, c.h).forEach((p,i)=>{ const X=(p[0]/len+.5)*cw, Y=(1-p[1]/wallH)*ch; i?g.lineTo(X,Y):g.moveTo(X,Y); });
  g.closePath(); g.fill();
  let t=m.userData.cutTex; if(!t){ t=new THREE.CanvasTexture(cv); m.userData.cutTex=t; } t.needsUpdate=true;
  m.material.alphaMap=t; m.material.alphaTest=.5; m.material.needsUpdate=true;
  /* the frame: a moulding round the opening, standing a little proud of the wall */
  const old=m.userData.cutFrame; if(old){ if(old.parent) old.parent.remove(old); old.geometry.dispose(); m.userData.cutFrame=null; }
  const th=c.frame==='thick'?.22:c.frame==='thin'?.08:0;
  if(th>0){
    const toShape=pts=>{ const s=new THREE.Shape(); pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1])); s.closePath(); return s; };
    const outer=toShape(CORE.cutPoly(c.shape, c.x-c.w/2-th, c.y-th, c.w+2*th, c.h+2*th));
    const inner=new THREE.Path(); CORE.cutPoly(c.shape, c.x-c.w/2, c.y, c.w, c.h).slice().reverse().forEach((p,i)=>i?inner.lineTo(p[0],p[1]):inner.moveTo(p[0],p[1]));
    outer.holes.push(inner);
    const geo=new THREE.ExtrudeGeometry(outer,{depth:Math.max(.05,th*.6),bevelEnabled:false,curveSegments:4});
    geo.translate(0,-wallH/2,0);
    const mat=new THREE.MeshStandardMaterial({color:c.fc||'#1b1a17',roughness:.6,metalness:.2});
    const f=new THREE.Mesh(geo,mat); f.userData.cutFrame=true;
    m.updateMatrixWorld(true); f.position.copy(m.position); f.quaternion.copy(m.quaternion);
    (m.parent||H.scene).add(f); m.userData.cutFrame=f;
  }
  CORE.winPane(H, m, c, len, wallH);                                    /* v65: a window can start closed */
  CORE.CUTVER=(CORE.CUTVER||0)+1;                                         /* v66.1: add-ons that follow the walls re-fit round windows */
  return CORE.cutRect(c,len,wallH);
};
/* ---------- v65 · windows that open — like the roof: the wall over the opening fades away ----------
   cut.closed = the window starts closed (fans see plain wall). A trigger "a window · opens" (t:'win:wallN')
   fades the pane away — on tap, on collecting the egg, or when the song plays. Reset puts it back. */
CORE.WINK={}; CORE.WINPANES={};
CORE.winPane=function(H, m, c, len, wallH){
  const key=m.userData.slot||('wall'+(H.walls||[]).indexOf(m)), old=CORE.WINPANES[key];
  if(old&&old.pane){ if(old.pane.parent) old.pane.parent.remove(old.pane); old.pane.geometry.dispose(); old.mat.dispose(); }
  if(!c||!c.closed){ delete CORE.WINPANES[key]; delete CORE.WINK[key]; return null; }
  const pts=CORE.cutPoly(c.shape, c.x-c.w/2, c.y, c.w, c.h), sh=new THREE.Shape();
  pts.forEach((q,i)=>i?sh.lineTo(q[0],q[1]):sh.moveTo(q[0],q[1])); sh.closePath();
  const g=new THREE.ShapeGeometry(sh, 12), pos=g.attributes.position, uv=g.attributes.uv;
  for(let i=0;i<pos.count;i++){ const x=pos.getX(i), y=pos.getY(i); uv.setXY(i, x/len+.5, y/wallH); pos.setXYZ(i, x, y-wallH/2, .002); }
  const mat=new THREE.MeshStandardMaterial({roughness:1, metalness:0, side:THREE.FrontSide});
  const pane=new THREE.Mesh(g, mat); pane.userData.winPane=key;
  pane.onBeforeRender=()=>{ const w=m.material; if(!w) return;            /* the pane wears whatever the wall wears */
    if(mat.map!==w.map||mat.normalMap!==w.normalMap||mat.roughnessMap!==w.roughnessMap||mat.envMap!==w.envMap||mat.emissiveMap!==w.emissiveMap){
      mat.map=w.map||null; mat.normalMap=w.normalMap||null; mat.roughnessMap=w.roughnessMap||null; mat.envMap=w.envMap||null; mat.emissiveMap=w.emissiveMap||null; mat.needsUpdate=true; }
    if(w.color) mat.color.copy(w.color); if(w.normalScale&&mat.normalScale) mat.normalScale.copy(w.normalScale);
    mat.roughness=w.roughness==null?1:w.roughness; mat.metalness=w.metalness||0; mat.envMapIntensity=w.envMapIntensity==null?1:w.envMapIntensity;
    if(w.emissive) mat.emissive.copy(w.emissive); mat.emissiveIntensity=w.emissiveIntensity||0; };
  m.add(pane);
  CORE.WINPANES[key]={pane, mat, m};
  if(CORE.WINK[key]==null) CORE.WINK[key]=0;
  CORE.winK(key, CORE.WINK[key]);
  return pane; };
CORE.winK=function(key, v){ const P=CORE.WINPANES[key]; if(v===undefined) return CORE.WINK[key]==null?1:CORE.WINK[key];
  v=Math.max(0,Math.min(1,v)); CORE.WINK[key]=v; if(!P) return v;
  const op=(1-v)*(CORE.EDIT?.45:1);                                       /* the builder shows a closed window as a faint ghost */
  P.pane.visible=op>.002; P.mat.opacity=op; const tr=op<.999; if(P.mat.transparent!==tr){ P.mat.transparent=tr; P.mat.needsUpdate=true; } P.mat.depthWrite=!tr;
  const f=P.m&&P.m.userData.cutFrame; if(f&&f.material){ const fo=CORE.EDIT?1:v;   /* fans: the frame arrives with the opening — no hint before */
    f.visible=fo>.002; f.material.opacity=fo; const ft=fo<.999; if(f.material.transparent!==ft){ f.material.transparent=ft; f.material.needsUpdate=true; } }
  return v; };
CORE.uncutWindow=function(H, m){
  if(!m) return;
  CORE.CUTVER=(CORE.CUTVER||0)+1;
  { const key=m.userData.slot, P=key&&CORE.WINPANES[key]; if(P){ if(P.pane.parent) P.pane.parent.remove(P.pane); P.pane.geometry.dispose(); P.mat.dispose(); delete CORE.WINPANES[key]; delete CORE.WINK[key]; } }
  if(m.material&&m.material.alphaMap&&m.userData.cutTex===m.material.alphaMap){ m.material.alphaMap=null; m.material.needsUpdate=true; }
  const f=m.userData.cutFrame; if(f){ if(f.parent) f.parent.remove(f); f.geometry.dispose(); m.userData.cutFrame=null; }
};
/* the wall shows its opening: cut-out pixels are dropped */
CORE.windowWall=function(m,on){ if(!m||!m.material) return;
  const want=on?.5:0; if(m.material.alphaTest!==want){ m.material.alphaTest=want; m.material.needsUpdate=true; } };
/* published rooms */
CORE.hydrateWindows=function(bake, H){
  const Wn=bake&&bake.windows, sets=(bake&&bake.sets)||[]; if(!Wn||!H||!H.walls) return;
  const RMh=CORE.room(H), A=bake.assets||{}, cache={};
  const res=id=>{ if(!id||!A[id]) return null; if(cache[id]) return cache[id]; const u=A[id];
    if(/^data:video|\.(mp4|webm|mov)(\?|$)/i.test(u)) return cache[id]={video:u};
    if(/^data:model|\.glb(\?|$)/i.test(u)){ const r={buf:null}; cache[id]=r;
      if(/^data:/.test(u)) r.buf=CORE.b64buf(u); return r; }
    const im=new Image(); im.src=u; return cache[id]={img:im}; };
  const glbs=[];
  sets.forEach(st=>(st.models||[]).forEach(M=>{ const u=A[M.asset]; if(u&&!/^data:/.test(u)&&/\.glb/i.test(u)) glbs.push(M.asset); }));
  const go=()=>{
    CORE.WINSETS=[];
    Object.keys(Wn).forEach(k=>{ const w=Wn[k]; const i=parseInt(k.replace('wall',''),10); const m=H.walls[i];
      if(!w||!w.on||!w.rect||!m) return;
      if(w.cut) CORE.cutWindow(H, m, w.cut, RMh.len(i), RMh.H||H.WALL_H);
      CORE.windowWall(m,true);
      const st=sets.find(x=>x.id===w.set); if(!st) return;
      const place={}; const tmp=new THREE.Group(); H.scene.add(tmp);
      const pl=CORE.placeSet(tmp, m, w.rect, RMh.len(i), RMh.H||H.WALL_H); H.scene.remove(tmp);
      const G=CORE.buildSet(st, res, pl.winH, {sill:pl.sill}); H.scene.add(G); CORE.placeSet(G, m, w.rect, RMh.len(i), RMh.H||H.WALL_H);
      CORE.mountSet(G, pl.winH, i+1);
      const bkm=G.userData.backMesh||G.children[1]; (G.userData.vids||[]).forEach((v,j)=>{ CORE.SURFVID['set:'+k+':'+j]={obj:bkm, video:v}; });
      G.userData.urlOf=id=>A[id]||null; CORE.WINSETS.push(G); });
    if(CORE.WINSETS.some(G=>(G.userData.eggs||[]).length||(sets.some(x=>(x.spots||[]).length||(x.models||[]).some(M=>M.egg&&M.egg.on)))))
      CORE.eggWire(H, CORE.eggHosts);
    /* lit surfaces swap the wall material — keep the opening cut */
    if(!CORE._winHook&&H.onFrame){ CORE._winHook=1; let n=0;
      H.onFrame.push(()=>{ if(n++%20) return; Object.keys(Wn).forEach(k=>{ const w=Wn[k], m=H.walls[parseInt(k.replace('wall',''),10)];
        if(w&&w.on&&w.rect&&m) CORE.windowWall(m,true); }); }); }
  };
  if(!glbs.length) return go();
  Promise.all(glbs.map(id=>fetch(A[id]).then(r=>r.arrayBuffer()).then(b=>{ cache[id]={buf:b}; }).catch(()=>{}))).then(go);
};

/* tap a video tile to open the reel */
CORE.wireTiles=function(HEXREF, tiles){
  const ray=new THREE.Raycaster(), ptr=new THREE.Vector2();
  let dn=null;   /* a look-around drag must not count as a tap */
  HEXREF.canvas.addEventListener('pointerdown',e=>{ dn=[e.clientX,e.clientY]; },true);
  HEXREF.canvas.addEventListener('click',e=>{
    if(dn&&Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>10) return;
    if(CORE.REELOPEN) return;
    const roots=[]; Object.keys(tiles).forEach(k=>tiles[k].forEach(g=>roots.push(g)));
    if(!roots.length) return;
    ptr.x=e.clientX/innerWidth*2-1; ptr.y=-(e.clientY/innerHeight)*2+1;
    ray.setFromCamera(ptr,HEXREF.cam);
    const h=ray.intersectObjects(roots,true)[0]; if(!h) return;
    let o=h.object; while(o&&!o.userData.isTile) o=o.parent;
    if(!o) return;
    /* Tiles are silent, always — the room's own track owns the audio. A tap is
       reserved for the vertical feed (Phase 2); this just announces it. */
    try{
      window.dispatchEvent(new CustomEvent('hex:tile',{detail:{
        kind:o.userData.tile&&o.userData.tile.kind, index:o.userData.tile&&o.userData.tile.i }}));
    }catch(err){}
    if(o.userData.tile&&o.userData.tile.kind==='photo'){
      const a=o.userData.art, im=a&&a.material&&a.material.map&&a.material.map.image;
      if(im&&im.src){                          /* all the room's photos, swipeable, starting on this one */
        const L=(CORE.TILES.photo||[]).map(g=>{ const a2=g.userData.art, m2=a2&&a2.material&&a2.material.map; return (m2&&m2.image&&m2.image.src)?{g:g,src:m2.image.src}:null; }).filter(Boolean);
        const at2=L.findIndex(it=>it.g===o);
        CORE.openReel(Math.max(0,at2), (window.HEXBAKE&&window.HEXBAKE.name&&window.HEXBAKE.name!=='untitled look')?window.HEXBAKE.name:'', L, 'img');
      }
    }
    if(o.userData.tile&&o.userData.tile.kind==='video'){
      const L=CORE.reelList(), at=L.findIndex(it=>it.g===o);
      if(at>=0) CORE.openReel(at, (window.HEXBAKE&&window.HEXBAKE.name&&window.HEXBAKE.name!=='untitled look')?window.HEXBAKE.name:'');
    }
  });
};

/* baked rooms: rebuild every prop from window.HEXBAKE */
CORE.applyUI=function(bake){
  const ui=(bake&&bake.ui)||{};
  CORE.EGGSTYLE=ui.eggStyle||null;
  const hide=(sel,off)=>{ const n=document.querySelector(sel); if(n&&off) n.style.display='none'; };
  if(ui.game===false){
    const gw=document.getElementById('gwall'); if(gw){ gw.style.display='none'; gw.style.visibility='hidden'; }
    if(window.HEX&&window.HEX.hideDock) window.HEX.hideDock();
  }
  if(ui.drive&&window.HEX&&window.HEX.setDrive) window.HEX.setDrive(ui.drive);
  if(ui.timer===false) hide('#timer',true);
  if(ui.rail===false) hide('#rail',true);
  if(ui.chip===false) hide('.chip',true);
  /* the turntable, in a baked room */
  const ob=bake&&bake.orbit;
  if(ob&&window.HEX&&window.HEX.ok){
    const sp=CORE.orbitBoot(window.HEX, function(){ return ob; });
    sp.showButton(ob.button!==false);
    if(ob.auto) setTimeout(function(){ sp.start(); }, ob.delay===undefined?1200:ob.delay);
  }
};
CORE.hydrate=function(bake, scene){
  if(bake) CORE.SKYURL=id=>(bake.assets||{})[id];   /* v60: their own sky picture rides in the bake */
  try{ if(window.HEX) CORE.hostBoot(window.HEX); }catch(e){}     /* inside a Trio page: messages only */
  try{ if(window.HEX&&!CORE.HOSTED&&bake&&bake.ui&&bake.ui.splash===false) CORE.directBoot(window.HEX); }catch(e){}
  try{ if(window.HEX&&bake) CORE.hydrateWindows(bake, window.HEX); }catch(e){ console.warn('windows',e); }
  if(!bake) return {};
  CORE.applyUI(bake);
  /* the room's visualizers. No music plays in a standalone room, so it runs on the
     shared beat; the Trio export will switch this to Trio's now.playing. */
  try{ if(bake.fx&&bake.fx.aurora&&window.HEX) CORE.applyAurora(window.HEX, bake.fx.aurora); }catch(e){}
  if(bake.fx&&window.HEXFX&&window.HEX&&window.HEX.onFrame){
    window.HEXFX.boot(window.HEX); window.HEXFX.apply(Object.assign({},bake.fx,{playing:true}));
    CORE.VIBESTART=bake.fx.start==='off'?0:1; if(window.HEXFX.setK) window.HEXFX.setK(CORE.VIBESTART);   /* v57: off · waits for a trigger */
  }
  if(bake.ui&&bake.ui.walk!==false&&window.HEX&&window.HEX.onFrame) CORE.navBoot(window.HEX);
  if(bake.ui&&bake.ui.walk!==false&&window.HEX&&window.HEX.onFrame) CORE.roomTabs(window.HEX, bake);   /* the tabs + joystick bottom-right */
  const tiles={};
  if(bake.videos){
    Object.keys(bake.videos).forEach(id=>{
      const b=bake.videos[id];
      CORE.applySurfaceVideo(window.HEX, id, b.src, b);
    });
  }
  if(bake.racks){
    Object.keys(bake.racks).forEach(k=>{
      const rack=bake.racks[k];
      const built=CORE.buildRack(rack, window.HEX, scene);
      tiles[k]=built;
      const tas={};
      (rack.tiles||[]).forEach((t,i)=>{
        if(t.asset&&bake.assets&&bake.assets[t.asset]){
          const src=bake.assets[t.asset];
          if(k==='video'){ tas[t.asset]={url:src}; CORE.applyTile(built[i],t,tas,k); }
          else { const im=new Image(); im.onload=()=>CORE.applyTile(built[i],t,tas,k); im.src=src;
                 tas[t.asset]={img:im}; }
        } else if(t.url){ CORE.applyTile(built[i],t,{},k); }
      });
    });
    CORE.TILES=tiles;
    if(window.HEX&&window.HEX.canvas) CORE.wireTiles(window.HEX, tiles);
  }
  if(window.HEX&&window.HEX.onFrame)
    window.HEX.onFrame.push(CORE.videoCuller(window.HEX, CORE.allVideos(tiles)));
  CORE.hydrateLights(bake, scene, window.HEX);
  CORE.hydrateBoards(bake, window.HEX, scene);
  try{ CORE.sigLive(bake, window.HEX); }catch(e){ console.warn('sign wall',e); }   /* v86 */
  try{ if(bake.mood&&window.HEX) CORE.applyMood(window.HEX, bake.mood, bake.mood.tex); }catch(e){ console.warn('mood',e); }
  CORE.SETS=bake.sets||[]; if(CORE.setTrigList().length&&window.HEX) CORE.trigWire(window.HEX, ()=>bake.props||[]);   /* v83: window models can be the only things listening */
  if(!bake.props||!bake.props.length) return {tiles:tiles};
  const assets={}, out={tiles:tiles};
  const pend=[];
  (bake.props||[]).forEach(p=>{
    if(p.asset&&bake.assets&&bake.assets[p.asset]){
      const src=bake.assets[p.asset];
      if(p.type==='image'||p.type==='playme'){ const im=new Image(); im.src=src; assets[p.asset]={img:im};
        pend.push(new Promise(r=>{ im.onload=r; im.onerror=r; })); }
      else if(p.type==='glb'){
        if(/^data:/.test(src)) assets[p.asset]={buf:CORE.b64buf(src)};
        else pend.push(fetch(src).then(r=>r.arrayBuffer()).then(b=>{ assets[p.asset]={buf:b}; }).catch(()=>{}));   /* a folder room: ./media/model.glb */
      }
    }
  });
  Promise.all(pend).then(()=>{
    CORE.ROOMEGGS.userData.urlOf=id=>(bake.assets&&bake.assets[id])||null;
    CORE.SCREENURL=id=>(bake.assets&&bake.assets[id])||null;                 /* v70 */
    CORE.SETS=bake.sets||[];   /* v83 */
    if((bake.props.some(p=>p.trig&&p.trig.on)||CORE.setTrigList().length)&&window.HEX) CORE.trigWire(window.HEX, ()=>bake.props);
    bake.props.forEach(p=>CORE.build(p,assets,scene,g=>{ out[p.id]=g;
      if(p.type==='playme'&&window.HEX){ CORE.PLAYMES.push({p:p,g:g}); CORE.playmeWire(window.HEX); }
      if(p.egg&&p.egg.on&&window.HEX){ CORE.propEgg(p,g,scene,window.HEX); CORE.eggWire(window.HEX, CORE.eggHosts); } }));
  });
  return out;
};
CORE.b64buf=function(dataUrl){
  try{ const b=atob(String(dataUrl).split(',')[1]||''); const u=new Uint8Array(b.length);
    for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u.buffer; }catch(e){ return null; }
};

/* ---------- ?diag=1 — a readout you can photograph off a TV ----------
   No devtools on a television, so the room reports on itself: framerate,
   scene cost, which GPU the set is using, whether audio and video actually
   decoded, and what input it can see. Ships in baked rooms too. */
CORE.diagBoot=function(H){
  if(CORE.DIAG) return;
  CORE.DIAG=true;
  const box=document.createElement('div'); box.id='hexDiag';
  document.body.appendChild(box);

  let gpu='—', glv='—';
  try{
    const gl=H.renderer.getContext();
    glv=(typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext)?'WebGL2':'WebGL1';
    const dbg=gl.getExtension('WEBGL_debug_renderer_info');
    gpu=dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  }catch(e){}

  let frames=0,t0=performance.now(),fps=0,low=999,n=0;
  const row=(k,v,cls)=>'<div class="r"><span>'+k+'</span><b class="'+(cls||'')+'">'+v+'</b></div>';

  H.onFrame.push(function(){
    frames++;
    const now=performance.now();
    if(now-t0>500){ fps=frames*1000/(now-t0); frames=0; t0=now;
      if(fps<low&&now>4000) low=fps; }
    if((n++%30)!==0) return;

    const info=H.renderer.info;
    const a=H.audioEl;
    const vids=[].slice.call(document.querySelectorAll('video'));
    let vplay=0, vdim='—';
    vids.forEach(function(v){ if(!v.paused) vplay++;
      if(v.videoWidth&&vdim==='—') vdim=v.videoWidth+'×'+v.videoHeight; });
    let pad='none';
    try{ const gs=navigator.getGamepads?navigator.getGamepads():[];
      for(let i=0;i<gs.length;i++) if(gs[i]&&gs[i].connected){ pad=gs[i].id.slice(0,34); break; } }catch(e){}

    const fcls=fps<24?'bad':(fps<45?'warn':'ok');
    box.innerHTML=
      '<h3>TRIO · ROOM DIAGNOSTIC</h3>'+
      row('Frames per second', Math.round(fps)+(low<999?('  (low '+Math.round(low)+')'):''), fcls)+
      row('Draw calls', info.render.calls)+
      row('Triangles', Math.round(info.render.triangles/1000)+'k')+
      row('Textures', info.memory.textures)+
      row('Graphics', String(gpu).slice(0,46))+
      row('Context', glv)+
      row('Screen', innerWidth+'×'+innerHeight+' @'+(devicePixelRatio||1)+'x')+
      row('Audio', a?((a.readyState>=2?'decoded':'NOT decoded')+' · '+
          (a.paused?'paused':'playing')+' · '+Math.round(a.currentTime||0)+'s'):'none',
          (a&&a.readyState>=2)?'ok':'bad')+
      row('Video', vids.length?(vplay+'/'+vids.length+' playing · '+vdim):'none on this wall',
          (vids.length&&vdim!=='—')?'ok':(vids.length?'bad':''))+
      row('Controller', pad, pad==='none'?'':'ok')+
      '<div class="ua">'+String(navigator.userAgent).slice(0,110)+'</div>';
  });
};

/* boot it as soon as the room exists */
(function(){
  try{
    if(location.search.indexOf('diag=1')<0) return;
    let tries=0;
    const iv=setInterval(function(){
      if(window.HEX&&window.HEX.ok&&window.HEX.onFrame){ clearInterval(iv); CORE.diagBoot(window.HEX); }
      else if(++tries>60) clearInterval(iv);
    },150);
  }catch(e){}
})();


/* baked rooms build their own boards and keep them fed */
/* ================= v86 · SIGN THE WALL — live =================
   The room draws the wall: a solid title ("SIGN THE WALL", the builder can change the words and colour) with a small line
   under it, and the signatures the page sends ({trio:'signatures', rows:[{id,name,line,pen,strokes:[[x,y,x,y…]…]}]}).
   A tap on the wall asks the page to open its signing pad ({trio:'open', board:'sign'}); a tap on a signature shows it big.
   The room never saves or moderates anything — the Trio page does, and sends only approved signatures. */
CORE.SIGDEF={plate:true, title:'SIGN THE WALL', sub:true, color:'#f2efe6'};
CORE.sigStrokes=function(g,S,x,y,w,h,look,pen){
  const lw=Math.max(1.5,w*.02);
  const path=pts=>{ g.beginPath(); for(let i=0;i<pts.length;i+=2){ const X=x+pts[i]*w, Y=y+pts[i+1]*h;
      if(!i) g.moveTo(X,Y); else if(i+2<pts.length){ const nx=x+(pts[i]+pts[i+2])/2*w, ny=y+(pts[i+1]+pts[i+3])/2*h; g.quadraticCurveTo(X,Y,nx,ny); } else g.lineTo(X,Y); }
    if(pts.length===2) g.lineTo(x+pts[0]*w+.5,y+pts[1]*h+.5); g.stroke(); };
  g.lineCap='round'; g.lineJoin='round';
  (S.strokes||[]).forEach(pts=>{
    if(look==='carved'){
      g.strokeStyle='rgba(255,255,255,.22)'; g.lineWidth=lw*1.15; g.save(); g.translate(0,lw*.45); path(pts); g.restore();
      g.strokeStyle='rgba(0,0,0,.78)'; g.lineWidth=lw; path(pts);
      g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=lw*.45; g.save(); g.translate(0,-lw*.25); path(pts); g.restore();
    } else if(look==='chalk'){
      g.strokeStyle=pen; g.globalAlpha=.32;
      for(let k=0;k<4;k++){ g.lineWidth=lw*(.7+k*.18); g.save(); g.translate((k-1.5)*lw*.18,(k%2-.5)*lw*.22); path(pts); g.restore(); }
      g.globalAlpha=1;
    } else if(look==='paint'){
      g.strokeStyle=pen; g.lineWidth=lw*1.1; path(pts);
      g.strokeStyle='rgba(255,255,255,.35)'; g.lineWidth=lw*.3; g.save(); g.translate(-lw*.18,-lw*.18); path(pts); g.restore();
    } else { g.strokeStyle=pen; g.globalAlpha=.92; g.lineWidth=lw; path(pts); g.globalAlpha=1; }
  }); };
const sigRand=seed=>{ let s=0; seed=String(seed||''); for(let i=0;i<seed.length;i++) s=(s*31+seed.charCodeAt(i))>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; };
/* the wall's picture: the title on top (when on), signatures below in a loose grid → {canvas, rects} */
CORE.sigCanvas=function(cfg, sigs, len, Hh){
  const C=Object.assign({},CORE.SIGDEF,cfg||{}), cw=2048, ch=Math.max(64,Math.round(2048*Hh/len)), cv=document.createElement('canvas'); cv.width=cw; cv.height=ch;
  const g=cv.getContext('2d'), n=(sigs||[]).length, rects=[], plate=C.plate!==false&&String(C.title||'').trim();
  if(plate){ const ph=Math.min(ch*.14,cw*.06), py=ch*.17; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle=C.color||'#f2efe6';
    g.font='400 '+Math.round(ph*.78)+'px "Bebas Neue",Anton,Impact,"Arial Narrow",sans-serif'; g.fillText(String(C.title).toUpperCase().slice(0,28),cw/2,py);
    if(C.sub!==false){ g.globalAlpha=.7; g.font='600 '+Math.round(ph*.2)+'px "IBM Plex Mono",ui-monospace,monospace'; g.fillText('TAP THE WALL TO LEAVE YOUR NAME',cw/2,py+ph*.7); g.globalAlpha=1; } }
  if(n){
    const ax=cw*.06, ay=plate?ch*.32:ch*.14, aw=cw*.88, ah=plate?ch*.5:ch*.62;
    const cols=Math.max(1,Math.ceil(Math.sqrt(n*(aw/ah)/2))), rows=Math.ceil(n/cols);
    const cellW=Math.min(aw/cols, cw*.4), cellH=Math.min(ah/rows, cellW/2*1.25);
    const gw=cellW*cols, gh=cellH*rows, ox=ax+(aw-gw)/2, oy=ay+(ah-gh)/2;
    const order=[...Array(cols*rows).keys()], R=sigRand('wall'+n); for(let i=order.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
    sigs.forEach((S,i)=>{
      const r=sigRand(S.id), cell=order[i], cx=ox+(cell%cols+.5)*cellW+(r()-.5)*cellW*.18, cy=oy+(Math.floor(cell/cols)+.5)*cellH+(r()-.5)*cellH*.2;
      const w=cellW*(.78+r()*.14), h=w/2, rot=(r()-.5)*.24;
      g.save(); g.translate(cx,cy); g.rotate(rot);
      CORE.sigStrokes(g,S,-w/2,-h/2,w,h,C.look,S.pen||'#141414');
      if(S.name){ g.font='italic 600 '+Math.round(h*.13)+'px "Segoe Script","Bradley Hand","Comic Sans MS",cursive';
        g.fillStyle=C.look==='carved'?'rgba(0,0,0,.6)':(S.pen||'#141414'); g.globalAlpha=C.look==='chalk'?.55:.8; g.textAlign='right';
        g.fillText('— '+S.name, w/2, h/2+h*.05); g.globalAlpha=1; }
      g.restore();
      rects.push({id:S.id, u0:(cx-w/2)/cw, u1:(cx+w/2)/cw, v0:(cy-h/2)/ch, v1:(cy+h/2+h*.12)/ch}); });
  }
  return {canvas:cv, rects}; };
/* lay the picture on its wall (builder and published alike) */
CORE.sigWallMesh=function(H, cfg, sigs){ const RMr=H.ROOM||CORE.room(H), wall=H.walls&&H.walls[cfg.wall]; if(!wall) return null;
  const len=RMr.len(cfg.wall), Hh=RMr.H||H.WALL_H, P=CORE.sigCanvas(cfg,sigs,len,Hh);
  const t=new THREE.CanvasTexture(P.canvas); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4;
  const mat=new THREE.MeshStandardMaterial({map:t,transparent:true,roughness:.9,depthWrite:false,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.35});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(len,Hh),mat); m.userData.sigWall=true; m.userData.rects=P.rects; m.renderOrder=3;
  wall.updateMatrixWorld(true); m.position.copy(wall.position).add(RMr.normal(cfg.wall).multiplyScalar(.03)); m.quaternion.copy(wall.quaternion);
  return m; };
/* published: draw it, take the page's signatures, open the pad on a tap */
CORE.sigLive=function(bake, H){ const cfg=bake&&bake.sigwall; if(!cfg||!cfg.on||!H||!H.scene) return; const SW=CORE.SIGW={cfg, sigs:CORE.SIGROWS||[], mesh:null};
  const draw=()=>{ if(SW.mesh){ H.scene.remove(SW.mesh); SW.mesh.material.map.dispose(); SW.mesh.material.dispose(); } SW.mesh=CORE.sigWallMesh(H,cfg,SW.sigs); if(SW.mesh) H.scene.add(SW.mesh); };
  SW.draw=draw; draw(); try{ if(document.fonts&&document.fonts.ready) document.fonts.ready.then(draw); }catch(e){}
  CORE.SIGFEED=rows=>{ SW.sigs=rows; draw(); };
  if(!H.canvas) return; const ray=new THREE.Raycaster(), v=new THREE.Vector2(); let dn=null;
  H.canvas.addEventListener('pointerdown',e=>{ dn=[e.clientX,e.clientY]; },true);
  H.canvas.addEventListener('click',e=>{ if(CORE.EDIT||!SW.mesh) return; if(dn&&Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>10) return; if(CORE.EGGOPEN||CORE.REELOPEN) return;
    v.x=e.clientX/innerWidth*2-1; v.y=-(e.clientY/innerHeight)*2+1; ray.setFromCamera(v,H.cam); const h=ray.intersectObject(SW.mesh,false)[0]; if(!h||!h.uv||h.distance>30) return;
    const u=h.uv.x, w=1-h.uv.y, r=(SW.mesh.userData.rects||[]).find(q=>u>=q.u0&&u<=q.u1&&w>=q.v0&&w<=q.v1), S=r&&SW.sigs.find(x=>x.id===r.id);
    if(S){ CORE.sigCard(S,cfg); return; }
    if(!CORE.post({trio:'open', board:'sign'})) CORE.toast&&CORE.toast('the signing pad opens here inside the Trio page'); }); };
CORE.sigCard=function(S,cfg){ let o=document.getElementById('hexSigCard'); if(o) o.remove();
  o=document.createElement('div'); o.id='hexSigCard'; o.style.cssText='position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(5,5,6,.72);backdrop-filter:blur(6px);font-family:"IBM Plex Sans",Helvetica,Arial,sans-serif;color:#ece9df';
  const box=document.createElement('div'); box.style.cssText='width:min(560px,92vw);background:#121214;border:1px solid rgba(235,232,220,.16);border-radius:18px;padding:18px;display:grid;gap:12px';
  const cv=document.createElement('canvas'); cv.width=1040; cv.height=520; cv.style.cssText='width:100%;border-radius:12px;background:#4a4842'; box.appendChild(cv);
  const row=document.createElement('div'); row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:10px';
  const tx=document.createElement('div'), nm=document.createElement('b'), ln=document.createElement('div'); nm.style.cssText='font:400 24px "Bebas Neue",Impact,sans-serif;letter-spacing:.06em'; ln.style.cssText='color:#9b978b;font-size:14px;margin-top:2px';
  nm.textContent=S.name||'a fan'; ln.textContent=S.line||''; tx.appendChild(nm); tx.appendChild(ln); row.appendChild(tx);
  const cl=document.createElement('button'); cl.textContent='close'; cl.style.cssText='font:600 10px "IBM Plex Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:#ece9df;background:none;border:1px solid rgba(235,232,220,.3);border-radius:999px;padding:8px 14px;cursor:pointer';
  row.appendChild(cl); box.appendChild(row); o.appendChild(box); document.body.appendChild(o);
  CORE.sigStrokes(cv.getContext('2d'),S,60,40,920,440,(cfg&&cfg.look)||'marker',S.pen||'#141414');
  cl.onclick=()=>o.remove(); o.onclick=e=>{ if(e.target===o) o.remove(); }; };
/* the page's signatures, cleaned: names and lines are text only, pens are colours, strokes are numbers 0–1 */
CORE.sigClean=function(rows){ const hex=/^#[0-9a-f]{6}$/i; return (rows||[]).slice(0,60).map((r,i)=>{ r=r||{};
  const st=(Array.isArray(r.strokes)?r.strokes:[]).slice(0,40).map(a=>(Array.isArray(a)?a:[]).slice(0,600).map(x=>Math.max(0,Math.min(1,+x||0)))).filter(a=>a.length>=2);
  return {id:String(r.id==null?('s'+i):r.id).slice(0,40), name:String(r.name==null?'':r.name).slice(0,18), line:String(r.line==null?'':r.line).slice(0,60), pen:hex.test(r.pen||'')?r.pen:'#141414', strokes:st}; }).filter(r=>r.strokes.length); };
CORE.hydrateBoards=function(bake, H, scene){
  const B=bake&&bake.boards; if(!B||!B.game) return;
  CORE.BTHEME=CORE.boardTheme(B.theme);
  let rows=[], lines=[], over=false, art=null, chat=[], count=undefined, chatOpts={};
  const paint=function(){
    const gb=CORE.boardByKind('game');
    if(gb&&!gb.free){ CORE.drawGameBoard(gb.canvas, B.game, art, paint); gb.tex.needsUpdate=true; }
    const lb=CORE.boardByKind('leader');
    if(lb){ CORE.drawLeaderBoard(lb.canvas, rows, lines, over); lb.tex.needsUpdate=true; }
    const cb=CORE.boardByKind('chat');
    if(cb){ CORE.drawChatBoard(cb.canvas, chat, {count:(B.chat&&B.chat.style==='fan')?chatOpts.count:count, title:(B.chat&&B.chat.title), top:!!chatOpts.top, fan:!!(B.chat&&B.chat.style==='fan')});
      cb.tex.needsUpdate=true; }
  };
  /* Anton and Manrope may land after first paint; redraw when they do */
  try{ if(document.fonts&&document.fonts.ready) document.fonts.ready.then(paint); }catch(e){}
  if(B.game.on!==false&&B.game.place==='free'){
    const ss=(B.game.screen&&bake.assets)?bake.assets[B.game.screen]:null; let im=null;
    if(ss&&(B.game.screenKind==='video'||/^data:video|\.(mp4|webm|mov)(\?|$)/i.test(ss))) im={video:ss};
    else if(ss){ im=new Image(); im.src=ss; }
    CORE.buildFreeScreen(B.game, H, scene, im);
  } else if(B.game.on!==false) CORE.buildWallBoard('game', B.game.wall, H, scene,
    {w:B.game.size||5.4, y:B.game.y||3.42});
  if(B.leader&&B.leader.on!==false) CORE.buildWallBoard('leader', B.leader.wall, H, scene,
    {w:B.leader.size||5.4, y:B.leader.y||1.39});
  if(B.chat&&B.chat.on) CORE.buildWallBoard('chat', B.chat.wall, H, scene,
    {w:B.chat.size||6.4, y:B.chat.y||2.35});
  CORE.wireBoards(H, function(){ return B.game; });
  H.onBoard=function(r,o){ rows=r||[]; over=!!o; paint(); };
  H.onLine =function(l){ lines=l||[]; paint(); };
  H.onChat =function(l,n,o){ chat=l||[]; if(n!==undefined) count=n; chatOpts=o||{}; if(chatOpts.top) count=undefined; paint(); };
  const src=(B.game.art&&bake.assets)?bake.assets[B.game.art]:null;
  if(src){ const im=new Image(); im.onload=paint; im.src=src; art=im; }

  /* the key art on the marquee wall, unless Adam staged something there */
  if(B.game.on!==false && B.game.wallArt!==false && B.game.place!=='free' && !(bake.surfaces&&bake.surfaces['wall'+B.game.wall])){
    CORE.installKeyArtDefault(H,'wall'+B.game.wall,{onready:function(){
      const m=CORE.meshForSlot(H,'wall'+B.game.wall);
      if(m){ m.material.map=H.defaultMap('wall'+B.game.wall); m.material.needsUpdate=true; }
    }});
    const m0=CORE.meshForSlot(H,'wall'+B.game.wall);
    if(m0){ m0.material.map=H.defaultMap('wall'+B.game.wall); m0.material.needsUpdate=true; }
  }

  /* a baked room can carry the demo crowd, for a room shown before it is real */
  if(B.sim&&!CORE.HOSTED){                  /* inside a Trio page the rows are real — never the demo crowd */
    const sim=CORE.liveSim({artist:B.sim.artist,
      onBoard:function(r,o){ rows=r; over=o; paint(); },
      onChat :function(l,n){ chat=l; count=n; paint(); },
      onLine :function(l){ lines=l; paint(); }});
    CORE.SIM=sim; sim.start();
  }
  paint();
};


/* ---------- wall numbers, editor only ----------
   "which wall do you mean" has cost us a round trip more than once. */
CORE.WALLTAGS=[];
CORE.wallTags=function(H, scene, roles){
  CORE.clearWallTags(scene);
  const RMT=CORE.room(H);
  for(let i=0;i<RMT.n;i++){
    const c=document.createElement('canvas'); c.width=512; c.height=192;
    const g=c.getContext('2d');
    g.fillStyle='rgba(7,6,13,.85)';
    if(g.roundRect){ g.beginPath(); g.roundRect(6,6,500,180,26); g.fill(); }
    else g.fillRect(6,6,500,180);
    g.strokeStyle='rgba(251,191,36,.75)'; g.lineWidth=5;
    if(g.roundRect){ g.beginPath(); g.roundRect(6,6,500,180,26); g.stroke(); }
    g.textAlign='center';
    g.fillStyle='#fbbf24'; g.font='800 86px Manrope,sans-serif';
    g.fillText('WALL '+i, 256, 92);
    g.fillStyle='#8f87b8'; g.font='700 30px Manrope,sans-serif';
    g.fillText(((roles&&roles[i])||'open').toUpperCase(), 256, 142);
    const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.98),
      new THREE.MeshBasicMaterial({map:tex,transparent:true,depthTest:false}));
    m.renderOrder=999;
    /* low on the wall — the boards now reach near the top of wall 3 */
    const nt=RMT.normal(i);
    m.position.copy(RMT.wallPoint(i, 0, 0.62, 0.2));
    m.lookAt(m.position.x+nt.x, m.position.y, m.position.z+nt.z);
    m.userData.isWallTag=true;
    scene.add(m); CORE.WALLTAGS.push(m);
  }
  return CORE.WALLTAGS;
};
CORE.clearWallTags=function(scene){
  CORE.WALLTAGS.forEach(function(m){ scene.remove(m); });
  CORE.WALLTAGS=[];
};
CORE.showWallTags=function(on){
  CORE.WALLTAGS.forEach(function(m){ m.visible=!!on; });
};

})();

/* ---------- v54 · RECORD 360 ----------
   Open any room with ?record in the link. A small pill (bottom right) lets you pick HD / 4K and a length,
   then turns the camera one full circle from where you stand and saves the room's own pictures straight
   into an MP4 — frame by frame on a clock of its own, so it's smooth however heavy the room is.
   The pill is never in the video. Fans never see it (no ?record, no pill). Nothing is sent anywhere. */
(function(){
const CORE=window.HEXCORE; if(!CORE) return;
/* a tiny MP4 writer: one video track, all samples in one chunk, moov at the end */
CORE.mp4Mux=function(o){   /* o={codec:'avc'|'vp9', desc:Uint8Array|null, w, h, fps, chunks:[{data:Uint8Array,key:bool}]} */
  const u32=n=>[n>>>24&255,n>>>16&255,n>>>8&255,n&255], u16=n=>[n>>8&255,n&255], s4=s=>[...s].map(c=>c.charCodeAt(0));
  const box=(t,...parts)=>{ const body=[]; parts.forEach(p=>{ if(p instanceof Uint8Array) body.push(...p); else body.push(...p); });
    return Uint8Array.from([...u32(8+body.length),...s4(t),...body]); };
  const full=(t,v,f,...parts)=>box(t,[v,f>>16&255,f>>8&255,f&255],...parts);
  const n=o.chunks.length, ts=o.fps*1000, dur=n*1000, durMs=Math.round(n*1000/o.fps);
  const matrix=[...u32(0x10000),...u32(0),...u32(0),...u32(0),...u32(0x10000),...u32(0),...u32(0),...u32(0),...u32(0x40000000)];
  const ftyp=box('ftyp',s4('isom'),u32(512),s4('isom'),s4('iso2'),s4(o.codec==='avc'?'avc1':'vp09'),s4('mp41'));
  let mdatLen=0; o.chunks.forEach(c=>mdatLen+=c.data.length);
  const mdatHead=Uint8Array.from([...u32(8+mdatLen),...s4('mdat')]);
  const dataStart=ftyp.length+8;
  const cfg=o.codec==='avc'?box('avcC',o.desc):full('vpcC',1,0,[0,40,(8<<4)|(1<<1)|0,1,1,1,0,0]);
  const entry=box(o.codec==='avc'?'avc1':'vp09',[0,0,0,0,0,0],u16(1),u16(0),u16(0),u32(0),u32(0),u32(0),u16(o.w),u16(o.h),
    u32(0x480000),u32(0x480000),u32(0),u16(1),new Array(32).fill(0),u16(0x18),u16(0xffff),cfg);
  const keys=[]; o.chunks.forEach((c,i)=>{ if(c.key) keys.push(...u32(i+1)); });
  const sizes=[]; o.chunks.forEach(c=>sizes.push(...u32(c.data.length)));
  const stbl=box('stbl', full('stsd',0,0,u32(1),entry), full('stts',0,0,u32(1),u32(n),u32(1000)),
    full('stss',0,0,u32(keys.length/4),keys), full('stsz',0,0,u32(0),u32(n),sizes),
    full('stsc',0,0,u32(1),u32(1),u32(n),u32(1)), full('stco',0,0,u32(1),u32(dataStart)));
  const minf=box('minf', full('vmhd',0,1,u16(0),u16(0),u16(0),u16(0)), box('dinf',full('dref',0,0,u32(1),full('url ',0,1))), stbl);
  const mdia=box('mdia', full('mdhd',0,0,u32(0),u32(0),u32(ts),u32(dur),u16(0x55c4),u16(0)),
    full('hdlr',0,0,u32(0),s4('vide'),u32(0),u32(0),u32(0),s4('Trio room 360'),[0]), minf);
  const tkhd=full('tkhd',0,3,u32(0),u32(0),u32(1),u32(0),u32(durMs),u32(0),u32(0),u16(0),u16(0),u16(0),u16(0),matrix,u32(o.w<<16),u32(o.h<<16));
  const mvhd=full('mvhd',0,0,u32(0),u32(0),u32(1000),u32(durMs),u32(0x10000),u16(0x100),u16(0),u32(0),u32(0),matrix,new Array(24).fill(0),u32(2));
  const moov=box('moov', mvhd, box('trak', tkhd, mdia));
  return new Blob([ftyp, mdatHead, ...o.chunks.map(c=>c.data), moov], {type:'video/mp4'});
};
const SIZES={hd:[1920,1080], '4k':[3840,2160]};
async function pickCodec(w,h,fps){
  const br=w>2000?60e6:20e6;
  const tries=[['avc','avc1.640033'],['avc','avc1.64002A'],['avc','avc1.640028'],['vp9','vp09.00.40.08'],['vp9','vp09.00.51.08']];
  for(const [k,c] of tries){ const cfg={codec:c,width:w,height:h,bitrate:br,framerate:fps,latencyMode:'quality'}; if(k==='avc') cfg.avc={format:'avc'};
    try{ const r=await VideoEncoder.isConfigSupported(cfg); if(r&&r.supported) return {kind:k,cfg}; }catch(e){} }
  return null;
}
CORE.REC=null;
/* record(opts): {size:'hd'|'4k', secs, fps, onProgress(f)} → resolves to a Blob */
CORE.record360=async function(opts){
  const H=window.HEX; if(!H||!H.renderer) throw new Error('room not ready');
  if(!window.VideoEncoder||!window.VideoFrame) throw new Error('this browser can’t record — use Chrome');
  if(CORE.REC) throw new Error('already recording');
  const [W,Hh]=SIZES[opts.size]||SIZES.hd, fps=opts.fps||60, N=Math.round((opts.secs||20)*fps);
  const pick=await pickCodec(W,Hh,fps); if(!pick) throw new Error('this browser can’t encode video at that size');
  const R=H.renderer, cv=R.domElement, cam=H.cam;
  /* hold the room still and on our clock */
  if(CORE.EGGOPEN&&CORE.closeEgg) try{ CORE.closeEgg({quiet:true}); }catch(e){}
  const save={pr:R.getPixelRatio(), size:R.getSize(new THREE.Vector2()), aspect:cam.aspect, setYaw:H.setYaw, addYaw:H.addYaw,
    now:performance.now, dnow:Date.now, raf:window.requestAnimationFrame, caf:window.cancelAnimationFrame};
  const realRaf=save.raf.bind(window), realNow=save.now.bind(performance);
  let VT=realNow(); const dnow0=Date.now()-VT;
  let Q=[], qid=0; CORE.REC={cancel:false};
  window.requestAnimationFrame=cb=>{ Q.push([++qid,cb]); return qid; };
  window.cancelAnimationFrame=id=>{ Q=Q.filter(x=>x[0]!==id); };
  performance.now=()=>VT; Date.now=()=>Math.round(dnow0+VT);
  const yaw0=H.getYaw?H.getYaw():0;
  H.setYaw=()=>{}; H.addYaw=()=>{};
  await new Promise(r=>realRaf(()=>realRaf(r)));            /* the room's own frame loop moves onto our clock */
  R.setPixelRatio(1); R.setSize(W,Hh,false); cam.aspect=W/Hh; cam.updateProjectionMatrix();
  /* videos in the room follow the clock too */
  const vids=[...document.querySelectorAll('video')].filter(v=>v.readyState>=2&&v.duration>0);
  const vstate=vids.map(v=>({v, playing:!v.paused, t0:v.currentTime})); vids.forEach(v=>{ try{ v.pause(); }catch(e){} });
  const vtex=[]; H.scene.traverse(o=>{ const m=o.material; (Array.isArray(m)?m:[m]).forEach(mm=>{ if(mm&&mm.map&&mm.map.isVideoTexture) vtex.push(mm.map); if(mm&&mm.emissiveMap&&mm.emissiveMap.isVideoTexture) vtex.push(mm.emissiveMap); }); });
  const seekAll=t=>Promise.all(vstate.map(s=>new Promise(res=>{ const v=s.v, to=(s.t0+t)%v.duration;
    if(Math.abs(v.currentTime-to)<.001) return res(); let done=false; const fin=()=>{ if(done) return; done=true; v.removeEventListener('seeked',fin); res(); };
    v.addEventListener('seeked',fin); setTimeout(fin,400); try{ v.currentTime=to; }catch(e){ fin(); } })));
  const chunks=[]; let desc=null, err=null;
  const enc=new VideoEncoder({ output:(ch,meta)=>{ const d=new Uint8Array(ch.byteLength); ch.copyTo(d); chunks.push({data:d,key:ch.type==='key'});
      if(meta&&meta.decoderConfig&&meta.decoderConfig.description&&!desc) { const d=meta.decoderConfig.description; desc=ArrayBuffer.isView(d)?new Uint8Array(d.buffer,d.byteOffset,d.byteLength).slice():new Uint8Array(d).slice(); } },
    error:e=>{ err=e; } });
  enc.configure(pick.cfg);
  const restore=()=>{
    performance.now=save.now; Date.now=save.dnow; window.requestAnimationFrame=save.raf; window.cancelAnimationFrame=save.caf;
    H.setYaw=save.setYaw; H.addYaw=save.addYaw; save.setYaw(yaw0);
    R.setPixelRatio(save.pr); R.setSize(save.size.x,save.size.y,false); cam.aspect=save.aspect; cam.updateProjectionMatrix();
    const q=Q; Q=[]; q.forEach(x=>realRaf(x[1]));
    vstate.forEach(s=>{ if(s.playing) try{ s.v.play().catch(()=>{}); }catch(e){} });
    CORE.REC=null; };
  try{
    for(let i=0;i<N;i++){
      if(CORE.REC.cancel) throw new Error('cancelled');
      if(err) throw err;
      VT+=1000/fps;
      save.setYaw(yaw0+Math.PI*2*i/N);                       /* one even turn: the clip loops cleanly */
      if(vstate.length){ await seekAll(i/fps); vtex.forEach(t=>t.needsUpdate=true); }
      const q=Q; Q=[]; q.forEach(x=>{ try{ x[1](VT); }catch(e){} });
      if(window.HEXSLEEP){ if(H.post) H.post(); else R.render(H.scene,cam); }
      const vf=new VideoFrame(cv,{timestamp:Math.round(i*1e6/fps), duration:Math.round(1e6/fps)});
      enc.encode(vf,{keyFrame:i%(fps*2)===0}); vf.close();
      while(enc.encodeQueueSize>3) await new Promise(r=>setTimeout(r,5));
      if(opts.onProgress&&(i%5===0)) opts.onProgress(i/N);
      await new Promise(r=>setTimeout(r,0));
    }
    await enc.flush(); enc.close();
    if(err) throw err;
    if(pick.kind==='avc'&&!desc) throw new Error('the encoder gave no stream header');
    return CORE.mp4Mux({codec:pick.kind, desc, w:W, h:Hh, fps, chunks});
  } finally { try{ if(enc.state!=='closed') enc.close(); }catch(e){} restore(); }
};
/* the pill */
CORE.recUI=function(){
  if(document.getElementById('hexRec')) return;
  const css=document.createElement('style'); css.textContent=
    '#hexRec{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;gap:6px;align-items:center;background:rgba(8,8,8,.9);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:6px;font:600 11px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#f4f1e8;user-select:none}'+
    '#hexRec button{font:inherit;letter-spacing:inherit;text-transform:inherit;color:#a8a395;background:none;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:7px 10px;cursor:pointer}'+
    '#hexRec button.on{color:#0b0b0c;background:#f4f1e8;border-color:#f4f1e8}'+
    '#hexRec button.go{background:#e5322d;border-color:#e5322d;color:#fff;padding:8px 14px}#hexRec button.go:before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#fff;margin-right:7px;vertical-align:0}'+
    '#hexRec .msg{padding:0 8px;color:#f4f1e8}#hexRec .x{color:#a8a395}'+
    '#hexRec button.go2{border-color:#e5322d;color:#fff}#hexRec button.go2:before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#fff;margin-right:7px;vertical-align:0}'+
    '#hexRec .sep{width:1px;height:22px;background:rgba(255,255,255,.18);margin:0 4px}'+
    /* v56 · free recording: the arrow becomes a soft glowing ring, a click sends out a ripple */
    'html.hexrecing,html.hexrecing *{cursor:none!important}'+
    '#hexRing{position:fixed;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:2px solid rgba(255,246,200,.95);box-shadow:0 0 12px 3px rgba(255,236,170,.55),inset 0 0 8px rgba(255,236,170,.4);pointer-events:none;z-index:2147483646;transition:transform .08s}'+
    '#hexRing.dn{transform:scale(.8)}'+
    '.hexRip{position:fixed;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:2px solid rgba(255,236,170,.9);box-shadow:0 0 18px rgba(255,236,170,.6);pointer-events:none;z-index:2147483645;animation:hexRip .7s ease-out forwards}'+
    '@keyframes hexRip{to{transform:scale(6);opacity:0}}'+
    '#hexRecMsg{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;background:rgba(8,8,8,.92);border:1px solid rgba(229,50,45,.6);border-radius:16px;padding:18px 24px;font:600 13px "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#f4f1e8;text-align:center;pointer-events:none}'+
    '#hexRecMsg b{display:block;font-size:40px;margin-top:8px;color:#e5322d}';
  document.head.appendChild(css);
  const P=document.createElement('div'); P.id='hexRec'; document.body.appendChild(P);
  addEventListener('pointermove',e=>{ CORE._lastPtr={clientX:e.clientX,clientY:e.clientY}; },true);
  const st={size:'hd', secs:20};
  const draw=()=>{ P.innerHTML='';
    const b=(t,on,fn,cls)=>{ const e=document.createElement('button'); e.textContent=t; if(on) e.classList.add('on'); if(cls) e.classList.add(cls); e.onclick=ev=>{ ev.stopPropagation(); fn(); }; P.appendChild(e); return e; };
    b('HD',st.size==='hd',()=>{ st.size='hd'; draw(); }); b('4K',st.size==='4k',()=>{ st.size='4k'; draw(); });
    [10,20,30].forEach(s=>b(s+' s',st.secs===s,()=>{ st.secs=s; draw(); }));
    b('record 360',false,go,'go');
    if(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia&&window.MediaRecorder){ const sp=document.createElement('span'); sp.className='sep'; P.appendChild(sp); b('record',false,free,'go2'); } };
  /* v56 · free recording: everything on the tab, as you play, in bursts. Esc stops. */
  let clipN=0;
  async function free(){
    let stream;
    try{ stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:60}, displaySurface:'browser'}, audio:true,
        preferCurrentTab:true, selfBrowserSurface:'include', surfaceSwitching:'exclude', systemAudio:'exclude'}); }
    catch(e){ say('recording cancelled'); setTimeout(draw,2500); return; }
    const vt=stream.getVideoTracks()[0]; const set=vt.getSettings()||{}; const W=set.width||innerWidth, Hh=set.height||innerHeight;
    const types=['video/mp4;codecs=avc1.640033,mp4a.40.2','video/mp4;codecs=avc1.64002A,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
    const mt=types.find(t=>{ try{ return MediaRecorder.isTypeSupported(t); }catch(e){ return false; } })||'';
    const bits=Math.round(Math.min(80e6, Math.max(16e6, W*Hh*10)));
    /* a 3-2-1 before the camera rolls, so the countdown is never in the clip */
    P.style.display='none';
    const msg=document.createElement('div'); msg.id='hexRecMsg'; document.body.appendChild(msg);
    for(let n=3;n>0;n--){ msg.innerHTML='recording · press esc to stop<b>'+n+'</b>'; await new Promise(r=>setTimeout(r,700)); }
    msg.remove();
    const ring=document.createElement('div'); ring.id='hexRing'; document.body.appendChild(ring);
    const mv=e=>{ ring.style.left=e.clientX+'px'; ring.style.top=e.clientY+'px'; };
    const dn=e=>{ mv(e); ring.classList.add('dn'); const r=document.createElement('div'); r.className='hexRip'; r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px'; document.body.appendChild(r); setTimeout(()=>r.remove(),800); };
    const up=()=>ring.classList.remove('dn');
    addEventListener('pointermove',mv,true); addEventListener('pointerdown',dn,true); addEventListener('pointerup',up,true);
    if(CORE._lastPtr) mv(CORE._lastPtr); else { ring.style.left=innerWidth/2+'px'; ring.style.top=innerHeight/2+'px'; }
    document.documentElement.classList.add('hexrecing');
    const parts=[]; let rec;
    try{ rec=new MediaRecorder(stream, Object.assign({videoBitsPerSecond:bits, audioBitsPerSecond:192000}, mt?{mimeType:mt}:{})); }
    catch(e){ rec=new MediaRecorder(stream); }
    rec.ondataavailable=e=>{ if(e.data&&e.data.size) parts.push(e.data); };
    let stopped=false;
    const stop=()=>{ if(stopped) return; stopped=true; try{ if(rec.state!=='inactive') rec.stop(); }catch(e){} };
    const key=e=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); stop(); } };
    addEventListener('keydown',key,true); vt.addEventListener('ended',stop);
    CORE.FREEREC={stop};
    rec.onstop=()=>{
      removeEventListener('keydown',key,true); removeEventListener('pointermove',mv,true); removeEventListener('pointerdown',dn,true); removeEventListener('pointerup',up,true);
      stream.getTracks().forEach(t=>{ try{ t.stop(); }catch(e){} });
      ring.remove(); document.documentElement.classList.remove('hexrecing'); P.style.display=''; CORE.FREEREC=null;
      const type=(rec.mimeType||mt||'video/webm').split(';')[0]; const ext=/mp4/.test(type)?'mp4':'webm';
      const blob=new Blob(parts,{type}); clipN++;
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      const nm=(document.title||'room').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'room';
      a.download=nm+'-clip-'+clipN+'.'+ext; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000);
      say('saved ✓ '+a.download); setTimeout(draw,4000);
    };
    rec.start(1000);
  }
  const say=(t,cancel)=>{ P.innerHTML=''; const m=document.createElement('span'); m.className='msg'; m.textContent=t; P.appendChild(m);
    if(cancel){ const c=document.createElement('button'); c.className='x'; c.textContent='stop'; c.onclick=ev=>{ ev.stopPropagation(); if(CORE.REC) CORE.REC.cancel=true; }; P.appendChild(c); } };
  async function go(){
    say('recording · 0%',true);
    try{
      const blob=await CORE.record360({size:st.size, secs:st.secs, onProgress:f=>say('recording · '+Math.round(f*100)+'%',true)});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      const nm=(document.title||'room').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'room';
      a.download=nm+'-360-'+st.size+'.mp4'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href),60000);
      say('saved ✓ '+a.download); setTimeout(draw,4000);
    }catch(e){ say(String(e&&e.message||e)); setTimeout(draw,4000); }
  }
  ['pointerdown','click','touchstart'].forEach(t=>P.addEventListener(t,e=>e.stopPropagation()));
  draw();
};
if(window.HEXRECORD||/[?&]record(=|&|$)/.test(location.search)){
  const boot=()=>{ if(window.HEX&&window.HEX.ok&&window.HEX.renderer&&document.body) CORE.recUI(); else setTimeout(boot,400); };
  setTimeout(boot,600);
}
})();

/* ---- default marquee key art (Sound Wave Survival) ---- */
window.HEXCORE.SWSART="data:image/webp;base64,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";

