/* ============================================================
   THE HEX — STAGE MODE (?stage=1)
   Adam's room stager. Drag art onto walls, banners and the floor;
   drop .glb models, images or built-in props into the room; push
   everything around until it looks right. Nothing uploads, nothing
   deploys, nothing touches the platform. Saved in this browser.
   Phase 2 (tap → popup → collect) hangs off prop.payload.
   ============================================================ */
(function(){
/* A dropped file must NEVER navigate the page away. Registered before anything
   else, in every mode — staging or not. This is the "it opened my image in a
   blank tab and I lost the room" guard. */
['dragenter','dragover','drop'].forEach(t=>addEventListener(t,e=>{ e.preventDefault(); },false));

/* Staging turns itself on when this SOURCE file is opened locally from Adam's Mac.
   A baked room carries window.HEXBAKE and never opens the panel; anything served from
   a real web address is a fan's room. ?stage=0 forces it off, ?stage=1 forces it on. */
const Q=new URLSearchParams(location.search);
const LOCAL = location.protocol==='file:';
const BUILDER = (window.HEXBUILDER && !window.HEXBAKE) ? window.HEXBUILDER : null;  /* admin / room builds */
const ON = Q.has('stage') ? (Q.get('stage')!=='0') : (!!BUILDER || (LOCAL && !window.HEXBAKE));
if(!ON) return;
const HEX=window.HEX;
if(!HEX||!HEX.ok){
  addEventListener('load',()=>{ const d=document.createElement('div');
    d.style.cssText='position:fixed;z-index:99;left:50%;top:14px;transform:translateX(-50%);font:800 11px Manrope;'+
      'color:#07060d;background:#fbbf24;border-radius:999px;padding:10px 18px';
    d.textContent='stage mode needs WebGL — this device fell back to flat mode';
    document.body.appendChild(d); });
  return;
}
const T=THREE;
const RM=HEX.ROOM||window.HEXCORE.room(HEX);        /* the room's shape — see HEXCORE.makeRoom */
const ISBOX=RM.shape==='box';
/* v42: the Mood Room — the hexagon with the Mood Lab's light and textures. Its own looks, its own autosave */
/* v59: Open Space — the Mood Room on a floating platform, walls invisible. Everything the Mood Room does, plus the sky */
/* v71: World — the Open Space engine on one big piece of land (lib/world.js). Every World line here is gated on WORLDSP */
const WORLDSP=!ISBOX&&(Q.get('space')==='world'||!!(BUILDER&&BUILDER.space==='world'));
const OPENSP=!ISBOX&&(WORLDSP||Q.get('space')==='open'||!!(BUILDER&&BUILDER.space==='open'));
const MOODSP=!ISBOX&&(OPENSP||Q.get('space')==='mood'||!!(BUILDER&&BUILDER.space==='mood'));
const SPACENAME=ISBOX?'Room Space':WORLDSP?'World':(OPENSP?'Open Space':(MOODSP?'Mood Room':'Event Space'));
const PFX=ISBOX?'room:':WORLDSP?'world:':(OPENSP?'open:':(MOODSP?'mood:':''));          /* Room Space looks live beside Event Space ones */
const AUTOKEY=ISBOX?'auto:room':WORLDSP?'auto:world':(OPENSP?'auto:open':(MOODSP?'auto:mood':'auto'));              /* …and never overwrite the Romy autosave */
const ADMIN=!(BUILDER&&BUILDER.space==='room');      /* the public Room builder is the creator view */
const MODEL_MAX=5;                                  /* models a creator can put in one room */
const STEPS=['1 · Your room','2 · Walls, banners & floor','3 · Photos, videos & music',
             '4 · Visualizers','5 · Models','6 · Lights','7 · Game & chat board'];

/* ================= surfaces ================= */
const SURF=ISBOX?[
 {id:'wall0',   label:'Wall 0 · FRONT',       kind:'wall',  idx:0, w:2048,h:1024, note:'2:1 · faced on arrival'},
 {id:'wall1',   label:'Wall 1 · RIGHT · VIDEO',kind:'wall', idx:1, w:3072,h:1024, note:'3:1 · backdrop behind the video tiles'},
 {id:'wall2',   label:'Wall 2 · BACK',        kind:'wall',  idx:2, w:2048,h:1024, note:'2:1 · behind you on arrival'},
 {id:'wall3',   label:'Wall 3 · LEFT · PHOTO', kind:'wall', idx:3, w:3072,h:1024, note:'3:1 · backdrop behind the photo tiles'},
 {id:'bannerA', label:'Banner A · over the right wall',kind:'banner',idx:0, w:2048,h:400},
 {id:'bannerB', label:'Banner B · over the left wall', kind:'banner',idx:1, w:2048,h:400},
 {id:'floor',   label:'Floor',                kind:'floor', w:1024,h:1536, note:'2:3 · top of the image = front wall'},
 {id:'logo',    label:'Splash logo',          kind:'logo'},
 {id:'gamecard',label:'Game card art',        kind:'gamecard'},
 {id:'song',    label:'Room song',            kind:'song'}
]:[
 {id:'wall0',   label:'Wall 0 · GAME',        kind:'wall',  idx:0, w:2048,h:944, note:'panel + board sit on top'},
 {id:'wall1',   label:'Wall 1 · DIRECTIVE',   kind:'wall',  idx:1, w:2048,h:944, note:'anchor key art LEFT'},
 {id:'wall2',   label:'Wall 2 · open',        kind:'wall',  idx:2, w:2048,h:944},
 {id:'wall3',   label:'Wall 3 · ENTRY',       kind:'wall',  idx:3, w:2048,h:944, note:'behind you on arrival'},
 {id:'wall4',   label:'Wall 4 · VIDEO WALL',  kind:'wall',  idx:4, w:2048,h:944, note:'backdrop behind the 5 video tiles'},
 {id:'wall5',   label:'Wall 5 · PHOTO WALL',  kind:'wall',  idx:5, w:2048,h:944, note:'backdrop behind the 5 photo tiles'},
 {id:'bannerA', label:'Banner A · over wall 1',kind:'banner',idx:0, w:2048,h:400},
 {id:'bannerB', label:'Banner B · over wall 5',kind:'banner',idx:1, w:2048,h:400},
 {id:'floor',   label:'Floor',                kind:'floor', w:2048,h:2048, note:'cropped to the hexagon'},
 {id:'logo',    label:'Splash logo',          kind:'logo'},
 {id:'gamecard',label:'Game card art',        kind:'gamecard'},
 {id:'song',    label:'Event song',           kind:'song'}
];
if(MOODSP){ for(let i=SURF.length-1;i>=0;i--) if(SURF[i].kind==='banner') SURF.splice(i,1);
  SURF.forEach(d=>{ if(d.kind==='wall'){ d.label='Wall '+d.idx+(d.idx===0?' · FRONT':d.idx===3?' · BEHIND YOU':'');
    d.note=d.idx===0?'faced on arrival':''; } }); }
const SBY={}; SURF.forEach(s=>SBY[s.id]=s);
const LIVE=2;                       /* live canvases render at half spec; bake at full */
const defSurf=()=>({asset:null,url:'',fit:'cover',scale:1,ox:0,oy:0,rot:0,tint:'#ffffff',bright:1});
const CANMOVE=k=>(k==='wall'||k==='banner'||k==='floor');   /* slots that can take a looping clip */
let SVID={};                                                /* slot id -> live surface video */

/* ================= state ================= */
let LOOK=null, ASSETS={}, OBJ={}, SEL=null, DIRTY=false;
const newLook=()=>{
  const L={version:3,shape:RM.shape,name:'untitled look',surfaces:{},props:[],seq:1,
    ui:ISBOX?{game:false,timer:false,rail:false,chip:false,walk:true}
            :{game:false,timer:true,rail:true,chip:true,walk:true},
    lights:[], lit:{surfaces:false,ambient:.85},
    racks:{photo:window.HEXCORE.newRack('photo'), video:window.HEXCORE.newRack('video')},
    sets:[], windows:{}};
  if(ISBOX){ L.racks.photo.wall=3; L.racks.video.wall=1; }    /* left and right — the flanking walls */
  if(MOODSP){ L.mood=window.HEXCORE.moodDefaults(); L.racks.photo.wall=5; L.racks.video.wall=1; L.ui.eggStyle={preset:'mood',float:true}; }
  if(OPENSP){ L.mood.open=openDefaults(); L.mood.ceiling='off'; }
  if(WORLDSP){ L.mood.world=window.HEXCORE.WORLD.defaults(); Object.assign(L.mood.open,{islands:false,walls:'none'}); L.mood.ups=0; L.ui.timer=false; L.ui.rail=false; L.ui.chip=false; L.mood.look='dusk'; L.mood.light=window.HEXCORE.MOODLOOKS.dusk; L.racks.photo.wall=-1; L.racks.video.wall=-1; }   /* v71 */
  L.fx=window.HEXFX?window.HEXFX.newCfg():{sky:'off',on:{}};  /* nothing running until they pick it */
  return L;
};
if(WORLDSP){ window.HEXCORE.WORLDPROPS=()=>(LOOK&&LOOK.props)||[]; window.HEXCORE.WORLDREAL=true; window.HEXCORE.WORLDBUF=id=>Promise.resolve(ASSETS[id]&&ASSETS[id].buf||null);   /* v72: map pieces */
     /* v71: the world reads the look's models */
  window.HEXCORE.EDITSEL=()=>!!(SEL&&SEL.indexOf('S:')!==0&&SEL.indexOf('T:')!==0);
  const wt=window.HEXCORE.showWallTags; window.HEXCORE.showWallTags=()=>wt(false); }                      /* no walls, no wall tags */                    /* arrows nudge a picked model, else they walk */
let RACKS={};                      /* kind -> array of tile groups in the scene */

/* ================= indexeddb ================= */
let DB=null;
function db(){ return new Promise((res,rej)=>{
  if(DB) return res(DB);
  const r=indexedDB.open('hexstage',1);
  r.onupgradeneeded=()=>{ const d=r.result;
    if(!d.objectStoreNames.contains('assets')) d.createObjectStore('assets');
    if(!d.objectStoreNames.contains('looks'))  d.createObjectStore('looks');
    if(!d.objectStoreNames.contains('kv'))     d.createObjectStore('kv'); };
  r.onsuccess=()=>{ DB=r.result; res(DB); }; r.onerror=()=>rej(r.error); }); }
function put(store,key,val){ return db().then(d=>new Promise((res,rej)=>{
  const t=d.transaction(store,'readwrite'); t.objectStore(store).put(val,key);
  t.oncomplete=res; t.onerror=()=>rej(t.error); })); }
function get(store,key){ return db().then(d=>new Promise((res,rej)=>{
  const t=d.transaction(store,'readonly'); const q=t.objectStore(store).get(key);
  q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); })); }
function del(store,key){ return db().then(d=>new Promise((res)=>{
  const t=d.transaction(store,'readwrite'); t.objectStore(store).delete(key); t.oncomplete=res; })); }
function keys(store){ return db().then(d=>new Promise((res)=>{
  const t=d.transaction(store,'readonly'); const q=t.objectStore(store).getAllKeys();
  q.onsuccess=()=>res(q.result||[]); })); }

/* ================= assets ================= */
function assetKind(f){
  const n=(f.name||'').toLowerCase();
  if(/\.(glb|gltf)$/.test(n)) return 'glb';
  if((f.type||'').indexOf('video/')===0||/\.(mp4|mov|webm|m4v)$/.test(n)) return 'video';
  if((f.type||'').indexOf('image/')===0) return 'image';
  if((f.type||'').indexOf('audio/')===0||/\.(mp3|m4a|ogg|wav)$/.test(n)) return 'audio';
  return 'image';
}
function hydrateAsset(a){
  a.url=URL.createObjectURL(a.blob);
  if(a.k==='image'){ return new Promise(res=>{ const im=new Image();
    im.onload=()=>{ a.img=im; res(a); }; im.onerror=()=>res(a); im.src=a.url; }); }
  if(a.k==='glb'){ return a.blob.arrayBuffer().then(b=>{ a.buf=b; return a; }); }
  return Promise.resolve(a);
}
function addAsset(file){
  const id='a'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);
  const a={id,name:file.name||'asset',type:file.type||'',k:assetKind(file),blob:file};
  ASSETS[id]=a;
  put('assets',id,{name:a.name,type:a.type,k:a.k,blob:file}).catch(()=>{});
  return hydrateAsset(a);
}

/* ================= framing ================= */
function frameCanvas(img,W,H,st,clear){
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const g=c.getContext('2d');
  if(!clear){ g.fillStyle='#07060d'; g.fillRect(0,0,W,H); }   /* a window wall keeps its see-through part */
  if(!img) return c;
  const iw=img.naturalWidth||img.width||1, ih=img.naturalHeight||img.height||1;
  g.save();
  g.translate(W/2+(st.ox||0)*W, H/2+(st.oy||0)*H);
  g.rotate((st.rot||0)*Math.PI/180);
  const k=st.scale||1;
  if(st.fit==='stretch'){ g.drawImage(img,-W/2*k,-H/2*k,W*k,H*k); }
  else{
    const s=(st.fit==='contain'?Math.min(W/iw,H/ih):Math.max(W/iw,H/ih))*k;
    g.drawImage(img,-iw*s/2,-ih*s/2,iw*s,ih*s);
  }
  g.restore();
  return c;
}
function meshFor(d){
  if(d.kind==='wall')   return HEX.walls[d.idx];
  if(d.kind==='banner') return HEX.banners[d.idx];
  if(d.kind==='floor')  return HEX.floor;
  return null;
}
function applySurface(id){
  const d=SBY[id]; if(!d) return;
  const st=LOOK.surfaces[id]||(LOOK.surfaces[id]=defSurf());
  const a=st.asset?ASSETS[st.asset]:null;
  /* an empty slot means "leave the room's built-in alone", not "hide it" */
  if(d.kind==='logo'){ const el=document.getElementById('slogo');
    const src=(a&&a.url)||(ISBOX?null:window.HEXLOGO)||null;
    if(el){ if(src){ el.src=src; el.style.display=''; }
            else { el.removeAttribute('src'); el.style.display='none'; } }
    return; }
  if(d.kind==='gamecard'){ const el=document.getElementById('gcard');
    const src=(a&&a.url)||window.HEXCARD||null;
    if(el) el.style.backgroundImage=src?('url('+src+')'):'';
    return; }
  if(d.kind==='song'){ const el=document.getElementById('track');
    const su=st.url||(a?a.url:null);
    if(el&&su){ el.src=su; try{ el.load(); el.play().catch(()=>{}); }catch(e){} }
    return; }
  const m=meshFor(d); if(!m) return;

  /* a looping clip on the surface — banners, walls or the floor */
  const wantsVideo = CANMOVE(d.kind) && ((a&&a.k==='video')||!!st.url);
  if(wantsVideo){
    const src=st.url||(a?a.url:null);
    if(src){
      if(!SVID[id]||SVID[id].src!==src){
        if(SVID[id]&&SVID[id].video){ try{ SVID[id].video.pause(); SVID[id].video.remove(); }catch(e){} }
        const r=window.HEXCORE.applySurfaceVideo(HEX,id,src,st);
        if(r){ r.src=src; SVID[id]=r; }
      } else {
        SVID[id].refit();
        m.material.color.set(st.tint||'#ffffff').multiplyScalar(st.bright===undefined?1:st.bright);
        m.material.needsUpdate=true;
      }
      return;
    }
  }
  if(SVID[id]){ try{ SVID[id].video.pause(); SVID[id].video.remove(); }catch(e){} delete SVID[id]; }

  const old=m.material.map;
  const isWin=d.kind==='wall'&&winOn(id);
  if(d.kind==='wall') WRECT[id]=null;
  const cutW=MOODSP&&d.kind==='wall'&&winOn(id)&&winOf(id).cut;
  if(!a||!a.img){ m.material.map=HEX.defaultMap(id); }
  else{
    const c=frameCanvas(a.img, Math.round(d.w/LIVE), Math.round(d.h/LIVE), st, isWin);
    if(isWin) WRECT[id]=window.HEXCORE.windowRect(c);
    const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; t.anisotropy=4;
    t.wrapS=t.wrapT=T.ClampToEdgeWrapping;
    m.material.map=t;
  }
  if(old&&old!==m.material.map&&old.isCanvasTexture&&old!==HEX.defaultMap(id)) old.dispose();
  m.material.color.set(st.tint||'#ffffff').multiplyScalar(st.bright===undefined?1:st.bright);
  m.material.needsUpdate=true;
  if(cutW) WRECT[id]=window.HEXCORE.cutRect(winOf(id).cut, wallLen(d.idx), RM.H||HEX.WALL_H);
  if(d.kind==='wall'&&(isWin||WSETS[id])) rebuildWindows();
}
const applyAllSurfaces=()=>SURF.forEach(s=>applySurface(s.id));

/* ================= tile racks ================= */
/* One reset for both spaces: everything a loaded look can put in the room comes back out. */
function startFresh(){
  if(SETEDIT) exitSetEditor(true);
  LOOK=newLook(); applyAllSurfaces(); buildRacks(); rebuildProps();
  rebuildLights(); rebuildBoards(); rebuildWindowsNow(); applyRoomUI(); select(null); ui(); DIRTY=true; put("kv",AUTOKEY,serialize()).catch(()=>{});
}
function buildRacks(){
  Object.keys(RACKS).forEach(k=>RACKS[k].forEach(g=>{ HEX.scene.remove(g);
    const v=g.userData&&g.userData.video; if(v){ try{ v.pause(); v.removeAttribute('src'); v.load(); v.remove(); }catch(e){} } }));
  RACKS={};
  if(!LOOK.racks) LOOK.racks={photo:window.HEXCORE.newRack('photo'),video:window.HEXCORE.newRack('video')};
  Object.keys(LOOK.racks).forEach(k=>{
    RACKS[k]=window.HEXCORE.buildRack(LOOK.racks[k],HEX,HEX.scene);
    LOOK.racks[k].tiles.forEach((t,i)=>applyTile(k,i));
  });
}
function applyTile(kind,i){
  const rack=LOOK.racks[kind]; if(!rack) return;
  const t=rack.tiles[i], g=RACKS[kind]&&RACKS[kind][i];
  if(!g) return;
  const art=g.userData.art;
  const a=t.asset?ASSETS[t.asset]:null;
  if(kind==='video'){
    const url=t.url||(a?a.url:null);
    if(!url){ art.material.map=null; art.material.color.set(0x1a1436); art.material.needsUpdate=true;
      if(g.userData.badge) g.userData.badge.visible=false; return; }
    if(g.userData.vurl!==url){
      if(g.userData.video){ try{ g.userData.video.pause(); g.userData.video.remove(); }catch(e){} }
      g.userData.vurl=url;
      const v=window.HEXCORE.videoFor(url);
      v.muted=true;
      art.material.map=window.HEXCORE.videoTex(v);
      g.userData.video=v;
    }
    art.material.color.set(t.tint||'#ffffff').multiplyScalar(t.bright===undefined?1:t.bright);
    art.material.needsUpdate=true;
    return;
  }
  if(!a||!a.img){ art.material.map=null; art.material.color.set(0x1a1436); art.material.needsUpdate=true; return; }
  const d=window.HEXCORE.RACKS[kind];
  const c=frameCanvas(a.img, 540, Math.round(540/d.aspect), t);
  const tex=new T.CanvasTexture(c); tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=4;
  const old=art.material.map;
  art.material.map=tex;
  art.material.color.set(t.tint||'#ffffff').multiplyScalar(t.bright===undefined?1:t.bright);
  art.material.needsUpdate=true;
  if(old&&old.isCanvasTexture) old.dispose();
}
function tileRefs(){ const out=[];
  Object.keys(RACKS).forEach(k=>RACKS[k].forEach(g=>out.push(g))); return out; }

/* ================= props ================= */
/* eggs on room props follow the prop around */
function syncPropEggs(){ window.HEXCORE.ROOMEGGS.userData.urlOf=eggURL;
  window.HEXCORE.ROOMEGGS.userData.eggs.slice().forEach(E=>{ const id=E.id.slice(5); if(!propById(id)) window.HEXCORE.clearPropEgg(id); });
  (LOOK.props||[]).forEach(p=>{ if(p.egg&&p.egg.on&&OBJ[p.id]) window.HEXCORE.propEgg(p,OBJ[p.id],HEX.scene,HEX); else window.HEXCORE.clearPropEgg(p.id); }); }
function syncPlaymes(){ window.HEXCORE.PLAYMES=(LOOK.props||[]).filter(p=>p.type==='playme'&&OBJ[p.id]).map(p=>({p,g:OBJ[p.id]}));
  window.HEXCORE.playmeTick(HEX); followModels(); }
function syncPropEggsSoon(){ clearTimeout(syncPropEggsSoon._t); syncPropEggsSoon._t=setTimeout(()=>{ syncPropEggs(); syncPlaymes(); },120); }
function addProp(rec,then){
  LOOK.props.push(rec);
  window.HEXCORE.SCREENURL=id=>ASSETS[id]&&ASSETS[id].url;
  window.HEXCORE.build(rec,ASSETS,HEX.scene,g=>{ OBJ[rec.id]=g; syncPropEggsSoon(); if(g.userData.hasScreen&&!rec.screen){ rec.screen={clips:[],tap:rec.type==='prim'?'none':'arcade'}; touch(); if(SEL===rec.id) ui(); } if(then) then(g); });
  touch();
}
/* v77 · a model from an outside kit: its look, its parts (finish + colour, lights on/off) and its extras — straight from the kit */
function kitPropControls(p,box){ const D=window.HEXCORE.PRIMS[p.kind], def=D.def||{}, o=p.kit||(p.kit={}); o.parts=o.parts||{}; o.extras=o.extras||{};
  const redo=()=>{ rebuildProp(p); touch(); ui(); };
  box.appendChild(el('div','stsub',D.kitName+' · '+D.label));
  if(Array.isArray(def.looks)&&def.looks.length>1) box.appendChild(seg('Look',def.looks.map(k=>[k,k]),o.look||def.looks[0],k=>{ o.look=k; redo(); }));
  const colour=(lab,val,set)=>{ const r=el('div','stf'); r.appendChild(el('label','',lab)); const i=document.createElement('input'); i.type='color'; i.value=val||'#ffffff'; i.onchange=()=>set(i.value); r.appendChild(i); box.appendChild(r); };
  const nice=k=>String(k).replace(/([a-z])([A-Z])/g,'$1 $2').trim().replace(/^./,c=>c.toUpperCase());   /* v82: no stray space before a capital */
  if(Array.isArray(def.parts)) def.parts.forEach(pt=>{ const q=o.parts[pt.label]||{}; colour(nice(pt.label),q.colour||'#ffffff',v=>{ o.parts[pt.label]=Object.assign({},q,{colour:v}); redo(); }); });
  else Object.keys(def.parts||{}).forEach(k=>{ const d=def.parts[k], q=o.parts[k]||{};
    if(d.finishes&&d.finishes.length>1) box.appendChild(seg(nice(k),d.finishes.map(f=>[f,f]),q.finish||d.finishes[0],f=>{ o.parts[k]=Object.assign({},o.parts[k],{finish:f}); redo(); }));
    if(d.on!=null) box.appendChild(seg(nice(k)+(d.colour?' lights':''),[['on','on'],['off','off']],(q.on==null?d.on:q.on)?'on':'off',v=>{ o.parts[k]=Object.assign({},o.parts[k],{on:v==='on'}); redo(); }));
    if(d.colour) colour(nice(k)+(d.finishes?' colour':''),q.colour||d.colour,v=>{ o.parts[k]=Object.assign({},o.parts[k],{colour:v}); redo(); }); });
  Object.keys(def.extras||{}).forEach(k=>{ const on=o.extras[k]==null?!!def.extras[k]:!!o.extras[k]; box.appendChild(seg(nice(k),[['on','on'],['off','off']],on?'on':'off',v=>{ o.extras[k]=(v==='on'); redo(); })); });
  if(p.door&&p.door.on) box.appendChild(el('div','sthint','Its front door can open a room — set the link under <b>Door</b>.')); }
/* v81 · a house's own panel: Look, walls (finish + colour), roof (finish + colour), trim, door, window lights, extras */
function houseControls(p,box){ const type=window.HEXCORE.PRIMS[p.kind].house, H=window.TRIOHOUSE, d=H.DEF[type], o=p.house||(p.house={});
  const redo=()=>{ rebuildProp(p); touch(); ui(); }, L=H.lookOf(type,o);
  box.appendChild(el('div','stsub','House · '+d.label));
  box.appendChild(seg('Look',[['fresh','fresh'],['abandoned','abandoned']],o.look==='abandoned'?'abandoned':'fresh',k=>{ o.look=k; redo(); }));
  const colour=(lab,val,set)=>{ const r=el('div','stf'); r.appendChild(el('label','',lab)); const i=document.createElement('input'); i.type='color'; i.value=val||'#ffffff'; i.onchange=()=>set(i.value); r.appendChild(i); box.appendChild(r); };
  box.appendChild(seg('Walls',[['siding','siding'],['brick','brick'],['stucco','stucco'],['paint','paint'],['stone','stone'],['wood','wood']],L.walls.t,k=>{ o.walls=Object.assign({},o.walls,{t:k}); redo(); }));
  colour('Walls colour',L.walls.c,v=>{ o.walls=Object.assign({},o.walls,{c:v}); redo(); });
  if(type==='cottage'||type==='suburban'){ box.appendChild(seg('Roof',[['shingles','shingles'],['tiles','tiles'],['metal','metal']],L.roof.t,k=>{ o.roof=Object.assign({},o.roof,{t:k}); redo(); }));
    colour('Roof colour',L.roof.c,v=>{ o.roof=Object.assign({},o.roof,{c:v}); redo(); }); }
  colour('Trim',L.trim,v=>{ o.trim=v; redo(); }); colour('Front door',L.door,v=>{ o.door=v; redo(); });
  if(o.look!=='abandoned') box.appendChild(seg('Window lights',[['on','on'],['off','off']],o.glow===false?'off':'on',k=>{ o.glow=(k==='on'); redo(); }));
  if(type==='suburban'){ box.appendChild(seg('Porch',[['on','on'],['off','off']],o.porch===false?'off':'on',k=>{ o.porch=(k==='on'); redo(); })); box.appendChild(seg('Garage',[['on','on'],['off','off']],o.garage===false?'off':'on',k=>{ o.garage=(k==='on'); redo(); })); }
  if(type==='cottage') box.appendChild(seg('Fence',[['on','on'],['off','off']],o.fence===false?'off':'on',k=>{ o.fence=(k==='on'); redo(); }));
  if(type==='shop'){ colour('Awning',L.awning,v=>{ o.awning=v; redo(); });
    const r=el('div','stf'); r.appendChild(el('label','','Sign')); const i=document.createElement('input'); i.type='text'; i.maxLength=18; i.value=L.sign||''; i.onchange=()=>{ o.sign=i.value.toUpperCase(); redo(); }; r.appendChild(i); box.appendChild(r); }
  box.appendChild(el('div','sthint','Its front door can open one of your rooms — set the link under <b>Door</b>. <b>Abandoned</b> fades the colours, boards and breaks the windows, adds grime, weeds and vines.')); }
/* v76 · a big screen arrives at its real size in a World, small in a room (size it up); no clips yet, a tap does nothing */
function bigScreenRec(p,k){ if(!WORLDSP) p.scale=OPENSP?.5:.25; if(k!=='fanwall') p.screen={clips:[],tap:'none'}; p.shadow=false; if(k==='bannerplane') p.fly={loop:WORLDSP?'medium':'small',height:'mid'}; }   /* v78 */
function propRec(type,kind){
  const p=window.HEXCORE.newProp('p'+(LOOK.seq++),type,kind);
  p.name=type==='prim'?(window.HEXCORE.PRIMS[kind]||{label:kind}).label:'';
  return p;
}
function removeProp(id){
  const i=LOOK.props.findIndex(p=>p.id===id); if(i<0) return;
  LOOK.props.splice(i,1);
  const g=OBJ[id]; if(g){ HEX.scene.remove(g); delete OBJ[id]; } window.HEXCORE.clearPropEgg(id);
  if(SEL===id) select(null);
  touch(); ui();
}
function rebuildProps(){
  Object.keys(OBJ).forEach(k=>{ HEX.scene.remove(OBJ[k]); delete OBJ[k]; });
  LOOK.props.forEach(p=>window.HEXCORE.build(p,ASSETS,HEX.scene,g=>{ OBJ[p.id]=g; syncPropEggsSoon(); }));
  syncPropEggsSoon();
}
const propById=id=>LOOK.props.find(p=>p.id===id);

/* selection outline */
let BOX=null;
function sectionFor(id){
  if(!id) return null;
  if(LOBJ[id]) return ISBOX?STEPS[5]:'Lighting';
  if(OBJ[id]) return ISBOX?STEPS[4]:'Props in the room';
  if(id.indexOf('S:')===0) return ISBOX?STEPS[1]:null;
  if(id.indexOf('T:')===0) return ISBOX?STEPS[2]:null;
  return null;
}
function select(id){
  SEL=id;
  const sk=sectionFor(id); if(sk) OPEN[sk]=true;
  if(id) FOLLOW=true;
  syncAim();
  if(BOX){ HEX.scene.remove(BOX); BOX=null; }
  let target=null;
  if(id&&LOBJ[id]) target=LOBJ[id].userData.fixture||LOBJ[id];
  else if(id&&OBJ[id]) target=OBJ[id];
  else if(id&&id.indexOf('S:')===0){ const d=SBY[id.slice(2)]; if(d) target=meshFor(d); }
  else if(id&&id.indexOf('T:')===0){ const p=id.split(':');
    target=RACKS[p[1]]&&RACKS[p[1]][+p[2]]; }
  if(target){ BOX=new T.BoxHelper(target,0xfbbf24); BOX.material.depthTest=false;
    BOX.material.transparent=true; BOX.material.opacity=.95; HEX.scene.add(BOX); }
  syncAdd();
  ui();
}
/* the in-room add button: click a wall, then click this */
function syncAdd(){
  const btn=document.getElementById('stgAdd'); if(!btn) return;
  if(FAN||!SEL){ btn.classList.remove('on'); btn.dataset.slot=''; return; }
  if(SEL.indexOf('T:')===0){
    const p=SEL.split(':'), kind=p[1], i=+p[2];
    const t=LOOK.racks[kind].tiles[i], has=t.asset||t.url;
    btn.textContent=(has?'swap ':'＋ add ')+(kind==='video'?'video · tile ':'photo · tile ')+(i+1);
    btn.dataset.slot=SEL; btn.classList.add('on'); return;
  }
  if(SEL.indexOf('S:')!==0){ btn.classList.remove('on'); btn.dataset.slot=''; return; }
  const sid=SEL.slice(2), d=SBY[sid];
  const st=LOOK.surfaces[sid], has=st&&st.asset;
  btn.textContent=(has?'swap art on ':'＋ add art to ')+d.label.replace(/ ·.*/,'');
  btn.dataset.slot=sid; btn.classList.add('on');
}
function refreshSel(){ if(BOX&&SEL&&OBJ[SEL]){ BOX.setFromObject(OBJ[SEL]); } }

/* place a prop against a wall plane */
function snapToWall(p,wi){
  p.wall=wi;
  if(wi==null){ p.rot[1]=0; return; }
  const q=RM.wallPoint(wi,0,0,0.14);
  p.pos[0]=q.x; p.pos[2]=q.z;
  p.pos[1]=Math.max(p.pos[1],1.2);
  p.rot[1]=RM.th(wi);                       /* face the room centre */
}


/* ================= lighting desk ================= */
let LOBJ={};
function lightById(id){ return (LOOK.lights||[]).find(L=>L.id===id); }
function litCfg(){
  if(!LOOK.lit) LOOK.lit={surfaces:false,ambient:.85,handles:true};
  if(LOOK.lit.handles===undefined) LOOK.lit.handles=true;
  return LOOK.lit;
}
/* handles are the cans you grab while staging — hide them to demo the room as-is */
function setHandles(on){
  litCfg().handles=!!on;
  window.HEXCORE.EDIT=!!on;
  (LOOK.lights||[]).forEach(L=>window.HEXCORE.applyLight(L,LOBJ[L.id]));
  window.HEXCORE.showWallTags(!!on && !FAN && !DEMO && tagsPanelOpen());
  refreshSel();
}
function mkLight(L){
  const g=window.HEXCORE.buildLight(L,HEX.scene);
  const fx=g.userData.fixture;
  if(fx){ const hit=new T.Mesh(new T.SphereGeometry(.42,10,8),
      new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
    hit.userData.lightId=L.id; hit.userData.grab=true; fx.add(hit); g.userData.hit=hit; }
  return g;
}
function rebuildLights(){
  Object.keys(LOBJ).forEach(k=>{ HEX.scene.remove(LOBJ[k]); delete LOBJ[k]; });
  if(!LOOK.lights) LOOK.lights=[];
  const c=litCfg();
  window.HEXCORE.EDIT=c.handles!==false;
  window.HEXCORE.ambient(HEX.scene, c.surfaces?c.ambient:1);
  window.HEXCORE.setSurfacesLit(HEX, !!c.surfaces);
  LOOK.lights.forEach(L=>{ LOBJ[L.id]=mkLight(L); });
  applyMoodNow();
}
/* ---- v42 · the Mood Room's own controls ---- */
function moodSections(){
  const M=LOOK.mood, go=()=>{ applyMoodNow(); touch(); };
  const s=sec('Mood',true);
  s.wrap.appendChild(seg('Look',[['dark','dark'],['dusk','dusk'],['gallery','gallery']],M.look,
    k=>{ M.look=k; M.light=window.HEXCORE.MOODLOOKS[k]; go(); ui(); }));
  s.wrap.appendChild(slider('Room light',M.light,0,1,.01,v=>Math.round(v*100)+'%',v=>{ M.light=v; M.look=''; go(); }));
  s.wrap.appendChild(slider('Halo',M.halo,0,1.5,.01,v=>v>0?Math.round(v/.6*100)+'%':'off',v=>{ M.halo=v; go(); }));
  s.wrap.appendChild(seg('Wall art',[['off','lit only'],['on','glows']],M.artGlow==='on'?'on':'off',k=>{ M.artGlow=k; go(); ui(); }));
  s.wrap.appendChild(el('div','sthint','<b>Room light</b> is how much you can see without your lights. <b>Halo</b> is the soft '+
    'bloom around anything bright. <b>Wall art · glows</b> lights your pictures from within, like a screen.'));
  BODY.appendChild(s);
  const t=sec('Textures',true);
  const packs=[['concrete','concrete'],['brick','brick'],['metal','metal'],['cracked','cracked'],['paint','peeling paint'],['gloss','glossy'],['plain','plain']];   /* v59.1: + glossy */   /* v55: + cracked, peeling paint */
  if(!WORLDSP) t.wrap.appendChild(seg('Walls',packs,M.walls,k=>{ M.walls=k; go(); ui(); }));
  t.wrap.appendChild(seg(WORLDSP?'Ground':'Floor',packs,M.floor,k=>{ M.floor=k; go(); ui(); }));
  if(!OPENSP) t.wrap.appendChild(seg('Ceiling',[['orig','original']].concat(packs),M.ceilTex||'orig',k=>{ M.ceilTex=k==='orig'?null:k; go(); ui(); }));   /* v64: the ceiling wears any texture (the roof's on / open sky lives in Sky) */
  t.wrap.appendChild(colourBlock(M, go));                                    /* v62: colour */
  t.wrap.appendChild(slider('Bumpiness',M.bump,0,2,.01,v=>Math.round(v*100)+'%',v=>{ M.bump=v; go(); }));
  t.wrap.appendChild(slider('Floor shine',M.shine,0,1,.01,v=>Math.round(v*100)+'%',v=>{ M.shine=v; go(); }));
  t.wrap.appendChild(el('div','sthint','Empty walls and the floor show the texture. Art you drop on a wall sits on top, with a '+
    'little of the texture showing through.'));
  BODY.appendChild(t);
}
/* v63 · the ADD-ONS drawer — bespoke extras for one artist's room; the main editor stays as it is */
function addonsSection(){
  const C=window.HEXCORE, M=LOOK.mood; if(!M) return;
  if(WORLDSP){ const AD=C.WORLDADDONS||{}, Wc=M.world||(M.world={}), A=Wc.addons||(Wc.addons={});   /* v85: a World shows only the world add-ons */
    const s=sec('Add-ons',true); s.wrap.appendChild(el('div','sthint','Pieces made for one artist. Only the ones you switch on show up — a published world carries just those.'));
    Object.keys(AD).forEach(k=>{ const on=!!(A[k]&&A[k].on), card=el('div','stcard'+(on?' on':''));
      const hd=el('div','stcardh','<b>'+AD[k].name+'<small>'+(AD[k].note||'')+'</small></b>'); const tg=el('button','sttog'+(on?' on':''),on?'on':'off');
      tg.onclick=()=>{ A[k]=Object.assign(A[k]||{},{on:!on}); applyMoodNow(); touch(); ui(); if(WMAP) try{ WMAP.lib&&WMAP.lib(); }catch(e){} }; hd.appendChild(tg); card.appendChild(hd);
      if(on){ const where=[]; if((AD[k].prims||[]).length) where.push('<b>Models</b> (+ '+AD[k].prims.map(p=>(C.PRIMS[p]||{label:p}).label).join(', + ')+')'); if((AD[k].kits||[]).length) where.push('the <b>map</b> (its own <b>'+(AD[k].kitName||AD[k].name)+'</b> tab)');
        card.appendChild(el('div','sthint','Find it in '+where.join(' and ')+'.')); }
      s.wrap.appendChild(card); });
    BODY.appendChild(s); return; }
  const A=M.addons||(M.addons={}), go=()=>{ applyMoodNow(); touch(); };
  const s=sec('Add-ons',true);
  s.wrap.appendChild(el('div','sthint','Extras for one artist\'s room. Only the ones you switch on load — a published room carries just those.'));
  const reg=(C&&C.ADDONS)||{};
  if(reg.carved){ const D=reg.carved.defaults, c=A.carved||(A.carved=Object.assign({},D,{on:false}));
    Object.keys(D).forEach(k=>{ if(c[k]==null) c[k]=D[k]; });
    const card=el('div','stcard'+(c.on?' on':''));
    const hd=el('div','stcardh','<b>Carved line<small>a channel carved round the walls, neon inside</small></b>');
    const tg=el('button','sttog'+(c.on?' on':''),c.on?'on':'off'); tg.onclick=()=>{ c.on=!c.on; go(); ui(); }; hd.appendChild(tg); card.appendChild(hd);
    if(OPENSP) card.appendChild(el('div','sthint','Open Space has no walls to carve — this one works in the Mood Room.'));
    else if(c.on){
      const word=(v,a)=>a[Math.min(a.length-1,Math.floor(v*a.length))];
      card.appendChild(slider('Height',c.height,0,1,.01,v=>word(v,['low','middle','high']),v=>{ c.height=v; go(); }));
      card.appendChild(slider('Wave',c.wave,0,1,.01,v=>v<.04?'straight':word(v,['gentle','flowing','wild']),v=>{ c.wave=v; go(); }));
      card.appendChild(slider('Depth',c.depth,0,1,.01,v=>word(v,['shallow','medium','deep']),v=>{ c.depth=v; go(); }));
      card.appendChild(colorRow('Neon colour',c.neon,v=>{ c.neon=v; go(); }));
      card.appendChild(slider('Neon glow',c.glow,0,1,.01,v=>v<.03?'off':word(v,['soft','medium','bright']),v=>{ c.glow=v; go(); }));
      card.appendChild(seg('With music',[['still','still'],['pulses','pulses']],c.music==='still'?'still':'pulses',k=>{ c.music=k; go(); ui(); }));
      card.appendChild(el('div','sthint','The room keeps its shape — only the channel is carved. It wears the walls\' own texture and colour.'));
    }
    s.wrap.appendChild(card); }
  if(reg.beams){ const D=reg.beams.defaults, c=A.beams||(A.beams=Object.assign({},D,{on:false}));   /* v66 */
    Object.keys(D).forEach(k=>{ if(c[k]==null) c[k]=D[k]; });
    const card=el('div','stcard'+(c.on?' on':''));
    const hd=el('div','stcardh','<b>Beam ceiling<small>the ceiling lifts and glows; big beams hang under it</small></b>');
    const tg=el('button','sttog'+(c.on?' on':''),c.on?'on':'off'); tg.onclick=()=>{ c.on=!c.on; go(); ui(); }; hd.appendChild(tg); card.appendChild(hd);
    if(OPENSP) card.appendChild(el('div','sthint','Open Space has no ceiling — this one works in the Mood Room.'));
    else if(c.on){
      const word=(v,a)=>a[Math.min(a.length-1,Math.floor(v*a.length))];
      card.appendChild(seg('Beams',[['match','match the ceiling'],['pick','pick a colour']],c.beam==='match'?'match':'pick',k=>{ c.beam=k==='match'?'match':(c.beam!=='match'?c.beam:'#a3120d'); go(); ui(); }));
      if(c.beam!=='match') card.appendChild(colorRow('Beam colour',c.beam,v=>{ c.beam=v||'#a3120d'; go(); }));
      card.appendChild(slider('Beam depth',c.depth,0,1,.01,v=>word(v,['slim','medium','deep']),v=>{ c.depth=v; go(); }));
      card.appendChild(slider('Glow',c.glow,0,1,.01,v=>v<.03?'off':word(v,['soft','medium','bright']),v=>{ c.glow=v; go(); }));
      card.appendChild(colorRow('Glow colour',c.glowColor,v=>{ c.glowColor=v||'#ffd2c0'; go(); }));
      card.appendChild(seg('Roof opens',[['fade','beams fade too'],['stay','beams stay']],c.roof==='stay'?'stay':'fade',k=>{ c.roof=k; go(); ui(); }));
      card.appendChild(el('div','sthint','The lifted ceiling keeps your ceiling texture and colour. Open the roof (Sky → Roof, or a trigger) and it fades away as always.'));
    }
    s.wrap.appendChild(card); }
  s.wrap.appendChild(el('div','stcard off','<div class="stcardh"><b>Coming later<small>more artist extras land here, one at a time</small></b></div>'));
  BODY.appendChild(s);
}
/* v62 · Colour — walls / floor / ceiling take any colour over any texture; "original" leaves them as they were */
const SWATCHES=['#d8708a','#ff1f7e','#1fb865','#c8141f','#2b5bff','#f5d400','#eeeeee'];
function colourBlock(M, go){
  const C=M.color||(M.color={same:true});
  const box=el('div','stcolour'); box.appendChild(el('div','stsub','Colour'));
  const parts=OPENSP?[['walls','Walls'],['floor','Floor']]:[['walls','Walls'],['floor','Floor'],['ceil','Ceiling']];
  const set=(part,v)=>{ if(C.same!==false) parts.forEach(([k])=>{ C[k]=v; }); else C[part]=v; go(); ui(); };
  parts.forEach(([k,lab])=>{ const r=el('div','stf stswr'); r.appendChild(el('label','',lab)); const w=el('div','stsw');
    const o=el('button','orig'+(C[k]?'':' on'),'original'); o.onclick=()=>set(k,null); w.appendChild(o);
    SWATCHES.forEach(h=>{ const b=el('button','dot'+(C[k]&&C[k].toLowerCase()===h?' on':'')); b.style.background=h; b.title=h; b.onclick=()=>set(k,h); w.appendChild(b); });
    const any=el('label','any'+(C[k]&&SWATCHES.indexOf(C[k].toLowerCase())<0?' on':''),'+ any'); if(C[k]&&SWATCHES.indexOf(C[k].toLowerCase())<0) any.style.boxShadow='inset 0 0 0 9px '+C[k];
    const i=document.createElement('input'); i.type='color'; i.value=C[k]||'#d8708a';
    i.oninput=()=>{ if(C.same!==false) parts.forEach(([q])=>{ C[q]=i.value; }); else C[k]=i.value; go(); }; i.onchange=()=>ui();
    any.appendChild(i); w.appendChild(any); r.appendChild(w); box.appendChild(r); });
  box.appendChild(seg('',[['same','all the same'],['own','each on its own']],C.same===false?'own':'same',k=>{ C.same=k==='same';
    if(C.same){ const v=C.walls||null; parts.forEach(([q])=>{ C[q]=v; }); go(); } ui(); }));
  box.appendChild(el('div','sthint','<b>Colour</b> tints whatever texture is on: glossy pink, green brick, red concrete. <b>original</b> keeps the texture\'s own colour. Art on a wall keeps its colours.'));
  return box;
}
const openDefaults=()=>({rim:'#f5d400', islands:true, glow:true, walls:'art', sky:'night', below:'void'});
/* v61 · the sky picker, shared by the Mood Room (M.sky) and Open Space (M.open) */
function skyControls(w, C, go, isOpen){
  window.HEXCORE.SKYURL=id=>ASSETS[id]&&ASSETS[id].url;
  w.appendChild(seg('Sky',[['night','night'],['galaxy','galaxy'],['day','day'],['image','my own image']],C.sky||'night',k=>{ C.sky=k; go(); ui(); }));
  w.appendChild(seg('Sky drift',[['off','off'],['slow','slow'],['medium','medium']],C.drift||'off',k=>{ C.drift=k==='off'?undefined:k; go(); ui(); }));   /* v68: the sky turns slowly */
  if(C.sky==='image'){ const a=C.skyImg?ASSETS[C.skyImg]:null; const row=el('div','strow'); const th=el('div','th'); if(a&&a.url) th.style.backgroundImage='url('+a.url+')'; else th.textContent='+';
    const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>'; nm.querySelector('b').textContent=a?a.name:'your sky';
    nm.querySelector('s').textContent='a 360° picture · 2:1 wide (e.g. 4096 × 2048) · JPG';
    const add=el('button','add',a?'swap':'+ add'); add.onclick=e=>{ e.stopPropagation(); pick('image/*',fs=>{ if(!fs[0]) return; addAsset(fs[0]).then(x=>{ C.skyImg=x.id; go(); ui(); }); }); };
    row.appendChild(th); row.appendChild(nm); row.appendChild(add); w.appendChild(row); }
  if((C.sky||'night')==='night'&&!WORLDSP) w.appendChild(seg('Sky glow',[['on','on · breathing lights'],['off','off · just stars']],C.glow===false?'off':'on',k=>{ C.glow=(k==='on'); go(); ui(); }));
  if(isOpen) w.appendChild(seg('Below',[['void','void'],['ocean','ocean'],['clouds','cloud sea']],C.below||'void',k=>{ C.below=k; go(); ui(); }));
}
function skySection(){   /* v61 · Mood Room: the sky you see when the roof is open */
  const M=LOOK.mood, C=M.sky||(M.sky={sky:'night',glow:true}), go=()=>{ applyMoodNow(); touch(); };
  const s=sec('Sky',true);
  s.wrap.appendChild(seg('Roof',[['on','on'],['off','open sky']],M.ceiling==='off'?'off':'on',k=>{ M.ceiling=k; go(); ui(); }));
  skyControls(s.wrap, C, go, false);
  s.wrap.appendChild(el('div','sthint','You see the sky when the roof is open — set <b>Roof</b> to open sky, or let a trigger open it (<b>the sky (roof) · opens</b>).'));
  BODY.appendChild(s);
}
function openSection(){   /* v59 */
  const M=LOOK.mood, O=M.open||(M.open=openDefaults()), go=()=>{ applyMoodNow(); touch(); };
  const s=sec('Open space',true);
  skyControls(s.wrap, O, go, true);   /* v60/v61 */
  const r=el('div','stf'); r.appendChild(el('label','','Edge glow'));
  const i=document.createElement('input'); i.type='color'; i.value=O.rim||'#f5d400'; i.oninput=()=>{ O.rim=i.value; go(); }; r.appendChild(i); s.wrap.appendChild(r);
  s.wrap.appendChild(seg('Floating islands',[['on','on'],['off','off']],O.islands===false?'off':'on',k=>{ O.islands=(k==='on'); go(); ui(); }));
  s.wrap.appendChild(seg('Walls',[['art','show walls with art'],['none','all invisible']],O.walls==='none'?'none':'art',k=>{ O.walls=k; go(); ui(); }));
  s.wrap.appendChild(seg('Roof',[['off','open sky'],['on','on']],M.ceiling==='on'?'on':'off',k=>{ M.ceiling=k; go(); ui(); }));
  s.wrap.appendChild(el('div','sthint','The walls are still here — just invisible. Hang art, tiles, boards and windows on them as usual: '+
    'they float where the wall was. In the builder the walls show faintly so you can click them. Fans can walk to the edge, never off it.'));
  BODY.appendChild(s);
}
/* ---- v71 · WORLD: the land's own controls ---- */
function worldSection(){
  const M=LOOK.mood, O=M.open||(M.open=openDefaults()), Wc=M.world||(M.world=window.HEXCORE.WORLD.defaults()), go=()=>{ applyMoodNow(); touch(); };
  const s=sec('World',true);
  s.wrap.appendChild(el('div','sthint','<b>One land tile · 128 m × 128 m</b> — about six hexagon rooms side by side, around 40 seconds to walk across. '+
    'Stitching tiles into a district comes next (World 2).'));
  skyControls(s.wrap, O, go, false);
  const r=el('div','stf'); r.appendChild(el('label','','Edge glow'));
  const i=document.createElement('input'); i.type='color'; i.value=O.rim||'#f5d400'; i.oninput=()=>{ O.rim=i.value; go(); }; r.appendChild(i); s.wrap.appendChild(r);
  s.wrap.appendChild(seg('Next tiles',[['on','show outlines'],['off','hide']],Wc.next===false?'off':'on',k=>{ Wc.next=(k==='on'); go(); ui(); }));
  s.wrap.appendChild(seg('Corner map',[['on','on'],['off','off']],Wc.map===false?'off':'on',k=>{ Wc.map=(k==='on'); go(); ui(); }));
  s.wrap.appendChild(seg('Streets',[['dry','dry'],['wet','wet · shiny']],Wc.wet==='wet'?'wet':'dry',k=>{ Wc.wet=k; go(); ui(); }));   /* v73 */
  s.wrap.appendChild(seg('Street lamps',[['on','on · bulbs glow'],['off','off']],Wc.lamps==='off'?'off':'on',k=>{ Wc.lamps=k; go(); ui(); }));
  { const mb=el('div','stbtns'); const ob=el('button','gold','open the map'); ob.onclick=openWorldMap; mb.appendChild(ob); s.wrap.appendChild(mb);
    const used=((Wc.map&&Wc.map.cells)||[]).filter(Boolean).length; s.wrap.appendChild(el('div','sthint','<b>The map</b> — lay the ground pieces (streets, forest, parks…) from above, then walk it. '+(used?used+' of 64 squares used.':'Nothing laid down yet.'))); }
  if(Object.keys(window.HEXCORE.WORLDADDONS||{}).length) s.wrap.appendChild(el('div','sthint','Artist add-ons (KATSEYE, Knocked Loose…) are in the <b>Add-ons</b> tab.'));   /* v85: add-ons live in Add-ons */
  s.wrap.appendChild(el('div','stsub','Start spot'));
  const st=Wc.start||(Wc.start={x:0,z:40,yaw:0});
  const sb=el('div','stbtns');
  const set=el('button','gold','set start here'); set.onclick=()=>{ if(!NAVS) return; Wc.start={x:+NAVS.pos.x.toFixed(2),z:+NAVS.pos.z.toFixed(2),yaw:+(HEX.getYaw?HEX.getYaw():0).toFixed(3)}; touch(); ui(); tip('people arrive here, facing this way'); };
  const goS=el('button','','go to start'); goS.onclick=()=>{ if(NAVS){ NAVS.pos.init=false; NAVS.eye=1.7; } };
  sb.appendChild(set); sb.appendChild(goS); s.wrap.appendChild(sb);
  s.wrap.appendChild(el('div','sthint','Arrive at <b>'+Math.round(st.x+64)+' m across, '+Math.round(st.z+64)+' m down</b>. Walk to where people should land, face the way they should look, then <b>set start here</b>.'));
  const w=window.HEXCORE.WORLD.weight(), cl={green:'#2dd4bf',amber:'#ffb020',red:'#ff5470'}[w.level];
  s.wrap.appendChild(el('div','stsub','Weight on a phone'));
  s.wrap.appendChild(el('div','sthint','<div style="display:flex;justify-content:space-between"><span>triangles</span><b style="color:'+cl+'">'+Math.round(w.tris/1000)+'k of 300k</b></div>'+
    '<div style="display:flex;justify-content:space-between"><span>textures</span><b style="color:#cfc7f2">'+w.textures+' · '+w.mpx.toFixed(1)+' MP</b></div>'+
    '<div style="display:flex;justify-content:space-between"><span>models · lights</span><b style="color:#cfc7f2">'+w.models+' · '+w.lights+'</b></div>'+
    '<div style="margin-top:6px;color:'+cl+'"><b>'+({green:'Light — runs well on phones.',amber:'Getting heavy — fine on newer phones.',red:'Too heavy for phones — shrink models or use fewer.'})[w.level]+'</b></div>'+
    '<div style="margin-top:4px">Lights only switch on when you’re near them, so many lights spread out are fine.</div>'));
  const wb=el('div','stbtns'); const rf=el('button','','refresh'); rf.onclick=()=>ui(); wb.appendChild(rf); s.wrap.appendChild(wb);
  s.wrap.appendChild(el('div','sthint','<b>Doors:</b> pick a model under <b>Models</b> and turn on <b>Opens a room</b>. It gets a glowing doorway (at its <b>DOOR_</b> part if the artist named one, '+
    'otherwise at its front), its name and a pin on the map. Walk up to it, or tap it, to go in.'));
  BODY.appendChild(s);
}
function doorControls(p,box){   /* v71: this model opens a room */
  const D=p.door||{};
  box.appendChild(el('div','stsub','In the world'));
  box.appendChild(seg('Opens a room',[['off','off'],['on','on']],D.on?'on':'off',k=>{
    p.door=Object.assign({name:p.name||'',url:'',color:'#ff5fa2'},p.door||{}); p.door.on=(k==='on'); touch(); ui(); }));
  if(D.on){
    const nm=document.createElement('input'); nm.style.cssText=inStyle; nm.value=D.name||''; nm.placeholder='the name over the door, e.g. Knocked Loose';
    nm.oninput=()=>{ D.name=nm.value; touch(); }; box.appendChild(nm);
    const u=document.createElement('input'); u.style.cssText=inStyle; u.value=D.url||''; u.placeholder='the room’s link · https://…';
    u.oninput=()=>{ D.url=u.value.trim(); touch(); }; box.appendChild(u);
    if(D.url&&!/^https?:\/\//i.test(D.url)) box.appendChild(el('div','sthint warn','The link needs to start with https://'));
    const r=el('div','stf'); r.appendChild(el('label','','Door glow'));
    const c=document.createElement('input'); c.type='color'; c.value=D.color||'#ff5fa2'; c.oninput=()=>{ D.color=c.value; touch(); }; r.appendChild(c); box.appendChild(r);
    box.appendChild(el('div','sthint','In the builder a tap just tells you where it goes. In the published world it opens the room.'));
  }
  box.appendChild(seg('Walk through',[['yes','yes'],['solid','no · solid']],p.solid?'solid':'yes',k=>{ p.solid=(k==='solid'); touch(); ui(); }));
  box.appendChild(el('div','sthint','<b>Solid</b> stops people walking through it (good for buildings). Parts the artist named <b>BLOCK_</b> are always solid.'));
}
/* ---- v72 · WORLD MAP: lay the ground pieces down from above (its own little stage on top of the builder) ---- */
let WMAP=null; const WTHUMB={}; window.__wmap=()=>WMAP;   /* v72 (tests reach the open map through this) */
function parsePieceName(n){ const m=/TRIO_([NC])\d*_([^_.]+)_(\d)x\d(?:_([NPCR]{4}))?/i.exec(n||'');
  if(!m) return {name:String(n||'piece').replace(/\.[a-z0-9]+$/i,'').replace(/[_-]+/g,' '),f:null,e:null,size:1};
  return {name:m[2].replace(/-/g,' '),f:m[1].toUpperCase(),e:m[4]?m[4].toUpperCase():null,size:+m[3]===2?2:1}; }
function openWorldMap(){
  if(WMAP||!WORLDSP) return;
  const C=window.HEXCORE, W=C.WORLD, M=LOOK.mood, Wc=M.world||(M.world=W.defaults()), SQ=W.SQ, NG=W.NG, HALF=SQ*NG/2;
  C.WORLDBUF=id=>Promise.resolve(ASSETS[id]&&ASSETS[id].buf||null);
  const lib=Wc.lib||(Wc.lib=[]);
  const cells=JSON.parse(JSON.stringify((Wc.map&&Wc.map.cells)||[])); while(cells.length<NG*NG) cells.push(null);
  const ui0=document.createElement('div'); ui0.id='wmap'; ui0.setAttribute('data-stage','');
  ui0.innerHTML='<canvas></canvas><div class="wtop"><b>WORLD · MAP</b><button data-v="top" class="on">bird’s eye</button><button data-v="tilt">tilted</button>'+
    '<button data-a="sample">sample town</button><button data-a="clear">clear</button><button data-a="walk" class="hot">walk it ›</button></div>'+
    '<div class="wtray"><div class="wkits"></div><div class="wtabs"><button data-f="N">Nature</button><button data-f="C">City</button></div><div class="wpcs"></div><div class="wed"></div>'+
    '<div class="wtools"><button data-t="paint" class="on">place</button><button data-t="turn">turn</button><button data-t="erase">erase</button><button data-a="rot">↻ rotate (R)</button></div>'+
    '<div class="whint">Pick a piece, then <b>click or drag</b> across squares. <b>R</b> turns it. Red edges = pieces that don’t join. Shift-drag or right-drag moves the map, the wheel zooms.</div></div>'+
    '<div class="winfo"><b>1 land tile · 8 × 8 squares</b><br>each square 16 m<br><span class="wcount"></span><br><span class="wwarn"></span></div>';
  document.body.appendChild(ui0);
  const q=s=>ui0.querySelector(s), cv=q('canvas');
  const R=new T.WebGLRenderer({canvas:cv,antialias:true}); R.setPixelRatio(Math.min(devicePixelRatio,2)); R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.ACESFilmicToneMapping; R.toneMappingExposure=1.05;
  const S=new T.Scene(); S.background=new T.Color('#0a0915');
  const lights=sc=>{ sc.add(new T.HemisphereLight(0xc9c4ff,0x2a2216,1.15)); const d=new T.DirectionalLight(0xffe6c8,1.4); d.position.set(-60,120,40); sc.add(d); }; lights(S);
  const base=new T.Mesh(new T.BoxGeometry(SQ*NG+2,1,SQ*NG+2),new T.MeshStandardMaterial({color:0x14131c})); base.position.y=-.62; S.add(base);
  { const lm=new T.LineBasicMaterial({color:0x6a62a8,transparent:true,opacity:.55}); for(let i=0;i<=NG;i++){ const p=-HALF+i*SQ;
      S.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(p,.2,-HALF),new T.Vector3(p,.2,HALF)]),lm)); S.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(-HALF,.2,p),new T.Vector3(HALF,.2,p)]),lm)); }
    const em=new T.MeshBasicMaterial({color:new T.Color((M.open&&M.open.rim)||'#f5d400')}); [[0,-HALF,SQ*NG+.4,.3],[0,HALF,SQ*NG+.4,.3],[-HALF,0,.3,SQ*NG],[HALF,0,.3,SQ*NG]].forEach(([x,z,w,d])=>{ const b=new T.Mesh(new T.BoxGeometry(w,.2,d),em); b.position.set(x,.12,z); S.add(b); }); }
  /* your buildings and models, as see-through boxes, so you can plan round them */
  const pm=new T.MeshBasicMaterial({color:0xb9a6ff,transparent:true,opacity:.35,depthWrite:false});
  (LOOK.props||[]).forEach(p=>{ const g=OBJ[p.id]; if(!g) return; const b=new T.Box3().setFromObject(g); if(b.isEmpty()) return; const s=b.getSize(new T.Vector3()), c=b.getCenter(new T.Vector3());
    if(s.x>60||s.z>60) return; const m=new T.Mesh(new T.BoxGeometry(Math.max(.5,s.x),Math.max(.5,s.y),Math.max(.5,s.z)),pm); m.position.copy(c); S.add(m); });
  const board=new T.Group(); S.add(board); const objs={};
  const owner=i=>{ const c=cells[i]; return c&&c.cover!=null?c.cover:(c?i:-1); };
  const sizeOf=id=>{ const pc=W.piece(id,M); return pc&&pc.size===2?2:1; };
  function clearAt(i){ const a=owner(i); if(a<0) return; const c=cells[a]; if(objs[a]){ board.remove(objs[a]); delete objs[a]; }
    if(c&&sizeOf(c.id)===2) [a,a+1,a+NG,a+NG+1].forEach(k=>{ if(k<NG*NG&&(k===a||(cells[k]&&cells[k].cover===a))) cells[k]=null; }); cells[a]=null; }
  function draw(a){ const c=cells[a]; if(objs[a]){ board.remove(objs[a]); delete objs[a]; } if(!c||!c.id) return; const sz=sizeOf(c.id);
    const o=W.buildPiece(c.id,M); const [x,z]=W.cellXZ(a,sz); o.position.set(x,0,z); o.rotation.y=-(c.rot||0)*Math.PI/2; board.add(o); objs[a]=o; }
  function place(i,id,rot){ const sz=sizeOf(id), cx=i%NG, cz=Math.floor(i/NG); if(sz===2&&(cx>=NG-1||cz>=NG-1)) return;
    const span=sz===2?[i,i+1,i+NG,i+NG+1]:[i]; span.forEach(clearAt); cells[i]={id,rot}; span.slice(1).forEach(k=>{ cells[k]={cover:i}; }); draw(i); }
  for(let i=0;i<NG*NG;i++) if(cells[i]&&cells[i].id) draw(i);
  const bad=new T.Group(); S.add(bad); const badM=new T.MeshBasicMaterial({color:0xff3b55});
  function check(){ while(bad.children.length) bad.remove(bad.children[0]); const iss=W.edgeIssues({cells},M);
    iss.forEach(({i,side})=>{ const [x,z]=W.cellXZ(i,1); const b=new T.Mesh(new T.BoxGeometry(side===1?.6:SQ-1,1.2,side===1?SQ-1:.6),badM); b.position.set(side===1?x+SQ/2:x,.6,side===1?z:z+SQ/2); bad.add(b); });
    q('.wwarn').textContent=iss.length?(iss.length+(iss.length>1?' edges don’t join':' edge doesn’t join')):'';
    q('.wcount').textContent=cells.filter(Boolean).length+' of 64 squares used'; }
  check();
  /* cameras + picking */
  const cam=new T.OrthographicCamera(-1,1,1,-1,.1,1000); let VIEW='top', zoom=1; const pan={x:0,z:0};
  const wide=()=>innerWidth>700;
  function place0(){ const off=wide()?-(150/innerWidth)*(cam.right-cam.left):0, oz=wide()?0:(cam.top-cam.bottom)*.21;
    if(VIEW==='top'){ cam.position.set(pan.x+off,300,pan.z+oz+.001); cam.up.set(0,0,-1); cam.lookAt(pan.x+off,0,pan.z+oz); }
    else { cam.position.set(pan.x+off,170,pan.z+oz*1.6+210); cam.up.set(0,1,0); cam.lookAt(pan.x+off,0,pan.z+oz*1.6); } }
  function size(){ const w=innerWidth,h=innerHeight; R.setSize(w,h,false); const a=w/h, span=(SQ*NG+24)/zoom/2, s=a>1?span:span/a; cam.left=-s*a; cam.right=s*a; cam.top=s; cam.bottom=-s; cam.updateProjectionMatrix(); place0(); }
  const ray=new T.Raycaster(), ptr=new T.Vector2(), PL=new T.Plane(new T.Vector3(0,1,0),0), HIT=new T.Vector3();
  const cellAt=(x,y)=>{ ptr.set(x/innerWidth*2-1,-(y/innerHeight)*2+1); ray.setFromCamera(ptr,cam); if(!ray.ray.intersectPlane(PL,HIT)) return -1;
    const cx=Math.floor((HIT.x+HALF)/SQ), cz=Math.floor((HIT.z+HALF)/SQ); return (cx<0||cz<0||cx>=NG||cz>=NG)?-1:cz*NG+cx; };
  let KITV='real', SELP=null, ROT=0, TOOL='paint', FAM='C', ghost=null, gk='', down=false, last=-1, panning=null;
  function setGhost(i){ if(TOOL!=='paint'||i<0||!SELP){ if(ghost) ghost.visible=false; return; } const k=SELP+'|'+ROT;
    if(gk!==k){ if(ghost) S.remove(ghost); ghost=W.buildPiece(SELP,M); const fade=g=>g.traverse(o=>{ if(o.isMesh&&o.material&&!o.material._wg){ o.material=o.material.clone(); o.material._wg=1; o.material.transparent=true; o.material.opacity=.5; } });
      fade(ghost); ghost.userData.onReady=fade; ghost.rotation.y=-ROT*Math.PI/2; S.add(ghost); gk=k; }
    const [x,z]=W.cellXZ(i,sizeOf(SELP)); ghost.position.set(x,.15,z); ghost.visible=true; }
  function act(i){ if(i<0) return; if(TOOL==='paint'&&SELP) place(i,SELP,ROT); else if(TOOL==='erase') clearAt(i);
    else if(TOOL==='turn'&&i!==last){ const a=owner(i); if(a>=0){ cells[a].rot=((cells[a].rot||0)+1)%4; draw(a); } } check(); }
  cv.addEventListener('pointerdown',e=>{ if(e.button===2||e.shiftKey){ panning={x:e.clientX,y:e.clientY,px:pan.x,pz:pan.z}; return; } down=true; last=-1; const i=cellAt(e.clientX,e.clientY); act(i); last=i; });
  const mv=e=>{ if(panning){ const k=(cam.right-cam.left)/innerWidth; pan.x=panning.px-(e.clientX-panning.x)*k; pan.z=panning.pz-(e.clientY-panning.y)*k*(VIEW==='top'?1:1.4); place0(); return; }
    if(e.target!==cv){ if(ghost) ghost.visible=false; return; } const i=cellAt(e.clientX,e.clientY); setGhost(i); if(down&&i!==last&&TOOL!=='turn'){ act(i); last=i; } };
  const up=()=>{ down=false; panning=null; };
  addEventListener('pointermove',mv); addEventListener('pointerup',up);
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('wheel',e=>{ zoom=Math.max(.8,Math.min(4,zoom*(e.deltaY<0?1.12:1/1.12))); size(); },{passive:true});
  const key=e=>{ if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName||'')) return; if(e.key==='r'||e.key==='R'){ ROT=(ROT+1)%4; e.stopImmediatePropagation(); } if(e.key==='Escape') close(); };
  addEventListener('keydown',key,true);
  addEventListener('resize',size);
  /* the tray */
  const tR=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); tR.setSize(140,140); tR.outputColorSpace=T.SRGBColorSpace; tR.toneMapping=T.ACESFilmicToneMapping;
  const tS=new T.Scene(); tS.background=new T.Color('#16151f'); lights(tS); const tC=new T.OrthographicCamera(-8.4,8.4,8.4,-8.4,.1,300); tC.position.set(0,120,.001); tC.up.set(0,0,-1); tC.lookAt(0,0,0);
  function thumb(pc){ if(WTHUMB[pc.id]) return WTHUMB[pc.id]; const g=W.buildPiece(pc.id,M), s=(pc.size===2?2:1)*8.4;
    const shot=()=>{ tC.left=-s; tC.right=s; tC.top=s; tC.bottom=-s; tC.updateProjectionMatrix(); tS.add(g); tR.render(tS,tC); WTHUMB[pc.id]=tR.domElement.toDataURL('image/jpeg',.85); tS.remove(g); };
    if(pc.b){ { const kr=W.kitReady&&W.kitReady(pc.kit); if(kr){ kr.then(()=>tray()); return null; } }   /* v77: an outside kit's textures first */
      if(pc.kit==='real'&&W.texBusy&&W.texBusy()){ W.texReady().then(()=>tray()); return null; } shot(); return WTHUMB[pc.id]; }   /* v75: wait for the kit textures, or the picture comes out black */ g.userData.onReady=()=>{ shot(); tray(); }; return null; }
  const all=()=>W.KIT.concat(lib.map(L=>Object.assign({custom:true},L)));
  function tray(){ ui0.querySelectorAll('.wtabs button').forEach(b=>b.classList.toggle('on',b.dataset.f===FAM)); const P=q('.wpcs'); P.innerHTML='';
    { const K=q('.wkits'); K.innerHTML=''; const AD=window.HEXCORE.WORLDADDONS||{}, ON=(LOOK.mood&&LOOK.mood.world&&LOOK.mood.world.addons)||{};   /* v85: an add-on's kit shows only when the add-on is on */
      const adOf=id=>Object.keys(AD).find(a=>(AD[a].kits||[]).indexOf(id)>=0);
      const shown=W.KITS.filter(kt=>{ const a=adOf(kt.id); return !a||(ON[a]&&ON[a].on); }); if(!shown.some(kt=>kt.id===KITV)&&shown.length) KITV=shown[0].id;
      shown.forEach(kt=>{ const a=adOf(kt.id), b=el('button',kt.id===KITV?'on':'',a?(AD[a].kitName||AD[a].name):kt.name+' kit'); b.onclick=()=>{ KITV=kt.id; tray(); }; K.appendChild(b); }); }
    all().filter(k=>k.f===FAM&&(k.custom||k.kit===KITV)).forEach(k=>{ const d=el('div','wpc'+(k.id===SELP?' sel':'')); const im=thumb(k);
      d.innerHTML=(im?'<img src="'+im+'">':'<div class="wph">loading…</div>')+'<s></s><i></i>'; d.querySelector('s').textContent=k.name+(k.custom?' ★':''); d.querySelector('i').textContent=(k.custom?'yours':k.id)+' · '+String(k.e).split('').join(' ')+(k.size===2?' · 2×2':'');
      d.onclick=()=>{ SELP=k.id; ROT=0; tool('paint'); tray(); }; P.appendChild(d); });
    const add=el('div','wpc wadd','<b>+</b><s>add your piece</s><i>.glb from the Blender kit</i>'); add.onclick=addPiece; P.appendChild(add);
    editor(); }
  function editor(){ const E=q('.wed'); E.innerHTML=''; const L=lib.find(x=>x.id===SELP); if(!L) return;
    E.appendChild(el('div','wsub','Your piece'));
    const nm=document.createElement('input'); nm.value=L.name||''; nm.placeholder='name'; nm.oninput=()=>{ L.name=nm.value; }; nm.onchange=tray; E.appendChild(nm);
    const ed=document.createElement('input'); ed.value=L.e; ed.placeholder='edges N E S W, e.g. RCRC'; ed.maxLength=4;
    ed.oninput=()=>{ const v=ed.value.toUpperCase().replace(/[^NPCR]/g,''); if(v.length===4){ L.e=v; check(); tray(); } }; E.appendChild(ed);
    const row=el('div','wrow'); [['N','Nature'],['C','City']].forEach(([k,t])=>{ const b=el('button',L.f===k?'on':'',t); b.onclick=()=>{ L.f=k; FAM=k; tray(); }; row.appendChild(b); });
    [[1,'1×1'],[2,'2×2']].forEach(([k,t])=>{ const b=el('button',(L.size||1)===k?'on':'',t); b.onclick=()=>{ if((L.size||1)===k) return; for(let i=0;i<NG*NG;i++) if(cells[i]&&cells[i].id===L.id) clearAt(i); L.size=k; delete WTHUMB[L.id]; check(); tray(); }; row.appendChild(b); });
    const rm=el('button','red','remove'); rm.onclick=()=>{ if(!confirm('Remove “'+L.name+'” from the library? It comes off the map too.')) return; for(let i=0;i<NG*NG;i++) if(cells[i]&&cells[i].id===L.id) clearAt(i); lib.splice(lib.indexOf(L),1); SELP=null; check(); tray(); };
    row.appendChild(rm); E.appendChild(row);
    E.appendChild(el('div','whint','Edges: <b>N</b> nature · <b>P</b> path · <b>C</b> city · <b>R</b> road — north, east, south, west (see the kit spec).')); }
  function addPiece(){ pick('.glb,.gltf',fs=>{ [...fs].forEach(f=>addAsset(f).then(a=>{ if(a.k!=='glb') return tip('that wants a .glb piece');
      const n=parsePieceName(a.name), L={id:'u'+Date.now().toString(36)+Math.floor(Math.random()*999), name:n.name, f:n.f||FAM, e:n.e||((n.f||FAM)==='C'?'CCCC':'NNNN'), size:n.size, asset:a.id};
      lib.push(L); FAM=L.f; SELP=L.id; ROT=0; tool('paint'); tray(); touch(); })); }); }
  function tool(t){ TOOL=t; ui0.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x.dataset.t===t)); if(ghost) ghost.visible=false; }
  ui0.querySelectorAll('.wtabs button').forEach(b=>b.onclick=()=>{ FAM=b.dataset.f; tray(); });
  ui0.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>tool(b.dataset.t));
  ui0.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{ VIEW=b.dataset.v; ui0.querySelectorAll('[data-v]').forEach(x=>x.classList.toggle('on',x===b)); place0(); });
  q('[data-a="rot"]').onclick=()=>{ ROT=(ROT+1)%4; };
  q('[data-a="clear"]').onclick=()=>{ if(!confirm('Clear every square?')) return; for(let i=0;i<NG*NG;i++) clearAt(i); check(); };
  q('[data-a="sample"]').onclick=()=>{ if(cells.some(Boolean)&&!confirm('Replace the map with the sample town?')) return; for(let i=0;i<NG*NG;i++) clearAt(i);
    const sw={}; if(KITV==='real') W.KIT.forEach(k=>{ if(k.kit==='real'&&/R$/.test(k.id)) sw[k.id.slice(0,-1)]=k.id; });   /* v75: every Realistic stand-in */   /* v73: the Realistic kit's pieces stand in where it has them */
    W.sampleMap().cells.forEach((c,i)=>{ cells[i]=Object.assign({},c,{id:sw[c.id]||c.id}); draw(i); }); check(); };
  q('[data-a="walk"]').onclick=()=>close();
  let raf=0; const loop=()=>{ R.render(S,cam); raf=requestAnimationFrame(loop); };
  function close(){ cancelAnimationFrame(raf); removeEventListener('pointermove',mv); removeEventListener('pointerup',up); removeEventListener('keydown',key,true); removeEventListener('resize',size);
    Wc.map={cells:cells.slice()}; R.dispose(); tR.dispose(); ui0.remove(); WMAP=null; touch(); applyMoodNow(); ui(); tip('back in the world — walk it'); }
  WMAP={close, cells, place, check, act:(i)=>act(i), lib, screenOf:i=>{ const [x,z]=W.cellXZ(i,1), v=new T.Vector3(x,0,z).project(cam); return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight]; }, warn:()=>q('.wwarn').textContent, count:()=>q('.wcount').textContent, set:(o)=>{ if(o.sel) SELP=o.sel; if(o.tool) tool(o.tool); if(o.rot!=null) ROT=o.rot; if(o.fam){ FAM=o.fam; tray(); } }};
  FAM='C'; SELP='C01R'; tray(); size(); loop();
}
function uplightSection(){
  const M=LOOK.mood, go=()=>{ applyMoodNow(); touch(); };
  const s=sec('Uplights',true);
  s.wrap.appendChild(seg('Uplights',[['0','none'],['3','3'],['6','6']],String(+M.ups||0),k=>{ M.ups=+k; go(); ui(); }));
  if(+M.ups) s.wrap.appendChild(seg('At the start',[['on','on'],['off','off · waits']],M.upsStart==='off'?'off':'on',k=>{ M.upsStart=k; window.HEXCORE.upK(HEX,k==='off'?0:1); touch(); ui(); }));
  if(+M.ups){
    const r=el('div','stf'); r.appendChild(el('label','','Colour'));
    const i=document.createElement('input'); i.type='color'; i.value=M.upColor||'#e8e39a';
    i.oninput=()=>{ M.upColor=i.value; go(); }; r.appendChild(i); s.wrap.appendChild(r);
    s.wrap.appendChild(slider('Strength',M.upStrength==null?1:M.upStrength,0,2,.01,v=>Math.round(v*100)+'%',v=>{ M.upStrength=v; go(); }));
  }
  s.wrap.appendChild(el('div','sthint','Cans at the foot of the walls, washing light up them. Flicker, pulse-to-the-music '+
    'and the rest come in the lighting build.'));
  return s;
}
function hangSection(){
  const s=sec('Where they hang',true), R=LOOK.racks;
  const pw=R.photo.wall, vw=R.video.wall;
  let svg='<svg viewBox="0 0 120 120" style="width:110px;height:110px;flex:none">';
  for(let i=0;i<6;i++){
    const a1=(-120+i*60)*Math.PI/180, a2=(-60+i*60)*Math.PI/180, am=(-90+i*60)*Math.PI/180;
    const c=i===pw?'#e7e2a0':i===vw?'#8fd3ff':'rgba(236,233,223,.3)', w=(i===pw||i===vw)?7:3;
    svg+='<line x1="'+(60+48*Math.cos(a1)).toFixed(1)+'" y1="'+(60+48*Math.sin(a1)).toFixed(1)+'" x2="'+(60+48*Math.cos(a2)).toFixed(1)+
      '" y2="'+(60+48*Math.sin(a2)).toFixed(1)+'" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round"/>';
    svg+='<text x="'+(60+33*Math.cos(am)).toFixed(1)+'" y="'+(60+33*Math.sin(am)+4).toFixed(1)+'" text-anchor="middle" '+
      'style="font:600 11px IBM Plex Mono,monospace;fill:#ece9df">'+i+'</text>';
  }
  svg+='<circle cx="60" cy="88" r="3" fill="#ece9df"/><text x="60" y="104" text-anchor="middle" style="font:500 8px IBM Plex Mono,monospace;fill:#9b978b">YOU</text></svg>';
  const top=el('div',''); top.style.cssText='display:flex;gap:12px;align-items:center;padding:4px 4px 6px';
  top.innerHTML=svg;
  const key=el('div','sthint','<span style="color:#e7e2a0">■</span> photos &nbsp; <span style="color:#8fd3ff">■</span> videos<br>'+
    'Wall 0 is the one you face when you walk in. A wall holds one set — pick a taken wall and they swap.');
  key.style.padding='0'; top.appendChild(key); s.wrap.appendChild(top);
  const opts=[['0','0'],['1','1'],['2','2'],['3','3'],['4','4'],['5','5'],['-1',"don't show"]];
  const pick=(k,other)=>v=>{ const n=+v, cur=R[k].wall;
    if(n!==-1&&R[other].wall===n) R[other].wall=cur;            /* taken: they trade places */
    R[k].wall=n; buildRacks(); touch(); ui(); };
  s.wrap.appendChild(seg('Photos on',opts,String(pw),pick('photo','video')));
  s.wrap.appendChild(seg('Videos on',opts,String(vw),pick('video','photo')));
  return s;
}
/* ---- v44 · glow on any model (Mood Room) ---- */
function glowControls(p,box){
  const G=p.glow, on=!!(G&&G.on);
  const go=()=>{ window.HEXCORE.glowApply(p,OBJ[p.id]); touch(); };
  box.appendChild(seg('Glow',[['off','off'],['on','on']],on?'on':'off',k=>{
    if(k==='on'){ p.glow=Object.assign(window.HEXCORE.glowDefaults(),p.glow||{},{on:true}); } else if(p.glow) p.glow.on=false;
    go(); ui(); }));
  if(!on) return;
  const r=el('div','stf'); r.appendChild(el('label','','Glow colour'));
  const i=document.createElement('input'); i.type='color'; i.value=G.color||'#fff3c4'; i.oninput=()=>{ G.color=i.value; touch(); };
  r.appendChild(i); box.appendChild(r);
  box.appendChild(slider('Glow strength',G.strength==null?2.2:G.strength,1,4,.05,v=>Math.round(v*100)+'%',v=>{ G.strength=v; touch(); }));
  box.appendChild(slider('Light on room',G.light==null?1:G.light,0,3,.05,v=>v>0?Math.round(v*100)+'%':'none',v=>{ G.light=v; touch(); }));
  box.appendChild(seg('Behaviour',[['steady','steady'],['flicker','flicker'],['breathe','breathe'],['pulse','pulse'],['strobe','strobe']],G.mode||'steady',
    k=>{ G.mode=k; touch(); ui(); }));
  box.appendChild(seg('Glow at the start',[['on','glowing'],['off','dark · waits']],G.start==='off'?'off':'on',k=>{ G.start=k; window.HEXCORE.startState(p,OBJ[p.id]); touch(); ui(); }));
  box.appendChild(el('div','sthint','<b>Glow strength</b> is how hot the model itself burns (the halo blooms round it). '+
    '<b>Light on room</b> is how much it lights the floor and walls. <b>Pulse</b> follows the music.'));
}
/* v45 · glow on a set's models — same controls, prefixed like the rest of the set's model rows */
function setGlowControls(w,M,ch){
  w.appendChild(seg('· at the start',[['shown','shown'],['hidden','hidden · waits']],M.startHidden?'hidden':'shown',k=>{ M.startHidden=(k==='hidden'); ch(); ui(); }));
  const who=trigWho('set:'+M.id); if(who.length) w.appendChild(el('div','sthint','⚡ set off from the room by <b>'+who.map(eggEsc2).join(', ')+'</b>'));
  const G=M.glow, on=!!(G&&G.on);
  w.appendChild(seg('· glow',[['off','off'],['on','on']],on?'on':'off',k=>{
    if(k==='on') M.glow=Object.assign(window.HEXCORE.glowDefaults(),M.glow||{},{on:true}); else if(M.glow) M.glow.on=false;
    ch(); ui(); }));
  if(!on) return;
  const r=el('div','stf'); r.appendChild(el('label','','· glow colour'));
  const i=document.createElement('input'); i.type='color'; i.value=G.color||'#fff3c4'; i.oninput=()=>{ G.color=i.value; touch(); };
  r.appendChild(i); w.appendChild(r);
  w.appendChild(slider('· glow strength',G.strength==null?2.2:G.strength,1,4,.05,v=>Math.round(v*100)+'%',v=>{ G.strength=v; touch(); }));
  w.appendChild(slider('· light in the set',G.light==null?1:G.light,0,3,.05,v=>v>0?Math.round(v*100)+'%':'none',v=>{ G.light=v; touch(); }));
  w.appendChild(seg('· behaviour',[['steady','steady'],['flicker','flicker'],['breathe','breathe'],['pulse','pulse'],['strobe','strobe']],G.mode||'steady',k=>{ G.mode=k; touch(); ui(); }));
  w.appendChild(seg('· glow at the start',[['on','glowing'],['off','dark · waits']],G.start==='off'?'off':'on',k=>{ G.start=k; ch(); ui(); }));
}
/* ---- v49 · triggers (Mood Room): a tap here sets things off there ---- */
const propLabel=p=>p.type==='switch'?(p.name||'switch'):(p.type==='playme'?'PLAY ME tile':(p.name||(p.type==='glb'?'model':p.type)));
function trigTargets(p){
  const out=LOOK.props.filter(q=>q.id!==p.id).map(q=>[q.id,propLabel(q),'In the room']);
  (LOOK.sets||[]).forEach(st=>(st.models||[]).forEach((M,j)=>out.push(['set:'+M.id, modelName(M,j).replace(/^\d+ · /,''), 'In '+(st.name||'a set')])));
  if(MOODSP){ out.push(['uplights','the uplights','The room']); out.push(['sky','the sky (roof)','The room']); out.push(['vibe','the visualizers','The room']); }   /* v57 */
  if(MOODSP&&(LOOK.lights||[]).some(L=>L.kind==='search')) out.push(['search','the event searchlights','The room']);   /* v74 */
  if(MOODSP) Object.keys(LOOK.windows||{}).forEach(k=>{ const W=LOOK.windows[k]; if(W&&W.on&&W.cut&&W.cut.closed) out.push(['win:'+k,'window · wall '+k.replace('wall',''),'The room']); });   /* v65 */
  return out.filter(o=>o[0]!==p.id);   /* v83: never itself (a window model) */
}
function trigEggOf(t){ if(t==null||t==='uplights'||t==='search') return null;   /* v52: the egg on a trigger target, if it has one on */
  if(String(t).indexOf('set:')===0){ const id=String(t).slice(4); let e=null; (LOOK.sets||[]).forEach(st=>(st.models||[]).forEach(M=>{ if(String(M.id)===id&&M.egg&&M.egg.on) e=M.egg; })); return e; }
  const q=LOOK.props.find(x=>x.id===t); return q&&q.egg&&q.egg.on?q.egg:null; }
function eggStartSeg(lbl, egg, tk, ch){   /* v52: an egg can wait, hidden, until a trigger shows it */
  return seg(lbl,[['on','showing'],['off','hidden · waits']],egg.start==='off'?'off':'on',k=>{ egg.start=k; delete window.HEXCORE.EGGK[tk]; ch(); ui(); }); }
function trigWho(id){ const hit=T=>T&&T.on&&(T.acts||[]).some(a=>a.t===id); const out=LOOK.props.filter(q=>hit(q.trig)).map(propLabel);
  (LOOK.sets||[]).forEach(st=>(st.models||[]).forEach((M,j)=>{ if(hit(M.trig)) out.push(modelName(M,j).replace(/^\d+ · /,'')); })); return out; }   /* v83: window models count too */
function newSwitch(){
  const p=propRec('switch'); p.name='switch '+(LOOK.props.filter(q=>q.type==='switch').length+1);
  const q=inFront(3.2); p.pos=[q.x,0,q.z]; p.shadow=false;
  p.trig={on:true,mode:'once',acts:[]};
  addProp(p,()=>select(p.id)); ui();
}
function trigPlay(p){ window.HEXCORE.TRIGFIRED[p.id]=false; if(window.HEXCORE.TRIGLAST) window.HEXCORE.TRIGLAST[p.id]=0;
  if(p.trig&&p.trig.when==='song'&&p.egg){ const b=(p.egg.blocks||[]).find(x=>x.t==='song'&&x.asset); const u=b&&eggURL(b.asset); if(u) window.HEXCORE.playSong(u,HEX); }   /* v57 */
  window.HEXCORE.trigFire(p,HEX); tip('playing the moment — hit reset to put it back'); }
function trigResetAll(){ window.HEXCORE.trigReset(LOOK.props,HEX,LOOK.sets); tip('back to how the room starts'); }
function trigControls(p,box){
  const isSw=p.type==='switch';
  if(!isSw) box.appendChild(seg('Tap sets things off',[['off','off'],['on','on']],p.trig&&p.trig.on?'on':'off',k=>{
    if(k==='on') p.trig=Object.assign({mode:'once',acts:[]},p.trig||{},{on:true}); else if(p.trig) p.trig.on=false; touch(); ui(); }));
  const T=p.trig; if(!T||!T.on) return;
  const hasSong=!!(p.egg&&p.egg.on&&(p.egg.blocks||[]).some(b=>b.t==='song'&&b.asset));   /* v57 */
  if(hasSong) box.appendChild(seg('Sets things off',[['tap','when tapped'],['song','when its song plays']],T.when==='song'?'song':'tap',k=>{ T.when=k; touch(); ui(); }));
  box.appendChild(el('div','stsub',T.when==='song'&&hasSong?'When its song plays':'When tapped'));
  const opts=trigTargets(p);
  (T.acts||[]).forEach((a,j)=>{
    const card=el('div','stctl');
    const r=el('div','stf'); r.appendChild(el('label','',(j+1)+' · this'));
    const s=document.createElement('select'); const grp={};
    opts.forEach(([v,t,gname])=>{ let og=grp[gname]; if(!og){ og=grp[gname]=document.createElement('optgroup'); og.label=gname; s.appendChild(og); }
      const o=document.createElement('option'); o.value=v; o.textContent=t; if(a.t===v) o.selected=true; og.appendChild(o); });
    s.onchange=()=>{ a.t=s.value; const room=(a.t==='uplights'||a.t==='vibe'||a.t==='search');
      const opn=a.t==='sky'||/^win:/.test(a.t);
      if(room&&!/^(on|off)$/.test(a.w)) a.w='on'; else if(opn&&!/^(open|close)$/.test(a.w)) a.w='open';
      else if(!room&&!opn&&/^(on|off|open|close)$/.test(a.w)) a.w='glowOn'; if(/^egg/.test(a.w)&&!trigEggOf(a.t)) a.w='glowOn'; touch(); ui(); };
    r.appendChild(s); card.appendChild(r);
    const ws=(a.t==='sky'||/^win:/.test(a.t))?[['open','opens'],['close','closes']]:(a.t==='uplights'||a.t==='vibe'||a.t==='search')?[['on','turn on'],['off','turn off']]:[['glowOn','glow on'],['glowOff','glow off'],['show','appear'],['hide','disappear']].concat(trigEggOf(a.t)?[['eggOn','egg appears'],['eggOff','egg hides']]:[]);   /* v52 */
    card.appendChild(seg('· does',ws,a.w,k=>{ a.w=k; touch(); ui(); }));
    card.appendChild(slider('· fade',a.fade==null?3:a.fade,0,8,.1,v=>v<.05?'snap':v.toFixed(1)+' s',v=>{ a.fade=v; touch(); }));
    card.appendChild(slider('· after',a.delay||0,0,8,.1,v=>v<.05?'right away':v.toFixed(1)+' s',v=>{ a.delay=v; touch(); }));
    const xb=el('div','stbtns'); const x=el('button','red','remove'); x.onclick=()=>{ T.acts.splice(j,1); touch(); ui(); }; xb.appendChild(x); card.appendChild(xb);
    box.appendChild(card);
  });
  const ab=el('div','stbtns');
  const add=el('button','gold','+ something happens'); add.onclick=()=>{ if(!opts.length) return tip('add the thing you want to change first');
    const t=opts[0][0]; (T.acts||(T.acts=[])).push({t:t, w:(t==='uplights'||t==='vibe'||t==='search')?'on':(t==='sky'||/^win:/.test(t))?'open':'glowOn', fade:3, delay:0}); touch(); ui(); };
  ab.appendChild(add); box.appendChild(ab);
  box.appendChild(seg('Each tap',[['once','once · stays on'],['toggle','flips on / off']],T.mode==='toggle'?'toggle':'once',k=>{ T.mode=k; touch(); ui(); }));
  const pb=el('div','stbtns');
  const pl=el('button','gold','▶ play the moment'); pl.onclick=()=>trigPlay(p);
  const rs=el('button','','reset the room'); rs.onclick=trigResetAll;
  pb.appendChild(pl); pb.appendChild(rs); box.appendChild(pb);
  box.appendChild(el('div','sthint','Set how each thing <b>starts</b> on the thing itself (a glow can start <b>dark · waits</b>; anything can start <b>hidden</b>). '+
    'Fans tap '+(isSw?'this glint':'this')+' in the published room — try it with <b>preview as a fan</b>.'));
}
function startControls(p,box){
  box.appendChild(seg('At the start',[['shown','shown'],['hidden','hidden · waits']],p.startHidden?'hidden':'shown',k=>{
    p.startHidden=(k==='hidden'); window.HEXCORE.startState(p,OBJ[p.id]); touch(); ui(); }));
  const who=trigWho(p.id);
  if(who.length) box.appendChild(el('div','sthint','⚡ set off by <b>'+who.map(eggEsc2).join(', ')+'</b>'));
}
const eggEsc2=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
/* v51 · how Easter eggs open in this room, in this artist's colours */
function eggStyleSection(){
  const U=LOOK.ui||(LOOK.ui={}), S=U.eggStyle||(U.eggStyle={preset:'mood',float:true});
  const go=()=>{ window.HEXCORE.EGGSTYLE=S; touch(); };
  const s=sec('Easter egg pop-ups',true);
  s.wrap.appendChild(seg('Opens as',[['float','floating in the room'],['sheet','classic card']],S.float===false?'sheet':'float',k=>{ S.float=(k==='float'); go(); ui(); }));
  s.wrap.appendChild(seg('Colours',[['mood','mood'],['trio','Trio'],['custom','my own']],S.preset||'mood',k=>{
    if(k==='custom'&&S.preset!=='custom'){ const b=window.HEXCORE.EGGPRESETS[S.preset]||window.HEXCORE.EGGPRESETS.mood;
      Object.assign(S,{bg:'#101012',fg:b.fg,dim:b.dim,hot:b.hot,btn:b.btn,btnfg:b.btnfg}); }
    S.preset=k; go(); ui(); }));
  if(S.preset==='custom') [['bg','Background'],['fg','Text'],['dim','Small text'],['hot','Highlight'],['btn','Button'],['btnfg','Button text']].forEach(([k,lab])=>{
    const r=el('div','stf'); r.appendChild(el('label','',lab));
    const i=document.createElement('input'); i.type='color'; i.value=S[k]||'#ffffff'; i.oninput=()=>{ S[k]=i.value; go(); };
    r.appendChild(i); s.wrap.appendChild(r); });
  const b=el('div','stbtns'); const pv=el('button','gold','show me a pop-up');
  pv.onclick=()=>{ const q=inFront(3); window.HEXCORE.openEgg({blocks:[{t:'title',text:'The first amp'},
      {t:'text',text:'This is the amp from the garage where it all started. It blew a fuse halfway through the first take and they kept it in.'},
      {t:'link',url:'https://triomusic.co',label:'hear it'}]},()=>null,null,3,HEX,{anchor:new T.Vector3(q.x,1.4,q.z)}); };
  b.appendChild(pv); s.wrap.appendChild(b);
  s.wrap.appendChild(el('div','sthint','One look for every Easter egg in this room. <b>Floating</b> hangs the card beside what was tapped, with a thread of light back to it; the room keeps playing. '+
    'Pick <b>my own</b> to match the artist.'));
  return s;
}
function applyMoodNow(){ if(MOODSP&&LOOK&&LOOK.mood){ window.HEXCORE.SKYURL=id=>ASSETS[id]&&ASSETS[id].url; window.HEXCORE.applyMood(HEX, LOOK.mood, window.HEXMOODTEX||{}); } }
function addLight(kind){
  if(!LOOK.lights) LOOK.lights=[];
  const L=window.HEXCORE.newLight('L'+(LOOK.seq++),kind);
  /* land where you can see it: a little ahead and below the top of the frame */
  const q=inFront(ISBOX?4.2:3.4);
  L.pos=[q.x,kind==='key'?6:(ISBOX?3.2:4.2),q.z];
  L.target=[q.x*.3,0,q.z*.3];
  L.name=window.HEXCORE.LIGHTKINDS[kind].label;
  if(kind==='search'){ const q2=inFront(WORLDSP?16:(ISBOX?3:5)); L.pos=[q2.x,0,q2.z]; L.target=[q2.x,0,q2.z]; L.intensity=1; L.color='#ffffff'; L.search=window.HEXCORE.searchDefaults(); }   /* v74 */
  LOOK.lights.push(L);
  LOBJ[L.id]=mkLight(L);
  touch(); select(L.id); ui();
  tip('drag the can to move it · drag the gold ring to aim it');
}
function removeLight(id){
  const i=(LOOK.lights||[]).findIndex(L=>L.id===id); if(i<0) return;
  LOOK.lights.splice(i,1);
  if(LOBJ[id]){ HEX.scene.remove(LOBJ[id]); delete LOBJ[id]; }
  if(SEL===id) select(null);
  touch(); ui();
}
function pickLight(x,y){
  setPtr(x,y);
  if(litCfg().handles===false) return null;               /* hidden cans can't be grabbed */
  const roots=Object.keys(LOBJ).map(k=>LOBJ[k].userData.fixture).filter(Boolean);
  if(!roots.length) return null;
  const h=RAY.intersectObjects(roots,true).filter(r=>r.object.isMesh)[0];
  if(!h) return null;
  let o=h.object; while(o&&!o.userData.lightId) o=o.parent;
  return o?{id:o.userData.lightId,point:h.point}:null;
}
let AIM=null, AIMDRAG=null;
function syncAim(){
  const L=(LOOK&&LOOK.lights||[]).find(x=>x.id===SEL);
  const want=L&&L.kind!=='point'&&L.kind!=='search'&&litCfg().handles!==false;
  if(!want){ if(AIM) AIM.visible=false; return; }
  if(!AIM){
    AIM=new T.Group(); AIM.userData.isAim=true;
    const ring=new T.Mesh(new T.TorusGeometry(.34,.035,8,40), new T.MeshBasicMaterial({color:0xfbbf24,transparent:true,opacity:.95,depthTest:false}));
    ring.rotation.x=Math.PI/2; ring.renderOrder=20;
    const dotm=new T.Mesh(new T.SphereGeometry(.07,12,8), new T.MeshBasicMaterial({color:0xfbbf24,depthTest:false}));
    dotm.renderOrder=20;
    const hit=new T.Mesh(new T.CylinderGeometry(.55,.55,.3,16), new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
    const lg=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);
    const line=new T.Line(lg,new T.LineDashedMaterial({color:0xfbbf24,dashSize:.18,gapSize:.12,transparent:true,opacity:.7,depthTest:false}));
    line.renderOrder=19;
    AIM.add(ring); AIM.add(dotm); AIM.add(hit); HEX.scene.add(AIM); HEX.scene.add(line);
    AIM.userData.hit=hit; AIM.userData.line=line;
    HEX.onFrame.push(()=>{ if(!AIM.visible){ AIM.userData.line.visible=false; return; }
      const L2=(LOOK.lights||[]).find(x=>x.id===AIM.userData.id); if(!L2){ AIM.visible=false; return; }
      AIM.position.set(L2.target[0],L2.target[1]+.02,L2.target[2]);
      const pa=AIM.userData.line.geometry.attributes.position;
      pa.setXYZ(0,L2.pos[0],L2.pos[1],L2.pos[2]); pa.setXYZ(1,L2.target[0],L2.target[1],L2.target[2]); pa.needsUpdate=true;
      AIM.userData.line.computeLineDistances(); AIM.userData.line.visible=true; });
  }
  AIM.userData.id=L.id; AIM.visible=true;
}
function pickAim(x,y){
  if(!AIM||!AIM.visible) return null;
  setPtr(x,y);
  return RAY.intersectObject(AIM.userData.hit,false).length?AIM.userData.id:null;
}
function beginAim(id,x,y){
  const L=(LOOK.lights||[]).find(v=>v.id===id); if(!L) return;
  PLANE.setFromNormalAndCoplanarPoint(new T.Vector3(0,1,0),new T.Vector3(L.target[0],L.target[1],L.target[2]));
  setPtr(x,y); if(!RAY.ray.intersectPlane(PLANE,HITV)) return;
  AIMDRAG={id, off:new T.Vector3(L.target[0],L.target[1],L.target[2]).sub(HITV)};
}
function moveAim(x,y){
  const L=(LOOK.lights||[]).find(v=>v.id===AIMDRAG.id); if(!L) return;
  setPtr(x,y); if(!RAY.ray.intersectPlane(PLANE,HITV)) return;
  const q=HITV.clone().add(AIMDRAG.off), cl=RM.clamp(q.x,q.z,.1);
  L.target[0]=cl.x; L.target[2]=cl.z; window.HEXCORE.applyLight(L,LOBJ[L.id]);
}
function lightRow(L){
  const row=el('div','strow'+(SEL===L.id?' sel':''));
  const th=el('div','th');
  th.textContent=L.kind==='spot'?'▽':(L.kind==='point'?'◉':'⌁');
  th.style.color=L.color;
  const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>';
  nm.querySelector('b').textContent=L.name||window.HEXCORE.LIGHTKINDS[L.kind].label;
  nm.querySelector('s').textContent=window.HEXCORE.LIGHTKINDS[L.kind].label+
    ' · '+(L.intensity||0).toFixed(1)+'×'+(L.pulse?' · pulses':'');
  const x=el('span','x','×'); x.onclick=e=>{ e.stopPropagation(); removeLight(L.id); };
  row.appendChild(th); row.appendChild(nm); row.appendChild(x);
  row.onclick=()=>select(SEL===L.id?null:L.id);
  return row;
}
/* ---- v74 · an event searchlight's own controls ---- */
function searchCtl(L){
  const box=el('div','stctl'), S=L.search||(L.search=window.HEXCORE.searchDefaults()), g=()=>LOBJ[L.id];
  const push=()=>{ window.HEXCORE.applyLight(L,g()); refreshSel(); touch(); };
  box.appendChild(colorRow('Colour',L.color,v=>{ L.color=v; push(); }));
  box.appendChild(slider('Brightness',L.intensity==null?1:L.intensity,0,2.5,.05,v=>Math.round(v*100)+'%',v=>{ L.intensity=v; push(); }));
  box.appendChild(seg('Sweep',[['slow','slow'],['medium','medium'],['fast','fast']],S.speed||'medium',k=>{ S.speed=k; push(); ui(); }));
  box.appendChild(slider('Swing',S.swing,0,90,1,v=>v.toFixed(0)+'°',v=>{ S.swing=v; push(); }));
  box.appendChild(slider('Tilt',S.tilt,0,40,1,v=>v.toFixed(0)+'° from straight up',v=>{ S.tilt=v; push(); }));
  box.appendChild(slider('Beam length',S.len,15,140,1,v=>v.toFixed(0)+' m',v=>{ S.len=v; push(); }));
  box.appendChild(seg('Trailer',[['on','shows'],['off','hidden · just the beam']],S.base===false?'off':'on',k=>{ S.base=(k==='on'); push(); ui(); }));
  box.appendChild(seg('Beam at the start',[['on','on'],['off','off · waits for a trigger']],S.start==='off'?'off':'on',k=>{ S.start=k; push(); ui(); }));
  const b=el('div','stbtns');
  const pl=el('button',L.pulse?'gold':'',L.pulse?'pulsing with the song':'pulse with the song');
  pl.onclick=()=>{ L.pulse=!L.pulse; if(!L.pulse&&g()) g().userData.pulseMul=1; push(); ui(); };
  const dup=el('button','','duplicate'); dup.onclick=()=>{ const c=JSON.parse(JSON.stringify(L)); c.id='L'+(LOOK.seq++); c.pos=[L.pos[0]+3,0,L.pos[2]]; LOOK.lights.push(c); LOBJ[c.id]=mkLight(c); touch(); select(c.id); ui(); };
  const dl=el('button','red','delete'); dl.onclick=()=>removeLight(L.id);
  [pl,dup,dl].forEach(x=>b.appendChild(x)); box.appendChild(b);
  box.appendChild(el('div','sthint','An event searchlight sweeps a beam across the sky. <b>Drag the trailer</b> to move it. '+
    'It casts no real light, so you can use as many as you like. Shines best under an open sky (World, Open Space, or a Mood Room with the roof open). '+
    'A trigger can fade every searchlight on or off: <b>the event searchlights</b>.'));
  return box;
}
function lightCtl(L){
  if(L.kind==='search') return searchCtl(L);   /* v74 */
  const box=el('div','stctl');
  const g=()=>LOBJ[L.id];
  const push=()=>{ window.HEXCORE.applyLight(L,g()); refreshSel(); touch(); };
  const nmr=el('div','stf'); nmr.appendChild(el('label','','Name'));
  const ni=document.createElement('input'); ni.value=L.name||'';
  ni.style.cssText='flex:1;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
    'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
  ni.oninput=()=>{ L.name=ni.value; touch(); };
  nmr.appendChild(ni); box.appendChild(nmr);

  box.appendChild(colorRow('Colour',L.color,v=>{ L.color=v; push(); }));
  box.appendChild(slider('Intensity',L.intensity,0,8,.05,v=>v.toFixed(2)+'×',v=>{ L.intensity=v; push(); }));
  box.appendChild(slider('Height',L.pos[1],0,8,.02,v=>v.toFixed(2),v=>{ L.pos[1]=v; push(); }));
  if(L.kind!=='key')
    box.appendChild(slider('Reach',L.distance,0,40,.5,v=>v?v.toFixed(0):'∞',v=>{ L.distance=v; push(); }));
  if(L.kind==='spot'){
    box.appendChild(slider('Cone',L.angle,4,70,.5,v=>v.toFixed(0)+'°',v=>{ L.angle=v; push(); }));
    box.appendChild(slider('Softness',L.penumbra,0,1,.01,v=>(v*100).toFixed(0)+'%',v=>{ L.penumbra=v; push(); }));
  }
  if(L.kind!=='point'){
    box.appendChild(slider('Aim across',L.target[0],-9,9,.05,v=>v.toFixed(1),v=>{ L.target[0]=v; push(); }));
    box.appendChild(slider('Aim depth',L.target[2],-9,9,.05,v=>v.toFixed(1),v=>{ L.target[2]=v; push(); }));
    box.appendChild(slider('Aim height',L.target[1],0,5,.05,v=>v.toFixed(1),v=>{ L.target[1]=v; push(); }));
  }
  if(L.kind==='spot')
    box.appendChild(slider('Beam haze',L.beamOpacity,0,.5,.005,v=>(v*200).toFixed(0)+'%',
      v=>{ L.beamOpacity=v; L.beam=v>0; push(); }));

  const b=el('div','stbtns');
  const pl=el('button',L.pulse?'gold':'',L.pulse?'pulsing with the song':'pulse with the song');
  pl.onclick=()=>{ L.pulse=!L.pulse; if(!L.pulse&&g()) g().userData.pulseMul=1; push(); ui(); };
  const fx=el('button',L.showCan?'gold':'',L.showCan?'can shows in the room':'can is editor-only');
  fx.onclick=()=>{ L.showCan=!L.showCan; push(); ui(); };
  const aim=el('button','','aim at centre');
  aim.onclick=()=>{ L.target=[0,0,0]; push(); ui(); };
  const dup=el('button','','duplicate');
  dup.onclick=()=>{ const c=JSON.parse(JSON.stringify(L)); c.id='L'+(LOOK.seq++);
    c.pos=[L.pos[0]+1,L.pos[1],L.pos[2]+1]; LOOK.lights.push(c);
    LOBJ[c.id]=mkLight(c); touch(); select(c.id); ui(); };
  const dl=el('button','red','delete'); dl.onclick=()=>removeLight(L.id);
  [pl,fx,aim,dup,dl].forEach(x=>b.appendChild(x)); box.appendChild(b);
  box.appendChild(el('div','sthint','Drag the can in the room to move the light. '+
    'The can is a <b>handle</b> — it never appears in a baked room unless you switch it on. '+
    '<b>Pulse</b> rides the actual song through the analyser.'));
  return box;
}


/* ================= wall boards: the game marquee + the live board ================= */
const SWS_URL='https://sws-triogames-audiobolts.netlify.app/';
/* wall 3 sits directly beside the video wall (4); the photo wall (5) is its other
   neighbour, so 3 is where the challenge goes. */
function boardsCfg(){
  if(!LOOK.boards&&ISBOX) LOOK.boards={
    v:5,
    game:  {on:false, wall:2, title:'Soundwave Survival', url:SWS_URL, art:null, size:5.4, y:3.42,
            kicker:'LIVE NOW · SURVIVAL · AHZ SOUNDTRACK',
            sub:'Move on the kick drum. Outlast the horde.',
            badge:'LIVE NOW · FLAGSHIP DROP', chal:true, hint:'tap the wall to play', wallArt:false},
    leader:{on:false, wall:2, size:5.4, y:1.39},
    chat:  {on:false, wall:2, size:6.4, y:2.35, title:'THE ROOM'}
  };
  const freshB=!LOOK.boards;
  if(!LOOK.boards) LOOK.boards={
    v:5,
    game:  {on:true, wall:3, title:'Soundwave Survival', url:SWS_URL, art:null, size:5.4, y:3.42,
            kicker:'LIVE NOW · SURVIVAL · AHZ SOUNDTRACK',
            sub:'Move on the kick drum. Outlast the horde.',
            badge:'LIVE NOW · FLAGSHIP DROP',
            chal:true, hint:'tap the wall to play'},
    leader:{on:true, wall:3, size:5.4, y:1.39},
    chat:  {on:true, wall:2, size:6.4, y:2.35, title:'THE ROOM'}
  };
  const B=LOOK.boards;
  if(freshB&&MOODSP){ B.game.on=false; B.leader.on=false; B.chat.on=false; B.game.wallArt=false; }   /* v42: a Mood Room starts clean — boards are a choice */
  if(B.game && !B.game.url) B.game.url=SWS_URL;          /* saved before the URL existed */
  if(!B.v){ if(B.game) B.game.wall=3; B.v=2; }           /* one-time move off the old default */
  if(B.v<3 && B.game){                                    /* the hero-card marquee */
    const d={kicker:'LIVE NOW · SURVIVAL · AHZ SOUNDTRACK',
             sub:'Move on the kick drum. Outlast the horde.',
             badge:'LIVE NOW · FLAGSHIP DROP', chal:true};
    Object.keys(d).forEach(k=>{ if(B.game[k]===undefined) B.game[k]=d[k]; });
    if(!B.game.size||B.game.size<6.4) B.game.size=6.6;
    B.v=3;
  }
  if(B.v<4){                                              /* chat board + key-art wall */
    if(!B.chat) B.chat={on:true, wall:1, size:6.4, y:2.35, title:'THE ROOM'};
    if(B.game&&B.game.wallArt===undefined) B.game.wallArt=true;
    B.v=4;
  }
  if(B.v<5){
    /* The broadcast stack: marquee and standings share wall 3 at matching width,
       chat takes wall 2 on its own. Approved from the mock, Sept 20. */
    if(B.game){   B.game.wall=3;   B.game.size=5.4;   B.game.y=3.42; }
    if(B.leader){ B.leader.wall=3; B.leader.size=5.4; B.leader.y=1.39; }
    if(B.chat){   B.chat.wall=2;   B.chat.size=6.4;   B.chat.y=2.35; }
    B.v=5;
  }
  if(!B.sim) B.sim={on:false, artist:'ROMY'};
  return B;
}
function redrawBoards(){
  const B=boardsCfg();
  window.HEXCORE.BTHEME=window.HEXCORE.boardTheme(B.theme);
  const gb=window.HEXCORE.boardByKind('game');
  if(gb&&!gb.free){
    const a=B.game.art?ASSETS[B.game.art]:null;
    window.HEXCORE.drawGameBoard(gb.canvas, B.game, a?a.img:null, redrawBoards);
    gb.tex.needsUpdate=true;
  }
  const lb=window.HEXCORE.boardByKind('leader');
  if(lb){
    window.HEXCORE.drawLeaderBoard(lb.canvas, BOARDROWS, BOARDLINES, BOARDOVER);
    lb.tex.needsUpdate=true;
  }
  const cb=window.HEXCORE.boardByKind('chat');
  if(cb){
    const FANS=!!(B.chat&&B.chat.style==='fan');
    window.HEXCORE.drawChatBoard(cb.canvas, FANS?(BOARDCHAT||[]).slice().reverse():BOARDCHAT,
      {count:FANS?undefined:BOARDCOUNT, title:B.chat&&B.chat.title, fan:FANS});
    cb.tex.needsUpdate=true;
  }
}
let BOARDROWS=[], BOARDLINES=[], BOARDOVER=false, BOARDCHAT=[], BOARDCOUNT=undefined;

/* the demo crowd — stage dressing, connected to nothing */
let SIM=null;
function simOn(on){
  const B=boardsCfg();
  B.sim.on=!!on;
  if(SIM){ SIM.stop(); SIM=null; }
  if(!on){ BOARDROWS=[]; BOARDLINES=[]; BOARDCHAT=[]; BOARDCOUNT=undefined; redrawBoards(); return; }
  SIM=window.HEXCORE.liveSim({artist:B.sim.artist||'ROMY',
    onBoard:(r,o)=>{ BOARDROWS=r; BOARDOVER=o; redrawBoards(); },
    onChat :(l,n)=>{ BOARDCHAT=l; BOARDCOUNT=n; redrawBoards(); },
    onLine :(l)=>{ BOARDLINES=l; redrawBoards(); }});
  SIM.start();
}

/* the Soundwave Survival key art across the marquee wall */
function keyArtWall(){
  const B=boardsCfg(), slot='wall'+B.game.wall;
  const st=LOOK.surfaces[slot];
  const staged=!!(st&&(st.asset||st.url));
  if(B.game.on!==false && B.game.wallArt!==false && B.game.place!=='free' && !staged){   /* v48: no marquee, no key art */
    window.HEXCORE.installKeyArtDefault(HEX, slot, {onready:()=>applySurface(slot)});
  } else {
    window.HEXCORE.clearKeyArtDefault(HEX);
  }
  applySurface(slot);
}
/* the free-floating game screen: art, "put it in front of me", and five placement sliders */
function freeScreenControls(w,B){
  const F=B.game.free||(B.game.free={x:0,y:2.2,z:0,ry:0,w:3.2});
  const nb=el('div','stbtns');
  const bA=el('button','',B.game.screen?'swap screen art':'+ screen art / video (16:9)');
  bA.onclick=()=>pick('image/*,video/*',fs=>takeFiles(fs,{screenArt:true}));
  const bP=el('button','','put it in front of me');
  bP.onclick=()=>{ const p=inFront(3.2), d=new T.Vector3(); HEX.cam.getWorldDirection(d);
    F.x=+p.x.toFixed(2); F.z=+p.z.toFixed(2); F.ry=Math.round(Math.atan2(-d.x,-d.z)*180/Math.PI); rebuildBoards(); touch(); ui(); };
  nb.appendChild(bA); nb.appendChild(bP); w.appendChild(nb);
  const lim=(RM.shape==='box'?Math.max(RM.W,RM.D)/2:RM.APO);
  const sl=(lab,key,min,max,st,fmt)=>w.appendChild(slider(lab,F[key],min,max,st,fmt,v=>{ F[key]=v; rebuildBoards(); touch(); }));
  sl('Size','w',1,8,.05,v=>v.toFixed(2)+' m wide');
  sl('Height','y',.3,6,.01,v=>v.toFixed(2)+' m');
  sl('Left / right','x',-lim,lim,.01,v=>v.toFixed(2));
  sl('Forward / back','z',-lim,lim,.01,v=>v.toFixed(2));
  sl('Turn','ry',-180,180,1,v=>v+'°');
  w.appendChild(el('div','sthint','Line it up over the TV model’s screen. The <b>TAP TO PLAY</b> pill floats above it and '+
    'breathes; tapping the screen or the pill plays. A picture or a silent 16:9 loop (1280 × 720, 10–15 s, a few MB).'));
}
function wallRoles(){
  const B=boardsCfg(), r=[];
  for(let i=0;i<RM.n;i++){
    const d=SBY['wall'+i];
    let name=d?d.label.replace(/^Wall \d+ · /,''):'open';
    if(B.chat&&B.chat.on&&B.chat.wall===i) name='CHAT BOARD';
    const g=B.game.on&&B.game.place!=='free'&&B.game.wall===i, l=B.leader.on&&B.leader.wall===i;
    if(g&&l) name='GAME + BOARD';
    else if(g) name='GAME MARQUEE';
    else if(l) name='LIVE BOARD';
    r.push(name);
  }
  return r;
}
/* the WALL 1 / WALL 2 labels are an editing aid — they go away whenever the panel is hidden
   (hide, the stage button, G), so a clean screen recording is one click */
function tagsPanelOpen(){ return !PANEL||PANEL.classList.contains('open'); }
function syncWallTags(){ try{ window.HEXCORE.showWallTags(litCfg().handles!==false && !FAN && !DEMO && tagsPanelOpen()); }catch(e){} }
function refreshWallTags(){
  window.HEXCORE.wallTags(HEX, HEX.scene, wallRoles());
  window.HEXCORE.showWallTags(litCfg().handles!==false && !FAN && !DEMO && tagsPanelOpen());
}
function applyFX(){
  if(!window.HEXFX||!LOOK) return;
  if(!LOOK.fx) LOOK.fx=window.HEXFX.newCfg();
  window.HEXFX.boot(HEX); window.HEXFX.apply(LOOK.fx);
  window.HEXCORE.VIBESTART=(MOODSP&&LOOK.fx.start==='off')?0:1; if(window.HEXFX.setK) window.HEXFX.setK(window.HEXCORE.VIBESTART?1:.3);   /* v57 */
  window.HEXCORE.applyAurora(HEX, LOOK.fx.aurora);
}
function layoutRoomBoards(B){
  if(!ISBOX) return;
  B.game.wall=2; if(B.chat) B.chat.wall=2; B.leader.on=false; B.game.wallArt=false;
  const g=B.game.on, c=B.chat&&B.chat.on;
  if(g&&c){ B.game.size=5.0; B.game.y=3.52; B.chat.size=4.6; B.chat.y=1.40; }
  else if(g){ B.game.size=5.4; B.game.y=2.45; }
  else if(c){ B.chat.size=6.4; B.chat.y=2.35; }
}
function rebuildBoards(){
  window.HEXCORE.BTHEME=window.HEXCORE.boardTheme(boardsCfg().theme);
  window.HEXCORE.clearBoards(HEX.scene);
  try{ drawSigWall(); }catch(e){}
  const B=boardsCfg();
  layoutRoomBoards(B);
  if(B.game.on&&B.game.place==='free'){
    const a=B.game.screen?ASSETS[B.game.screen]:null;
    window.HEXCORE.buildFreeScreen(B.game, HEX, HEX.scene, a?(a.k==='video'?{video:a.url}:(a.img||null)):null);
  } else if(B.game.on)   window.HEXCORE.buildWallBoard('game',   B.game.wall,   HEX, HEX.scene,
                    {w:B.game.size||5.4, y:B.game.y||3.42});
  if(B.leader.on) window.HEXCORE.buildWallBoard('leader', B.leader.wall, HEX, HEX.scene,
                    {w:B.leader.size||5.4, y:B.leader.y||1.39});
  if(B.chat&&B.chat.on) window.HEXCORE.buildWallBoard('chat', B.chat.wall, HEX, HEX.scene,
                    {w:B.chat.size||6.4, y:B.chat.y||2.35});
  window.HEXCORE.wireBoards(HEX, ()=>boardsCfg().game);
  keyArtWall();
  redrawBoards();
  refreshWallTags();
  applyFX();
}
window.HEXCORE.onChallenge=()=>tip('challenge a friend — not wired yet');
/* v48 · board colours — one look for the marquee, leaderboard and chat */
function boardColours(w,B){
  const t=B.theme||(B.theme={preset:'trio'});
  w.appendChild(el('div','stsub','Board colours'));
  w.appendChild(seg('Colours',[['trio','Trio'],['concrete','concrete'],['ink','ink'],['blood','blood'],['neon','neon'],['custom','my own']],t.preset||'trio',k=>{
    if(k==='custom'&&t.preset!=='custom') Object.assign(t, window.HEXCORE.BOARDTHEMES[t.preset]||window.HEXCORE.BOARDTHEMES.concrete);
    t.preset=k; redrawBoards(); touch(); ui(); }));
  if(t.preset==='custom'){
    [['panel','Background'],['frame','Frame'],['title','Titles'],['text','Text'],['accent','Highlight'],['dim','Small text']].forEach(([k,lab])=>{
      const r=el('div','stf'); r.appendChild(el('label','',lab));
      const i=document.createElement('input'); i.type='color'; i.value=t[k]||'#ffffff'; i.oninput=()=>{ t[k]=i.value; redrawBoards(); touch(); };
      r.appendChild(i); w.appendChild(r); });
  }
  w.appendChild(el('div','sthint','Recolours the marquee, the leaderboard and the chat board together. <b>Highlight</b> is the #1 row, your own line and the play button.'));
}
function boardsSection(){
  const B=boardsCfg();
  const s=sec('Game wall + live board',true);
  const wallOpts=[]; for(let i=0;i<RM.n;i++) wallOpts.push([String(i),'W'+i]);

  boardColours(s.wrap,B);
  s.wrap.appendChild(el('div','sthint','<b>The game marquee</b> — tap it in the room to launch. '+
    'Score comes back and lands on the live board.'));
  s.wrap.appendChild(seg('Marquee',[['on','on'],['off','off']],B.game.on?'on':'off',
    k=>{ B.game.on=(k==='on'); rebuildBoards(); touch(); ui(); }));
  if(B.game.on){
    /* on a wall (the marquee card) or free-floating (a 16:9 picture you place anywhere — over a TV model) */
    s.wrap.appendChild(seg('Placement',[['wall','on a wall'],['free','free · over a model']],B.game.place==='free'?'free':'wall',
      k=>{ B.game.place=(k==='free')?'free':'wall';
        if(k==='free'&&!B.game.free){ const p=inFront(3.2); const d=new T.Vector3(); HEX.cam.getWorldDirection(d);
          B.game.free={x:+p.x.toFixed(2), y:2.2, z:+p.z.toFixed(2), ry:Math.round(Math.atan2(-d.x,-d.z)*180/Math.PI), w:3.2}; }
        keyArtWall(); rebuildBoards(); touch(); ui(); }));
    if(B.game.place==='free') freeScreenControls(s.wrap,B);
    if(B.game.place!=='free') s.wrap.appendChild(seg('On wall',wallOpts,String(B.game.wall),
      k=>{ B.game.wall=parseInt(k,10); rebuildBoards(); touch(); ui(); }));
    const txt=(label,key,ph)=>{
      const r=el('div','stf'); r.appendChild(el('label','',label));
      const i=document.createElement('input'); i.value=B.game[key]||''; if(ph) i.placeholder=ph;
      i.style.cssText='flex:1;min-width:0;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
        'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
      i.oninput=()=>{ B.game[key]=i.value; redrawBoards(); touch(); };
      r.appendChild(i); return r;
    };
    s.wrap.appendChild(txt('Kicker','kicker','LIVE NOW · SURVIVAL · …'));
    s.wrap.appendChild(txt('Title','title','SOUNDWAVE SURVIVAL'));
    s.wrap.appendChild(txt('Subtitle','sub','one line of hype'));
    s.wrap.appendChild(txt('Art badge','badge','LIVE NOW · FLAGSHIP DROP'));
    s.wrap.appendChild(txt('Foot','hint','tap the wall to play'));
    s.wrap.appendChild(seg('2nd button',[['on','show'],['off','hide']],B.game.chal!==false?'on':'off',
      k=>{ B.game.chal=(k==='on'); redrawBoards(); touch(); ui(); }));
    const ur=el('div','stf'); ur.appendChild(el('label','','Game URL'));
    const ui2=document.createElement('input'); ui2.value=B.game.url||'';
    ui2.placeholder='https://…netlify.app/';
    ui2.style.cssText='flex:1;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
      'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    ui2.onchange=()=>{ B.game.url=ui2.value.trim(); touch(); ui(); };
    ur.appendChild(ui2); s.wrap.appendChild(ur);
    if(B.game.place!=='free'){
    s.wrap.appendChild(seg('Key art wall',[['on','on'],['off','off']],B.game.wallArt!==false?'on':'off',
      k=>{ B.game.wallArt=(k==='on'); keyArtWall(); touch(); ui(); }));
    if(B.game.wallArt!==false) s.wrap.appendChild(el('div','sthint',
      'The SWS key art fills the marquee wall behind the card. Anything you stage on '+
      'that wall wins instead — this is only the empty-wall dress.'));
    s.wrap.appendChild(slider('Size',B.game.size||5.4,3,9,.1,v=>v.toFixed(1),
      v=>{ B.game.size=v; rebuildBoards(); touch(); }));
    s.wrap.appendChild(slider('Height',B.game.y||2.35,1,6.4,.02,v=>v.toFixed(2),
      v=>{ B.game.y=v; rebuildBoards(); touch(); }));
    /* the centerpiece: above the front wall, level with the banners (approved Sept 25, option 1) */
    const hb=el('div','stbtns'), hang=el('button','','hang above the front wall');
    hang.onclick=()=>{ B.game.wall=0; B.game.size=8.1; B.game.y=5.75; rebuildBoards(); touch(); ui(); };
    hb.appendChild(hang); s.wrap.appendChild(hb);
    s.wrap.appendChild(el('div','sthint','Past 4.6 m the marquee leaves the wall and hangs in the air like the banners.'));
    }
    if(B.game.chal!==false) s.wrap.appendChild(el('div','sthint',
      '<b>Challenge a friend</b> is drawn but not wired — the challenge flow lives in the '+
      'platform, not in this room. Hide it for a clean demo, or leave it and we point it '+
      'somewhere later.'));
    const ab=el('div','stbtns');
    const aArt=el('button','', B.game.art?'swap art':'swap key art');
    aArt.onclick=()=>pick('image/*',fs=>takeFiles(fs,{boardArt:true}));
    const aTest=el('button','gold','test launch');
    aTest.onclick=()=>{ if(!B.game.url) return tip('paste the game URL first');
      HEX.openGame(B.game.url,B.game.title); };
    ab.appendChild(aArt); ab.appendChild(aTest);
    if(B.game.art){ const cl=el('button','','back to SWS art');
      cl.onclick=()=>{ B.game.art=null; redrawBoards(); touch(); ui(); }; ab.appendChild(cl); }
    s.wrap.appendChild(ab);
    if(!B.game.url) s.wrap.appendChild(el('div','sthint',
      '<b>No URL yet</b> — paste the Sound Wave Survival address and the marquee goes live.'));
  }

  s.wrap.appendChild(seg('Live board',[['on','on'],['off','off']],B.leader.on?'on':'off',
    k=>{ B.leader.on=(k==='on'); rebuildBoards(); touch(); ui(); }));
  if(B.leader.on){
    s.wrap.appendChild(seg('On wall',wallOpts,String(B.leader.wall),
      k=>{ B.leader.wall=parseInt(k,10); rebuildBoards(); touch(); ui(); }));
    s.wrap.appendChild(slider('Size',B.leader.size||5.4,3,9,.1,v=>v.toFixed(1),
      v=>{ B.leader.size=v; rebuildBoards(); touch(); }));
    s.wrap.appendChild(slider('Height',B.leader.y||1.39,1,4,.02,v=>v.toFixed(2),
      v=>{ B.leader.y=v; rebuildBoards(); touch(); }));
    s.wrap.appendChild(el('div','sthint',
      'Names, scores and the fan reactions, live. Right now the other players are the demo '+
      'crowd and <b>your</b> score is real — enough to test playability. Real fans on the same '+
      'board needs the events backend.'));
  }

  s.wrap.appendChild(seg('Chat board',[['on','on'],['off','off']],(B.chat&&B.chat.on)?'on':'off',
    k=>{ B.chat.on=(k==='on'); rebuildBoards(); touch(); ui(); }));
  if(B.chat&&B.chat.on){
    s.wrap.appendChild(seg('On wall',wallOpts,String(B.chat.wall),
      k=>{ B.chat.wall=parseInt(k,10); rebuildBoards(); touch(); ui(); }));
    const hr=el('div','stf'); hr.appendChild(el('label','','Heading'));
    const hi=document.createElement('input'); hi.value=B.chat.title||'THE ROOM';
    hi.style.cssText='flex:1;min-width:0;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
      'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    hi.oninput=()=>{ B.chat.title=hi.value; redrawBoards(); touch(); };
    hr.appendChild(hi); s.wrap.appendChild(hr);
    s.wrap.appendChild(seg('Style',[['chat','chat'],['fan','fan board']],B.chat.style==='fan'?'fan':'chat',
      k=>{ B.chat.style=k; if(k==='fan'&&(!B.chat.title||B.chat.title==='THE ROOM')) B.chat.title='FAN BOARD'; redrawBoards(); touch(); ui(); }));
    s.wrap.appendChild(slider('Size',B.chat.size||6.4,3,9,.1,v=>v.toFixed(1),
      v=>{ B.chat.size=v; rebuildBoards(); touch(); }));
    s.wrap.appendChild(slider('Height',B.chat.y||2.35,1,4,.02,v=>v.toFixed(2),
      v=>{ B.chat.y=v; rebuildBoards(); touch(); }));
    s.wrap.appendChild(el('div','sthint',
      'The room <b>draws</b> chat, it never filters it — every moderation call happens before a '+
      'line arrives. Fans type on their phones, not in here.'));
  }

  /* ---- the demo crowd ---- */
  s.wrap.appendChild(seg('Demo crowd',[['on','running'],['off','off']],B.sim.on?'on':'off',
    k=>{ simOn(k==='on'); touch(); ui(); }));
  if(B.sim.on){
    const ar=el('div','stf'); ar.appendChild(el('label','','Artist'));
    const ai=document.createElement('input'); ai.value=B.sim.artist||'ROMY';
    ai.style.cssText='flex:1;min-width:0;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
      'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    ai.onchange=()=>{ B.sim.artist=ai.value.trim()||'ROMY'; simOn(true); touch(); };
    ar.appendChild(ai); s.wrap.appendChild(ar);
    const sb=el('div','stbtns');
    const rs=el('button','','new crowd'); rs.onclick=()=>{ if(SIM) SIM.reset(); };
    sb.appendChild(rs); s.wrap.appendChild(sb);
  }
  s.wrap.appendChild(el('div','sthint',
    '<b>Stage dressing.</b> Scores climb, ranks change, chat scrolls — so the room looks live '+
    'while you demo it. None of it is connected to anything and no score here is a record.'));
  s.wrap.appendChild(seg('Bake the crowd in',[['on','yes'],['off','no']],B.sim.bake?'on':'off',
    k=>{ B.sim.bake=(k==='on'); touch(); ui(); }));
  if(B.sim.bake) s.wrap.appendChild(el('div','sthint',
    'The baked room will run the demo crowd too. Good for a room you are sending someone; '+
    'turn it off before a real event or it will fight the real board.'));
  return s;
}

/* ================= the turntable: one steady 360 of the room ================= */
const ORBITDEF={dur:24, turns:1, tilt:0.10, loop:false, button:true, bake:false, auto:false};
function orbitCfg(){
  if(!LOOK) return ORBITDEF;                 /* boot() runs before the look loads */
  if(!LOOK.orbit) LOOK.orbit=Object.assign({},ORBITDEF);
  return LOOK.orbit;
}
let SPIN=null;
function orbitBoot(){
  if(SPIN) return SPIN;
  SPIN=window.HEXCORE.orbitBoot(HEX, orbitCfg);
  SPIN.onChange=()=>{ try{ ui(); }catch(e){} };
  SPIN.showButton(orbitCfg().button!==false);
  return SPIN;
}
function orbitSection(){
  const o=orbitCfg(), s=sec('Spin the room',!ISBOX);
  orbitBoot().showButton(o.button!==false);
  s.wrap.appendChild(el('div','sthint',
    'Parks the camera dead centre, tilts up toward the banner line and turns once, '+
    'steadily. Walking, the stick, a controller or <b>Esc</b> takes control straight back.'));
  const b=el('div','stbtns');
  const go=el('button','gold', (SPIN&&SPIN.running)?'stop':'▶  go');
  go.onclick=()=>{ const sp=orbitBoot(); sp.running?sp.stop(true):sp.start(); ui(); };
  b.appendChild(go);
  s.wrap.appendChild(b);
  s.wrap.appendChild(slider('Seconds',o.dur,6,90,1,v=>v.toFixed(0)+'s',
    v=>{ o.dur=v; touch(); }));
  s.wrap.appendChild(slider('Turns',o.turns,1,4,1,v=>v.toFixed(0),
    v=>{ o.turns=v; touch(); }));
  s.wrap.appendChild(slider('Tilt up',o.tilt,-0.10,0.40,.01,v=>(v*57.3).toFixed(0)+'°',
    v=>{ o.tilt=v; touch(); if(SPIN&&SPIN.running){ SPIN.stop(false); SPIN.start(); } }));
  s.wrap.appendChild(seg('Loop',[['on','on'],['off','once']],o.loop?'on':'off',
    k=>{ o.loop=(k==='on'); touch(); ui(); }));
  s.wrap.appendChild(seg('Button in room',[['on','show'],['off','hide']],o.button!==false?'on':'off',
    k=>{ o.button=(k==='on'); orbitBoot().showButton(o.button); touch(); ui(); }));
  s.wrap.appendChild(seg('Bake it in',[['on','yes'],['off','no']],o.bake?'on':'off',
    k=>{ o.bake=(k==='on'); touch(); ui(); }));
  if(o.bake){
    s.wrap.appendChild(seg('On entering',[['on','spin once'],['off','wait for the button']],
      o.auto?'on':'off', k=>{ o.auto=(k==='on'); touch(); ui(); }));
    s.wrap.appendChild(el('div','sthint',
      'The baked room carries the spin. <b>On entering</b> gives you a hands-free reveal — '+
      'good for a screen recording or a room running on a television.'));
  }
  return s;
}

/* ================= WINDOWS & SETS =================
   A wall can be a window: the see-through part of its art is the opening. Behind it sits a SET —
   a staged box built in the set editor (floor, middle ground, background, models, up to 3 lights,
   a mood). Sets are built on their own, locked with Done, then flown into any window. */
const SETMAX_LIGHTS=3;
let WSETS={};                     /* wall slot -> set group in the room */
const WRECT={};                   /* wall slot -> [u0,v0,u1,v1] of the opening, or null */
const winOf=id=>(LOOK.windows||(LOOK.windows={}))[id]||null;
const winOn=id=>{ const w=winOf(id); return !!(w&&w.on); };
const setById=id=>(LOOK.sets||[]).find(s=>s.id===id)||null;
function setRes(id){ const a=id?ASSETS[id]:null; if(!a) return null;
  if(a.k==='image') return a.img?{img:a.img}:null;
  if(a.k==='video') return {video:a.url};
  if(a.k==='glb') return a.buf?{buf:a.buf}:null;
  return null; }
function wallLen(i){ return RM.len(i); }
function rebuildWindowsNow(){
  Object.keys(WSETS).forEach(k=>{ window.HEXCORE.disposeSet(WSETS[k]); delete WSETS[k]; });
  HEX.walls.forEach((m,i)=>{
    const id='wall'+i, w=winOf(id);
    if(MOODSP&&w&&w.on&&w.cut) WRECT[id]=window.HEXCORE.cutWindow(HEX, m, w.cut, wallLen(i), RM.H||HEX.WALL_H);
    else if(m.userData.cutTex) window.HEXCORE.uncutWindow(HEX, m);
    window.HEXCORE.windowWall(m, !!(w&&w.on&&WRECT[id]));
    if(!w||!w.on||!WRECT[id]||!w.set) return;
    const st=setById(w.set); if(!st) return;
    const G=new T.Group(); HEX.scene.add(G);
    const pl=window.HEXCORE.placeSet(G,m,WRECT[id],wallLen(i),RM.H||HEX.WALL_H); HEX.scene.remove(G);
    const S=window.HEXCORE.buildSet(st,setRes,pl.winH,{sill:pl.sill}); HEX.scene.add(S);
    window.HEXCORE.placeSet(S,m,WRECT[id],wallLen(i),RM.H||HEX.WALL_H);
    window.HEXCORE.mountSet(S,pl.winH,i+1); S.userData.urlOf=eggURL;
    (S.userData.vids||[]).forEach(v=>v.play().catch(()=>{}));
    WSETS[id]=S;
  });
  cutHandles();
}
const eggURL=id=>(ASSETS[id]&&ASSETS[id].url)||null;
function rebuildWindows(){ clearTimeout(rebuildWindows._t); rebuildWindows._t=setTimeout(rebuildWindowsNow,180); }
function newSet(){
  const n=(LOOK.sets||[]).length+1;
  const st=window.HEXCORE.setDefaults({id:'set'+Date.now().toString(36),name:'set '+n,locked:false,shape:'curve',
    depth:4,mood:{color:'#ffffff',i:.95},floor:{asset:null},middle:{asset:null},back:{asset:null,kind:'image'},
    models:[],lights:[{id:'l1',kind:'spot',color:'#fff3e0',i:2,x:0,y:3.2,z:-.4,tx:0,ty:0,tz:-2.4}]});
  (LOOK.sets||(LOOK.sets=[])).push(st); return st;
}
function setAssetIds(st){ const o=[];
  ['floor','middle','back'].forEach(k=>{ if(st[k]&&st[k].asset) o.push(st[k].asset); });
  (st.models||[]).forEach(M=>{ if(M.asset) o.push(M.asset); });
  eggsOf(st).forEach(E=>(E.blocks||[]).forEach(b=>{ if(b.asset) o.push(b.asset); })); return o; }
function eggsOf(st){ const o=[]; (st.models||[]).forEach(M=>{ if(M.egg) o.push(M.egg); }); (st.spots||[]).forEach(P=>{ if(P.egg) o.push(P.egg); }); return o; }
function deleteSet(id){
  LOOK.sets=(LOOK.sets||[]).filter(s=>s.id!==id);
  Object.keys(LOOK.windows||{}).forEach(k=>{ if(LOOK.windows[k].set===id) LOOK.windows[k].set=null; });
  rebuildWindowsNow(); touch(); ui();
}
function exportSet(st){
  tip('packing set…');
  const out={kind:'hexset',version:1,set:JSON.parse(JSON.stringify(st)),assets:{}};
  const jobs=setAssetIds(st).map(k=>{ const a=ASSETS[k]; if(!a) return null;
    return dataURLFor(a).then(u=>{ if(u) out.assets[k]={name:a.name,type:a.type,k:a.k,data:u}; }); });
  Promise.all(jobs).then(()=>{ const b=new Blob([JSON.stringify(out)],{type:'application/json'});
    dl(slug(st.name||'set')+'.hexset.json',b); tip('set saved · '+(b.size/1048576).toFixed(1)+' MB — open it in any room'); });
}
function importSetData(m){
  const st=JSON.parse(JSON.stringify(m.set)); const map={};
  const jobs=Object.keys(m.assets||{}).map(k=>assetFromDataURL(m.assets[k].data,m.assets[k].name||k)
    .then(a=>{ map[k]=a.id; }).catch(()=>{}));
  return Promise.all(jobs).then(()=>{
    const re=x=>x&&map[x]?map[x]:(x&&ASSETS[x]?x:null);
    ['floor','middle','back'].forEach(k=>{ if(st[k]) st[k].asset=re(st[k].asset); });
    (st.models||[]).forEach(M=>{ M.asset=re(M.asset); });
    st.models=(st.models||[]).filter(M=>M.asset);
    eggsOf(st).forEach(E=>{ E.blocks=(E.blocks||[]).filter(b=>{ if(!('asset' in b)) return true; b.asset=re(b.asset); return !!b.asset; }); });
    st.id='set'+Date.now().toString(36)+Math.floor(Math.random()*1e3);
    if((LOOK.sets||[]).some(s=>s.name===st.name)) st.name+=' (2)';
    (LOOK.sets||(LOOK.sets=[])).push(st); return st; });
}
function importSet(){
  pick('.json,application/json',fs=>{ const f=fs[0]; if(!f) return;
    f.text().then(t=>{ let m=null; try{ m=JSON.parse(t); }catch(e){}
      if(!m||m.kind!=='hexset'||!m.set){ tip('that file is not a set'); return; }
      importSetData(m).then(st=>{ touch(); ui(); tip('set “'+st.name+'” flown in — pick a window for it'); }); }); });
}

/* ---- the set editor: the room goes away, the set gets its own little stage ---- */
let SETEDIT=null;
const SE_Y=-500, SE_WINH=3, SE_SILL=1.1;   /* the editor's window sits 1.1 above its room floor, like a real one */
function seFrame(){
  const g=new T.Group(), mat=new T.MeshBasicMaterial({color:0x0d0a1c,side:T.DoubleSide});
  const W=window.HEXCORE.SET_W, h=SE_WINH, big=400;
  const add=(w,hh,x,y)=>{ const m=new T.Mesh(new T.PlaneGeometry(w,hh),mat); m.position.set(x,y,0); g.add(m); };
  add(big,big,0,h+big/2); add(big,big,0,-big/2);
  add(big,h,-W/2-big/2,h/2); add(big,h,W/2+big/2,h/2);
  const pts=[[-W/2,0],[W/2,0],[W/2,h],[-W/2,h],[-W/2,0]].map(p=>new T.Vector3(p[0],p[1],.01));
  const ln=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x8b7bff}));
  g.add(ln);
  const rf=new T.Mesh(new T.PlaneGeometry(40,14),new T.MeshBasicMaterial({color:0x1a1450}));
  rf.rotation.x=-Math.PI/2; rf.position.set(0,-SE_SILL,7); g.add(rf);       /* the room floor you stand on */
  g.position.y=SE_Y; return g;
}
function seBuild(){
  if(!SETEDIT) return;
  if(SETEDIT.box){ HEX.scene.remove(SETEDIT.box); SETEDIT.box=null; }
  if(SETEDIT.G) window.HEXCORE.disposeSet(SETEDIT.G);
  const st=setById(SETEDIT.id); if(!st) return;
  SETEDIT.G=window.HEXCORE.buildSet(st,setRes,SE_WINH,{editor:true,sill:SE_SILL});
  SETEDIT.G.position.y=SE_Y; HEX.scene.add(SETEDIT.G); SETEDIT.G.userData.urlOf=eggURL; window.HEXCORE.glintTick(HEX);
  (SETEDIT.G.userData.vids||[]).forEach(v=>v.play().catch(()=>{}));
}
function seRefresh(){ clearTimeout(seRefresh._t); seRefresh._t=setTimeout(seBuild,90); }
function seCam(){
  if(!SETEDIT) return;
  const st=setById(SETEDIT.id); const D=st?st.depth:4, c=HEX.cam;
  const th=Math.tan(c.fov*Math.PI/360), dist=Math.max(1.6/th,3.3/(th*c.aspect))*1.12;
  const x=SETEDIT.sway?Math.sin(performance.now()/1000*.7)*1.7:SETEDIT.view*2.2;
  const nr=SETEDIT.near||0, eye=SE_WINH/2*(1-nr)+(1.7-SE_SILL)*nr;      /* step closer = walk up and look down in */
  c.position.set(x*(1-nr*.6),SE_Y+eye,dist*(1-nr*.82)); c.lookAt(x*.15,SE_Y+eye-nr*1.6,-D*.5);
}
function seBlock(e){ if(!SETEDIT) return; if(PANEL.contains(e.target)) return;
  e.stopPropagation(); e.preventDefault();
  if(e.type==='pointerdown'){ SETEDIT.drag={x:e.clientX,v:SETEDIT.sway?0:SETEDIT.view}; SETEDIT.sway=false; }
  else if(e.type==='pointermove'&&SETEDIT.drag){ SETEDIT.view=Math.max(-1,Math.min(1,SETEDIT.drag.v+(e.clientX-SETEDIT.drag.x)/300)); }
  else if(e.type==='pointerup'){ if(SETEDIT.drag){ SETEDIT.drag=null; ui(); } } }
['pointerdown','pointermove','pointerup','wheel','touchstart','touchmove'].forEach(t=>
  addEventListener(t,e=>{ if(SETEDIT&&!PANEL.contains(e.target)&&(t.indexOf('touch')===0||t==='wheel')){ e.stopPropagation(); if(t!=='touchstart') e.preventDefault(); return; }
    seBlock(e); },{capture:true,passive:false}));
function enterSetEditor(id){
  if(SETEDIT) exitSetEditor(true);
  select(null);
  SETEDIT={id,sway:true,view:0,G:null,frame:seFrame(),save:{p:HEX.cam.position.clone(),q:HEX.cam.quaternion.clone()}};
  HEX.scene.add(SETEDIT.frame); seBuild();
  HEX.onFrame.push(seCam);
  document.body.classList.add('stsetedit');
  OPEN['Set editor']=true; ui(); if(BODY) BODY.scrollTop=0;
  tip('set editor — the room is hidden. Build, then Done & lock.');
}
function exitSetEditor(quiet){
  if(!SETEDIT) return;
  const i=HEX.onFrame.indexOf(seCam); if(i>=0) HEX.onFrame.splice(i,1);
  if(SETEDIT.box) HEX.scene.remove(SETEDIT.box);
  if(SETEDIT.G) window.HEXCORE.disposeSet(SETEDIT.G);
  HEX.scene.remove(SETEDIT.frame);
  HEX.cam.position.copy(SETEDIT.save.p);
  SETEDIT=null; document.body.classList.remove('stsetedit');
  rebuildWindowsNow(); touch(); if(!quiet) ui();
}
function seLayerRow(lab,sub,aid,accept,set,clear){
  const a=aid?ASSETS[aid]:null;
  const row=el('div','strow'); const th=el('div','th');
  if(a&&a.k==='image'&&a.url) th.style.backgroundImage='url('+a.url+')'; else th.textContent=a?(a.k==='video'?'▶':'◈'):'+';
  const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>';
  nm.querySelector('b').textContent=lab; nm.querySelector('s').textContent=a?a.name:sub;
  row.appendChild(th); row.appendChild(nm);
  const add=el('button','add',a?'swap':'+ add');
  add.onclick=e=>{ e.stopPropagation(); pick(accept,fs=>{ if(!fs[0]) return; addAsset(fs[0]).then(x=>{ set(x); touch(); seBuild(); ui(); }); }); };
  row.appendChild(add); th.onclick=add.onclick;
  if(a){ const x=el('span','x','×'); x.onclick=e=>{ e.stopPropagation(); clear(); touch(); seBuild(); ui(); }; row.appendChild(x); }
  return row;
}
function seOutline(key){
  if(SETEDIT.box){ HEX.scene.remove(SETEDIT.box); SETEDIT.box=null; }
  if(!key||!SETEDIT.G) return; let tgt=null;
  SETEDIT.G.traverse(o=>{ if(!tgt&&o.userData&&o.userData.isProp&&o.userData.propId==='set:'+key&&o.parent&&!(o.parent.userData&&o.parent.userData.propId==='set:'+key)) tgt=o; });
  if(!tgt) return; SETEDIT.box=new T.BoxHelper(tgt,0xfbbf24); SETEDIT.box.material.depthTest=false; HEX.scene.add(SETEDIT.box);
}
const modelName=(M,j)=>{ const a=ASSETS[M.asset]; return (j+1)+' · '+(a?a.name.replace(/\.[a-z0-9]+$/i,''):'model'); };
const eggTitle=E=>{ const t=(E.blocks||[]).find(b=>b.t==='title'&&b.text); return t?t.text:'(no title)'; };
function setEditorUI(){
  const st=setById(SETEDIT.id); if(!st){ exitSetEditor(); return; }
  window.HEXCORE.setDefaults(st);
  const D=st.depth, dims=SETEDIT.G?SETEDIT.G.userData.dims:{boxW:6+D*1.6};
  const ch=()=>{ touch(); seRefresh(); };
  const hd=el('div','stsethead','<b>SET EDITOR</b><span></span>');
  hd.querySelector('span').textContent=st.name+(st.locked?' · locked':'');
  const hb=el('div','stbtns');
  if(st.locked){ const u=el('button','gold','unlock to edit'); u.onclick=()=>{ st.locked=false; touch(); ui(); }; hb.appendChild(u); }
  else { const d=el('button','gold','done & lock'); d.onclick=()=>{ st.locked=true; exitSetEditor(); tip('“'+st.name+'” locked — fly it into a window'); }; hb.appendChild(d); }
  const bk=el('button','','back to the room'); bk.onclick=()=>exitSetEditor(); hb.appendChild(bk);
  hd.appendChild(hb); BODY.appendChild(hd);

  const sV=sec('View',true);
  sV.wrap.appendChild(seg('Camera',[['sway','sway (see the depth)'],['still','still']],SETEDIT.sway?'sway':'still',k=>{ SETEDIT.sway=(k==='sway'); ui(); }));
  if(!SETEDIT.sway) sV.wrap.appendChild(slider('Look from',SETEDIT.view,-1,1,.01,v=>v<-.05?'left':(v>.05?'right':'centre'),v=>{ SETEDIT.view=v; }));
  sV.wrap.appendChild(slider('Step closer',SETEDIT.near||0,0,1,.01,v=>v<.05?'across the room':(v>.95?'at the glass':Math.round(v*100)+'%'),v=>{ SETEDIT.near=v; }));
  sV.wrap.appendChild(el('div','sthint','The purple line is the window. Drag across the screen to look in from the side.'));
  BODY.appendChild(sV);
  /* every egg in this set, wherever it lives — click one to edit it right here */
  { const L=[]; (st.models||[]).forEach((M,j)=>{ if(M.egg) L.push({k:'m:'+M.id, E:M.egg, where:'model '+modelName(M,j), M, j}); });
    (st.spots||[]).forEach((P,j)=>{ if(P.egg) L.push({k:'p:'+P.id, E:P.egg, where:'egg spot '+(j+1), P}); });
    const sE=sec('Easter eggs in this set',true);
    if(!L.length) sE.wrap.appendChild(el('div','sthint','No eggs yet — switch one on under a model, or add an egg spot.'));
    L.forEach(it=>{
      const row=el('div','strow'+(SETEDIT.egg===it.k?' sel':'')); const th=el('div','th',it.E.on?'✦':'·');
      const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>'; nm.querySelector('b').textContent=eggTitle(it.E);
      nm.querySelector('s').textContent=(it.E.on?'on':'OFF')+' · on '+it.where; row.appendChild(th); row.appendChild(nm);
      row.onclick=()=>{ SETEDIT.egg=(SETEDIT.egg===it.k?null:it.k); seOutline(SETEDIT.egg&&it.M?it.M.id:null); ui(); };
      sE.wrap.appendChild(row);
      if(SETEDIT.egg===it.k&&!st.locked){
        const box=el('div','stctl');
        box.appendChild(seg('Egg',[['on','on'],['off','off']],it.E.on?'on':'off',k=>{ it.E.on=(k==='on'); touch(); seRefresh(); ui(); }));
        sE.wrap.appendChild(box); eggEditor(sE.wrap,it.E,()=>{ touch(); seRefresh(); }); }
    });
    if(L.length&&st.locked) sE.wrap.appendChild(el('div','sthint','Unlock the set to edit an egg.'));
    BODY.appendChild(sE); }
  if(st.locked){ BODY.appendChild(el('div','sthint','<b>Locked.</b> This set is finished and safe. Unlock it to change anything.')); return; }

  const s0=sec('The set',true);
  const ni=document.createElement('input'); ni.value=st.name||''; ni.placeholder='name this set';
  ni.style.cssText='width:100%;box-sizing:border-box;font:700 11px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:8px';
  ni.oninput=()=>{ st.name=ni.value; touch(); hd.querySelector('span').textContent=st.name; };
  s0.wrap.appendChild(ni);
  s0.wrap.appendChild(seg('Shape',[['curve','curved'],['box','box']],st.shape==='curve'?'curve':'box',k=>{ st.shape=k; touch(); seBuild(); ui(); }));
  s0.wrap.appendChild(slider('Depth',st.depth,2,8,.1,v=>v.toFixed(1)+' m',v=>{ st.depth=v; if(st.middle.dist>v-.15) st.middle.dist=v-.15; ch(); }));
  s0.wrap.appendChild(slider('Floor height',st.floorLevel,0,1,.01,v=>v<.02?'room floor':(v>.98?'windowsill':Math.round(v*100)+'% up'),v=>{ st.floorLevel=v; ch(); }));
  s0.wrap.appendChild(el('div','sthint','<b>Room floor</b> = the set floor lines up with the floor you stand on, so you walk up to the window to see it. Slide up to raise it to the sill.'));
  s0.wrap.appendChild(colorRow('Mood colour',st.mood.color,v=>{ st.mood.color=v; ch(); }));
  s0.wrap.appendChild(seg('Lights out',[['off','off'],['on','on']],st.dark?'on':'off',k=>{ st.dark=(k==='on'); ch(); ui(); }));
  if(!st.dark) s0.wrap.appendChild(slider('Brightness',st.mood.i,.1,1.8,.01,v=>Math.round(v*100)+'%',v=>{ st.mood.i=v; ch(); }));
  else s0.wrap.appendChild(el('div','sthint','<b>Lights out.</b> The set has no light of its own and its lights are off — only a model with <b>· glow</b> '+
    'on lights it. You see a faint version here so you can place things; in the room it is fully dark.'));
  BODY.appendChild(s0);

  const s1=sec('Layers',true);
  const LAYERS=[
    ['floor','Floor','seen from above · bottom edge = the glass','image/*',a=>a.k==='image','the floor wants an image'],
    ['middle','Middle ground','see-through PNG · stands on its bottom edge','image/png,image/webp,image/*',a=>a.k==='image','the middle ground wants a see-through PNG'],
    ['back','Background',st.shape==='curve'?'wraps the curve · 4096×1024 panorama, or an MP4 loop':'an image, or an MP4 loop','image/*,video/*',a=>a.k==='image'||a.k==='video','the background wants an image or a video']];
  LAYERS.forEach(([key,lab,sub,acc,okK,bad])=>{
    const L=st[key];
    const row=seLayerRow(lab,sub,L.asset,acc,a=>{ if(!okK(a)) return tip(bad); L.asset=a.id; if(key==='back') L.kind=a.k; SETEDIT.layer=key; },
      ()=>{ L.asset=null; });
    if(SETEDIT.layer===key&&L.asset) row.classList.add('sel');
    row.onclick=()=>{ SETEDIT.layer=(SETEDIT.layer===key?null:key); ui(); };
    s1.wrap.appendChild(row);
    if(SETEDIT.layer!==key||!L.asset) return;
    const box=el('div','stctl');
    const rf=()=>{ window.HEXCORE.reframeLayer(SETEDIT.G,key,L,window.HEXCORE.setMood(st,true)); touch(); };
    const isVid=ASSETS[L.asset]&&ASSETS[L.asset].k==='video';
    box.appendChild(el('div','stsub','Picture'));
    if(!isVid) box.appendChild(seg('Fit',[['cover','cover'],['contain','fit in'],['stretch','stretch']],L.fit,k=>{ L.fit=k; rf(); ui(); }));
    box.appendChild(slider('Scale',L.scale,isVid?1:.2,4,.01,v=>v.toFixed(2)+'×',v=>{ L.scale=v; rf(); }));
    box.appendChild(slider('Across',L.ox,-1,1,.005,v=>(v*100).toFixed(0)+'%',v=>{ L.ox=v; rf(); }));
    box.appendChild(slider(key==='floor'?'Near/far':'Up/down',L.oy,-1,1,.005,v=>(-v*100).toFixed(0)+'%',v=>{ L.oy=v; rf(); }));
    if(!isVid) box.appendChild(slider('Rotate',L.rot,-180,180,.5,v=>v.toFixed(0)+'°',v=>{ L.rot=v; rf(); }));
    box.appendChild(slider('Brightness',L.bright,.1,2,.01,v=>v.toFixed(2)+'×',v=>{ L.bright=v; rf(); }));
    box.appendChild(colorRow('Tint',L.tint,v=>{ L.tint=v; rf(); }));
    const rb=el('div','stbtns'); const r=el('button','','reset picture');
    r.onclick=()=>{ Object.assign(L,{fit:'cover',scale:1,ox:0,oy:0,rot:0,tint:'#ffffff',bright:1}); rf(); ui(); };
    rb.appendChild(r); box.appendChild(rb);
    if(key==='middle'){
      box.appendChild(el('div','stsub','Where it stands'));
      box.appendChild(slider('Distance',L.dist,.2,Math.max(.3,D-.15),.01,v=>v.toFixed(2)+' m',v=>{ L.dist=v; ch(); }));
      box.appendChild(slider('Plate size',L.size,.3,2,.01,v=>v.toFixed(2)+'×',v=>{ L.size=v; ch(); }));
      box.appendChild(slider('Plate height',L.y,-1,2,.01,v=>v.toFixed(2)+' m',v=>{ L.y=v; ch(); }));
    }
    if(key==='back'&&st.shape!=='curve'){
      box.appendChild(el('div','stsub','Where it hangs'));
      box.appendChild(slider('Plate size',L.size,.5,2,.01,v=>v.toFixed(2)+'×',v=>{ L.size=v; ch(); }));
      box.appendChild(slider('Plate height',L.y,-1,3,.01,v=>v.toFixed(2)+' m',v=>{ L.y=v; ch(); }));
    }
    s1.wrap.appendChild(box);
  });
  s1.wrap.appendChild(el('div','sthint','Click a layer to frame its picture — same controls as the walls. <b>Picture</b> moves the image inside its plate; <b>where it stands</b> moves the plate in the set.'));
  BODY.appendChild(s1);

  const s2=sec('Models',true);
  st.models.forEach((M,j)=>{
    const a=ASSETS[M.asset];
    const r=el('div','stsub',modelName(M,j)+(M.egg&&M.egg.on?'  ✦ egg on':'')+' ');
    r.style.cursor='pointer'; r.title='click to outline it in the set'; r.onclick=e=>{ if(e.target.classList.contains('x')) return; seOutline(M.id); };
    const x=el('span','x','×'); x.style.cssText='cursor:pointer;float:right;color:#ff5470';
    x.onclick=()=>{ st.models.splice(j,1); ch(); ui(); }; r.appendChild(x); s2.wrap.appendChild(r);
    s2.wrap.appendChild(slider('· across',M.x||0,-dims.boxW/2,dims.boxW/2,.01,v=>v.toFixed(2),v=>{ M.x=v; ch(); }));
    s2.wrap.appendChild(slider('· depth',-(M.z==null?-D*.55:M.z),.2,D-.1,.01,v=>v.toFixed(2)+' m',v=>{ M.z=-v; ch(); }));
    s2.wrap.appendChild(slider('· height',M.y||0,0,Math.max(4,dims.boxH||6),.01,v=>v<.02?'on the floor':v.toFixed(2)+' m up',v=>{ M.y=v; ch(); }));   /* v46.1: float it */
    s2.wrap.appendChild(slider('· turn',M.ry||0,-180,180,1,v=>v.toFixed(0)+'°',v=>{ M.ry=v; ch(); }));
    s2.wrap.appendChild(slider('· size',M.size||1.6,.2,Math.max(14,dims.boxW*1.4),.01,v=>v.toFixed(2)+' m',v=>{ M.size=v; ch(); })   /* v45.1: big enough to fill the set */);
    s2.wrap.appendChild(seg('· light',[['lit','lit by the set'],['unlit','unlit · as made']],M.lit===false?'unlit':'lit',k=>{ M.lit=(k==='lit'); ch(); ui(); }));
    s2.wrap.appendChild(seg('· easter egg',[['off','off'],['on','on']],M.egg&&M.egg.on?'on':'off',k=>{
      if(k==='on'){ if(eggCount(st)>=EGGMAX) return tip('a set holds '+EGGMAX+' eggs'); M.egg=M.egg||newEgg(a?a.name.replace(/\.[a-z0-9]+$/i,''):'Easter egg'); M.egg.on=true; }
      else if(M.egg) M.egg.on=false; ch(); ui(); }));
    if(M.egg&&M.egg.on){ if(MOODSP) s2.wrap.appendChild(eggStartSeg('· egg at the start',M.egg,'set:'+M.id,ch)); eggEditor(s2.wrap,M.egg,ch); }
    if(MOODSP) setGlowControls(s2.wrap,M,ch);
    if(MOODSP){ const P={id:'set:'+M.id, type:'setmodel', name:modelName(M,j), get trig(){ return M.trig; }, set trig(v){ M.trig=v; }, get egg(){ return M.egg; }};   /* v83: a window model sets things off too */
      const tb=el('div',''); trigControls(P,tb); s2.wrap.appendChild(tb); }
  });
  const mb=el('div','stbtns'); const am=el('button','','+ model (.glb)');
  am.onclick=()=>pick('.glb,.gltf',fs=>{ if(!fs[0]) return; addAsset(fs[0]).then(a=>{ if(a.k!=='glb') return tip('that is not a .glb');
    st.models.push({id:'m'+Date.now().toString(36),asset:a.id,x:0,z:-D*.55,ry:0,size:1.6}); touch(); seBuild(); ui(); }); });
  mb.appendChild(am); s2.wrap.appendChild(mb);
  s2.wrap.appendChild(el('div','sthint','.glb under 2 MB, under 50k triangles. Models stand on the floor.'));
  BODY.appendChild(s2);

  const sE=sec('Easter egg spots',true);
  sE.wrap.appendChild(el('div','sthint','A spot is a tappable point anywhere in the set — on the floor, in the middle ground, up in the background. Models can carry eggs too (see Models).'));
  st.spots.forEach((P,j)=>{
    const r=el('div','stsub','Spot '+(j+1)+' ');
    const x=el('span','x','×'); x.style.cssText='cursor:pointer;float:right;color:#ff5470';
    x.onclick=()=>{ st.spots.splice(j,1); ch(); ui(); }; r.appendChild(x); sE.wrap.appendChild(r);
    sE.wrap.appendChild(slider('· across',P.x||0,-dims.boxW/2,dims.boxW/2,.01,v=>v.toFixed(2),v=>{ P.x=v; ch(); }));
    sE.wrap.appendChild(slider('· height',P.y==null?1:P.y,0,6,.01,v=>v.toFixed(2)+' m',v=>{ P.y=v; ch(); }));
    sE.wrap.appendChild(slider('· depth',-(P.z==null?-D*.5:P.z),.2,D,.01,v=>v.toFixed(2)+' m',v=>{ P.z=-v; ch(); }));
    eggEditor(sE.wrap,P.egg||(P.egg=newEgg()),ch);
  });
  const eb=el('div','stbtns'); const ae=el('button','','+ egg spot');
  ae.onclick=()=>{ if(eggCount(st)>=EGGMAX) return tip('a set holds '+EGGMAX+' eggs');
    st.spots.push({id:'e'+Date.now().toString(36),x:0,y:1,z:-D*.5,egg:newEgg()}); ch(); ui(); };
  eb.appendChild(ae); sE.wrap.appendChild(eb);
  BODY.appendChild(sE);

  const s3=sec('Lights',true);
  if(st.dark) s3.wrap.appendChild(el('div','sthint warn','Lights out is on — these lights are switched off until you turn it off.'));
  st.lights.forEach((L,j)=>{
    const r=el('div','stsub',(L.kind==='point'?'Bulb ':'Spot ')+(j+1)+' ');
    const x=el('span','x','×'); x.style.cssText='cursor:pointer;float:right;color:#ff5470';
    x.onclick=()=>{ st.lights.splice(j,1); ch(); ui(); }; r.appendChild(x); s3.wrap.appendChild(r);
    s3.wrap.appendChild(colorRow('· colour',L.color,v=>{ L.color=v; ch(); }));
    s3.wrap.appendChild(slider('· brightness',L.i==null?2:L.i,0,5,.05,v=>v.toFixed(2),v=>{ L.i=v; ch(); }));
    s3.wrap.appendChild(slider('· across',L.x||0,-dims.boxW/2,dims.boxW/2,.01,v=>v.toFixed(2),v=>{ L.x=v; ch(); }));
    s3.wrap.appendChild(slider('· height',L.y==null?3:L.y,0,6,.01,v=>v.toFixed(2)+' m',v=>{ L.y=v; ch(); }));
    s3.wrap.appendChild(slider('· depth',-(L.z==null?-.4:L.z),0,D,.01,v=>v.toFixed(2)+' m',v=>{ L.z=-v; ch(); }));
    if(L.kind!=='point'){
      s3.wrap.appendChild(slider('· aim across',L.tx||0,-dims.boxW/2,dims.boxW/2,.01,v=>v.toFixed(2),v=>{ L.tx=v; ch(); }));
      s3.wrap.appendChild(slider('· aim depth',-(L.tz==null?-D*.6:L.tz),0,D,.01,v=>v.toFixed(2)+' m',v=>{ L.tz=-v; ch(); }));
    }
  });
  const lb=el('div','stbtns');
  if(st.lights.length<SETMAX_LIGHTS){
    const sp=el('button','','+ spot'); sp.onclick=()=>{ st.lights.push({id:'l'+Date.now().toString(36),kind:'spot',color:'#ffffff',i:2,x:0,y:3,z:-.4,tx:0,ty:0,tz:-D*.6}); ch(); ui(); };
    const pt=el('button','','+ bulb'); pt.onclick=()=>{ st.lights.push({id:'l'+Date.now().toString(36),kind:'point',color:'#ffd8a8',i:1.5,x:0,y:2,z:-D*.5}); ch(); ui(); };
    lb.appendChild(sp); lb.appendChild(pt); }
  s3.wrap.appendChild(lb);
  s3.wrap.appendChild(el('div','sthint','Up to '+SETMAX_LIGHTS+' lights per set — more costs frames on a phone. The dots show where each light sits; they never appear in the room.'));
  BODY.appendChild(s3);
}

/* ---- Easter eggs: a pop-up you fill with whatever you like ---- */
const EGGMAX=8;
const newEgg=title=>({on:true,glint:true,afterCollect:MOODSP?'gone':'stay',blocks:[{t:'title',text:title||'Easter egg'},{t:'text',text:''}]});
const inStyle='width:100%;box-sizing:border-box;font:700 11px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:8px;margin:0 0 6px';
function eggEditor(w, egg, ch){
  const box=el('div','stctl');
  box.appendChild(seg('Shows',[['glint','glints'],['hidden','hidden']],egg.glint===false?'hidden':'glint',k=>{ egg.glint=(k==='glint'); ch(); ui(); }));
  if(MOODSP) box.appendChild(seg('After collect',[['gone','glint goes away'],['stay','stays']],egg.afterCollect==='gone'?'gone':'stay',k=>{ egg.afterCollect=k; ch(); ui(); }));   /* v53 */
  box.appendChild(el('div','stsub','The pop-up'));
  const BL={title:'Title',text:'Text',image:'Picture',video:'Clip',link:'Link button',song:'Song',quiz:'Question'};
  egg.blocks=egg.blocks||[];
  egg.blocks.forEach((b,j)=>{
    const hd=el('div','stsub',BL[b.t]||b.t);
    hd.style.cssText='display:flex;gap:8px;align-items:center;color:#cfc7f2;padding:10px 2px 4px';
    const sp=el('span',''); sp.style.flex='1'; hd.appendChild(sp);
    const mv=(d)=>{ const k=j+d; if(k<0||k>=egg.blocks.length) return; const t=egg.blocks[j]; egg.blocks[j]=egg.blocks[k]; egg.blocks[k]=t; touch(); ui(); };
    [['↑',()=>mv(-1)],['↓',()=>mv(1)],['×',()=>{ egg.blocks.splice(j,1); touch(); ui(); }]].forEach(([t,f])=>{
      const x=el('span','',t); x.style.cssText='cursor:pointer;padding:0 5px;font:800 13px Arial;color:'+(t==='×'?'#ff5470':'#cfc7f2'); x.onclick=f; hd.appendChild(x); });
    box.appendChild(hd);
    if(b.t==='title'||b.t==='link'){
      const i=document.createElement('input'); i.style.cssText=inStyle; i.value=b.t==='title'?(b.text||''):(b.label||''); i.placeholder=b.t==='title'?'a short title':'button words, e.g. hear it';
      i.oninput=()=>{ if(b.t==='title') b.text=i.value; else b.label=i.value; touch(); }; box.appendChild(i); }
    if(b.t==='link'){ const u=document.createElement('input'); u.style.cssText=inStyle; u.value=b.url||''; u.placeholder='https://…';
      u.oninput=()=>{ b.url=u.value.trim(); touch(); }; box.appendChild(u);
      if(b.url&&!/^https?:\/\//i.test(b.url)) box.appendChild(el('div','sthint warn','The link needs to start with https://')); }
    if(b.t==='text'){ const t=document.createElement('textarea'); t.style.cssText=inStyle+';min-height:74px;resize:vertical;font:600 12px Manrope'; t.value=b.text||'';
      t.placeholder='the fact, the story, the secret…'; t.oninput=()=>{ b.text=t.value; touch(); }; box.appendChild(t); }
    if(b.t==='song'){   /* v57: a track the pop-up can play */
      const a=b.asset?ASSETS[b.asset]:null;
      const r=el('div','strow'); const th=el('div','th',a?'♪':'+');
      const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>'; nm.querySelector('b').textContent=a?a.name:'a song';
      nm.querySelector('s').textContent=a?((a.blob.size/1048576).toFixed(1)+' MB · shows a “play track” button'):'MP3 or M4A · rides inside the room';
      const add=el('button','add',a?'swap':'+ add');
      add.onclick=e=>{ e.stopPropagation(); pick('audio/*',fs=>{ if(!fs[0]) return; addAsset(fs[0]).then(x=>{ if(x.k!=='audio') return tip('that wants a song (mp3 / m4a)'); b.asset=x.id; touch(); ui(); }); }); };
      r.appendChild(th); r.appendChild(nm); r.appendChild(add); box.appendChild(r);
      const i=document.createElement('input'); i.style.cssText=inStyle; i.value=b.text||''; i.placeholder='song name (optional)'; i.oninput=()=>{ b.text=i.value; touch(); }; box.appendChild(i);
      if(MOODSP) box.appendChild(el('div','sthint','To make <b>play</b> open the sky or wake the visualizers: on this model, turn on <b>Tap sets things off</b> and pick <b>when its song plays</b>.'));
      if(a&&a.blob.size>12*1048576) box.appendChild(el('div','sthint warn','<b>That song is '+(a.blob.size/1048576).toFixed(1)+' MB.</b> It rides inside the room — under 10 MB loads best.'));
    }
    if(b.t==='quiz'){   /* v69: a question — the right answer unlocks "collect" */
      if(!Array.isArray(b.answers)) b.answers=['',''];
      const q=document.createElement('input'); q.style.cssText=inStyle; q.value=b.q||''; q.placeholder='the question, e.g. Which city did the band form in?';
      q.oninput=()=>{ b.q=q.value; touch(); }; box.appendChild(q);
      b.answers.forEach((a,ai)=>{ const r=el('div','stqa'); const ok=el('button','qok'+(ai===(+b.right||0)?' on':''),ai===(+b.right||0)?'✓ right':'right?');
        ok.title='mark this as the right answer'; ok.onclick=()=>{ b.right=ai; touch(); ui(); };
        const i=document.createElement('input'); i.style.cssText=inStyle+';flex:1;margin:0'; i.value=a||''; i.placeholder='answer '+(ai+1);
        i.oninput=()=>{ b.answers[ai]=i.value; touch(); };
        r.appendChild(ok); r.appendChild(i);
        if(b.answers.length>2){ const x=el('button','qx','×'); x.title='remove this answer'; x.onclick=()=>{ b.answers.splice(ai,1); if(+b.right===ai) b.right=0; else if(+b.right>ai) b.right=+b.right-1; touch(); ui(); }; r.appendChild(x); }
        box.appendChild(r); });
      if(b.answers.length<4){ const ad=el('div','stbtns'); const x=el('button','','+ answer'); x.onclick=()=>{ b.answers.push(''); touch(); ui(); }; ad.appendChild(x); box.appendChild(ad); }
      box.appendChild(el('div','sthint','Fans pick an answer. Wrong → <b>try again</b>. Right → <b>collect</b> unlocks, and collecting sets off this model’s moment. Closing it before then doesn’t count.'));
    }
    if(b.t==='image'||b.t==='video'){
      const a=b.asset?ASSETS[b.asset]:null;
      const r=el('div','strow'); const th=el('div','th'); if(a&&a.k==='image') th.style.backgroundImage='url('+a.url+')'; else th.textContent=a?'▶':'+';
      const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>'; nm.querySelector('b').textContent=a?a.name:(b.t==='image'?'a picture':'a clip');
      nm.querySelector('s').textContent=a?((a.blob.size/1048576).toFixed(1)+' MB'):(b.t==='image'?'JPG or PNG · 1600 px wide is plenty':'MP4 · muted loop · keep it under 4 MB');
      const add=el('button','add',a?'swap':'+ add');
      add.onclick=e=>{ e.stopPropagation(); pick(b.t==='image'?'image/*':'video/*',fs=>{ if(!fs[0]) return; addAsset(fs[0]).then(x=>{
        if(x.k!==b.t) return tip(b.t==='image'?'that wants a picture':'that wants a video clip'); b.asset=x.id; touch(); ui(); }); }); };
      r.appendChild(th); r.appendChild(nm); r.appendChild(add); box.appendChild(r);
      if(a&&b.t==='video'&&a.blob.size>4*1048576) box.appendChild(el('div','sthint warn','<b>That clip is '+(a.blob.size/1048576).toFixed(1)+' MB.</b> It rides inside the room — keep clips under 4 MB.'));
    }
  });
  const ab=el('div','stbtns stchips');
  [['title','+ title'],['text','+ text'],['image','+ picture'],['video','+ clip'],['link','+ link'],['song','+ song'],['quiz','+ question']].forEach(([t,l])=>{
    const b=el('button','',l); b.onclick=()=>{ egg.blocks.push(t==='link'?{t,label:'',url:''}:(t==='image'||t==='video')?{t,asset:null}:t==='song'?{t,asset:null,text:''}:t==='quiz'?{t,q:'',answers:['','',''],right:0}:{t,text:''}); touch(); ui(); }; ab.appendChild(b); });
  box.appendChild(ab);
  const pb=el('div','stbtns'); const pv=el('button','gold','preview pop-up');
  pv.onclick=()=>{ delete window.HEXCORE.EGGSOLVED.preview; window.HEXCORE.openEgg(egg,eggURL,null,1,HEX); }; pb.appendChild(pv); box.appendChild(pb);
  w.appendChild(box);
}
function eggCount(st){ return (st.models||[]).filter(M=>M.egg&&M.egg.on).length+(st.spots||[]).filter(P=>P.egg&&P.egg.on).length; }

/* ---- the room side: which wall is a window, which set is behind it ---- */
function windowsSection(w){
  if(MOODSP) return cutSection(w);
  w.appendChild(el('div','sthint stlead','Any wall can be a window. The <b>see-through part</b> of the wall art is the opening. '+
    'Build a <b>set</b> on its own, lock it, then pick which window it goes behind.'));
  SURF.filter(d=>d.kind==='wall').forEach(d=>{
    const W=winOf(d.id)||{on:false,set:null};
    w.appendChild(seg(d.label.replace(/ ·.*$/,'')+' window',[['off','off'],['on','on']],W.on?'on':'off',k=>{
      const x=LOOK.windows[d.id]||(LOOK.windows[d.id]={on:false,set:null});
      x.on=(k==='on'); if(x.on&&!x.set&&(LOOK.sets||[]).length) x.set=LOOK.sets[0].id;
      applySurface(d.id); rebuildWindowsNow(); touch(); ui(); }));
    if(!W.on) return;
    const st=LOOK.surfaces[d.id], a=st&&st.asset?ASSETS[st.asset]:null;
    let msg;
    if(!a||!a.img) msg='<b>Add wall art first</b> — a PNG with a see-through hole ('+d.w+'×'+d.h+', the hole 2:1).';
    else if(!WRECT[d.id]) msg='<b>No opening found.</b> This art has no see-through part. Cut the window out as transparent pixels in a PNG.';
    else { const r=WRECT[d.id]; msg='Opening found · '+((r[2]-r[0])*RM.len(d.idx)).toFixed(1)+' × '+((r[3]-r[1])*(RM.H||4.6)).toFixed(1)+' m'; }
    w.appendChild(el('div','sthint'+(WRECT[d.id]?'':' warn'),msg));
    const r=el('div','stf'); r.appendChild(el('label','','Set'));
    const s=document.createElement('select');
    s.style.cssText='flex:1;font:700 10px Manrope;color:#cfc7f2;background:rgba(7,6,13,.6);border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    s.innerHTML='<option value="">— empty —</option>';
    (LOOK.sets||[]).forEach(x=>{ const o=document.createElement('option'); o.value=x.id; o.textContent=x.name+(x.locked?' 🔒':''); if(W.set===x.id) o.selected=true; s.appendChild(o); });
    s.onchange=()=>{ LOOK.windows[d.id].set=s.value||null; rebuildWindowsNow(); touch(); };
    r.appendChild(s); w.appendChild(r);
  });
  setsList(w);
}
function setsList(w){
  w.appendChild(el('div','stsub','Sets'));
  (LOOK.sets||[]).forEach(st=>{
    const row=el('div','strow'); const th=el('div','th', st.locked?'🔒':'◧');
    const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>'; nm.querySelector('b').textContent=st.name;
    const used=Object.keys(LOOK.windows||{}).filter(k=>LOOK.windows[k].on&&LOOK.windows[k].set===st.id).map(k=>SBY[k]?SBY[k].label.replace(/ ·.*$/,''):k);
    nm.querySelector('s').textContent=(st.locked?'locked':'not locked')+' · '+(used.length?'in '+used.join(', '):'not in a window');
    row.appendChild(th); row.appendChild(nm);
    const e=el('button','add','edit'); e.onclick=ev=>{ ev.stopPropagation(); enterSetEditor(st.id); }; row.appendChild(e);
    const x=el('span','x','×'); x.title='delete set'; x.onclick=ev=>{ ev.stopPropagation(); if(confirm('Delete set “'+st.name+'”?')) deleteSet(st.id); }; row.appendChild(x);
    row.onclick=()=>enterSetEditor(st.id);
    w.appendChild(row);
    const eb=el('div','stbtns'); const ex=el('button','','save set file'); ex.onclick=()=>exportSet(st); eb.appendChild(ex); w.appendChild(eb);
  });
  const b=el('div','stbtns');
  const n=el('button','gold','+ new set'); n.onclick=()=>{ const st=newSet(); touch(); enterSetEditor(st.id); };
  const im=el('button','','open set file…'); im.onclick=importSet;
  b.appendChild(n); b.appendChild(im); w.appendChild(b);
  w.appendChild(el('div','sthint','<b>save set file</b> keeps a set in one file, so you can fly it into another room with <b>open set file</b>.'));
}

/* ---- v43 · Mood Room: cut a window straight into a wall ---- */
let CUTWALL='wall0', CUTH=null, CUTDRAG=null;
const CUTSHAPES=[['rect','square','<rect x="3" y="3" width="20" height="14"/>'],['round','rounded','<rect x="3" y="3" width="20" height="14" rx="5"/>'],
  ['arch','arch','<path d="M3 17V10a10 7 0 0 1 20 0v7z"/>'],['circle','circle','<ellipse cx="13" cy="10" rx="9" ry="7.5"/>']];
function cutLive(){
  const w=winOf(CUTWALL); if(!w||!w.cut) return; const i=SBY[CUTWALL].idx;
  WRECT[CUTWALL]=window.HEXCORE.cutWindow(HEX,HEX.walls[i],w.cut,wallLen(i),RM.H||HEX.WALL_H);
  window.HEXCORE.windowWall(HEX.walls[i],true); cutHandles(); rebuildWindows(); touch();
}
function cutSection(w){
  const Hh=RM.H||HEX.WALL_H;
  if(!SBY[CUTWALL]) CUTWALL='wall0';
  const d=SBY[CUTWALL], len=wallLen(d.idx);
  w.appendChild(el('div','sthint stlead','Pick a wall and cut a window in it — no see-through picture needed. Then pick the <b>set</b> you see through it.'));
  w.appendChild(seg('Wall',SURF.filter(x=>x.kind==='wall').map(x=>[x.id,String(x.idx)]),CUTWALL,k=>{ CUTWALL=k; ui(); }));
  const W=winOf(CUTWALL);
  if(!W||!W.on||!W.cut){
    if(W&&W.on&&!W.cut) w.appendChild(el('div','sthint','This wall’s window comes from <b>your art’s see-through part</b> (the old way). You can cut one instead.'));
    const b=el('div','stbtns'), c=el('button','gold',W&&W.on?'cut one instead':'+ cut a window here');
    c.onclick=()=>{ const x=LOOK.windows[CUTWALL]||(LOOK.windows[CUTWALL]={on:false,set:null});
      x.on=true; x.cut=window.HEXCORE.cutDefaults(); window.HEXCORE.cutClamp(x.cut,len,Hh);
      if(!x.set&&(LOOK.sets||[]).length) x.set=LOOK.sets[0].id;
      applySurface(CUTWALL); rebuildWindowsNow(); touch(); ui(); };
    b.appendChild(c);
    if(!(W&&W.on)){ const o=el('button','','use my art’s see-through part');
      o.onclick=()=>{ const x=LOOK.windows[CUTWALL]||(LOOK.windows[CUTWALL]={on:false,set:null}); x.on=true; delete x.cut;
        if(!x.set&&(LOOK.sets||[]).length) x.set=LOOK.sets[0].id; applySurface(CUTWALL); rebuildWindowsNow(); touch(); ui(); };
      b.appendChild(o); }
    else { const o=el('button','red','remove window'); o.onclick=()=>{ LOOK.windows[CUTWALL].on=false; applySurface(CUTWALL); rebuildWindowsNow(); touch(); ui(); }; b.appendChild(o); }
    w.appendChild(b);
  } else {
    const c=W.cut;
    w.appendChild(el('div','stsub',d.label.replace(/ ·.*$/,'')+' · window'));
    const r=el('div','stf'); r.appendChild(el('label','','Shape')); const g=el('div','stseg stshape');
    CUTSHAPES.forEach(([k,t,svg])=>{ const b=el('button',k===c.shape?'on':'','<svg viewBox="0 0 26 20" fill="none" stroke="currentColor" stroke-width="2">'+svg+'</svg>');
      b.title=t; b.dataset.shape=k; b.onclick=()=>{ c.shape=k; cutLive(); ui(); }; g.appendChild(b); });
    r.appendChild(g); w.appendChild(r);
    const m=v=>v.toFixed(2)+' m';
    w.appendChild(slider('Width',c.w,.4,len-.3,.01,m,v=>{ c.w=v; cutLive(); }));
    w.appendChild(slider('Height',c.h,.4,Hh-.25,.01,m,v=>{ c.h=v; cutLive(); }));
    w.appendChild(slider('Left / right',c.x,-len/2,len/2,.01,m,v=>{ c.x=v; cutLive(); }));
    w.appendChild(slider('Up / down',c.y,.05,Hh-.5,.01,m,v=>{ c.y=v; cutLive(); }));
    w.appendChild(seg('At the start',[['open','open'],['closed','closed · opens on a trigger']],c.closed?'closed':'open',k=>{ c.closed=k==='closed'; if(!c.closed) delete window.HEXCORE.WINK[CUTWALL]; cutLive(); ui(); }));   /* v65 */
    if(c.closed) w.appendChild(el('div','sthint','Fans see plain wall until it opens. To open it: pick a model → <b>Tap sets things off</b> → <b>+ something happens</b> → <b>window · wall '+d.idx+'</b> · opens. Collecting that model\'s egg opens it too. It shows faintly here so you can still work on it.'));
    w.appendChild(seg('Frame',[['none','none'],['thin','thin'],['thick','thick']],c.frame||'none',k=>{ c.frame=k; cutLive(); ui(); }));
    if(c.frame&&c.frame!=='none'){ const fr=el('div','stf'); fr.appendChild(el('label','','Frame colour'));
      const i=document.createElement('input'); i.type='color'; i.value=c.fc||'#1b1a17'; i.oninput=()=>{ c.fc=i.value; cutLive(); };
      fr.appendChild(i); w.appendChild(fr); }
    w.appendChild(el('div','sthint','Or drag the <b>yellow dots</b> in the room: corners and edges size it, the middle one moves it.'));
    w.appendChild(el('div','stsub','What you see through it'));
    const sr=el('div','stf'); sr.appendChild(el('label','','Set'));
    const s=document.createElement('select'); s.innerHTML='<option value="">— empty —</option>';
    (LOOK.sets||[]).forEach(x=>{ const o=document.createElement('option'); o.value=x.id; o.textContent=x.name+(x.locked?' 🔒':''); if(W.set===x.id) o.selected=true; s.appendChild(o); });
    s.onchange=()=>{ W.set=s.value||null; rebuildWindowsNow(); touch(); ui(); };
    sr.appendChild(s); w.appendChild(sr);
    const b=el('div','stbtns');
    const n=el('button','gold','+ new set'); n.onclick=()=>{ const st=newSet(); if(!W.set) W.set=st.id; touch(); enterSetEditor(st.id); };
    const x=el('button','red','remove window'); x.onclick=()=>{ W.on=false; delete W.cut; applySurface(CUTWALL); rebuildWindowsNow(); touch(); ui(); };
    b.appendChild(n); b.appendChild(x); w.appendChild(b);
  }
  const all=SURF.filter(x=>x.kind==='wall'&&winOn(x.id));
  if(all.length){
    w.appendChild(el('div','stsub','Windows in this room'));
    all.forEach(x=>{ const W2=winOf(x.id), st=W2.set&&setById(W2.set);
      const row=el('div','strow'+(x.id===CUTWALL?' sel':'')); const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>';
      nm.querySelector('b').textContent=x.label.replace(/ ·.*$/,'')+' · '+(W2.cut?(CUTSHAPES.find(q=>q[0]===W2.cut.shape)||[0,'window'])[1]:'from art');
      nm.querySelector('s').textContent=st?st.name:'no set yet';
      row.appendChild(nm); row.onclick=()=>{ CUTWALL=x.id; ui(); }; w.appendChild(row); });
  }
  setsList(w);
}
function cutHandles(){
  if(!MOODSP||!HEX||!HEX.scene||!LOOK) return;
  const w=winOf(CUTWALL);
  const on=!!(w&&w.on&&w.cut&&TAB==='windows'&&!SETEDIT&&!FAN&&!DEMO&&PANEL&&PANEL.classList.contains('open'));
  if(!CUTH){ CUTH={g:new T.Group(),hs:[]};
    const mat=new T.MeshBasicMaterial({color:0xe7e2a0,depthTest:false,transparent:true,toneMapped:false});
    [-1,0,1].forEach(sx=>[-1,0,1].forEach(sy=>{ const h=new T.Mesh(new T.SphereGeometry((sx||sy)?.13:.17,16,12),mat);
      h.renderOrder=999; h.userData.cut=[sx,sy]; CUTH.g.add(h); CUTH.hs.push(h); }));
    CUTH.line=new T.LineLoop(new T.BufferGeometry(),new T.LineDashedMaterial({color:0xe7e2a0,dashSize:.18,gapSize:.12,depthTest:false,transparent:true,toneMapped:false}));
    CUTH.line.renderOrder=998; CUTH.g.add(CUTH.line); CUTH.g.userData.cutHandles=true; HEX.scene.add(CUTH.g); }
  CUTH.g.visible=on; if(!on) return;
  const c=w.cut, m=HEX.walls[SBY[CUTWALL].idx], Hh=RM.H||HEX.WALL_H; m.updateMatrixWorld(true);
  const V=(x,y)=>m.localToWorld(new T.Vector3(x,y-Hh/2,.16));
  CUTH.hs.forEach(h=>{ const [sx,sy]=h.userData.cut; h.position.copy(V(c.x+sx*c.w/2, c.y+c.h/2+sy*c.h/2)); });
  CUTH.line.geometry.setFromPoints([V(c.x-c.w/2,c.y),V(c.x+c.w/2,c.y),V(c.x+c.w/2,c.y+c.h),V(c.x-c.w/2,c.y+c.h)]);
  CUTH.line.computeLineDistances();
}
function wallLocal(m,x,y){
  setPtr(x,y); m.updateMatrixWorld(true);
  const n=new T.Vector3(0,0,1).applyQuaternion(m.quaternion), pl=new T.Plane().setFromNormalAndCoplanarPoint(n,m.position);
  const q=new T.Vector3(); if(!RAY.ray.intersectPlane(pl,q)) return null;
  const l=m.worldToLocal(q); l.y+=(RM.H||HEX.WALL_H)/2; return l;
}
function cutDown(e){
  if(!CUTH||!CUTH.g.visible||FAN||DEMO) return;
  if(PANEL.contains(e.target)) return;
  setPtr(e.clientX,e.clientY);
  const h=RAY.intersectObjects(CUTH.hs,false)[0]; if(!h) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const m=HEX.walls[SBY[CUTWALL].idx], p=wallLocal(m,e.clientX,e.clientY); if(!p) return;
  CUTDRAG={k:h.object.userData.cut, s:Object.assign({},winOf(CUTWALL).cut), p0:p, m:m};
}
addEventListener('pointermove',e=>{ if(!CUTDRAG) return;
  const D=CUTDRAG, p=wallLocal(D.m,e.clientX,e.clientY); if(!p) return;
  const dx=p.x-D.p0.x, dy=p.y-D.p0.y, s=D.s, c=winOf(CUTWALL).cut, sx=D.k[0], sy=D.k[1];
  if(!sx&&!sy){ c.x=s.x+dx; c.y=s.y+dy; }
  else{ let L=s.x-s.w/2, R=s.x+s.w/2, B=s.y, Tp=s.y+s.h;
    if(sx>0) R+=dx; if(sx<0) L+=dx; if(sy>0) Tp+=dy; if(sy<0) B+=dy;
    if(R-L<.4){ if(sx>0) R=L+.4; else L=R-.4; } if(Tp-B<.4){ if(sy>0) Tp=B+.4; else B=Tp-.4; }
    c.w=R-L; c.x=(L+R)/2; c.h=Tp-B; c.y=B; }
  cutLive(); });
addEventListener('pointerup',()=>{ if(!CUTDRAG) return; CUTDRAG=null; rebuildWindowsNow(); touch(); ui(); });

/* ================= v47 · SIGN THE WALL — builder demo =================
   A fan signs with a finger on a little pad; the signature lands on a wall in marker / paint pen /
   chalk / carved into it. DEMO ONLY: signatures live in this builder's look and never bake — on a
   live event the play page owns the pad, the saving and the moderation (the room never talks to a database). */
const SIGPENS=[['#141414','black marker'],['#f2f0ea','white paint pen'],['#c9ccd2','silver'],['#e2c46a','gold'],['#d23a3a','red']];
const SIGLOOKS=[['marker','marker'],['paint','paint pen'],['chalk','chalk'],['carved','carved']];
let SIGMESH=null, SIGRECTS=[];
const sigCfg=()=>LOOK.sigwall||(LOOK.sigwall={on:false,wall:2,look:'marker',sigs:[]});
function sigRand(seed){ let s=0; for(let i=0;i<seed.length;i++) s=(s*31+seed.charCodeAt(i))>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
/* draw one signature's strokes into box (x,y,w,h) of a 2D context */
function sigStrokes(g,S,x,y,w,h,look,pen){ return window.HEXCORE.sigStrokes(g,S,x,y,w,h,look,pen);
}
function sigStrokesOld(g,S,x,y,w,h,look,pen){
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
  });
}
function drawSigWall(){
  const C=LOOK&&LOOK.sigwall;
  if(SIGMESH){ HEX.scene.remove(SIGMESH); SIGMESH.material.map&&SIGMESH.material.map.dispose(); SIGMESH=null; }
  SIGRECTS=[];
  if(!C||!C.on||!HEX.walls[C.wall]) return;
  SIGMESH=window.HEXCORE.sigWallMesh(HEX,C,C.sigs||[]); if(!SIGMESH) return;   /* v86: one drawing for the builder and the live room */
  SIGRECTS=SIGMESH.userData.rects||[]; HEX.scene.add(SIGMESH);
}
function pickSig(x,y){
  if(!SIGMESH||!SIGRECTS.length) return null; setPtr(x,y);
  const h=RAY.intersectObject(SIGMESH,false)[0]; if(!h||!h.uv) return null;
  const u=h.uv.x, v=1-h.uv.y, r=SIGRECTS.find(q=>u>=q.u0&&u<=q.u1&&v>=q.v0&&v<=q.v1);
  return r?(sigCfg().sigs.find(s=>s.id===r.id)||null):null;
}
function sigOverlay(id,html){
  let o=document.getElementById(id); if(o) o.remove();
  o=el('div'); o.id=id; o.setAttribute('data-stage','');
  o.style.cssText='position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(5,5,6,.72);'+
    'backdrop-filter:blur(6px);font-family:"IBM Plex Sans",Helvetica,Arial,sans-serif;color:#ece9df';
  o.innerHTML=html; document.body.appendChild(o); return o;
}
function showSigCard(S){
  const C=sigCfg();
  const o=sigOverlay('stgSigCard','<div style="width:min(560px,92vw);background:#121214;border:1px solid rgba(235,232,220,.16);border-radius:18px;padding:18px;display:grid;gap:12px">'+
    '<canvas width="1040" height="520" style="width:100%;border-radius:12px;background:#4a4842"></canvas>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b class="nm" style="font:400 24px \'Bebas Neue\',Impact,sans-serif;letter-spacing:.06em"></b>'+
    '<div class="ln" style="color:#9b978b;font-size:14px;margin-top:2px"></div></div>'+
    '<button style="font:600 10px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;color:#ece9df;background:none;border:1px solid rgba(235,232,220,.3);border-radius:999px;padding:8px 14px;cursor:pointer">close</button></div></div>');
  const cv=o.querySelector('canvas'), g=cv.getContext('2d');
  const tex=HEX.walls[C.wall]&&HEX.walls[C.wall].material.map;   /* the wall behind it, so it reads as the wall */
  try{ if(tex&&tex.image){ const pat=g.createPattern(tex.image,'repeat'); g.fillStyle=pat; g.fillRect(0,0,1040,520); g.fillStyle='rgba(0,0,0,.35)'; g.fillRect(0,0,1040,520); } }catch(e){}
  sigStrokes(g,S,60,40,920,440,C.look,S.pen||'#141414');
  o.querySelector('.nm').textContent=S.name||'a fan';            /* fan-typed → text only */
  o.querySelector('.ln').textContent=S.line||'';
  o.querySelector('button').onclick=()=>o.remove(); o.onclick=e=>{ if(e.target===o) o.remove(); };
}
function openSigPad(){
  const C=sigCfg();
  const sw=SIGPENS.map(([c,t],i)=>'<button data-pen="'+c+'" title="'+t+'" style="width:30px;height:30px;border-radius:50%;cursor:pointer;background:'+c+';border:2px solid '+(i?'rgba(235,232,220,.25)':'#e7e2a0')+'"></button>').join('');
  const btn='font:600 10px \'IBM Plex Mono\',monospace;letter-spacing:.12em;text-transform:uppercase;border-radius:8px;padding:9px 12px;cursor:pointer;';
  const inp='font:500 14px \'IBM Plex Sans\',sans-serif;color:#ece9df;background:rgba(0,0,0,.35);border:1px solid rgba(235,232,220,.16);border-radius:8px;padding:9px 10px;box-sizing:border-box;width:100%';
  const o=sigOverlay('stgSigPad','<div style="width:min(640px,94vw);background:#121214;border:1px solid rgba(235,232,220,.16);border-radius:18px;padding:16px;display:grid;gap:12px">'+
    '<div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font:400 26px \'Bebas Neue\',Impact,sans-serif;letter-spacing:.08em">SIGN THE WALL</b>'+
    '<span style="font:600 9px \'IBM Plex Mono\',monospace;letter-spacing:.16em;color:#e7e2a0">DEMO · BUILDER ONLY</span></div>'+
    '<canvas width="1200" height="600" style="width:100%;aspect-ratio:2/1;border-radius:12px;background:#4a4842;touch-action:none;cursor:crosshair"></canvas>'+
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="font-size:12px;color:#9b978b;margin-right:4px">Pen</span>'+sw+
    '<span style="flex:1"></span><button class="un" style="'+btn+'color:#ece9df;background:none;border:1px solid rgba(235,232,220,.25)">undo</button>'+
    '<button class="cl" style="'+btn+'color:#ece9df;background:none;border:1px solid rgba(235,232,220,.25)">clear</button></div>'+
    '<div style="display:grid;grid-template-columns:1fr 2fr;gap:8px"><input class="nm" maxlength="12" placeholder="your name" style="'+inp+'">'+
    '<input class="ln" maxlength="140" placeholder="one line for the artist (optional)" style="'+inp+'"></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end"><button class="x" style="'+btn+'color:#ece9df;background:none;border:1px solid rgba(235,232,220,.25)">cancel</button>'+
    '<button class="go" style="'+btn+'color:#0b0b0c;background:#e7e2a0;border:1px solid #e7e2a0">sign the wall</button></div></div>');
  const cv=o.querySelector('canvas'), g=cv.getContext('2d'); let pen=SIGPENS[0][0], strokes=[], cur=null;
  const bg=()=>{ g.clearRect(0,0,1200,600);
    const tex=HEX.walls[C.wall]&&HEX.walls[C.wall].material.map;
    try{ if(tex&&tex.image){ g.fillStyle=g.createPattern(tex.image,'repeat'); g.fillRect(0,0,1200,600); g.fillStyle='rgba(0,0,0,.3)'; g.fillRect(0,0,1200,600); } }catch(e){}
    g.strokeStyle='rgba(236,233,223,.22)'; g.setLineDash([10,10]); g.lineWidth=2; g.beginPath(); g.moveTo(80,470); g.lineTo(1120,470); g.stroke(); g.setLineDash([]); };
  const redraw=()=>{ bg(); sigStrokes(g,{strokes:strokes.concat(cur?[cur]:[])},0,0,1200,600,C.look,pen); };
  const at=e=>{ const r=cv.getBoundingClientRect(); return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)), Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]; };
  cv.onpointerdown=e=>{ cv.setPointerCapture(e.pointerId); const p=at(e); cur=[+p[0].toFixed(4),+p[1].toFixed(4)]; redraw(); };
  cv.onpointermove=e=>{ if(!cur) return; const p=at(e); const lx=cur[cur.length-2], ly=cur[cur.length-1];
    if(Math.hypot(p[0]-lx,(p[1]-ly)/2)<.003) return; cur.push(+p[0].toFixed(4),+p[1].toFixed(4)); redraw(); };
  cv.onpointerup=cv.onpointercancel=()=>{ if(cur){ strokes.push(cur); cur=null; redraw(); } };
  o.querySelectorAll('[data-pen]').forEach(b=>b.onclick=()=>{ pen=b.dataset.pen;
    o.querySelectorAll('[data-pen]').forEach(x=>x.style.borderColor=x===b?'#e7e2a0':'rgba(235,232,220,.25)'); redraw(); });
  o.querySelector('.un').onclick=()=>{ strokes.pop(); redraw(); };
  o.querySelector('.cl').onclick=()=>{ strokes=[]; redraw(); };
  o.querySelector('.x').onclick=()=>o.remove();
  o.querySelector('.go').onclick=()=>{ if(!strokes.length) return tip('sign it first');
    C.sigs.push({id:'g'+Date.now().toString(36)+Math.floor(Math.random()*1e3), name:o.querySelector('.nm').value.trim().slice(0,12),
      line:o.querySelector('.ln').value.trim().slice(0,140), pen:pen, strokes:strokes});
    o.remove(); drawSigWall(); touch(); ui(); tip('signed — it’s on wall '+C.wall); };
  redraw();
}
function sigSection(){
  const C=sigCfg(), s=sec('Signature wall (demo)',true);
  s.wrap.appendChild(el('div','sthint stlead','Fans sign a wall with their finger. In the published room the wall shows its title and the signatures the Trio page sends; a tap opens the page’s signing pad. Signatures you make here are a <b>demo</b> and don’t publish.'));
  s.wrap.appendChild(seg('Signature wall',[['off','off'],['on','on']],C.on?'on':'off',k=>{ C.on=(k==='on'); drawSigWall(); touch(); ui(); }));
  if(C.on){
    s.wrap.appendChild(seg('On wall',SURF.filter(x=>x.kind==='wall').map(x=>[String(x.idx),String(x.idx)]),String(C.wall),k=>{ C.wall=+k; drawSigWall(); touch(); ui(); }));
    s.wrap.appendChild(seg('Look',SIGLOOKS,C.look,k=>{ C.look=k; drawSigWall(); touch(); ui(); }));
    { const D=window.HEXCORE.SIGDEF;   /* v86: the title that tells fans they can sign */
      s.wrap.appendChild(seg('Title',[['on','on'],['off','off']],C.plate===false?'off':'on',k=>{ C.plate=(k==='on'); drawSigWall(); touch(); ui(); }));
      if(C.plate!==false){
        const r=el('div','stf'); r.appendChild(el('label','','Words')); const i=document.createElement('input'); i.type='text'; i.maxLength=28; i.value=C.title==null?D.title:C.title; i.onchange=()=>{ C.title=i.value.toUpperCase().slice(0,28)||D.title; drawSigWall(); touch(); ui(); }; r.appendChild(i); s.wrap.appendChild(r);
        s.wrap.appendChild(seg('Small line',[['on','“tap the wall…”'],['off','off']],C.sub===false?'off':'on',k=>{ C.sub=(k==='on'); drawSigWall(); touch(); ui(); }));
        s.wrap.appendChild(colorRow('Title colour',C.color||D.color,v=>{ C.color=v||D.color; drawSigWall(); touch(); })); } }
    const b=el('div','stbtns'); const go=el('button','gold','✍ sign the wall'); go.onclick=openSigPad; b.appendChild(go);
    if(C.sigs.length){ const cl=el('button','red','clear all'); cl.onclick=()=>{ if(confirm('Wipe every signature?')){ C.sigs=[]; drawSigWall(); touch(); ui(); } }; b.appendChild(cl); }
    s.wrap.appendChild(b);
    C.sigs.slice().reverse().forEach(S=>{ const r=el('div','strow'); const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>';
      nm.querySelector('b').textContent=S.name||'a fan'; nm.querySelector('s').textContent=S.line||'signature only';
      const x=el('span','x','×'); x.title='remove'; x.onclick=ev=>{ ev.stopPropagation(); C.sigs=C.sigs.filter(q=>q!==S); drawSigWall(); touch(); ui(); };
      r.appendChild(nm); r.appendChild(x); r.onclick=()=>showSigCard(S); s.wrap.appendChild(r); });
    s.wrap.appendChild(el('div','sthint','Tap a signature in the room to see it big. Keep the photo and video tiles off this wall.'));
  }
  return s;
}

/* ================= UI ================= */
const el=(t,c,h)=>{ const n=document.createElement(t); if(c)n.className=c; if(h!==undefined)n.innerHTML=h; return n; };
let PANEL,BODY,TIP;
function tip(msg){ TIP.textContent=msg; TIP.classList.add('on');
  clearTimeout(tip._t); tip._t=setTimeout(()=>TIP.classList.remove('on'),2200); }

const OPEN={};
function sec(title,open){
  const isOpen=(title in OPEN)?OPEN[title]:open;
  const s=el('div','stsec'+(isOpen?'':' closed'));
  const h=el('h4','', '<i>▾</i>'+title);
  s.dataset.t=title;
  h.onclick=()=>{
    /* v41 tabs: a heading never folds away — it takes you to its tab, open */
    if(TABBED&&!SETEDIT&&s.parentNode===BODY){
      const tb=tabOf(title);
      if(tb!==TAB){ OPEN[title]=true; setTab(tb); return; }
      s.classList.remove('closed'); OPEN[title]=true; return;
    }
    s.classList.toggle('closed'); OPEN[title]=!s.classList.contains('closed'); };
  const w=el('div','stwrap'); s.appendChild(h); s.appendChild(w); s.wrap=w; return s;
}

/* ================= v41 · TABS — each category is its own short sheet =================
   Nothing about how a section is built changes: ui()/uiRoom() render every section exactly
   as before, then applyTabs() shows only the sections that belong to the open tab. */
let TABBED=true, TAB='room', RAIL=null, FOLLOW=false;
const TABS=[['room','◎','room'],['walls','▭','walls'],['windows','⧉','windows'],['media','▦','media'],
  ['models','◈','models'],['light','✦','light'],['vibe','≋','vibe'],['boards','☰','boards'],['view','⟳','360'],
  ['addons','✚','add-ons'],['admin','⚙','admin']];
const TABNAME={room:'The room',walls:'Walls & floor',windows:'Windows & sets',media:'Photos & video',
  models:'Models & tiles',light:'Light',vibe:'Vibe & music',boards:'Boards',view:'360 & moving',addons:'Add-ons',admin:'Admin'};
function tabOf(t){
  t=String(t||'');
  if(/^Admin/.test(t)) return 'admin';
  if(ISBOX){ const i=STEPS.indexOf(t); if(i>=0) return ['room','walls','media','vibe','models','light','boards'][i]; }
  if(t==='The look'||t==='What the room shows'||t==='Mood'||t==='Textures'||t==='Open space'||t==='Sky'||t==='World') return 'room';
  if(t==='Uplights') return 'light';
  if(/^Signature wall/.test(t)) return 'boards';
  if(t==='Easter egg pop-ups') return 'room';
  if(t==='Where they hang') return 'media';
  if(/^Walls/.test(t)) return 'walls';
  if(/^Windows/.test(t)) return 'windows';
  if(/^Photo wall|^Video wall/.test(t)) return 'media';
  if(/^Props/.test(t)) return 'models';
  if(t==='Lighting') return 'light';
  if(/^Vibe/.test(t)||t==='Music') return 'vibe';
  if(/^Game wall/.test(t)) return 'boards';
  if(t==='Spin the room'||t==='Move around') return 'view';
  if(t==='Add-ons') return 'addons';                                         /* v63 */
  return 'room';
}
function setTab(tb){
  TAB=tb; try{ localStorage.setItem('hexTab:'+(ISBOX?'room':WORLDSP?'world':MOODSP?'mood':'event'),tb); }catch(e){}
  if(PANEL) PANEL.classList.add('open');
  applyTabs(); if(BODY) BODY.scrollTop=0;
}
function applyTabs(){
  if(!BODY) return;
  const head=document.getElementById('stgTitle');
  if(!TABBED){ syncRail(); return; }
  if(SETEDIT){ if(head) head.textContent='Set editor'; syncRail(); return; }
  const secs=[...BODY.children].filter(n=>n.classList&&n.classList.contains('stsec'));
  if(FOLLOW){ FOLLOW=false;
    const sk=SEL?sectionFor(SEL):null;                     /* v50: a model stays in Models — never the highlighted window row */
    if(sk) TAB=tabOf(sk);
    else { const r=[...BODY.querySelectorAll('.strow.sel')].find(x=>{ let t=x; while(t&&t.parentNode!==BODY) t=t.parentNode; return t&&t.dataset&&tabOf(t.dataset.t)!=='windows'; });
      let top=r; while(top&&top.parentNode!==BODY) top=top.parentNode;
      if(top&&top.dataset&&top.dataset.t) TAB=tabOf(top.dataset.t); } }
  const have=new Set(secs.map(n=>tabOf(n.dataset.t)));
  if(!have.has(TAB)) TAB='room';
  secs.forEach(n=>{ const on=tabOf(n.dataset.t)===TAB; n.style.display=on?'':'none';
    if(on) n.classList.remove('closed'); });
  BODY.querySelectorAll('.stintro,.stnext').forEach(n=>n.style.display='none');
  if(head) head.textContent=TABNAME[TAB]||TAB;
  syncRail(have);
}
function syncRail(have){
  cutHandles();
  document.body.classList.toggle('stgclosed',!(PANEL&&PANEL.classList.contains('open')));
  { const sb=document.getElementById('stgBtn'); if(sb&&!FAN&&!DEMO) sb.textContent='show editor'; }
  if(!RAIL) return;
  RAIL.querySelectorAll('button[data-tab]').forEach(b=>{
    b.setAttribute('aria-pressed',String(b.dataset.tab===TAB&&PANEL&&PANEL.classList.contains('open')));
    if(have) b.style.display=have.has(b.dataset.tab)?'':'none';
  });
}
function railBoot(){
  try{ const t=localStorage.getItem('hexTab:'+(ISBOX?'room':WORLDSP?'world':MOODSP?'mood':'event')); if(t) TAB=t; }catch(e){}
  if(!document.getElementById('stgFonts')){
    const f=document.createElement('link'); f.id='stgFonts'; f.rel='stylesheet'; f.setAttribute('data-stage','');
    f.href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap';
    document.head.appendChild(f); }
  document.body.classList.add('sttabbed');
  RAIL=el('nav'); RAIL.id='stgRail'; RAIL.setAttribute('data-stage','');
  TABS.forEach(([k,ic,lab])=>{
    if(k==='admin') RAIL.appendChild(el('div','sp'));
    const b=el('button','','<s>'+ic+'</s>'+lab); b.dataset.tab=k; b.title=TABNAME[k];
    b.onclick=()=>{ if(k===TAB&&PANEL.classList.contains('open')){ PANEL.classList.remove('open'); syncRail(); return; }
      setTab(k); };
    RAIL.appendChild(b);
  });
  document.body.appendChild(RAIL);
  try{ new MutationObserver(()=>syncRail()).observe(PANEL,{attributes:true,attributeFilter:['class']}); }catch(e){}

  const top=el('div'); top.id='stgTop'; top.setAttribute('data-stage','');
  const nm=(!BUILDER&&!ISBOX)?'The Hex':SPACENAME;
  top.appendChild(el('b','',nm));
  const mk=(t,hot,fn)=>{ const b=el('button',hot?'hot':'',t); b.onclick=fn; top.appendChild(b); return b; };
  mk('save',false,saveLook);
  mk('save project file',false,exportProject);
  if(WORLDSP) mk('map',false,openWorldMap);   /* v72 */
  mk('preview as a fan',true,previewFan);
  mk(ISBOX?'publish':'bake',true,bakeHTML);
  document.body.appendChild(top);
}
function slider(lab,val,min,max,step,fmt,on){
  const r=el('div','stf'); r.appendChild(el('label','',lab));
  const i=document.createElement('input'); i.type='range'; i.min=min; i.max=max; i.step=step; i.value=val;
  const v=el('span','val',fmt(val));
  i.oninput=()=>{ const n=parseFloat(i.value); v.textContent=fmt(n); on(n); };
  r.appendChild(i); r.appendChild(v); return r;
}
function seg(lab,opts,cur,on){
  const r=el('div','stf'); r.appendChild(el('label','',lab));
  const g=el('div','stseg');
  opts.forEach(([k,t])=>{ const b=el('button','',t); if(k===cur)b.classList.add('on');
    b.onclick=()=>{ on(k); }; g.appendChild(b); });
  r.appendChild(g); return r;
}
function colorRow(lab,val,on){
  const r=el('div','stf'); r.appendChild(el('label','',lab));
  const i=document.createElement('input'); i.type='color'; i.value=val||'#ffffff';
  i.oninput=()=>on(i.value); r.appendChild(i);
  const b=el('button','','reset'); b.style.cssText='margin-left:8px;font:800 8px Manrope;letter-spacing:.1em;'+
    'text-transform:uppercase;background:rgba(139,123,255,.16);color:#cfc7f2;border:1px solid rgba(139,123,255,.35);'+
    'border-radius:7px;padding:6px 9px;cursor:pointer';
  b.onclick=()=>{ i.value='#ffffff'; on('#ffffff'); };
  r.appendChild(b); return r;
}

function surfaceRow(d){
  const st=LOOK.surfaces[d.id]||(LOOK.surfaces[d.id]=defSurf());
  const a=st.asset?ASSETS[st.asset]:null;
  const row=el('div','strow'+(SEL==='S:'+d.id?' sel':''));
  const th=el('div','th');
  const vidHere=CANMOVE(d.kind)&&((a&&a.k==='video')||st.url);
  if(vidHere) th.textContent='▶';
  else if(a&&a.url&&d.kind!=='song') th.style.backgroundImage='url('+a.url+')';
  else th.textContent=d.kind==='song'?'♪':'+';
  const nm=el('div','nm');
  let sub;
  if(d.kind==='logo'||d.kind==='gamecard') sub=a?a.name:'any size · drop an image';
  else if(d.kind==='song') sub=a?a.name:'drop an mp3 to hear the room';
  else if(CANMOVE(d.kind)&&((a&&a.k==='video')||st.url)){
    sub=(st.url?st.url:a.name)+' · looping clip';
  }
  else{
    const spec=d.w+'×'+d.h+' · '+(d.w/d.h).toFixed(2)+':1';
    if(a&&a.img){ const ar=(a.img.naturalWidth/a.img.naturalHeight);
      const want=d.w/d.h, off=Math.abs(ar-want)/want;
      sub=a.name+' · '+a.img.naturalWidth+'×'+a.img.naturalHeight+(off>.06?(' · '+ar.toFixed(2)+':1 — will crop'):'');
    } else sub=spec+(d.note?' · '+d.note:'');
  }
  nm.innerHTML='<b></b><s class="'+(sub.indexOf('will crop')>0?'warn':'')+'"></s>';
  nm.querySelector('b').textContent=d.label; nm.querySelector('s').textContent=sub;
  row.appendChild(th); row.appendChild(nm);
  const add=el('button','add',a?'swap':'+ add');
  add.title='choose a file for '+d.label;
  add.onclick=e=>{ e.stopPropagation(); select('S:'+d.id);
    pick(d.kind==='song'?'audio/*':(CANMOVE(d.kind)?'image/*,video/*':'image/*'),
      fs=>takeFiles(fs,{slot:d.id})); };
  row.appendChild(add);
  th.onclick=e=>{ e.stopPropagation(); add.onclick(e); };
  if(a){ const x=el('span','x','×'); x.title='clear';
    x.onclick=e=>{ e.stopPropagation(); st.asset=null; applySurface(d.id); touch(); ui(); }; row.appendChild(x); }
  row.onclick=()=>{ select(SEL==='S:'+d.id?null:'S:'+d.id); };
  row.ondragover=e=>{ e.preventDefault(); row.classList.add('dragover'); };
  row.ondragleave=()=>row.classList.remove('dragover');
  row.ondrop=e=>{ e.preventDefault(); e.stopPropagation(); row.classList.remove('dragover');
    hideDrop(); takeFiles(e.dataTransfer.files,{slot:d.id}); };
  row.onclick2=null;
  return row;
}
function surfaceCtl(d){
  const st=LOOK.surfaces[d.id];
  const box=el('div','stctl');
  if(d.kind==='logo'||d.kind==='gamecard'||d.kind==='song'){
    if(d.kind==='song'){
      const ur=el('div','stf'); ur.appendChild(el('label','','URL'));
      const uin=document.createElement('input'); uin.value=st.url||''; uin.placeholder='https://…/track.m4a';
      uin.style.cssText='flex:1;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
        'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
      uin.onchange=()=>{ st.url=uin.value.trim(); if(st.url) st.asset=null;
        applySurface(d.id); touch(); ui(); };
      ur.appendChild(uin); box.appendChild(ur);
      box.appendChild(el('div','sthint','A track is already baked into this room. Drop a file to '+
        'replace it, or paste a hosted URL — <b>streaming keeps the page small</b>, which matters '+
        'for a cold phone link.'));
    } else {
      box.appendChild(el('div','sthint','Drop a file on this row to set it.'));
    }
    const b=el('div','stbtns'); const f=el('button','','choose file…');
    f.onclick=()=>pick(d.kind==='song'?'audio/*':'image/*',fs=>takeFiles(fs,{slot:d.id}));
    if(st.url||st.asset){ const c=el('button','','back to the baked track');
      c.onclick=()=>{ st.asset=null; st.url=''; touch(); ui(); };
      b.appendChild(c); }
    b.appendChild(f); box.appendChild(b); return box;
  }
  const aNow=st.asset?ASSETS[st.asset]:null;
  const isVid = CANMOVE(d.kind) && ((aNow&&aNow.k==='video')||!!st.url);
  if(isVid){
    const ur=el('div','stf'); ur.appendChild(el('label','','URL'));
    const uin=document.createElement('input'); uin.value=st.url||''; uin.placeholder='https://\u2026/loop.mp4';
    uin.style.cssText='flex:1;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
      'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    uin.onchange=()=>{ st.url=uin.value.trim(); if(st.url) st.asset=null; applySurface(d.id); touch(); ui(); };
    ur.appendChild(uin); box.appendChild(ur);
    box.appendChild(slider('Zoom',st.scale,.5,4,.01,v=>v.toFixed(2)+'\u00d7',v=>{ st.scale=v; applySurface(d.id); touch(); }));
    box.appendChild(slider('Across',st.ox,-.5,.5,.005,v=>(v*200).toFixed(0)+'%',v=>{ st.ox=v; applySurface(d.id); touch(); }));
    box.appendChild(slider('Up/down',st.oy,-.5,.5,.005,v=>(v*200).toFixed(0)+'%',v=>{ st.oy=v; applySurface(d.id); touch(); }));
    box.appendChild(slider('Brightness',st.bright,.1,2,.01,v=>v.toFixed(2)+'\u00d7',v=>{ st.bright=v; applySurface(d.id); touch(); }));
    box.appendChild(colorRow('Tint',st.tint,v=>{ st.tint=v; applySurface(d.id); touch(); }));
    const vb=el('div','stbtns');
    const sw=el('button','','swap clip'); sw.onclick=()=>pick('image/*,video/*',fs=>takeFiles(fs,{slot:d.id}));
    const cl=el('button','','back to a still'); cl.onclick=()=>{ st.asset=null; st.url='';
      applySurface(d.id); touch(); ui(); };
    vb.appendChild(sw); vb.appendChild(cl); box.appendChild(vb);
    box.appendChild(el('div','sthint',
      'Loops silently, forever. It rides the texture matrix, so it costs nothing per frame. '+
      'Keep it tiny \u2014 <b>1024 \u00d7 200, 6\u201310s, 12\u201315fps, no audio track</b> is plenty for a banner. '+
      'For the deployed room, host the clip and paste its URL.'));
    return box;
  }
  box.appendChild(seg('Fit',[['cover','cover'],['contain','fit in'],['stretch','stretch']],st.fit,k=>{ st.fit=k; applySurface(d.id); touch(); ui(); }));
  box.appendChild(slider('Scale',st.scale,.2,4,.01,v=>v.toFixed(2)+'×',v=>{ st.scale=v; applySurface(d.id); touch(); }));
  box.appendChild(slider('Across',st.ox,-1,1,.005,v=>(v*100).toFixed(0)+'%',v=>{ st.ox=v; applySurface(d.id); touch(); }));
  box.appendChild(slider('Up/down',st.oy,-1,1,.005,v=>(-v*100).toFixed(0)+'%',v=>{ st.oy=v; applySurface(d.id); touch(); }));
  box.appendChild(slider('Rotate',st.rot,-180,180,.5,v=>v.toFixed(0)+'°',v=>{ st.rot=v; applySurface(d.id); touch(); }));
  box.appendChild(slider('Brightness',st.bright,.1,2,.01,v=>v.toFixed(2)+'×',v=>{ st.bright=v; applySurface(d.id); touch(); }));
  box.appendChild(colorRow('Tint',st.tint,v=>{ st.tint=v; applySurface(d.id); touch(); }));
  const b=el('div','stbtns');
  const f=el('button','','choose file…');
  f.onclick=()=>pick(CANMOVE(d.kind)?'image/*,video/*':'image/*',fs=>takeFiles(fs,{slot:d.id}));
  const r=el('button','','reset framing'); r.onclick=()=>{ const a=st.asset;
    LOOK.surfaces[d.id]=Object.assign(defSurf(),{asset:a}); applySurface(d.id); touch(); ui(); };
  b.appendChild(f); b.appendChild(r);
  if(st.asset||st.url){ const x=el('button','red','remove picture'); x.onclick=()=>{ LOOK.surfaces[d.id]=defSurf();   /* v48: back to the bare wall */
      applySurface(d.id); if(d.kind==='wall') rebuildWindows(); touch(); ui(); }; b.appendChild(x); }
  box.appendChild(b);
  return box;
}
function tileRow(kind,i){
  const t=LOOK.racks[kind].tiles[i];
  const id='T:'+kind+':'+i;
  const a=t.asset?ASSETS[t.asset]:null;
  const row=el('div','strow'+(SEL===id?' sel':''));
  const th=el('div','th');
  if(kind==='photo'&&a&&a.url) th.style.backgroundImage='url('+a.url+')';
  else th.textContent=kind==='video'?'▶':'+';
  const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>';
  nm.querySelector('b').textContent=(kind==='video'?'Video ':'Photo ')+(i+1);
  nm.querySelector('s').textContent = a?a.name : (t.url?t.url:window.HEXCORE.RACKS[kind].spec);
  row.appendChild(th); row.appendChild(nm);
  const add=el('button','add',(a||t.url)?'swap':'+ add');
  add.onclick=e=>{ e.stopPropagation(); select(id);
    pick(kind==='video'?'video/*':'image/*',fs=>takeFiles(fs,{slot:id})); };
  row.appendChild(add);
  th.onclick=e=>{ e.stopPropagation(); add.onclick(e); };
  if(a||t.url){ const x=el('span','x','×');
    x.onclick=e=>{ e.stopPropagation(); t.asset=null; t.url='';
      const g=RACKS[kind]&&RACKS[kind][i]; if(g){ g.userData.vurl=null;
        if(g.userData.video){ try{g.userData.video.pause();}catch(err){} g.userData.video=null; }
        if(g.userData.badge) g.userData.badge.visible=false; }
      applyTile(kind,i); touch(); ui(); };
    row.appendChild(x); }
  row.onclick=()=>select(SEL===id?null:id);
  row.ondragover=e=>{ e.preventDefault(); row.classList.add('dragover'); };
  row.ondragleave=()=>row.classList.remove('dragover');
  row.ondrop=e=>{ e.preventDefault(); e.stopPropagation(); row.classList.remove('dragover');
    hideDrop(); takeFiles(e.dataTransfer.files,{slot:id}); };
  return row;
}
function tileCtl(kind,i){
  const t=LOOK.racks[kind].tiles[i];
  const box=el('div','stctl');
  if(kind==='video'){
    const ur=el('div','stf'); ur.appendChild(el('label','','URL'));
    const ui2=document.createElement('input'); ui2.value=t.url||''; ui2.placeholder='https://…/clip.mp4';
    ui2.style.cssText='flex:1;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
      'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    ui2.onchange=()=>{ t.url=ui2.value.trim(); if(t.url) t.asset=null;
      const g=RACKS[kind][i]; if(g) g.userData.vurl=null; applyTile(kind,i); touch(); ui(); };
    ur.appendChild(ui2); box.appendChild(ur);
    const sb=el('div','stbtns');
    const g=RACKS[kind]&&RACKS[kind][i];
    const snd=el('button','',(g&&g.userData.video&&!g.userData.video.muted)
      ?'auditioning — click to mute':'audition sound (editor only)');
    snd.onclick=()=>{ if(!g||!g.userData.video) return;
      const v=g.userData.video;
      RACKS[kind].forEach(o=>{ if(o!==g&&o.userData.video) o.userData.video.muted=true; });
      v.muted=!v.muted; if(!v.muted) v.play().catch(()=>{});
      ui(); };
    sb.appendChild(snd); box.appendChild(sb);
    box.appendChild(el('div','sthint',
      'Tiles loop <b>silently and forever</b> in the room — audio belongs to the song. '+
      'Audition is for your ears here only and never bakes. A tap on a tile is reserved for '+
      'the vertical feed. '+
      'A dropped file is perfect for staging — for the <b>deployed</b> room, host the clip and '+
      'paste its URL here, because video is far too heavy to bake into the page.'));
  } else {
    box.appendChild(seg('Fit',[['cover','cover'],['contain','fit in'],['stretch','stretch']],t.fit,
      k=>{ t.fit=k; applyTile(kind,i); touch(); ui(); }));
    box.appendChild(slider('Scale',t.scale,.2,4,.01,v=>v.toFixed(2)+'×',v=>{ t.scale=v; applyTile(kind,i); touch(); }));
    box.appendChild(slider('Across',t.ox,-1,1,.005,v=>(v*100).toFixed(0)+'%',v=>{ t.ox=v; applyTile(kind,i); touch(); }));
    box.appendChild(slider('Up/down',t.oy,-1,1,.005,v=>(-v*100).toFixed(0)+'%',v=>{ t.oy=v; applyTile(kind,i); touch(); }));
    box.appendChild(slider('Rotate',t.rot,-180,180,.5,v=>v.toFixed(0)+'°',v=>{ t.rot=v; applyTile(kind,i); touch(); }));
  }
  box.appendChild(slider('Brightness',t.bright,.1,2,.01,v=>v.toFixed(2)+'×',v=>{ t.bright=v; applyTile(kind,i); touch(); }));
  box.appendChild(colorRow('Tint',t.tint,v=>{ t.tint=v; applyTile(kind,i); touch(); }));
  box.appendChild(el('div','sthint','Payload reserved on this tile for Phase 2 — a tile can become a '+
    'tap target the same way a prop can.'));
  return box;
}
/* ================= PLAY ME tiles: tap → a game ================= */
function newPlayme(){
  const p=propRec('playme',null); p.name='play me'; p.game={url:'',name:''}; p.shadow=false; p.glow=true; p.face=true; p.follow=null;
  const q=inFront(2.6); p.pos=[q.x,1.4,q.z]; return p; }
function rebuildProp(p){ const g=OBJ[p.id]; if(g){ HEX.scene.remove(g); delete OBJ[p.id]; }
  window.HEXCORE.build(p,ASSETS,HEX.scene,g2=>{ OBJ[p.id]=g2; syncPropEggsSoon(); if(SEL===p.id) select(p.id); }); }
/* a tile "over a model" sits just above that model and moves with it */
function followModels(){ (LOOK.props||[]).forEach(p=>{ if(p.type!=='playme'||!p.follow) return; const t=OBJ[p.follow]; if(!t||!propById(p.follow)){ p.follow=null; return; }
  const bb=new T.Box3(); t.updateMatrixWorld(true); t.traverse(o=>{ if(o.isMesh&&o!==t.userData.shadow) bb.expandByObject(o); }); if(bb.isEmpty()) return;
  p.wall=null; p.pos=[(bb.min.x+bb.max.x)/2, bb.max.y+.12+(p.lift||0), (bb.min.z+bb.max.z)/2];
  if(OBJ[p.id]) window.HEXCORE.apply(p,OBJ[p.id]); }); }
function playmeCtl(p){
  const box=el('div','stctl'); const G=p.game||(p.game={url:'',name:''});
  const inp=(lab,val,ph,on)=>{ const r=el('div','stf'); r.appendChild(el('label','',lab)); const i=document.createElement('input'); i.value=val||''; i.placeholder=ph;
    i.style.cssText='flex:1;min-width:0;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    i.onchange=()=>on(i.value.trim()); r.appendChild(i); return r; };
  box.appendChild(inp('Game link',G.url,'https://…',v=>{ G.url=v; touch(); ui(); }));
  if(G.url&&!/^https?:\/\//i.test(G.url)) box.appendChild(el('div','sthint warn','The link needs to start with https://'));
  box.appendChild(inp('Game name',G.name,'shows under PLAY ME',v=>{ G.name=v; rebuildProp(p); touch(); ui(); }));
  const a=p.asset?ASSETS[p.asset]:null;
  const pr=el('div','strow'); const th=el('div','th'); if(a&&a.url) th.style.backgroundImage='url('+a.url+')'; else th.textContent='+';
  const nm=el('div','nm'); nm.innerHTML='<b>Game picture</b><s></s>'; nm.querySelector('s').textContent=a?a.name:'optional · square, 512 × 512 is plenty';
  const add=el('button','add',a?'swap':'+ add'); add.onclick=e=>{ e.stopPropagation(); pick('image/*',fs=>{ if(!fs[0]) return; addAsset(fs[0]).then(x=>{
    if(x.k!=='image') return tip('that wants a picture'); p.asset=x.id; rebuildProp(p); touch(); ui(); }); }); };
  pr.appendChild(th); pr.appendChild(nm); pr.appendChild(add);
  if(a){ const x=el('span','x','×'); x.onclick=e=>{ e.stopPropagation(); p.asset=null; rebuildProp(p); touch(); ui(); }; pr.appendChild(x); }
  box.appendChild(pr);
  const where=p.follow?'model':(p.wall!=null?'wall':'free');
  box.appendChild(seg('Where it lives',[['free','anywhere'],['wall','on a wall'],['model','over a model']],where,k=>{
    if(k==='free'){ p.follow=null; if(p.wall!=null){ p.wall=null; const q=inFront(2.6); p.pos=[q.x,1.4,q.z]; } }
    if(k==='wall'){ p.follow=null; const hw=pickSurface(innerWidth/2,innerHeight/2); snapToWall(p, hw&&hw.wall!=null?hw.wall:0); p.pos[1]=Math.max(1.2,p.pos[1]); }
    if(k==='model'){ const m=(LOOK.props||[]).find(q=>q.type!=='playme'); if(!m) return tip('add a model to the room first'); p.follow=p.follow||m.id; followModels(); }
    window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); ui(); }));
  if(where==='model'){
    const r=el('div','stf'); r.appendChild(el('label','','Model'));
    const sl=document.createElement('select'); sl.style.cssText='flex:1;font:700 10px Manrope;color:#cfc7f2;background:rgba(7,6,13,.6);border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    (LOOK.props||[]).filter(q=>q.type!=='playme').forEach((q,j)=>{ const o=document.createElement('option'); o.value=q.id; o.textContent=(j+1)+' · '+(q.name||q.id); if(q.id===p.follow) o.selected=true; sl.appendChild(o); });
    sl.onchange=()=>{ p.follow=sl.value; followModels(); refreshSel(); touch(); }; r.appendChild(sl); box.appendChild(r);
    box.appendChild(slider('Above it',p.lift||0,-1,2,.01,v=>v.toFixed(2)+' m',v=>{ p.lift=v; followModels(); refreshSel(); touch(); }));
  } else box.appendChild(slider('Height',p.pos[1],0,6,.01,v=>v.toFixed(2)+' m',v=>{ p.pos[1]=v; window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); }));
  if(where!=='wall') box.appendChild(seg('Faces you',[['on','always'],['off','fixed']],p.face===false?'off':'on',k=>{ p.face=(k==='on'); touch(); ui(); }));
  if(where==='wall'||p.face===false) box.appendChild(slider('Turn',p.rot[1]*180/Math.PI,-180,180,.5,v=>v.toFixed(0)+'°',v=>{ p.rot[1]=v*Math.PI/180; window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); }));
  box.appendChild(slider('Size',p.scale,.4,3,.01,v=>v.toFixed(2)+'×',v=>{ p.scale=v; window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); }));
  box.appendChild(seg('Glow',[['on','on'],['off','off']],p.glow===false?'off':'on',k=>{ p.glow=(k==='on'); rebuildProp(p); touch(); ui(); }));
  const b=el('div','stbtns');
  const tr=el('button','gold','try it'); tr.onclick=()=>{ if(!G.url) return tip('add the game link first'); HEX.openGame(G.url,G.name||''); };
  const dup=el('button','','duplicate'); dup.onclick=()=>{ const c=JSON.parse(JSON.stringify(p)); c.id='p'+(LOOK.seq++); c.follow=null;
    c.pos=[p.pos[0]+.6,p.pos[1],p.pos[2]+.6]; addProp(c,()=>select(c.id)); ui(); };
  const dl=el('button','red','delete'); dl.onclick=()=>removeProp(p.id);
  b.appendChild(tr); b.appendChild(dup); b.appendChild(dl); box.appendChild(b);
  box.appendChild(el('div','sthint','Fans tap the tile to open the game full screen. <b>Drag it</b> in the room to move it. Check it with <b>preview as a fan</b>.'));
  return box;
}
function propRow(p){
  const row=el('div','strow'+(SEL===p.id?' sel':''));
  const th=el('div','th');
  const a=p.asset?ASSETS[p.asset]:null;
  if((p.type==='image'||p.type==='playme')&&a&&a.url) th.style.backgroundImage='url('+a.url+')';
  else th.textContent=p.type==='glb'?'◈':(p.type==='image'?'▣':(p.type==='playme'?'P':(p.type==='switch'?'⚡':'◆')));
  const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>';
  nm.querySelector('b').textContent=p.type==='playme'?('PLAY ME · '+((p.game&&p.game.name)||'no game yet')):(p.name||p.id);
  nm.querySelector('s').textContent=(p.type==='glb'?'model':p.type==='image'?'image':p.type==='playme'?'game tile':p.type==='switch'?'trigger · '+((p.trig&&p.trig.acts||[]).length)+' things happen':'built-in')+(p.startHidden?' · hidden · waits':'')+
    (p.wall!=null?(' · on wall '+p.wall):' · free')+(p.payload?' · has payload':'');
  const x=el('span','x','×'); x.onclick=e=>{ e.stopPropagation(); removeProp(p.id); };
  row.appendChild(th); row.appendChild(nm); row.appendChild(x);
  row.onclick=()=>select(SEL===p.id?null:p.id);
  return row;
}
function propCtl(p){
  if(p.type==='playme') return playmeCtl(p);
  const box=el('div','stctl');
  const nmr=el('div','stf'); nmr.appendChild(el('label','','Name'));
  const ni=document.createElement('input'); ni.value=p.name||''; ni.placeholder='e.g. amp stack';
  ni.style.cssText='flex:1;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
    'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
  ni.oninput=()=>{ p.name=ni.value; touch(); };
  nmr.appendChild(ni); box.appendChild(nmr);

  const walls=[['null','free']]; for(let i=0;i<RM.n;i++) walls.push([String(i),'W'+i]);
  const wr=el('div','stf'); wr.appendChild(el('label','','Mount'));
  const ws=document.createElement('select');
  ws.style.cssText='flex:1;font:700 10px Manrope;color:#cfc7f2;background:rgba(7,6,13,.6);'+
    'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
  walls.forEach(([v,t])=>{ const o=document.createElement('option'); o.value=v; o.textContent=t;
    if(String(p.wall)===v||(p.wall==null&&v==='null')) o.selected=true; ws.appendChild(o); });
  ws.onchange=()=>{ snapToWall(p, ws.value==='null'?null:parseInt(ws.value,10));
    window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); ui(); };
  wr.appendChild(ws); if(!WORLDSP) box.appendChild(wr);

  box.appendChild(slider('Height',p.pos[1],0,WORLDSP?40:6,.01,v=>v.toFixed(2),v=>{ p.pos[1]=v;
    window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); }));
  box.appendChild(slider('Turn',p.rot[1]*180/Math.PI,-180,180,.5,v=>v.toFixed(0)+'°',v=>{
    p.rot[1]=v*Math.PI/180; window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); }));
  box.appendChild(slider('Tilt',p.rot[0]*180/Math.PI,-90,90,.5,v=>v.toFixed(0)+'°',v=>{
    p.rot[0]=v*Math.PI/180; window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); }));
  box.appendChild(slider('Size',p.scale,.05,6,.01,v=>v.toFixed(2)+'×',v=>{ p.scale=v;
    window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); }));
  box.appendChild(slider('Brightness',p.bright,.1,2.5,.01,v=>v.toFixed(2)+'×',v=>{ p.bright=v;
    window.HEXCORE.apply(p,OBJ[p.id]); touch(); }));
  box.appendChild(slider('Opacity',p.opacity,.05,1,.01,v=>(v*100).toFixed(0)+'%',v=>{ p.opacity=v;
    window.HEXCORE.apply(p,OBJ[p.id]); touch(); }));
  box.appendChild(colorRow('Tint',p.tint,v=>{ p.tint=v; window.HEXCORE.apply(p,OBJ[p.id]); touch(); }));

  const b=el('div','stbtns');
  const sh=el('button','',(p.shadow===false?'shadow off':'shadow on'));
  sh.onclick=()=>{ p.shadow=p.shadow===false; window.HEXCORE.apply(p,OBJ[p.id]); touch(); ui(); };
  b.appendChild(sh);
  if(p.type==='glb'){
    const lt=el('button','',(p.lit?'lit':'unlit'));
    lt.onclick=()=>{ p.lit=!p.lit;
      window.HEXCORE.setLit(p,OBJ[p.id],HEX.scene);
      touch(); ui(); };
    b.appendChild(lt);
  }
  const dup=el('button','','duplicate');
  dup.onclick=()=>{ const c=JSON.parse(JSON.stringify(p)); c.id='p'+(LOOK.seq++);
    c.pos=[p.pos[0]+.6,p.pos[1],p.pos[2]+.6]; addProp(c,()=>{ select(c.id); }); ui(); };
  const dl=el('button','red','delete'); dl.onclick=()=>removeProp(p.id);
  b.appendChild(dup); b.appendChild(dl); box.appendChild(b);
  if(MOODSP&&p.type!=='playme'&&p.type!=='switch') glowControls(p,box);
  if(MOODSP){ startControls(p,box); trigControls(p,box); }
  if((p.type==='glb'||p.type==='prim')&&((OBJ[p.id]&&OBJ[p.id].userData.hasScreen)||p.screen)) screenControls(p,box);   /* v70 · v76: big screens */
  if(p.type==='prim'&&(window.HEXCORE.PRIMS[p.kind]||{}).kitProp) kitPropControls(p,box);   /* v77 */
  if(p.type==='prim'&&(window.HEXCORE.PRIMS[p.kind]||{}).house) houseControls(p,box);   /* v81 */
  if(p.type==='prim'&&p.kind==='bannerplane'){ const F=p.fly||(p.fly={}); box.appendChild(el('div','stsub','Flight'));   /* v78 */
    box.appendChild(seg('Loop',[['small','small'],['medium','medium'],['large','large']],F.loop||'medium',k=>{ F.loop=k; rebuildProp(p); touch(); ui(); }));
    box.appendChild(seg('Height',[['low','low'],['mid','mid'],['high','high']],F.height||'mid',k=>{ F.height=k; rebuildProp(p); touch(); ui(); }));
    box.appendChild(el('div','sthint','The plane flies laps around this spot (the yellow ring, only shown while you build), pulling the banner. <b>Drag the yellow pin</b> to move the loop. Add clips below — they play on the banner, both sides.')); }
  if(p.type==='prim'&&p.kind==='fanwall'){ box.appendChild(el('div','stsub','Fan board'));
    box.appendChild(el('div','sthint','Shows your <b>fan board</b> live, giant size. On the Trio page the newest posts appear as fans sign (here in the builder: sample posts). Fans tap it to open the board and sign.')); }
  if(WORLDSP&&p.type!=='switch') doorControls(p,box);                                    /* v71 */
  if(WORLDSP&&p.type==='prim'&&p.kind==='katseye') box.appendChild(seg('Sign',[['on','lit'],['off','off']],p.sign==='off'?'off':'on',k=>{ p.sign=k; touch(); ui(); }));   /* v74 */
  box.appendChild(seg('Easter egg',[['off','off'],['on','on']],p.egg&&p.egg.on?'on':'off',k=>{
    if(k==='on'){ p.egg=p.egg||newEgg(p.name||'Easter egg'); p.egg.on=true; } else if(p.egg) p.egg.on=false;
    syncPropEggs(); touch(); ui(); }));
  if(p.egg&&p.egg.on){ if(MOODSP){ box.appendChild(eggStartSeg('Egg at the start',p.egg,p.id,()=>{ syncPropEggs(); touch(); }));
      const who=LOOK.props.filter(q=>q.trig&&q.trig.on&&(q.trig.acts||[]).some(a=>a.t===p.id&&/^egg/.test(a.w))).map(propLabel);
      if(who.length) box.appendChild(el('div','sthint','⚡ egg shown by <b>'+who.map(eggEsc2).join(', ')+'</b>')); }
    eggEditor(box,p.egg,()=>{ syncPropEggs(); touch(); });
    box.appendChild(el('div','sthint','Fans tap it in the room to open this pop-up. Try it with <b>preview as a fan</b>.')); }
  box.appendChild(el('div','sthint','<b>Drag it in the room</b> to move · arrow keys nudge · '+
    'hold <b>shift</b> while dragging to raise it.<br>Payload (tap → popup → collect) is reserved on this prop for Phase 2.'));
  return box;
}

/* ---- v70 · a model with a SCREEN part: teaser clips + what a tap does ---- */
window.HEXCORE.onScreenErr=p=>{ if(SEL===p.id) ui(); tip('that clip won’t play here — export it as MP4 (H.264)'); };   /* v77.1 */
function screenApplyNow(p){ window.HEXCORE.SCREENURL=id=>ASSETS[id]&&ASSETS[id].url; if(OBJ[p.id]) window.HEXCORE.screenApply(p,OBJ[p.id]); }
function screenControls(p,box){
  const S=p.screen||(p.screen={clips:[],tap:'arcade'});
  box.appendChild(el('div','stsub','Screen'));
  const ar=p.type==='prim'&&(window.HEXCORE.PRIMS[p.kind]||{}).screen;   /* v76 */
  box.appendChild(el('div','sthint',ar?('Clips play on this screen — muted, one after another (one clip loops), all the time. Best cut <b>'+ar+'</b> ('+({'9:16':'1080 × 1920','32:9':'1920 × 540'}[ar]||'1920 × 1080')+'); any other shape is cropped to fill. A few seconds, under 4 MB.'):'This model has a <b>SCREEN</b>. Clips play on it — muted, one after another (one clip loops), only while it’s in view. Cut them <b>4:3</b> (1024 × 768), a few seconds, under 4 MB.'));
  S.clips=(S.clips||[]).filter(id=>ASSETS[id]);
  S.clips.forEach((id,j)=>{ const a=ASSETS[id]; const r=el('div','strow stclip'); const th=el('div','th','▶'); const nm=el('div','nm'); nm.innerHTML='<b></b><s></s>';
    nm.querySelector('b').textContent=a.name; nm.querySelector('s').textContent=(a.blob.size/1048576).toFixed(1)+' MB'+(j===0?' · plays first':'');
    r.appendChild(th); r.appendChild(nm);
    const mv=(d)=>{ const k=j+d; if(k<0||k>=S.clips.length) return; const t=S.clips[j]; S.clips[j]=S.clips[k]; S.clips[k]=t; screenApplyNow(p); touch(); ui(); };
    [['↑',()=>mv(-1)],['↓',()=>mv(1)],['×',()=>{ S.clips.splice(j,1); screenApplyNow(p); touch(); ui(); }]].forEach(([t,f])=>{ const x=el('button','add',t); x.onclick=e=>{ e.stopPropagation(); f(); }; r.appendChild(x); });
    box.appendChild(r);
    if(a.blob.size>4*1048576) box.appendChild(el('div','sthint warn','<b>'+a.name+' is '+(a.blob.size/1048576).toFixed(1)+' MB.</b> It rides inside the room — keep screen clips under 4 MB.')); });
  { const SS=window.HEXCORE.SCREENS[p.id]; if(SS&&SS.err) box.appendChild(el('div','sthint warn','<b>This clip won’t play in the browser.</b> Export it as <b>MP4 (H.264)</b> — iPhone .mov files (HEVC) often won’t play on the web.')); }   /* v77.1 */
  const ab=el('div','stbtns'); const add=el('button','gold','+ clip');
  add.onclick=()=>pick('video/*',fs=>{ const list=Array.from(fs||[]); if(!list.length) return;
    Promise.all(list.map(f=>addAsset(f))).then(xs=>{ xs.forEach(x=>{ if(x&&x.k==='video') S.clips.push(x.id); else tip('that wants a video clip (mp4)'); }); screenApplyNow(p); touch(); ui(); }); });
  ab.appendChild(add); box.appendChild(ab);
  box.appendChild(seg('Tap opens',[['arcade','the arcade'],['chat','the fan board'],['none','nothing']],S.tap==='none'?'none':(S.tap==='chat'?'chat':'arcade'),k=>{ S.tap=k; screenApplyNow(p); touch(); ui(); }));   /* v76: + the fan board */
  if(S.tap!=='none') box.appendChild(el('div','sthint','On the Trio page, tapping it opens the <b>'+(S.tap==='chat'?'fan board':'arcade')+'</b> (the page draws it). Try it with <b>preview as a fan</b>.'));
  const pb=el('div','stbtns'); const sv=el('button','','save as preset'); sv.onclick=()=>exportModelPreset(p); pb.appendChild(sv); box.appendChild(pb);
  box.appendChild(el('div','sthint','<b>save as preset</b> keeps this model + its clips (+ glow, egg…) in one file. In any room: Models → <b>open model preset…</b>'));
}
/* ---- v70 · model presets: one file = the model + its clips + its settings ---- */
function propAssetIds(p){ const ids=[]; if(p.asset) ids.push(p.asset); ((p.screen&&p.screen.clips)||[]).forEach(k=>ids.push(k)); if(p.egg) (p.egg.blocks||[]).forEach(b=>{ if(b.asset) ids.push(b.asset); }); return Array.from(new Set(ids)); }
function exportModelPreset(p){
  tip('packing preset…');
  const rec=JSON.parse(JSON.stringify(p)); delete rec.trig; delete rec.follow;
  const out={kind:'hexmodel',version:1,prop:rec,assets:{}};
  Promise.all(propAssetIds(p).map(k=>{ const a=ASSETS[k]; if(!a) return null; return dataURLFor(a).then(u=>{ if(u) out.assets[k]={name:a.name,type:a.type,k:a.k,data:u}; }); })).then(()=>{
    const b=new Blob([JSON.stringify(out)],{type:'application/json'}); dl(slug(p.name||(ASSETS[p.asset]||{}).name||'model').replace(/-glb$/,'')+'.hexmodel.json',b);
    tip('preset saved · '+(b.size/1048576).toFixed(1)+' MB — open it in any room'); });
}
function importModelPreset(){
  pick('.json,application/json',fs=>{ const f=fs[0]; if(!f) return;
    f.text().then(t=>{ let m=null; try{ m=JSON.parse(t); }catch(e){}
      if(!m||m.kind!=='hexmodel'||!m.prop){ tip('that file is not a model preset'); return; }
      const map={}; Promise.all(Object.keys(m.assets||{}).map(k=>assetFromDataURL(m.assets[k].data,m.assets[k].name||k).then(a=>{ map[k]=a.id; }).catch(()=>{}))).then(()=>{
        const re=x=>x&&map[x]?map[x]:(x&&ASSETS[x]?x:null);
        const p=JSON.parse(JSON.stringify(m.prop)); p.id='p'+(LOOK.seq++); p.asset=re(p.asset);
        if(p.screen) p.screen.clips=(p.screen.clips||[]).map(re).filter(Boolean);
        if(p.egg) p.egg.blocks=(p.egg.blocks||[]).filter(b=>{ if(!('asset' in b)) return true; b.asset=re(b.asset); return !!b.asset; });
        const q=inFront(3.2); p.pos=[q.x,p.pos?p.pos[1]:0,q.z]; p.wall=null;
        addProp(p,()=>{ select(p.id); ui(); }); tip('“'+(p.name||'model')+'” is in the room — drag it where you want it'); }); }); });
}
function presetBtn(){ const b=el('button','','open model preset…'); b.onclick=importModelPreset; return b; }   /* v70 */
function ui(){
  if(!BODY) return;
  window.HEXCORE.SCREENURL=id=>ASSETS[id]&&ASSETS[id].url;   /* v70 */
  if(SETEDIT){ BODY.innerHTML=''; setEditorUI(); applyTabs(); return; }
  if(ISBOX) return uiRoom();                 /* Room Space has its own, step-by-step panel */
  const sc=BODY.scrollTop;
  BODY.innerHTML='';

  /* ---- look ---- */
  const s0=sec('The look',true);
  const nameI=document.createElement('input'); nameI.id='stgName'; nameI.value=LOOK.name;
  nameI.oninput=()=>{ LOOK.name=nameI.value; };
  s0.wrap.appendChild(nameI);
  const sel=document.createElement('select'); sel.id='stgLooks';
  sel.innerHTML='<option value="">— saved looks —</option>';
  keys('looks').then(ks=>{ ks.forEach(k=>{
    const mine=ISBOX?(String(k).indexOf(PFX)===0):(String(k).indexOf('room:')!==0);
    if(!mine) return;
    const n=ISBOX?String(k).slice(PFX.length):k;
    const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); }); });
  sel.onchange=()=>{ if(sel.value) loadLook(sel.value); };
  s0.wrap.appendChild(sel);
  const b0=el('div','stbtns');
  const bSave=el('button','gold','save look'); bSave.onclick=saveLook;
  const bNew=el('button','','new'); bNew.onclick=()=>{ if(!confirm('Start an empty look? Unsaved changes are lost.')) return;
    startFresh(); };
  const bProj=el('button','gold','save project file'); bProj.onclick=exportProject;
  const bOpen=el('button','','open project or baked room…'); bOpen.onclick=openProject;
  const bJson=el('button','','export .json'); bJson.onclick=exportJSON;
  const bBake=el('button','gold','bake .html'); bBake.onclick=bakeHTML;
  const bDel=el('button','red','delete saved'); bDel.onclick=()=>{ const n=sel.value||LOOK.name;
    if(n&&confirm('Delete saved look "'+n+'"?')) del('looks',PFX+n).then(ui); };
  const bFan=el('button','','preview as a fan'); bFan.onclick=previewFan;
  [bSave,bNew,bProj,bOpen,bJson,bBake,bFan,bDel].forEach(b=>b0.appendChild(b));
  s0.wrap.appendChild(b0);
  /* the event's name — replaces the Death By Romy words in the published room (link preview, tab,
     splash line, game bar, welcome line). Blank = the room publishes exactly as it always has. */
  { const f=el('div','stf'); f.appendChild(el('label','','Event name'));
    const i=document.createElement('input'); i.value=(LOOK.ui&&LOOK.ui.eventName)||''; i.placeholder='blank = Death By Romy words';
    i.style.cssText='flex:1;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
      'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    i.onchange=()=>{ (LOOK.ui||(LOOK.ui={game:false,timer:true,rail:true,chip:true,walk:true})).eventName=i.value.trim(); touch(); };
    f.appendChild(i); s0.wrap.appendChild(f); }
  const cfgNow=bakeCfg();
  s0.wrap.appendChild(seg('Shrink models',[['on','on'],['off','off']],cfgNow.optimize?'on':'off',
    k=>{ cfgNow.optimize=(k==='on'); touch(); ui(); }));
  s0.wrap.appendChild(seg('Texture cap',[['512','512'],['1024','1024'],['2048','2048']],
    String(cfgNow.maxTex), k=>{ cfgNow.maxTex=parseInt(k,10); touch(); ui(); }));
  s0.wrap.appendChild(seg('Mesh detail',[['0','full'],['150000','high'],['60000','medium'],['20000','low']],
    String(cfgNow.targetTris), k=>{ cfgNow.targetTris=parseInt(k,10); touch(); ui(); }));
  const mb=el('div','stbtns');
  const bMeas=el('button','','measure baked size');
  bMeas.onclick=()=>{ bMeas.textContent='measuring…';
    measureSize().then(()=>ui()).catch(()=>{ bMeas.textContent='measure baked size'; }); };
  mb.appendChild(bMeas); s0.wrap.appendChild(mb);
  if(LASTMEASURE){
    const m=LASTMEASURE;
    const line=(k,v)=>'<div style="display:flex;justify-content:space-between"><span>'+k+
      '</span><b style="color:#cfc7f2">'+MB(v)+'</b></div>';
    let h=line('room shell',m.shell)+line('walls, banners, floor',m.walls)+
      line('photo tiles',m.tiles)+line('props',m.props)+line('clips baked in',m.clips)+
      line('song',m.song)+
      '<div style="display:flex;justify-content:space-between;margin-top:6px;'+
      'border-top:1px solid rgba(139,123,255,.3);padding-top:6px"><span>TOTAL</span>'+
      '<b style="color:'+(m.total>6291456?'#ff5470':(m.total>3145728?'#ffb020':'#2dd4bf'))+
      '">'+MB(m.total)+'</b></div>';
    if(m.saved.length) h+='<div style="margin-top:6px;color:#2dd4bf">models shrunk: '+
      MB(m.saved.reduce((n,x)=>n+x.before,0))+' → '+MB(m.saved.reduce((n,x)=>n+x.after,0))+'</div>';
    if(m.tris) h+='<div style="color:#2dd4bf">triangles: '+Math.round(m.tris/1000)+'k → '+
      Math.round(m.trisAfter/1000)+'k</div>';
    h+='<div style="margin-top:6px">Under <b>3 MB</b> is a comfortable cold phone link; '+
       'over <b>6 MB</b> and people bounce before the room opens.</div>';
    s0.wrap.appendChild(el('div','sthint',h));
  }
  s0.wrap.appendChild(el('div','sthint',
    '<b>save look</b> and autosave live in this browser only. '+
    '<b>save project file</b> writes everything — art, models, settings — into one file you can keep, '+
    'move to another machine, or load into a newer build with <b>open project</b>. '+
    'Do that before you replace this HTML file.<br>'+
    '<b>Baking never changes what you are editing</b> — it just downloads a copy. And a baked '+
    '.html can be opened back in here too, so nothing is ever a dead end.'));
  if(MOODSP) moodSections();                    /* the mood leads the Room tab */
  if(WORLDSP) worldSection();                   /* v71 */
  else if(OPENSP) openSection();                /* v59 */
  else if(MOODSP) skySection();                 /* v61 */
  if(MOODSP) addonsSection();                   /* v63 */
  if(MOODSP) BODY.appendChild(eggStyleSection());
  BODY.appendChild(s0);

  /* ---- surfaces ---- */
  if(!WORLDSP){ const s1=sec(MOODSP?'Walls & floor':'Walls, banners, floor',true);
  SURF.filter(d=>d.kind!=='logo'&&d.kind!=='song').forEach(d=>{ s1.wrap.appendChild(surfaceRow(d));
    if(SEL==='S:'+d.id) s1.wrap.appendChild(surfaceCtl(d)); });
  BODY.appendChild(s1);
  { const sW=sec('Windows & sets',false); windowsSection(sW.wrap); BODY.appendChild(sW); } }   /* v71: a World has no walls */

  /* ---- vibe and visualizers (same menu as Room Space) ---- */
  if(window.HEXFX){
    const sV=sec('Vibe & visualizers',false);
    sV.wrap.appendChild(el('div','sthint','An event space starts with nothing running. Pick a vibe, or '+
      'turn on <b>Light poles</b> for the bouncing poles around the floor.'));
    fxSection(sV.wrap);
    BODY.appendChild(sV);
  }

  /* ---- what the room shows ---- */
  const sU=sec('What the room shows',true);
  const U=LOOK.ui||(LOOK.ui={game:false,timer:true,rail:true,chip:true,walk:true});
  const sw=(label,key,note)=>{
    sU.wrap.appendChild(seg(label,[['on','on'],['off','off']],U[key]===false?'off':'on',
      k=>{ U[key]=(k==='on'); applyRoomUI(); touch(); ui(); }));
    if(note) sU.wrap.appendChild(el('div','sthint',note));
  };
  sw('Game + board','game','The play panel and the leaderboard. <b>Off by default</b> until you '+
    'know what goes in there — switch it on when the game is decided.');
  sw('Countdown','timer');
  sw('Reactions','rail');
  sw('Live chip','chip');
  sw('Walk around','walk','The joystick and W A S D, in the room a fan opens.');
  sU.wrap.appendChild(el('div','sthint','These ride along into the bake — this is the room itself, '+
    'not the editor.'));
  BODY.appendChild(sU);

  if(!WORLDSP) BODY.appendChild(boardsSection());
  if(!ISBOX&&!WORLDSP) BODY.appendChild(sigSection());
  BODY.appendChild(orbitSection());

  /* ---- racks ---- */
  if(MOODSP&&!WORLDSP) BODY.appendChild(hangSection());
  if(!WORLDSP) [['photo','Photo wall · 5 tiles (wall 5)'],['video','Video wall · 5 tiles (wall 4)']].forEach(([k,title])=>{
    const rw=LOOK.racks[k].wall;
    if(MOODSP) title=(k==='photo'?'Photo wall':'Video wall')+(rw===-1?' · not showing':' · 5 tiles (wall '+rw+')');
    const s=sec(title,true);
    if(MOODSP&&rw===-1){ s.wrap.appendChild(el('div','sthint',
      'Not in the room. Pick a wall for them under <b>Where they hang</b> — your tiles are kept.')); BODY.appendChild(s); return; }
    for(let i=0;i<LOOK.racks[k].tiles.length;i++){
      s.wrap.appendChild(tileRow(k,i));
      if(SEL==='T:'+k+':'+i) s.wrap.appendChild(tileCtl(k,i));
    }
    s.wrap.appendChild(el('div','sthint',
      window.HEXCORE.RACKS[k].spec+' · all five tiles are the same size, so the wall stays uniform. '+
      'The wall art behind them is still yours to skin.'));
    BODY.appendChild(s);
  });

  /* ---- music ---- */
  const sM=sec('Music',true);
  const trk=HEX.audioEl;
  const trkPlaying=trk&&!trk.paused;
  const musRow=el('div','stbtns');
  const bPlay=el('button',trkPlaying?'':'gold',trkPlaying?'pause':'play the track');
  bPlay.onclick=()=>{ if(!trk) return; if(!trk.getAttribute('src')) return tip('load a demo song first');
    if(trk.paused){
      if(HEX.setDrive) HEX.setDrive('auto');
      if(LOOK.ui) LOOK.ui.drive='auto';
      HEX.startAudio().then(()=>ui()).catch(()=>ui());
    }
    else { trk.pause(); ui(); } };
  const bMute=el('button',trk&&trk.muted?'gold':'',trk&&trk.muted?'unmute':'mute');
  bMute.onclick=()=>{ if(!trk) return; trk.muted=!trk.muted;
    const b=document.getElementById('mute');
    if(b){ b.textContent=trk.muted?'🔇':'🔊'; b.classList.toggle('off',trk.muted); }
    ui(); };
  const bRew=el('button','','back to the top');
  bRew.onclick=()=>{ if(trk){ try{ trk.currentTime=0; }catch(e){} } };
  [bPlay,bMute,bRew].forEach(b=>musRow.appendChild(b));
  sM.wrap.appendChild(musRow);
  { const st=LOOK.surfaces.song||(LOOK.surfaces.song=defSurf()); const sa=st.asset?ASSETS[st.asset]:null;
    const lr=el('div','strow'); const th=el('div','th','♪'); const nm=el('div','nm'); nm.innerHTML='<b>Demo song</b><s></s>';
    nm.querySelector('s').textContent=sa?sa.name:'none loaded · drop an mp3 / m4a to hear the room move';
    const add=el('button','add',sa?'swap':'+ add'); add.onclick=e=>{ e.stopPropagation(); pick('audio/*',fs=>takeFiles(fs,{slot:'song'})); };
    lr.appendChild(th); lr.appendChild(nm); lr.appendChild(add);
    if(sa){ const x=el('span','x','×'); x.onclick=e=>{ e.stopPropagation(); st.asset=null; st.url='';
      if(trk){ try{ trk.pause(); trk.removeAttribute('src'); trk.load(); }catch(err){} } touch(); ui(); }; lr.appendChild(x); }
    sM.wrap.insertBefore(lr, sM.wrap.firstChild);
    sM.wrap.insertBefore(el('div','sthint','For demoing in the builder only — <b>the song never goes into the room you bake</b>. '+
      'On Trio the event page plays the music.'), lr.nextSibling); }
  if(trk) sM.wrap.appendChild(slider('Volume',trk.volume,0,1,.01,v=>(v*100).toFixed(0)+'%',
    v=>{ trk.volume=v; }));
  const drive=(HEX.getDrive&&HEX.getDrive())||'auto';
  sM.wrap.appendChild(seg('Visuals follow',[['auto','the track'],['ambient','ambient drift']],
    drive, k=>{ if(HEX.setDrive) HEX.setDrive(k);
      if(LOOK.ui) LOOK.ui.drive=k; touch(); ui(); }));
  sM.wrap.appendChild(el('div','sthint', drive==='ambient'
    ? '<b>Ambient drift</b> — columns, aurora and pulsing lights move on their own and ignore the '+
      'track entirely. Good for talking over. Pressing play, or demoing from the door, snaps '+
      'back to the track.'
    : '<b>The track</b> — visuals ride the song, and go still the moment you pause it. Flip to '+
      'ambient drift to get the idle motion back without the music.'));
  sM.wrap.appendChild(el('div','sthint',
    (HEX.hasAnalyser&&HEX.hasAnalyser())
      ? 'Analyser live — the floor columns, the aurora and any <b>pulsing</b> light are reading the '+
        'real track. <b>Mute</b> silences your speakers but leaves the visuals dancing; '+
        '<b>pause</b> stops them.'
      : 'Hit <b>play the track</b> to wire the analyser. Until then the visuals run on a synthetic '+
        'beat, so pulsing lights move but not to the song.'));
  BODY.appendChild(sM);

  /* ---- lighting ---- */
  if(MOODSP&&!WORLDSP) BODY.appendChild(uplightSection());
  const sL=sec('Lighting',false);
  const C=litCfg();
  if(!MOODSP) sL.wrap.appendChild(seg('Surfaces catch light',[['on','on'],['off','off']],C.surfaces?'on':'off',
    k=>{ C.surfaces=(k==='on'); rebuildLights(); touch(); ui(); }));
  if(C.surfaces&&!MOODSP)
    sL.wrap.appendChild(slider('Base level',C.ambient,0,1.4,.01,v=>v.toFixed(2),
      v=>{ C.ambient=v; window.HEXCORE.ambient(HEX.scene,v); touch(); }));
  sL.wrap.appendChild(seg('Show handles',[['on','on'],['off','off']],C.handles===false?'off':'on',
    k=>{ setHandles(k==='on'); touch(); ui(); }));
  sL.wrap.appendChild(el('div','sthint', C.handles===false
    ? 'Cans hidden — this is what a fan sees. Select a light from the list below to keep '+
      'adjusting it; you just cannot drag it in the room while the handles are off.'
    : 'The cans are grab handles. Switch them off to demo the room without them — they never '+
      'bake in either way.'));
  if(!MOODSP) sL.wrap.appendChild(el('div','sthint', C.surfaces
    ? 'Walls, floor and banners now take light. Pull <b>base level</b> down and the room goes '+
      'dark enough for your beams to matter.'
    : 'The room is fullbright by design — lights only touch <b>lit</b> props. Turn this on and '+
      'your beams land on the walls and floor too.'));
  (LOOK.lights||[]).forEach(L=>{ sL.wrap.appendChild(lightRow(L));
    if(SEL===L.id) sL.wrap.appendChild(lightCtl(L)); });
  const lb=el('div','stbtns');
  Object.keys(window.HEXCORE.LIGHTKINDS).forEach(k=>{
    const b=el('button','','+ '+window.HEXCORE.LIGHTKINDS[k].label);
    b.onclick=()=>addLight(k); lb.appendChild(b); });
  sL.wrap.appendChild(lb);
  if((LOOK.lights||[]).length>6)
    sL.wrap.appendChild(el('div','sthint','<b>More than six lights</b> starts costing real frames '+
      'on a phone — watch the fps in the HUD.'));
  BODY.appendChild(sL);

  /* ---- props ---- */
  const s2=sec(WORLDSP?'Props in the world':'Props in the room',true);
  if(!LOOK.props.length) s2.wrap.appendChild(el('div','sthint',
    'Drop a <b>.glb</b>, or an image to hang, straight into the room. Or add a built-in below.'));
  LOOK.props.forEach(p=>{ s2.wrap.appendChild(propRow(p));
    if(SEL===p.id) s2.wrap.appendChild(propCtl(p)); });
  const pb=el('div','stbtns');
  Object.keys(window.HEXCORE.PRIMS).forEach(k=>{
    if(window.HEXCORE.PRIMS[k].kitProp) return;   /* v77: kit models get their own rows below */
    if(window.HEXCORE.PRIMS[k].goth) return;      /* v80: gothic models get their own row below */
    if(window.HEXCORE.PRIMS[k].house) return;     /* v81: houses get their own row below */
    if(!window.HEXCORE.PRIMS[k].big&&!!window.HEXCORE.PRIMS[k].world!==WORLDSP&&!(WORLDSP&&k==='orb')) return;   /* v71: world pieces only in a World · v76: big screens everywhere */
    { const ad=window.HEXCORE.PRIMS[k].addon; if(ad&&!(LOOK.mood&&LOOK.mood.world&&LOOK.mood.world.addons&&LOOK.mood.world.addons[ad]&&LOOK.mood.world.addons[ad].on)) return; }   /* v74: an add-on's pieces only when it's switched on */
    const b=el('button','','+ '+window.HEXCORE.PRIMS[k].label);
    b.onclick=()=>{ const p=propRec('prim',k), ad=window.HEXCORE.PRIMS[k].addon, big=window.HEXCORE.PRIMS[k].big; const q=inFront(WORLDSP?(ad?30:(big?(/jumbotron|drivein/.test(k)?28:20):(/wblock|wtower/.test(k)?20:7))):(big?6:3.2));
      if(big){ bigScreenRec(p,k); }   /* v76 */
      if(ad){ p.solid=true; p.shadow=false; p.door={on:true,name:window.HEXCORE.PRIMS[k].label.replace(/ building$/,''),url:'',color:'#ff5fa2'}; if(k==='katseye') p.sign='on'; }   /* v74: an artist's building: solid, a door ready to link */
      p.pos=[q.x,0,q.z]; addProp(p,()=>select(p.id)); ui(); };
    pb.appendChild(b); });
  s2.wrap.appendChild(pb);
  if(WORLDSP){ const HK=(window.HEXCORE.HOUSES||[]).filter(k=>window.HEXCORE.PRIMS[k]);   /* v81 · houses */
    if(HK.length){ s2.wrap.appendChild(el('div','stsub','Houses')); const hb=el('div','stbtns');
      HK.forEach(k=>{ const D=window.HEXCORE.PRIMS[k], b=el('button','','+ '+D.label); b.onclick=()=>{ const p=propRec('prim',k), q=inFront(16); p.pos=[q.x,0,q.z]; p.house={look:'fresh'}; p.solid=true; p.shadow=false;
          p.door={on:true,name:D.label,url:'',color:'#ffbf6e'}; addProp(p,()=>select(p.id)); ui(); }; hb.appendChild(b); });
      s2.wrap.appendChild(hb); } }
  if(WORLDSP){ const GK=Object.keys(window.HEXCORE.PRIMS).filter(k=>window.HEXCORE.PRIMS[k].goth);   /* v80 */
    if(GK.length){ s2.wrap.appendChild(el('div','stsub','Gothic models')); const gb=el('div','stbtns');
      GK.forEach(k=>{ const b=el('button','','+ '+window.HEXCORE.PRIMS[k].label); b.onclick=()=>{ const p=propRec('prim',k), q=inFront(k==='gchapel'?20:8); p.pos=[q.x,0,q.z]; p.shadow=false; if(k==='gchapel') p.solid=false; addProp(p,()=>select(p.id)); ui(); }; gb.appendChild(b); });
      s2.wrap.appendChild(gb); } }
  if(WORLDSP){ const KP={}; Object.keys(window.HEXCORE.PRIMS).forEach(k=>{ const D=window.HEXCORE.PRIMS[k]; if(D.kitProp) (KP[D.kitName]=KP[D.kitName]||[]).push(k); });   /* v77: each outside kit's models */
    Object.keys(KP).forEach(name=>{ s2.wrap.appendChild(el('div','stsub',name+' models')); const kb=el('div','stbtns');
      KP[name].forEach(k=>{ const D=window.HEXCORE.PRIMS[k], b=el('button','','+ '+D.label); b.onclick=()=>{ const p=propRec('prim',k), q=inFront(D.def&&D.def.solid?18:8);
          p.pos=[q.x,0,q.z]; p.kit={}; if(D.def&&Array.isArray(D.def.looks)) p.kit.look=D.def.looks[0]; if(D.def&&D.def.solid) p.solid=true;
          addProp(p,g=>{ let kd=false; if(g) g.traverse(o=>{ if(o.userData&&o.userData.kitDoor) kd=true; }); if(kd&&!p.door){ p.door={on:true,name:D.label,url:'',color:'#5fd4ff'}; p.solid=true; touch(); } select(p.id); }); ui(); }; kb.appendChild(b); });
      s2.wrap.appendChild(kb); }); }
  const pf=el('div','stbtns');
  const bg=el('button','','drop a model file…'); bg.onclick=()=>pick('.glb,.gltf',fs=>takeFiles(fs,{prop:true}));
  const bi=el('button','','hang an image…'); bi.onclick=()=>pick('image/*',fs=>takeFiles(fs,{prop:true}));
  const bpm=el('button','gold','+ play-me tile'); bpm.onclick=()=>{ const p=newPlayme(); addProp(p,()=>select(p.id)); ui(); };
  pf.appendChild(bg); pf.appendChild(bi); pf.appendChild(bpm); pf.appendChild(presetBtn());
  if(MOODSP){ const bt=el('button','gold','+ trigger (glint)'); bt.onclick=newSwitch; pf.appendChild(bt); } s2.wrap.appendChild(pf);
  BODY.appendChild(s2);

  /* ---- view ---- */
  const s3=sec('Move around',false);
  s3.wrap.appendChild(seg('Mode',[['look','look'],['edit','edit']],VIEW.mode,k=>{ setMode(k); ui(); }));
  s3.wrap.appendChild(slider('Walk speed',NAVS?NAVS.speed:1,.3,3,.05,v=>v.toFixed(2)+'×',v=>{ if(NAVS)NAVS.speed=v; }));
  s3.wrap.appendChild(slider('Turn speed',NAVS?NAVS.turn:1,.3,3,.05,v=>v.toFixed(2)+'×',v=>{ if(NAVS)NAVS.turn=v; }));
  s3.wrap.appendChild(slider('Eye height',NAVS?NAVS.eye:1.7,.6,4,.02,v=>v.toFixed(2),v=>{ if(NAVS)NAVS.eye=v; }));
  s3.wrap.appendChild(seg('Game panel',[['hidden','hide'],['docked','docked'],['float','floating']],
    VIEW.panel,k=>{ VIEW.panel=k; applyPanel(); ui(); }));
  const vb=el('div','stbtns');
  const vr=el('button','','back to the door');
  vr.onclick=()=>{ if(NAVS){ NAVS.pos.init=false; NAVS.eye=1.7; } ui(); };
  const vf=el('button','gold','preview as a fan'); vf.onclick=fanPreview;
  vb.appendChild(vr); vb.appendChild(vf); s3.wrap.appendChild(vb);
  s3.wrap.appendChild(el('div','sthint','Joystick: <b>up/down walks, left/right turns you</b>. '+
    'Keys: <b>W S</b> walk, <b>A D</b> turn, <b>Q E</b> sidestep, <b>M</b> flips look/edit. '+
    'Drag the room to look up and down; scroll glides forward.<br>'+
    '<b>Look</b> mode never grabs a prop — switch to <b>edit</b> when you want to move things.'));
  BODY.appendChild(s3);

  applyTabs();
  BODY.scrollTop=sc;
}


/* ================= ROOM SPACE PANEL — creators build in seven steps =================
   Event Space keeps the panel above untouched. Admin-only controls (model shrinking,
   texture cap, mesh detail, measure, export, event switches, the demo crowd) live in
   an Admin section that the public Room builder never shows. */
function stepSec(i,hint){
  const s=sec(STEPS[i], i===0);
  s.classList.add('ststep');
  if(hint) s.wrap.appendChild(el('div','sthint stlead',hint));
  return s;
}
function nextStep(s,i){
  if(i>=STEPS.length-1) return;
  const b=el('div','stbtns stnext');
  const n=el('button','','next · '+STEPS[i+1].replace(/^\d+ · /,'')+' →');
  n.onclick=()=>{ OPEN[STEPS[i]]=false; OPEN[STEPS[i+1]]=true; ui();
    setTimeout(()=>{ const h=[...BODY.querySelectorAll('.stsec>h4')].find(x=>x.textContent.indexOf(STEPS[i+1])>=0);
      if(h) BODY.scrollTop=h.parentNode.offsetTop-6; },20); };
  b.appendChild(n); s.wrap.appendChild(b);
}
function uiRoom(){
  const sc=BODY.scrollTop;
  BODY.innerHTML='';
  BODY.appendChild(el('div','stintro','<b>Build your room in seven steps.</b> Everything saves in this '+
    'browser as you go — open a step, do the thing, hit <i>next</i>.'));

  /* 1 · your room */
  const s0=stepSec(0,'Name it, save it, publish it.');
  const nameI=document.createElement('input'); nameI.id='stgName'; nameI.value=LOOK.name;
  nameI.placeholder='name your room';
  nameI.oninput=()=>{ LOOK.name=nameI.value; };
  s0.wrap.appendChild(nameI);
  const sel=document.createElement('select'); sel.id='stgLooks';
  sel.innerHTML='<option value="">— your saved looks —</option>';
  keys('looks').then(ks=>{ ks.forEach(k=>{
    if(String(k).indexOf(PFX)!==0) return;
    const n=String(k).slice(PFX.length);
    const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); }); });
  sel.onchange=()=>{ if(sel.value) loadLook(sel.value); };
  s0.wrap.appendChild(sel);
  const b0=el('div','stbtns');
  const bSave=el('button','gold','save look'); bSave.onclick=saveLook;
  const bProj=el('button','','save project file'); bProj.onclick=exportProject;
  const bOpen=el('button','','open project file…'); bOpen.onclick=openProject;
  const bPub=el('button','gold','publish room'); bPub.onclick=bakeHTML;
  const bNew=el('button','','start over'); bNew.onclick=()=>{ if(!confirm('Start an empty room? Unsaved changes are lost.')) return;
    startFresh(); };
  const bDel=el('button','red','delete saved'); bDel.onclick=()=>{ const n=sel.value||LOOK.name;
    if(n&&confirm('Delete saved look "'+n+'"?')) del('looks',PFX+n).then(ui); };
  const bFan=el('button','','preview as a fan'); bFan.onclick=previewFan;
  [bSave,bProj,bOpen,bPub,bFan,bNew,bDel].forEach(b=>b0.appendChild(b));
  s0.wrap.appendChild(b0);
  s0.wrap.appendChild(el('div','sthint','<b>Save look</b> keeps it in this browser. <b>Save project file</b> '+
    'keeps everything at full quality in one file you can open anywhere — do it often. <b>Publish</b> '+
    'downloads the finished room as a single file: that is the version that goes live.'));
  nextStep(s0,0); BODY.appendChild(s0);

  /* 2 · walls, banners & floor */
  const s1=stepSec(1,'Put your art on the room. Click a surface in the room or use <b>+ ADD</b>, then '+
    'crop and scale it until it sits right.');
  SURF.filter(d=>d.kind==='wall'||d.kind==='banner'||d.kind==='floor').forEach(d=>{
    s1.wrap.appendChild(surfaceRow(d)); if(SEL==='S:'+d.id) s1.wrap.appendChild(surfaceCtl(d)); });
  nextStep(s1,1); BODY.appendChild(s1);
  { const sW=sec('Windows & sets',false); windowsSection(sW.wrap); BODY.appendChild(sW); }

  /* 3 · photos, videos & music */
  const s2=stepSec(2,'Five photos on the left wall, five videos on the right. Every tile is 9:16, so the walls stay even.');
  [['photo','Photo wall · left'],['video','Video wall · right']].forEach(([k,t])=>{
    s2.wrap.appendChild(el('div','stsub',t));
    for(let i=0;i<LOOK.racks[k].tiles.length;i++){
      s2.wrap.appendChild(tileRow(k,i)); if(SEL==='T:'+k+':'+i) s2.wrap.appendChild(tileCtl(k,i)); }
  });
  s2.wrap.appendChild(el('div','stsoon','<b>Music wall · front wall</b>Pin your tracks, albums and '+
    'discography — or the music you recommend — to the wall people face when they walk in.'+
    '<i>coming soon</i>'));
  nextStep(s2,2); BODY.appendChild(s2);

  /* 4 · visualizers */
  const s3=stepSec(3,'Lights that move with the music. Your room starts with none — pick a vibe, then '+
    'switch pieces on or off.');
  fxSection(s3.wrap);
  nextStep(s3,3); BODY.appendChild(s3);

  /* 5 · models */
  const s4=stepSec(4,'Drop in 3D models and hang images. Click one in the room, then drag it to move it.');
  const used=modelCount();
  s4.wrap.appendChild(el('div','stcount', ADMIN?('models: '+used+' · admin — no limit')
    :('models: <b>'+used+'</b> of '+MODEL_MAX)));
  LOOK.props.forEach(p=>{ s4.wrap.appendChild(propRow(p)); if(SEL===p.id) s4.wrap.appendChild(propCtl(p)); });
  s4.wrap.appendChild(el('div','stsub','Library'));
  const pb=el('div','stbtns');
  Object.keys(window.HEXCORE.PRIMS).forEach(k=>{
    if(!window.HEXCORE.PRIMS[k].big&&!!window.HEXCORE.PRIMS[k].world!==WORLDSP&&!(WORLDSP&&k==='orb')) return;   /* v71: world pieces only in a World · v76: big screens everywhere */
    { const ad=window.HEXCORE.PRIMS[k].addon; if(ad&&!(LOOK.mood&&LOOK.mood.world&&LOOK.mood.world.addons&&LOOK.mood.world.addons[ad]&&LOOK.mood.world.addons[ad].on)) return; }   /* v74: an add-on's pieces only when it's switched on */
    const b=el('button','','+ '+window.HEXCORE.PRIMS[k].label);
    b.onclick=()=>{ if(!modelRoom()) return; const p=propRec('prim',k), big=window.HEXCORE.PRIMS[k].big; const q=inFront(big?6:3.2); if(big) bigScreenRec(p,k);   /* v76 */
      p.pos=[q.x,0,q.z]; addProp(p,()=>select(p.id)); ui(); };
    pb.appendChild(b); });
  s4.wrap.appendChild(pb);
  const pf=el('div','stbtns');
  const bg=el('button','','upload a model (.glb)…'); bg.onclick=()=>{ if(!modelRoom()) return; pick('.glb,.gltf',fs=>takeFiles(fs,{prop:true})); };
  const bi=el('button','','hang an image…'); bi.onclick=()=>pick('image/*',fs=>takeFiles(fs,{prop:true}));
  const bpm=el('button','gold','+ play-me tile'); bpm.onclick=()=>{ const p=newPlayme(); addProp(p,()=>select(p.id)); ui(); };
  pf.appendChild(bg); pf.appendChild(bi); pf.appendChild(bpm); pf.appendChild(presetBtn()); s4.wrap.appendChild(pf);
  s4.wrap.appendChild(el('div','sthint','Big models are shrunk automatically when you publish, so the room '+
    'still opens fast on a phone. Images you hang don’t count toward the limit.'));
  nextStep(s4,4); BODY.appendChild(s4);

  /* 6 · lights */
  const s5=stepSec(5,'Place spotlights. <b>Click a light’s can</b> to select it, <b>drag it</b> to move it, '+
    'and <b>drag the gold ring</b> on the floor to aim it.');
  const C=litCfg();
  (LOOK.lights||[]).forEach(L=>{ s5.wrap.appendChild(lightRow(L)); if(SEL===L.id) s5.wrap.appendChild(lightCtl(L)); });
  const lb=el('div','stbtns');
  Object.keys(window.HEXCORE.LIGHTKINDS).forEach(k=>{
    const b=el('button','','+ '+window.HEXCORE.LIGHTKINDS[k].label); b.onclick=()=>addLight(k); lb.appendChild(b); });
  s5.wrap.appendChild(lb);
  s5.wrap.appendChild(seg('Walls catch light',[['on','on'],['off','off']],C.surfaces?'on':'off',
    k=>{ C.surfaces=(k==='on'); rebuildLights(); touch(); ui(); }));
  if(C.surfaces) s5.wrap.appendChild(slider('Room brightness',C.ambient,0,1.4,.01,v=>v.toFixed(2),
    v=>{ C.ambient=v; window.HEXCORE.ambient(HEX.scene,v); touch(); }));
  s5.wrap.appendChild(seg('Show the cans',[['on','on'],['off','off']],C.handles===false?'off':'on',
    k=>{ setHandles(k==='on'); syncAim(); touch(); ui(); }));
  s5.wrap.appendChild(el('div','sthint','The cans and the ring are only here while you build — they never '+
    'appear in the published room.'));
  nextStep(s5,5); BODY.appendChild(s5);

  /* 7 · game & chat board */
  const s6=stepSec(6,'Optional. A game people can launch and a chat board, together on the back wall.');
  roomBoards(s6.wrap);
  BODY.appendChild(s6);

  /* extras */
  BODY.appendChild(orbitSection());
  const sv=sec('Move around',false);
  sv.wrap.appendChild(seg('Mode',[['look','look'],['edit','edit']],VIEW.mode,k=>{ setMode(k); ui(); }));
  sv.wrap.appendChild(slider('Walk speed',NAVS?NAVS.speed:1,.3,3,.05,v=>v.toFixed(2)+'×',v=>{ if(NAVS)NAVS.speed=v; }));
  sv.wrap.appendChild(slider('Eye height',NAVS?NAVS.eye:1.7,.6,4,.02,v=>v.toFixed(2),v=>{ if(NAVS)NAVS.eye=v; }));
  const vb=el('div','stbtns');
  const vr=el('button','','back to the door'); vr.onclick=()=>{ if(NAVS){ NAVS.pos.init=false; NAVS.eye=1.7; } ui(); };
  const vf=el('button','gold','preview as a visitor'); vf.onclick=fanPreview;
  vb.appendChild(vr); vb.appendChild(vf); sv.wrap.appendChild(vb);
  sv.wrap.appendChild(el('div','sthint','Joystick: up/down walks, left/right turns. Keys: <b>W S</b> walk, '+
    '<b>A D</b> turn. Drag the room to look around.'));
  BODY.appendChild(sv);

  if(ADMIN) BODY.appendChild(adminSection());
  applyTabs();
  BODY.scrollTop=sc;
}

/* ---- step 4: the visualizers ---- */
function fxSection(w){
  const F=LOOK.fx||(LOOK.fx=window.HEXFX.newCfg());
  const push=()=>{ applyFX(); touch(); ui(); };
  w.appendChild(el('div','stsub','Vibe'));
  const pr=el('div','stbtns stchips');
  Object.keys(window.HEXFX.PRESETS).forEach(k=>{
    const P=window.HEXFX.PRESETS[k];
    const b=el('button',F.preset===k?'gold':'',P.label);
    b.onclick=()=>{ F.preset=k; F.sky=P.sky; F.on=Object.assign({},P.on); push(); };
    pr.appendChild(b); });
  w.appendChild(pr);
  w.appendChild(seg('Sky show',window.HEXFX.SKIES,F.sky||'off',k=>{ F.sky=k; F.preset='custom'; push(); }));
  if(MOODSP){ w.appendChild(seg('Visualizers start',[['on','on'],['off','off · waits']],F.start==='off'?'off':'on',k=>{ F.start=k; push(); }));   /* v57 */
    if(F.start==='off') w.appendChild(el('div','sthint','The visualizers wait, hidden, until a trigger turns them on (<b>the visualizers · turn on</b>). In the builder they show faintly.')); }
  w.appendChild(el('div','stsub','Pieces'));
  const fr=el('div','stbtns stchips');
  window.HEXFX.LIST.forEach(d=>{
    const b=el('button',F.on[d.id]?'gold':'',d.label); b.title=d.note;
    b.onclick=()=>{ F.on[d.id]=F.on[d.id]?0:1; F.preset='custom'; push(); };
    fr.appendChild(b); });
  w.appendChild(fr);
  const on=window.HEXFX.LIST.filter(d=>F.on[d.id]);
  if(on.length) w.appendChild(el('div','sthint',on.map(d=>'<b>'+d.label+'</b> — '+d.note).join('<br>')));
  const cr=colorRow('Colour',F.color||'#8b7bff',v=>{ F.color=v; applyFX(); touch(); });
  w.appendChild(cr);
  const cb=el('div','stbtns');
  const tr=el('button',F.color?'':'gold','Trio colours'); tr.onclick=()=>{ F.color=null; push(); };
  cb.appendChild(tr); w.appendChild(cb);
  w.appendChild(slider('Intensity',F.intensity||1,.3,1.5,.05,v=>Math.round(v*100)+'%',v=>{ F.intensity=v; applyFX(); touch(); }));
  /* the glow above the walls — always there until now */
  if(!MOODSP){ const A=F.aurora||(F.aurora={on:true,color:null,bright:1});
    w.appendChild(el('div','stsub','Sky glow'));
    w.appendChild(seg('Glow',[['on','on'],['off','off']],A.on===false?'off':'on',k=>{ A.on=(k==='on'); push(); }));
    if(A.on!==false){
      w.appendChild(seg('Colour',[['built','built-in'],['mine','my colour']],A.color?'mine':'built',k=>{ A.color=(k==='mine')?(A.color||'#8b7bff'):null; push(); }));
      if(A.color){ const r=el('div','stf'); r.appendChild(el('label','','Pick'));
        const i=document.createElement('input'); i.type='color'; i.value=A.color; i.oninput=()=>{ A.color=i.value; applyFX(); touch(); };
        r.appendChild(i); w.appendChild(r); }
      w.appendChild(slider('Brightness',A.bright==null?1:A.bright,0,2,.01,v=>Math.round(v*100)+'%',v=>{ A.bright=v; applyFX(); touch(); }));
    }
    w.appendChild(el('div','sthint','The soft curtains of light circling above the walls. They ride the music.')); }
  w.appendChild(seg('Preview beat',[['on','on'],['off','off']],F.playing===false?'off':'on',
    k=>{ F.playing=(k==='on'); push(); }));
  w.appendChild(el('div','sthint','The room runs on a steady beat here so you can see it move. On Trio, '+
    'it follows whatever is playing.'));
  if(window.HEXFX.activeCount()>3) w.appendChild(el('div','sthint warn','<b>That’s a lot at once.</b> It may '+
    'run slowly on older phones — two or three pieces usually look best.'));
}

/* ---- step 7: game and chat on the back wall ---- */
function roomBoards(w){
  const B=boardsCfg();
  w.appendChild(seg('Game board',[['on','on'],['off','off']],B.game.on?'on':'off',
    k=>{ B.game.on=(k==='on'); rebuildBoards(); touch(); ui(); }));
  if(B.game.on){
    const txt=(label,key,ph)=>{ const r=el('div','stf'); r.appendChild(el('label','',label));
      const i=document.createElement('input'); i.value=B.game[key]||''; if(ph) i.placeholder=ph;
      i.style.cssText='flex:1;min-width:0;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
        'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
      i.oninput=()=>{ B.game[key]=i.value; redrawBoards(); touch(); };
      if(key==='url') i.onchange=()=>{ B.game.url=i.value.trim(); touch(); };
      r.appendChild(i); return r; };
    w.appendChild(txt('Game','title','game name'));
    w.appendChild(txt('Line','sub','one line about it'));
    w.appendChild(txt('Link','url','https://…'));
    const ab=el('div','stbtns');
    const a1=el('button','', B.game.art?'swap game art':'+ game art');
    a1.onclick=()=>pick('image/*',fs=>takeFiles(fs,{boardArt:true}));
    const a2=el('button','gold','try it'); a2.onclick=()=>{ if(!B.game.url) return tip('add the game link first');
      HEX.openGame(B.game.url,B.game.title); };
    ab.appendChild(a1); ab.appendChild(a2); w.appendChild(ab);
  }
  w.appendChild(seg('Chat board',[['on','on'],['off','off']],(B.chat&&B.chat.on)?'on':'off',
    k=>{ B.chat.on=(k==='on'); rebuildBoards(); touch(); ui(); }));
  if(B.chat&&B.chat.on){
    const hr=el('div','stf'); hr.appendChild(el('label','','Heading'));
    const hi=document.createElement('input'); hi.value=B.chat.title||'THE ROOM';
    hi.style.cssText='flex:1;min-width:0;font:700 10px Manrope;color:#e9e4ff;background:rgba(7,6,13,.6);'+
      'border:1px solid rgba(139,123,255,.3);border-radius:7px;padding:6px 8px';
    hi.oninput=()=>{ B.chat.title=hi.value; redrawBoards(); touch(); };
    hr.appendChild(hi); w.appendChild(hr);
    w.appendChild(seg('Style',[['chat','chat'],['fan','fan board']],B.chat.style==='fan'?'fan':'chat',
      k=>{ B.chat.style=k; if(k==='fan'&&(!B.chat.title||B.chat.title==='THE ROOM')) B.chat.title='FAN BOARD'; redrawBoards(); touch(); ui(); }));
  }
  w.appendChild(el('div','sthint','Both sit on the back wall and arrange themselves. The chat board shows '+
    'what people say once the room is live on Trio.'));
}

/* ---- admins only ---- */
function adminSection(){
  const s=sec('Admin',false); s.classList.add('stadmin');
  s.wrap.appendChild(el('div','sthint','Only you see this. Creators never get these controls.'));
  const cfgNow=bakeCfg();
  s.wrap.appendChild(seg('Shrink models',[['on','on'],['off','off']],cfgNow.optimize?'on':'off',
    k=>{ cfgNow.optimize=(k==='on'); touch(); ui(); }));
  s.wrap.appendChild(seg('Texture cap',[['512','512'],['1024','1024'],['2048','2048']],
    String(cfgNow.maxTex), k=>{ cfgNow.maxTex=parseInt(k,10); touch(); ui(); }));
  s.wrap.appendChild(seg('Mesh detail',[['0','full'],['150000','high'],['60000','medium'],['20000','low']],
    String(cfgNow.targetTris), k=>{ cfgNow.targetTris=parseInt(k,10); touch(); ui(); }));
  const mb=el('div','stbtns');
  const bMeas=el('button','','measure baked size');
  bMeas.onclick=()=>{ bMeas.textContent='measuring…'; measureSize().then(()=>ui()).catch(()=>{ bMeas.textContent='measure baked size'; }); };
  const bJson=el('button','','export .json'); bJson.onclick=exportJSON;
  mb.appendChild(bMeas); mb.appendChild(bJson); s.wrap.appendChild(mb);
  if(LASTMEASURE){ const m=LASTMEASURE;
    s.wrap.appendChild(el('div','sthint','Baked size <b style="color:'+(m.total>6291456?'#ff5470':(m.total>3145728?'#ffb020':'#2dd4bf'))+
      '">'+MB(m.total)+'</b> · walls '+MB(m.walls)+' · tiles '+MB(m.tiles)+' · props '+MB(m.props)+' · clips '+MB(m.clips))); }
  s.wrap.appendChild(el('div','stsub','Extra slots'));
  SURF.filter(d=>d.kind==='logo'||d.kind==='gamecard'||d.kind==='song').forEach(d=>{
    s.wrap.appendChild(surfaceRow(d)); if(SEL==='S:'+d.id) s.wrap.appendChild(surfaceCtl(d)); });
  s.wrap.appendChild(el('div','stsub','Event switches'));
  const U=LOOK.ui||(LOOK.ui={game:false,timer:false,rail:false,chip:false,walk:true});
  [['Countdown','timer'],['Reactions','rail'],['Live chip','chip'],['Walk around','walk']].forEach(([l,k])=>{
    s.wrap.appendChild(seg(l,[['on','on'],['off','off']],U[k]===false?'off':'on',k2=>{ U[k]=(k2==='on'); applyRoomUI(); touch(); ui(); })); });
  const B=boardsCfg();
  s.wrap.appendChild(seg('Demo crowd',[['on','running'],['off','off']],B.sim&&B.sim.on?'on':'off',k=>{ simOn(k==='on'); touch(); ui(); }));
  s.wrap.appendChild(seg('Bake the crowd in',[['on','yes'],['off','no']],B.sim&&B.sim.bake?'on':'off',k=>{ B.sim.bake=(k==='on'); touch(); ui(); }));
  return s;
}

function pick(accept,then){
  const i=document.createElement('input'); i.type='file'; i.accept=accept; i.multiple=true;
  i.onchange=()=>then(i.files); i.click();
}

/* ================= drops ================= */
function inFront(dist){
  const d=new T.Vector3(); HEX.cam.getWorldDirection(d); d.y=0; d.normalize();
  const p=HEX.cam.position.clone().addScaledVector(d,dist||3);
  const cl=RM.clamp(p.x,p.z,1.2); p.x=cl.x; p.z=cl.z;
  return p;
}
function takeFiles(files,opt){
  opt=opt||{};
  const list=Array.from(files||[]);
  if(!list.length) return;
  let chain=Promise.resolve();
  list.forEach(f=>{ chain=chain.then(()=>addAsset(f)).then(a=>route(a,opt)); });
  chain.then(()=>{ touch(); ui(); });
}
function route(a,opt){
  if(opt.boardArt){ boardsCfg().game.art=a.id; redrawBoards(); tip('marquee art ← '+a.name); return; }
  if(opt.screenArt){ if(a.k!=='image'&&a.k!=='video'){ tip('the screen wants a picture or a video'); return; }
    const G=boardsCfg().game; G.screen=a.id; G.screenKind=(a.k==='video')?'video':'image'; rebuildBoards(); tip('screen '+G.screenKind+' ← '+a.name); return; }
  /* a tile in one of the two racks */
  if(opt.slot&&opt.slot.indexOf('T:')===0){
    const p=opt.slot.split(':'), kind=p[1], i=+p[2];
    if(kind==='video'&&a.k!=='video'){ tip('that tile wants a video file'); return; }
    if(kind==='photo'&&a.k!=='image'){ tip('that tile wants an image'); return; }
    const t=LOOK.racks[kind].tiles[i];
    t.asset=a.id; t.url='';
    applyTile(kind,i); select(opt.slot);
    tip((kind==='video'?'Video':'Photo')+' tile '+(i+1)+' ← '+a.name);
    return;
  }
  /* a video dropped straight onto a banner / wall / floor loops there */
  if(a.k==='video'&&!opt.slot&&opt.pt){
    const ht=pickTile(opt.pt.x,opt.pt.y);
    if(ht&&ht.kind==='video'){ route(a,{slot:'T:video:'+ht.i}); return; }
    if(!ht){
      const hs=pickSurface(opt.pt.x,opt.pt.y);
      if(hs&&CANMOVE(SBY[hs.slot].kind)){ route(a,{slot:hs.slot}); return; }
    }
  }
  /* a video with no explicit target fills the next empty video tile */
  if(a.k==='video'&&!opt.slot){
    const tiles=LOOK.racks.video.tiles;
    let i=tiles.findIndex(t=>!t.asset&&!t.url); if(i<0) i=0;
    tiles[i].asset=a.id; tiles[i].url='';
    applyTile('video',i); select('T:video:'+i);
    tip('Video tile '+(i+1)+' ← '+a.name);
    return;
  }
  /* explicit slot (dropped on a panel row / chosen from a slot button) */
  if(opt.slot){
    const d=SBY[opt.slot];
    if(d.kind==='song'&&a.k!=='audio'){ tip('that slot wants an audio file'); return; }
    if(d.kind!=='song'&&a.k==='glb'){ makeProp(a,opt); return; }
    if(a.k==='video'&&!CANMOVE(d.kind)){ tip(d.label+" can't take video"); return; }
    const st=LOOK.surfaces[opt.slot]||(LOOK.surfaces[opt.slot]=defSurf());
    st.asset=a.id; st.url='';
    applySurface(opt.slot); select('S:'+opt.slot);
    tip(d.label+' ← '+a.name+(a.k==='video'?' (looping)':'')); return;
  }
  if(a.k==='audio'){ const st=LOOK.surfaces.song||(LOOK.surfaces.song=defSurf());
    st.asset=a.id; applySurface('song'); tip('event song ← '+a.name); return; }
  if(a.k==='glb'||opt.prop){ makeProp(a,opt); return; }
  /* image dropped into the room: a tile wins over the wall behind it */
  if(opt.pt){
    const ht=pickTile(opt.pt.x,opt.pt.y);
    if(ht&&ht.kind==='photo'){ route(a,{slot:'T:photo:'+ht.i}); return; }
    if(ht&&ht.kind==='video'){ tip('that tile wants a video file'); return; }
  }
  const hit=opt.pt?pickSurface(opt.pt.x,opt.pt.y):null;
  if(hit&&MODE==='surface'){
    const st=LOOK.surfaces[hit.slot]||(LOOK.surfaces[hit.slot]=defSurf());
    st.asset=a.id; applySurface(hit.slot); select('S:'+hit.slot);
    tip(SBY[hit.slot].label+' ← '+a.name); return;
  }
  makeProp(a,opt,hit);
}
function modelCount(){ return (LOOK.props||[]).filter(p=>p.type==='glb'||p.type==='prim').length; }
function modelRoom(){
  if(ADMIN||!ISBOX) return true;
  if(modelCount()<MODEL_MAX) return true;
  tip('this room holds '+MODEL_MAX+' models — remove one to add another'); return false;
}
function makeProp(a,opt,hit){
  if(a.k==='glb'&&!modelRoom()) return;
  const p=propRec(a.k==='glb'?'glb':'image',null);
  p.asset=a.id; p.name=a.name.replace(/\.[a-z0-9]+$/i,'');
  if(hit&&hit.point){
    p.pos=[hit.point.x,hit.point.y,hit.point.z];
    if(hit.wall!=null&&hit.kind==='wall'){ p.wall=hit.wall; p.rot[1]=RM.th(hit.wall);
      const tg=RM.tangent(hit.wall), c0=RM.wallPoint(hit.wall,0,0,0);
      /* the hex has always centred a wall drop; the box's long walls land where you clicked */
      const along=!ISBOX?0:Math.max(-RM.len(hit.wall)/2+.3,Math.min(RM.len(hit.wall)/2-.3,
        (hit.point.x-c0.x)*tg.x+(hit.point.z-c0.z)*tg.z));
      const q=RM.wallPoint(hit.wall,along,0,0.14);
      p.pos=[q.x, Math.max(1.0,hit.point.y), q.z]; }
    else p.pos[1]=0;
  } else { const q=inFront(WORLDSP&&a.k==='glb'?14:3.2); p.pos=[q.x,a.k==='glb'?0:1.5,q.z]; }
  if(WORLDSP&&a.k==='glb') p.lit=true;            /* v71: world models catch your lights */
  addProp(p,()=>select(p.id));
  tip((a.k==='glb'?'model':'image')+' placed — drag it around');
}

/* raycast helpers */
const RAY=new T.Raycaster(), PTR=new T.Vector2();
function setPtr(x,y){ PTR.x=x/innerWidth*2-1; PTR.y=-(y/innerHeight)*2+1; RAY.setFromCamera(PTR,HEX.cam); }
function pickSurface(x,y){
  if(WORLDSP) return null;                      /* v71: a World has no walls or floor slots — the ground is just ground */
  setPtr(x,y);
  const objs=HEX.walls.concat(HEX.banners); if(HEX.floor) objs.push(HEX.floor);
  const h=RAY.intersectObjects(objs,false)[0];
  if(!h) return null;
  const o=h.object;
  if(o===HEX.floor) return {slot:'floor',kind:'floor',point:h.point};
  let i=HEX.walls.indexOf(o);
  if(i>=0) return {slot:'wall'+i,kind:'wall',wall:i,point:h.point};
  i=HEX.banners.indexOf(o);
  if(i>=0) return {slot:i===0?'bannerA':'bannerB',kind:'banner',point:h.point};
  return null;
}
function pickTile(x,y){
  setPtr(x,y);
  const roots=tileRefs(); if(!roots.length) return null;
  const h=RAY.intersectObjects(roots,true).filter(r=>!r.object.isLineSegments)[0];
  if(!h) return null;
  let o=h.object; while(o&&!o.userData.tile) o=o.parent;
  return o?{kind:o.userData.tile.kind,i:o.userData.tile.i}:null;
}
function pickProp(x,y){
  setPtr(x,y);
  const roots=Object.keys(OBJ).map(k=>OBJ[k]);
  if(!roots.length) return null;
  const h=RAY.intersectObjects(roots,true).filter(r=>r.object.type!=='LineSegments')[0];
  if(!h) return null;
  let o=h.object; while(o&&!o.userData.propId) o=o.parent;
  return o?{id:o.userData.propId,point:h.point}:null;
}

/* ================= pointer: select + drag props ================= */
let DRAG=null;
const PLANE=new T.Plane(), HITV=new T.Vector3();
function beginDrag(id,x,y,shift){
  const p=propById(id)||lightById(id); if(!p) return;
  if(p.follow) p.follow=null;          /* grabbing a tile that rode a model sets it free */
  if(shift||p.wall!=null){
    if(p.wall!=null){ const n=RM.normal(p.wall);
      PLANE.setFromNormalAndCoplanarPoint(n,new T.Vector3(p.pos[0],p.pos[1],p.pos[2]));
    } else {
      const n=new T.Vector3(); HEX.cam.getWorldDirection(n); n.y=0; n.normalize();
      PLANE.setFromNormalAndCoplanarPoint(n,new T.Vector3(p.pos[0],p.pos[1],p.pos[2]));
    }
  } else {
    PLANE.setFromNormalAndCoplanarPoint(new T.Vector3(0,1,0),new T.Vector3(p.pos[0],p.pos[1],p.pos[2]));
  }
  setPtr(x,y);
  if(!RAY.ray.intersectPlane(PLANE,HITV)) return;
  DRAG={id, off:new T.Vector3(p.pos[0],p.pos[1],p.pos[2]).sub(HITV), vertical:!!shift&&p.wall==null};
}
function moveDrag(x,y){
  if(!DRAG) return;
  const p=propById(DRAG.id)||lightById(DRAG.id); if(!p) return;
  setPtr(x,y);
  if(!RAY.ray.intersectPlane(PLANE,HITV)) return;
  const q=HITV.clone().add(DRAG.off);
  if(p.wall!=null){ p.pos[1]=Math.max(0,q.y);
    const half=RM.len(p.wall)/2, c0=RM.wallPoint(p.wall,0,0,0.14), t=RM.tangent(p.wall);
    const along=Math.max(-half+.3,Math.min(half-.3, (q.x-c0.x)*t.x+(q.z-c0.z)*t.z));
    const w=RM.wallPoint(p.wall,along,0,0.14);
    p.pos[0]=w.x; p.pos[2]=w.z;
  } else if(DRAG.vertical){ p.pos[1]=Math.max(0,q.y); }
  else{
    const cl=RM.clamp(q.x,q.z,.35);
    p.pos[0]=cl.x; p.pos[2]=cl.z;
  }
  if(p.isLight) window.HEXCORE.applyLight(p,LOBJ[DRAG.id]);
  else window.HEXCORE.apply(p,OBJ[DRAG.id]);
  refreshSel(); touch();
}

function onDown(e){
  if(FAN||DEMO) return;
  if(PANEL.contains(e.target)) return;
  if(NAV&&NAV.contains(e.target)) return;
  /* the aim ring is only there while you're working on a light — always grabbable */
  const ai=pickAim(e.clientX,e.clientY);
  if(ai){ e.stopPropagation(); e.preventDefault(); beginAim(ai,e.clientX,e.clientY);
    DOWN={x:e.clientX,y:e.clientY,moved:false}; return; }
  /* LOOK mode never grabs by accident — only the thing you've already selected moves */
  if(VIEW.mode!=='edit'){
    if(SEL&&(LOBJ[SEL]||OBJ[SEL])){
      const hl=pickLight(e.clientX,e.clientY), hp=hl?null:pickProp(e.clientX,e.clientY);
      const hit=(hl&&hl.id===SEL)?hl:((hp&&hp.id===SEL)?hp:null);
      if(hit){ e.stopPropagation(); e.preventDefault(); beginDrag(SEL,e.clientX,e.clientY,e.shiftKey);
        DOWN={x:e.clientX,y:e.clientY,moved:false}; return; }
    }
    DOWN={x:e.clientX,y:e.clientY,moved:false,look:true}; return; }
  const hl=pickLight(e.clientX,e.clientY);
  if(hl){ e.stopPropagation(); e.preventDefault(); select(hl.id);
    beginDrag(hl.id,e.clientX,e.clientY,e.shiftKey);
    DOWN={x:e.clientX,y:e.clientY,moved:false}; return; }
  const hp=pickProp(e.clientX,e.clientY);
  if(hp){ e.stopPropagation(); e.preventDefault(); select(hp.id);
    beginDrag(hp.id,e.clientX,e.clientY,e.shiftKey);
    DOWN={x:e.clientX,y:e.clientY,moved:false}; return; }
  DOWN={x:e.clientX,y:e.clientY,moved:false,look:true};
}
let DOWN=null;
addEventListener('pointermove',e=>{ if(DOWN&&(Math.abs(e.clientX-DOWN.x)>3||Math.abs(e.clientY-DOWN.y)>3)) DOWN.moved=true;
  if(AIMDRAG) moveAim(e.clientX,e.clientY);
  else if(DRAG) moveDrag(e.clientX,e.clientY); });
addEventListener('pointerup',e=>{
  if(AIMDRAG){ AIMDRAG=null; touch(); ui(); }
  else if(DRAG){ DRAG=null; ui(); }
  else if(DOWN&&!DOWN.moved&&DOWN.look&&!FAN&&!PANEL.contains(e.target)&&!(NAV&&NAV.contains(e.target))){
    /* a click on a light's can or on a prop selects it — then it can be dragged */
    const cl=pickLight(e.clientX,e.clientY);
    if(cl){ select(cl.id); tip('light selected — drag the can to move it, the ring to aim it'); DOWN=null; return; }
    const cp=pickProp(e.clientX,e.clientY);
    if(cp){ select(cp.id); tip('selected — drag it to move · shift-drag to raise'); DOWN=null; return; }
    const sg=pickSig(e.clientX,e.clientY);
    if(sg){ showSigCard(sg); DOWN=null; return; }
    const ht=pickTile(e.clientX,e.clientY);
    if(ht){ select('T:'+ht.kind+':'+ht.i); tip((ht.kind==='video'?'Video':'Photo')+' tile '+(ht.i+1)); }
    else{
      const hs=pickSurface(e.clientX,e.clientY);
      if(hs&&MOODSP&&TAB==='windows'&&hs.kind==='wall'&&PANEL.classList.contains('open')){ CUTWALL=hs.slot; ui(); tip(SBY[hs.slot].label+' — cut a window here'); }
      else if(hs){ select('S:'+hs.slot); tip(SBY[hs.slot].label); } else select(null);
    }
  }
  DOWN=null; });

/* ================= view ================= */
const VIEW={panel:'hidden',mode:'look'};
let NAVS=null;                      /* HEXCORE.NAV — the same rig baked rooms get */

function applyRoomUI(){
  const U=LOOK.ui||{};
  window.HEXCORE.EGGSTYLE=U.eggStyle||null;
  const gw=document.getElementById('gwall');
  if(gw){
    if(U.game===false){ gw.style.display='none'; if(HEX.hideDock) HEX.hideDock(); }
    else gw.style.display='';
  }
  if(NAVS) NAVS.el.style.display=(U.walk===false)?'none':'';
  if(HEX.setDrive&&U.drive) HEX.setDrive(U.drive);
}
function applyPanel(){
  if(!HEX.showPanel) return;
  HEX.showPanel(VIEW.panel!=='hidden');
  if(VIEW.panel==='docked') HEX.setPanel(0);
  else if(VIEW.panel==='float') HEX.setPanel(1);
}
let FAN=false, NAV=null;
function setMode(m){
  VIEW.mode=m;
  const b=document.getElementById('stgMode');
  if(b){ b.textContent=m==='edit'?'editing · click to grab':'look around'; b.classList.toggle('edit',m==='edit'); }
  document.body.classList.toggle('editmode',m==='edit');
  tip(m==='edit'?'edit mode — drag props to move them'
                :'look mode — drag to look, joystick to walk. nothing gets grabbed.');
}
addEventListener('wheel',e=>{ if(FAN) return; if(PANEL.contains(e.target)) return;
  if(e.target&&e.target.closest&&e.target.closest('#wmap')) return;   /* v77: the map has its own wheel (zoom) and its tray scrolls */
  e.preventDefault();
  if(!NAVS) return;
  if(e.shiftKey){ NAVS.eye=Math.max(.6,Math.min(4,NAVS.eye-e.deltaY*.0025)); return; }
  const d=new T.Vector3(); HEX.cam.getWorldDirection(d); d.y=0; d.normalize();
  const k=-e.deltaY*.0055;
  NAVS.pos.x+=d.x*k; NAVS.pos.z+=d.z*k;
  const cl=RM.clamp(NAVS.pos.x,NAVS.pos.z,.8);
  NAVS.pos.x=cl.x; NAVS.pos.z=cl.z;
},{passive:false});

/* ================= keys ================= */
addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||''))) return;
  const lk=(e.key||'').toLowerCase();
  if('wasdqe'.indexOf(lk)>=0&&lk) return;          /* HEXCORE owns the movement keys */
  if(e.key==='Escape'){
    if(DEMO) return demoMode(false);
    if(FAN) return fanPreview(false);
    select(null); return; }
  if(lk==='m'){ setMode(VIEW.mode==='edit'?'look':'edit'); return; }
  if(e.key==='g'||e.key==='G'){ PANEL.classList.toggle('open'); return; }
  if(!SEL||SEL.indexOf('S:')===0||SEL.indexOf('T:')===0) return;
  const p=propById(SEL)||lightById(SEL); if(!p) return;
  const step=e.shiftKey?.02:.1;
  const d=new T.Vector3(); HEX.cam.getWorldDirection(d); d.y=0; d.normalize();
  const r=new T.Vector3(-d.z,0,d.x);
  let hit=true;
  if(e.key==='ArrowUp')    p.pos[0]+=d.x*step, p.pos[2]+=d.z*step;
  else if(e.key==='ArrowDown')  p.pos[0]-=d.x*step, p.pos[2]-=d.z*step;
  else if(e.key==='ArrowLeft')  p.pos[0]-=r.x*step, p.pos[2]-=r.z*step;
  else if(e.key==='ArrowRight') p.pos[0]+=r.x*step, p.pos[2]+=r.z*step;
  else if(e.key==='PageUp')     p.pos[1]+=step;
  else if(e.key==='PageDown')   p.pos[1]=Math.max(0,p.pos[1]-step);
  else if(e.key==='Delete'||e.key==='Backspace'){ removeProp(p.id); return; }
  else hit=false;
  if(hit){ e.preventDefault(); window.HEXCORE.apply(p,OBJ[p.id]); refreshSel(); touch(); }
});

/* ================= save / load / export ================= */
function touch(){ DIRTY=true; if(LOOK&&(LOOK.props||[]).some(p=>(p.egg&&p.egg.on)||p.follow)) syncPropEggsSoon(); clearTimeout(touch._t); touch._t=setTimeout(()=>put('kv',AUTOKEY,serialize()).catch(()=>{}),700); }
function usedAssets(){
  const used={};
  if(LOOK.boards&&LOOK.boards.game&&LOOK.boards.game.art) used[LOOK.boards.game.art]=1;
  if(LOOK.boards&&LOOK.boards.game&&LOOK.boards.game.screen) used[LOOK.boards.game.screen]=1;
  Object.keys(LOOK.surfaces).forEach(k=>{ const a=LOOK.surfaces[k].asset; if(a) used[a]=1; });
  LOOK.props.forEach(p=>{ if(p.asset) used[p.asset]=1; if(p.egg) (p.egg.blocks||[]).forEach(b=>{ if(b.asset) used[b.asset]=1; }); ((p.screen&&p.screen.clips)||[]).forEach(k=>{ used[k]=1; }); });
  Object.keys(LOOK.racks||{}).forEach(k=>LOOK.racks[k].tiles.forEach(t=>{ if(t.asset) used[t.asset]=1; }));
  (LOOK.sets||[]).forEach(st=>setAssetIds(st).forEach(k=>{ used[k]=1; }));
  (((LOOK.mood&&LOOK.mood.world&&LOOK.mood.world.lib)||[])).forEach(L=>{ if(L.asset) used[L.asset]=1; });   /* v72: map pieces */
  return used;
}
function serialize(){
  const used=usedAssets();
  return {version:2,shape:RM.shape,name:LOOK.name,seq:LOOK.seq,
    surfaces:JSON.parse(JSON.stringify(LOOK.surfaces)),
    props:JSON.parse(JSON.stringify(LOOK.props)),
    racks:JSON.parse(JSON.stringify(LOOK.racks||{})),
    ui:JSON.parse(JSON.stringify(LOOK.ui||{})), bake:JSON.parse(JSON.stringify(LOOK.bake||{})),
    lights:JSON.parse(JSON.stringify(LOOK.lights||[])), lit:JSON.parse(JSON.stringify(LOOK.lit||{})),
    boards:JSON.parse(JSON.stringify(LOOK.boards||{})),
    orbit:JSON.parse(JSON.stringify(LOOK.orbit||{})),
    fx:LOOK.fx?JSON.parse(JSON.stringify(LOOK.fx)):undefined,
    sets:JSON.parse(JSON.stringify(LOOK.sets||[])), windows:JSON.parse(JSON.stringify(LOOK.windows||{})),
    mood:LOOK.mood?JSON.parse(JSON.stringify(LOOK.mood)):undefined,
    sigwall:LOOK.sigwall?JSON.parse(JSON.stringify(LOOK.sigwall)):undefined,
    assets:Object.keys(used).reduce((o,k)=>{ const a=ASSETS[k];
      if(a) o[k]={name:a.name,type:a.type,k:a.k}; return o; },{}),
    view:{eye:NAVS?NAVS.eye:1.7,speed:NAVS?NAVS.speed:1,turn:NAVS?NAVS.turn:1,mode:VIEW.mode}};
}
function saveLook(){
  const n=(LOOK.name||'untitled look').trim();
  put('looks',PFX+n,serialize()).then(()=>{ tip('saved “'+n+'”'); DIRTY=false; ui(); });
}
function loadLook(n){
  get('looks',PFX+n).then(m=>{ if(!m) return;
    hydrateFrom(m).then(()=>{ tip('loaded “'+n+'”'); });
  });
}
/* v71: which builder a mood look belongs to */
const spaceOf=md=>md&&md.world?'world':(md&&md.open?'open':'mood');
const CURSP=WORLDSP?'world':(OPENSP?'open':'mood');
const SPNAME={world:'a World',open:'an Open Space',mood:'a Mood Room'};
function shapeMismatch(shape){
  const want=(shape==='box')?'Room Space':'Event Space';
  if(BUILDER&&BUILDER.space==='room'){ tip('that’s an '+want+' look — it opens in the admin builder'); return; }
  if(confirm('That’s a '+want+' look. Switch to the '+want+' builder? Then open the file again there.')){
    const u=new URL(location.href); u.searchParams.set('space', shape==='box'?'room':'event');
    location.href=u.toString();
  }
}
function hydrateFrom(m,inlineAssets){
  if(((m&&m.shape)||'hex')!==RM.shape){ shapeMismatch((m&&m.shape)||'hex'); return Promise.resolve(); }
  LOOK={version:2,shape:RM.shape,name:m.name||'untitled look',seq:m.seq||1,
    surfaces:m.surfaces||{},props:m.props||[],
    racks:m.racks&&m.racks.photo?m.racks:{photo:window.HEXCORE.newRack('photo'),video:window.HEXCORE.newRack('video')},
    ui:m.ui&&Object.keys(m.ui).length?m.ui:{game:false,timer:true,rail:true,chip:true,walk:true},
    bake:m.bake&&Object.keys(m.bake).length?m.bake:{optimize:true,maxTex:1024,targetTris:60000},
    lights:m.lights||[], lit:m.lit&&Object.keys(m.lit).length?m.lit:{surfaces:false,ambient:.85},
    boards:m.boards&&m.boards.game?m.boards:null,
    orbit:m.orbit&&m.orbit.dur?m.orbit:null,
    fx:m.fx&&m.fx.on?m.fx:(window.HEXFX?Object.assign(window.HEXFX.newCfg(),
        ISBOX?{}:{preset:'custom',on:{columns:1}}):undefined),   /* old event looks kept their poles */
    sets:m.sets||[], windows:m.windows||{}};
  if(m.sigwall) LOOK.sigwall=m.sigwall;
  if(MOODSP&&LOOK.ui&&!LOOK.ui.eggStyle) LOOK.ui.eggStyle={preset:'mood',float:true};
  if(MOODSP&&m.mood&&spaceOf(m.mood)!==CURSP){ const sp=spaceOf(m.mood); if(confirm('That’s '+SPNAME[sp]+' look. Switch to that builder? Then open it again there.')){
    const u=new URL(location.href); u.searchParams.set('space',sp); location.href=u.toString(); } return Promise.resolve(); }   /* v59 */
  if(MOODSP){ LOOK.mood=Object.assign(window.HEXCORE.moodDefaults(), m.mood||{}); if(OPENSP) LOOK.mood.open=Object.assign(openDefaults(), LOOK.mood.open||{}); if(WORLDSP) LOOK.mood.world=Object.assign(window.HEXCORE.WORLD.defaults(), LOOK.mood.world||{}); }
  else if(m.mood&&!ISBOX&&confirm('That’s a Mood Room look. Switch to the Mood Room builder? Then open it again there.')){
    const u=new URL(location.href); u.searchParams.set('space',spaceOf(m.mood)); location.href=u.toString(); return Promise.resolve(); }
  if(SETEDIT) exitSetEditor(true);
  if((m.version||1)<3&&LOOK.ui) LOOK.ui.game=false;      /* game panel used to default on */
  if(m.view&&NAVS){ NAVS.eye=m.view.eye||1.7; NAVS.speed=m.view.speed||1; NAVS.turn=m.view.turn||1; }
  if(m.view&&m.view.mode) setMode(m.view.mode);
  const need=Object.keys(m.assets||{}).filter(k=>!ASSETS[k]);
  const load=need.map(k=>{
    if(inlineAssets&&inlineAssets[k]){
      const rec=m.assets[k];
      return fetch(inlineAssets[k]).then(r=>r.blob()).then(bl=>{
        const a={id:k,name:rec.name,type:rec.type||bl.type,k:rec.k,blob:bl};
        ASSETS[k]=a; put('assets',k,{name:a.name,type:a.type,k:a.k,blob:bl}).catch(()=>{});
        return hydrateAsset(a);
      }).catch(()=>{});
    }
    return get('assets',k).then(rec=>{
      if(!rec) return; const a={id:k,name:rec.name,type:rec.type,k:rec.k,blob:rec.blob};
      ASSETS[k]=a; return hydrateAsset(a);
    });
  });
  return Promise.all(load).then(()=>{ applyAllSurfaces(); buildRacks(); rebuildProps();
    rebuildLights(); rebuildBoards(); rebuildWindowsNow(); applyRoomUI(); select(null); ui(); });
}
function dl(name,blob){
  const u=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=u; a.download=name; document.body.appendChild(a); a.click();
  setTimeout(()=>{ a.remove(); URL.revokeObjectURL(u); },800);
}
function slug(s){ return String(s||'look').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'look'; }
function exportJSON(){
  const m=serialize();
  m.note='THE HEX staging manifest. Slot ids match _events/<code>/ naming; every prop carries a payload field for Phase 2.';
  dl(slug(LOOK.name)+'-manifest.json', new Blob([JSON.stringify(m,null,2)],{type:'application/json'}));
  tip('manifest exported');
}
function dataURLFor(a){ return new Promise(res=>{ const r=new FileReader();
  r.onload=()=>res(r.result); r.onerror=()=>res(null); r.readAsDataURL(a.blob); }); }
function bakedSurface(d){
  const st=LOOK.surfaces[d.id];
  if(!st||(!st.asset&&!(d.kind==='song'&&st.url))) return Promise.resolve(null);
  const a=st.asset?ASSETS[st.asset]:null;
  if(!a&&!(d.kind==='song'&&st.url)) return Promise.resolve(null);
  if(d.kind==='logo'||d.kind==='gamecard'||d.kind==='song'){
    if(d.kind==='song'&&st.url) return Promise.resolve(st.url);
    return dataURLFor(a);
  }
  const win=d.kind==='wall'&&winOn(d.id);
  const c=frameCanvas(a.img,d.w,d.h,st,win);
  let u=null; try{ u=c.toDataURL('image/webp',.88); }catch(e){}
  if(!u||u.indexOf('data:image/webp')!==0) u=win?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.9);
  return Promise.resolve(u);
}
function exportProject(){
  tip('packing project…');
  const m=serialize(); m.kind='hexlook';
  const jobs=Object.keys(m.assets).map(k=>dataURLFor(ASSETS[k]).then(u=>{ if(u) m.assets[k].data=u; }));
  Promise.all(jobs).then(()=>{
    const blob=new Blob([JSON.stringify(m)],{type:'application/json'});
    dl(slug(LOOK.name)+'.hexlook.json', blob);
    tip('project saved · '+(blob.size/1048576).toFixed(1)+' MB — this file restores everything');
  });
}
function openProject(){
  pick('.json,.html,application/json,text/html',fs=>{
    const f=fs[0]; if(!f) return;
    tip('opening…');
    f.text().then(txt=>{
      if(/\.html?$/i.test(f.name)||txt.indexOf('window.HEXBAKE=')>=0){
        importBaked(txt).catch(e=>tip('could not read that room — '+(e&&e.message||'unknown')));
        return;
      }
      let m=null; try{ m=JSON.parse(txt); }catch(e){}
      if(!m||!m.surfaces){ tip('that file is not a Hex project or a baked room'); return; }
      const inline={};
      Object.keys(m.assets||{}).forEach(k=>{ if(m.assets[k].data) inline[k]=m.assets[k].data; });
      hydrateFrom(m,inline).then(()=>tip('project restored — “'+(m.name||'untitled')+'”'));
    });
  });
}
function bakedTile(kind,i){
  const t=LOOK.racks[kind].tiles[i];
  if(kind==='video'){
    if(t.url) return Promise.resolve({url:t.url});
    const a=t.asset?ASSETS[t.asset]:null;
    if(!a) return Promise.resolve(null);
    if(a.blob.size>12*1048576) return Promise.resolve({tooBig:a.name});
    return dataURLFor(a).then(u=>u?{data:u}:null);
  }
  const a=t.asset?ASSETS[t.asset]:null;
  if(!a||!a.img) return Promise.resolve(null);
  const d=window.HEXCORE.RACKS[kind];
  const c=frameCanvas(a.img,1080,Math.round(1080/d.aspect),t);
  let u=null; try{ u=c.toDataURL('image/webp',.86); }catch(e){}
  if(!u||u.indexOf('data:image/webp')!==0) u=c.toDataURL('image/jpeg',.88);
  return Promise.resolve({data:u});
}
/* "preview as a fan" — bakes exactly what publish would, and opens it in a new tab. The tab is
   opened on the click itself (a tab opened after the async bake would be popup-blocked). */
let PREVIEWWIN=null;
function previewFan(){
  const w=window.open('about:blank','_blank');
  if(!w){ tip('allow pop-ups for this site to preview as a fan'); return; }
  try{ w.document.write('<title>fan preview</title><body style="margin:0;background:#07060d;color:#fbbf24;'+
    'font:800 12px Manrope,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;'+
    'letter-spacing:.2em">BUILDING THE FAN VIEW…</body>'); }catch(e){}
  PREVIEWWIN=w; bakeHTML();
}
function bakeHTML(){
  tip('baking…');
  const payload={version:2,shape:RM.shape,name:LOOK.name,surfaces:{},tints:{},props:[],assets:{},racks:{},videos:{},
    ui:JSON.parse(JSON.stringify(LOOK.ui||{game:false,timer:true,rail:true,chip:true,walk:true})),
    boards:JSON.parse(JSON.stringify(LOOK.boards||{})),
    lights:JSON.parse(JSON.stringify(LOOK.lights||[])),
    lit:{surfaces:!!(LOOK.lit&&LOOK.lit.surfaces),
         ambient:(LOOK.lit&&LOOK.lit.ambient!==undefined)?LOOK.lit.ambient:.85}};
  if(LOOK.sigwall&&LOOK.sigwall.on){ const C=LOOK.sigwall; payload.sigwall={on:true, wall:C.wall, look:C.look, plate:C.plate!==false, title:C.title==null?window.HEXCORE.SIGDEF.title:C.title, sub:C.sub!==false, color:C.color||window.HEXCORE.SIGDEF.color}; }   /* v86: the wall goes live — never the builder's demo signatures */
  /* v42: a Mood Room carries its settings and only the texture packs it uses */
  if(MOODSP&&LOOK.mood){ const tex={}, LIB=window.HEXMOODTEX||{};
    window.HEXCORE.moodPacks(LOOK.mood).forEach(pk=>['_col','_nrm','_rgh'].forEach(x=>{ if(LIB[pk+x]) tex[pk+x]=LIB[pk+x]; }));
    if((LOOK.props||[]).some(p=>p.type==='prim'&&/^h_/.test(p.kind))) ['brick','concrete','paint'].forEach(pk=>['_col','_nrm'].forEach(x=>{ if(LIB[pk+x]) tex[pk+x]=LIB[pk+x]; }));   /* v81: houses bring their wall textures */
    payload.mood=Object.assign(JSON.parse(JSON.stringify(LOOK.mood)),{tex:tex});
    if(WORLDSP&&payload.mood.world){ const W=window.HEXCORE.WORLD, used=((payload.mood.world.map||{}).cells||[]).some(c=>c&&c.id&&(W.piece(c.id,LOOK.mood)||{}).kit==='real');   /* v73 */
      if(used) payload.mood.world.kittex=window.HEXKITTEX||{}; else delete payload.mood.world.kittex; } }
  /* the turntable ships only if Adam asked for it */
  (function(){ const o=orbitCfg();
    payload.orbit=o.bake?{dur:o.dur,turns:o.turns,tilt:o.tilt,loop:o.loop,
                          button:o.button!==false,auto:!!o.auto}:null; })();
  const skipped=[];
  const jobs=[];
  const SKC=MOODSP&&LOOK.mood?window.HEXCORE.skyCfg(LOOK.mood):null;
  if(SKC&&SKC.sky==='image'&&SKC.skyImg&&ASSETS[SKC.skyImg]){ const id=SKC.skyImg;   /* v60/v61: their own sky */
    jobs.push(dataURLFor(ASSETS[id]).then(u=>{ if(u) payload.assets[id]=u; })); }
  if(!ISBOX) payload.ui.splash=false;                 /* event rooms: no door, no song — the page owns both */
  SURF.forEach(d=>{
    if(!ISBOX&&(d.kind==='logo'||d.kind==='song')) return;
    const st=LOOK.surfaces[d.id]||defSurf();
    const a=st.asset?ASSETS[st.asset]:null;
    if(CANMOVE(d.kind)&&((a&&a.k==='video')||st.url)){
      const meta={scale:st.scale,ox:st.ox,oy:st.oy,tint:st.tint,bright:st.bright};
      if(st.url){ payload.videos[d.id]=Object.assign({src:st.url},meta); return; }
      if(a.blob.size>12*1048576){ skipped.push(a.name); return; }
      jobs.push(dataURLFor(a).then(u=>{ if(u) payload.videos[d.id]=Object.assign({src:u},meta); }));
      return;
    }
    jobs.push(bakedSurface(d).then(u=>{ if(u){ payload.surfaces[d.id]=u;
      payload.tints[d.id]={tint:st.tint,bright:st.bright}; } }));
  });
  Object.keys(LOOK.racks||{}).forEach(kind=>{
    const rack=JSON.parse(JSON.stringify(LOOK.racks[kind]));
    payload.racks[kind]=rack;
    rack.tiles.forEach((t,i)=>{
      jobs.push(bakedTile(kind,i).then(r=>{
        if(!r){ t.asset=null; t.url=''; return; }
        if(r.tooBig){ skipped.push(r.tooBig); t.asset=null; t.url=''; return; }
        if(r.url){ t.asset=null; t.url=r.url; return; }
        const key=kind+i; payload.assets[key]=r.data; t.asset=key; t.url='';
      }));
    });
  });
  const B0=boardsCfg();
  if(B0.game.art&&ASSETS[B0.game.art]){
    jobs.push(dataURLFor(ASSETS[B0.game.art]).then(u=>{
      if(u){ payload.assets['boardart']=u; payload.boards.game.art='boardart'; } }));
  } else if(payload.boards&&payload.boards.game){ payload.boards.game.art=null; }
  if(B0.game.screen&&ASSETS[B0.game.screen]){
    jobs.push(dataURLFor(ASSETS[B0.game.screen]).then(u=>{
      if(u){ payload.assets['screenart']=u; payload.boards.game.screen='screenart';
        payload.boards.game.screenKind=(ASSETS[B0.game.screen].k==='video')?'video':'image'; } }));
  } else if(payload.boards&&payload.boards.game){ payload.boards.game.screen=null; }
  /* the demo crowd only ships if Adam asked it to */
  if(payload.boards) payload.boards.sim=(B0.sim&&B0.sim.bake)?{artist:B0.sim.artist||'ROMY'}:null;
  payload.fx=JSON.parse(JSON.stringify(LOOK.fx||(window.HEXFX?window.HEXFX.newCfg():{on:{}})));
  const cfg=bakeCfg(); const shrunk=[]; const doneAsset={};
  /* windows + the sets behind them — only what a window actually shows ships */
  (function(){
    const wins={}, sets=[], seen={};
    SURF.filter(d=>d.kind==='wall').forEach(d=>{
      const w=winOf(d.id), st=LOOK.surfaces[d.id], a=st&&st.asset?ASSETS[st.asset]:null;
      if(!w||!w.on) return;
      const cut=MOODSP&&w.cut;
      if(!cut&&(!a||!a.img)) return;
      const rect=cut?window.HEXCORE.cutRect(w.cut,RM.len(d.idx),RM.H||HEX.WALL_H)
                    :window.HEXCORE.windowRect(frameCanvas(a.img,d.w,d.h,st,true)); if(!rect) return;
      wins[d.id]={on:true,rect:rect.map(v=>+v.toFixed(4)),set:w.set||null};
      if(cut) wins[d.id].cut=JSON.parse(JSON.stringify(w.cut));
      const S=w.set&&setById(w.set); if(!S||seen[S.id]) return; seen[S.id]=1;
      sets.push(JSON.parse(JSON.stringify(S)));
      setAssetIds(S).forEach(k=>{ const A=ASSETS[k]; if(!A||doneAsset[k]) return; doneAsset[k]=1;
        if(A.k==='video'&&A.blob.size>12*1048576){ skipped.push(A.name); return; }
        if(A.k==='glb'&&cfg.optimize) jobs.push(propBytes(A,cfg).then(r=>{ if(r.data) payload.assets[k]=r.data;
          else return dataURLFor(A).then(u=>{ if(u) payload.assets[k]=u; }); }));
        else jobs.push(dataURLFor(A).then(u=>{ if(u) payload.assets[k]=u; })); });
    });
    if(Object.keys(wins).length){ payload.windows=wins; payload.sets=sets; }
  })();
  LOOK.props.forEach(p=>{
    const c=JSON.parse(JSON.stringify(p)); payload.props.push(c);
    ((p.screen&&p.screen.clips)||[]).forEach(k=>{ const A=ASSETS[k]; if(!A||doneAsset[k]) return; doneAsset[k]=1;   /* v70: screen clips */
      if(A.blob.size>12*1048576){ skipped.push(A.name); return; } jobs.push(dataURLFor(A).then(u=>{ if(u) payload.assets[k]=u; })); });
    if(p.egg&&p.egg.on) (p.egg.blocks||[]).forEach(b=>{ const A=b.asset&&ASSETS[b.asset]; if(!A||doneAsset[b.asset]) return; doneAsset[b.asset]=1;
      if(A.k==='video'&&A.blob.size>12*1048576){ skipped.push(A.name); return; }
      jobs.push(dataURLFor(A).then(u=>{ if(u) payload.assets[b.asset]=u; })); });
    if(!p.asset||!ASSETS[p.asset]||doneAsset[p.asset]) return;
    doneAsset[p.asset]=1;
    const a=ASSETS[p.asset];
    if(a.k==='glb'&&cfg.optimize){
      jobs.push(propBytes(a,cfg).then(r=>{
        if(r.data){ payload.assets[p.asset]=r.data;
          if(r.before&&r.after<r.before)
            shrunk.push({name:a.name,before:r.before,after:r.after,tris:r.tris,trisAfter:r.trisAfter}); }
        else jobs.push(dataURLFor(a).then(u=>{ if(u) payload.assets[p.asset]=u; }));
      }));
    } else jobs.push(dataURLFor(a).then(u=>{ if(u) payload.assets[p.asset]=u; }));
  });
  if(WORLDSP&&LOOK.mood&&LOOK.mood.world){ const usedP={}; (((LOOK.mood.world.map||{}).cells)||[]).forEach(c=>{ if(c&&c.id) usedP[c.id]=1; });   /* v72: only the map pieces in use */
    (LOOK.mood.world.lib||[]).forEach(L=>{ const a=L.asset&&ASSETS[L.asset]; if(!a||!usedP[L.id]||doneAsset[L.asset]) return; doneAsset[L.asset]=1;
      if(cfg.optimize) jobs.push(propBytes(a,Object.assign({},cfg,{targetTris:0})).then(r=>{ if(r.data) payload.assets[L.asset]=r.data; else return dataURLFor(a).then(u=>{ if(u) payload.assets[L.asset]=u; }); }));
      else jobs.push(dataURLFor(a).then(u=>{ if(u) payload.assets[L.asset]=u; })); }); }
  Promise.all(jobs).then(()=>{
    const clone=document.documentElement.cloneNode(true);
    clone.querySelectorAll('[data-stage]').forEach(n=>n.remove());
    { const used=(payload.mood&&payload.mood.addons)||{};                     /* v63: a room carries only the add-ons it uses */
      clone.querySelectorAll('script[data-addon]').forEach(n=>{ const k=n.getAttribute('data-addon'); if(!(used[k]&&used[k].on)) n.remove(); }); }
    if(!(payload.mood&&payload.mood.world)) clone.querySelectorAll('script[data-world]').forEach(n=>n.remove());   /* v71: only a World carries the world */
    clone.querySelectorAll('script[data-waddon]').forEach(n=>{ const k=n.getAttribute('data-waddon'), W=payload.mood&&payload.mood.world, P=window.HEXCORE.PRIMS;   /* v74: world add-ons only when used */
      const used=!!(W&&((W.addons&&W.addons[k]&&W.addons[k].on)||(payload.props||[]).some(p=>p.type==='prim'&&P[p.kind]&&P[p.kind].addon===k))); if(!used) n.remove(); });
    clone.querySelectorAll('script[data-wkit]').forEach(n=>{ const k=n.getAttribute('data-wkit'), W=window.HEXCORE.WORLD, P=window.HEXCORE.PRIMS, Wd=payload.mood&&payload.mood.world;   /* v77: an outside kit rides along only when used */
      const used=!!Wd&&((((Wd.map||{}).cells)||[]).some(c=>c&&c.id&&W.kitOf&&W.kitOf(c.id)===k)||(payload.props||[]).some(p=>p.type==='prim'&&P[p.kind]&&P[p.kind].kitProp===k)); if(!used) n.remove(); });
    clone.querySelectorAll('script[data-houses]').forEach(n=>{ if(!(payload.props||[]).some(p=>p.type==='prim'&&/^h_/.test(p.kind))) n.remove(); });   /* v81: houses only when used */
    clone.querySelectorAll('script[data-screens]').forEach(n=>{ const B=window.HEXCORE.BIGSCREENS||[]; if(!(payload.props||[]).some(p=>p.type==='prim'&&B.indexOf(p.kind)>=0)) n.remove(); });   /* v76: big screens only when used */
    ['#stg','#stgBtn','#stgDrop','#stgTip','#stgRail','#stgTop','#stgFonts','#stgSigPad','#stgSigCard'].forEach(s=>{ const n=clone.querySelector(s); if(n) n.remove(); });
    /* hand the room back exactly as it ships: splash up, chrome hidden, panel floating */
    const b=clone.querySelector('body'); if(b){ b.classList.remove('staging'); b.classList.remove('over'); b.classList.remove('sttabbed'); }
    const sp=clone.querySelector('#splash'); if(sp) sp.classList.remove('gone');
    ['#evchip','#timer','#mute','#spinhint'].forEach(s=>{ const n=clone.querySelector(s); if(n) n.style.display='none'; });
    const rl=clone.querySelector('#rail'); if(rl) rl.style.display='none';
    /* the off-screen <video> elements HEXCORE created while staging would clone in
       carrying dead blob: URLs — the baked room makes its own */
    clone.querySelectorAll('video').forEach(v=>v.remove());
    ['#hexNav','#stgStats','#hexSpin','#hexGate'].forEach(sel=>{ const n=clone.querySelector(sel); if(n) n.remove(); });
    const gw=clone.querySelector('#gwall'); if(gw) gw.removeAttribute('style');
    const gwc=clone.querySelector('#gwall'); if(gwc) gwc.className='';
    const lg=clone.querySelector('#slogo'); if(lg) lg.removeAttribute('src');
    const gc=clone.querySelector('#gcard'); if(gc) gc.removeAttribute('style');
    const au=clone.querySelector('#track');
    if(au){
      if(payload.surfaces.song) au.removeAttribute('src');        /* the look overrides it */
      /* event rooms carry no music of their own (v39) */
      else au.removeAttribute('src');
    }
    if(ISBOX){ const tt=clone.querySelector('title');
      if(tt) tt.textContent=(LOOK.name&&LOOK.name!=='untitled look')?LOOK.name:'Trio room'; }
    const s=document.createElement('script');
    s.textContent='window.HEXBAKE='+JSON.stringify(payload).replace(/</g,'\\u003c')+';';
    const head=clone.querySelector('head'); head.insertBefore(s,head.firstChild);
    const EV=(!ISBOX&&LOOK.ui&&LOOK.ui.eventName)?String(LOOK.ui.eventName).replace(/[<>&"'\\`]/g,'').trim():'';
    const GB=(LOOK.boards&&LOOK.boards.game)||{};
    if(EV){                                  /* this event's words, not Romy's */
      const GT=String(GB.title||'the game').replace(/[<>&"'\\`]/g,'');
      const tt=clone.querySelector('title'); if(tt) tt.textContent=EV+' — live on Trio';
      const og=clone.querySelector('meta[property="og:title"]'); if(og) og.setAttribute('content',EV+' — live on Trio');
      if(lg) lg.setAttribute('alt',EV);
      const ss=clone.querySelector('#splash .s'); if(ss) ss.textContent='play '+GT.toLowerCase()+' · climb the board · music on';
      const cb=clone.querySelector('#evchip b'); if(cb) cb.textContent=EV;
      const cs=clone.querySelector('#evchip s'); if(cs) cs.textContent='\u00a0· live on Trio';
      const bb=clone.querySelector('#groom .bar b'); if(bb) bb.textContent=GT+' · '+EV;
    }
    let html='<!DOCTYPE html>\n'+clone.outerHTML;
    if(EV){
      html=html.replace('welcome to the DEATH BY ROMY event','welcome to '+EV);
      if(GB.url&&/^https:\/\/[^'"\s<>]+$/.test(GB.url)) html=html.replace(/const GAME_URL='[^']*';/,"const GAME_URL='"+GB.url+"';");
    }
    /* a Room Space bake from the admin builder must not carry the Romy logo bytes either */
    if(ISBOX) html=html.replace(/(logo:')data:image\/webp;base64,[A-Za-z0-9+\/=]{200,}(')/, "$1data:image/webp;base64,@@LOGO@@$2");
    if(PREVIEWWIN){                        /* preview as a fan: the exact published room, in a new tab, no download */
      const w=PREVIEWWIN; PREVIEWWIN=null;
      const ph=html.replace(/<head[^>]*>/i,m=>m+'<scr'+'ipt>window.HEXRECORD=1;</scr'+'ipt>');   /* v54.1: the record pill, in the preview only */
      try{ w.location.href=URL.createObjectURL(new Blob([ph],{type:'text/html'})); }catch(e){}
      tip('fan preview open in a new tab · '+(html.length/1048576).toFixed(1)+' MB'); return;
    }
    dl(slug(LOOK.name)+'.html', new Blob([html],{type:'text/html'}));
    let msg='baked · '+(html.length/1048576).toFixed(2)+' MB';
    if(shrunk.length){
      const b=shrunk.reduce((n,x)=>n+x.before,0), af=shrunk.reduce((n,x)=>n+x.after,0);
      msg+=' · models '+MB(b)+' → '+MB(af);
      const tb=shrunk.reduce((n,x)=>n+(x.tris||0),0), ta=shrunk.reduce((n,x)=>n+(x.trisAfter||0),0);
      if(tb) msg+=' · '+Math.round(tb/1000)+'k → '+Math.round(ta/1000)+'k tris';
    }
    if(skipped.length) msg+=' · '+skipped.length+' clip(s) left out — host them and paste URLs';
    tip(msg);
  });
}


/* ================= GLB texture optimiser =================
   Model weight is textures, not geometry. Decode every image inside the .glb,
   cap its longest edge, re-encode to WebP, rebuild the container. The result is
   test-parsed before it is accepted; anything that fails falls back to the
   original bytes so a bake can never ship a broken prop. */
const GLB_MAGIC=0x46546C67, CH_JSON=0x4E4F534A, CH_BIN=0x004E4942;
function parseGLB(buf){
  try{
    const dv=new DataView(buf);
    if(dv.getUint32(0,true)!==GLB_MAGIC) return null;
    const total=dv.getUint32(8,true);
    let off=12,json=null,bin=null;
    while(off+8<=total&&off+8<=buf.byteLength){
      const cl=dv.getUint32(off,true), ct=dv.getUint32(off+4,true);
      const data=buf.slice(off+8,off+8+cl);
      if(ct===CH_JSON) json=JSON.parse(new TextDecoder().decode(data));
      else if(ct===CH_BIN) bin=new Uint8Array(data);
      off+=8+cl;
    }
    return json?{json:json,bin:bin||new Uint8Array(0)}:null;
  }catch(e){ return null; }
}
function buildGLB(json,bin){
  const enc=new TextEncoder();
  let js=enc.encode(JSON.stringify(json));
  const jpad=(4-(js.length%4))%4;
  if(jpad){ const t=new Uint8Array(js.length+jpad); t.set(js); t.fill(0x20,js.length); js=t; }
  const bpad=(4-(bin.length%4))%4;
  const bl=bin.length+bpad;
  const total=12+8+js.length+(bl?8+bl:0);
  const out=new Uint8Array(total); const dv=new DataView(out.buffer);
  dv.setUint32(0,GLB_MAGIC,true); dv.setUint32(4,2,true); dv.setUint32(8,total,true);
  dv.setUint32(12,js.length,true); dv.setUint32(16,CH_JSON,true);
  out.set(js,20);
  if(bl){ const o=20+js.length;
    dv.setUint32(o,bl,true); dv.setUint32(o+4,CH_BIN,true); out.set(bin,o+8); }
  return out.buffer;
}
function reencodeImage(bytes,mime,max,quality){
  return new Promise(res=>{
    const blob=new Blob([bytes],{type:mime||'image/png'});
    createImageBitmap(blob).then(bmp=>{
      let w=bmp.width,h=bmp.height;
      const s=Math.min(1,max/Math.max(w,h));
      w=Math.max(1,Math.round(w*s)); h=Math.max(1,Math.round(h*s));
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(bmp,0,0,w,h);
      c.toBlob(b=>{
        if(!b){ res({bytes:bytes,mime:mime}); return; }
        b.arrayBuffer().then(ab=>{
          if(ab.byteLength>=bytes.length){ res({bytes:bytes,mime:mime}); return; }
          res({bytes:new Uint8Array(ab),mime:'image/webp'});
        });
      },'image/webp',quality===undefined?.85:quality);
    }).catch(()=>res({bytes:bytes,mime:mime}));
  });
}
function testParseGLB(buf){
  return new Promise(res=>{
    if(!T.GLTFLoader) return res(false);
    try{ window.HEXCORE.gltfLoader().parse(buf.slice(0),'',()=>res(true),()=>res(false)); }
    catch(e){ res(false); }
  });
}
function optimizeGLB(buf,opt){
  const max=(opt&&opt.max)||1024, q=(opt&&opt.quality)||.85;
  const g=parseGLB(buf);
  const before=buf.byteLength;
  if(!g||!g.json.images||!g.json.images.length)
    return Promise.resolve({buf:buf,before:before,after:before,changed:false});
  const json=JSON.parse(JSON.stringify(g.json)), bin=g.bin;
  const imgs=json.images||[], bvs=json.bufferViews||[];
  const imgBV={};                              /* bufferViews owned by images */
  const jobs=imgs.map((im,i)=>{
    let bytes=null, mime=im.mimeType||'image/png';
    if(im.bufferView!==undefined&&bvs[im.bufferView]){
      const bv=bvs[im.bufferView], o=bv.byteOffset||0;
      bytes=bin.slice(o,o+bv.byteLength); imgBV[im.bufferView]=1;
    } else if(im.uri&&/^data:/.test(im.uri)){
      const parts=im.uri.split(','); const mm=parts[0].match(/data:([^;]+)/);
      if(mm) mime=mm[1];
      try{ const b=atob(parts[1]); bytes=new Uint8Array(b.length);
        for(let k=0;k<b.length;k++) bytes[k]=b.charCodeAt(k); }catch(e){}
    }
    if(!bytes) return Promise.resolve(null);
    return reencodeImage(bytes,mime,max,q).then(r=>({i:i,bytes:r.bytes,mime:r.mime}));
  });
  return Promise.all(jobs).then(results=>{
    /* rebuild the binary: every non-image bufferView first, then the new images */
    const keep=[], map={};
    const chunks=[]; let cursor=0;
    bvs.forEach((bv,i)=>{
      if(imgBV[i]) return;
      const o=bv.byteOffset||0;
      const data=bin.slice(o,o+bv.byteLength);
      const pad=(4-(cursor%4))%4; if(pad){ chunks.push(new Uint8Array(pad)); cursor+=pad; }
      const nbv={buffer:0,byteOffset:cursor,byteLength:bv.byteLength};
      if(bv.byteStride!==undefined) nbv.byteStride=bv.byteStride;
      if(bv.target!==undefined) nbv.target=bv.target;
      map[i]=keep.length; keep.push(nbv); chunks.push(data); cursor+=data.length;
    });
    let webp=false;
    results.forEach(r=>{
      if(!r) return;
      const pad=(4-(cursor%4))%4; if(pad){ chunks.push(new Uint8Array(pad)); cursor+=pad; }
      const idx=keep.length;
      keep.push({buffer:0,byteOffset:cursor,byteLength:r.bytes.length});
      chunks.push(r.bytes); cursor+=r.bytes.length;
      imgs[r.i]={bufferView:idx,mimeType:r.mime};
      if(r.mime==='image/webp') webp=true;
    });
    const nbin=new Uint8Array(cursor); let at=0;
    chunks.forEach(c=>{ nbin.set(c,at); at+=c.length; });
    json.bufferViews=keep;
    json.buffers=[{byteLength:cursor}];
    /* every remaining bufferView reference has to follow the remap */
    (json.accessors||[]).forEach(a=>{ if(a.bufferView!==undefined) a.bufferView=map[a.bufferView];
      if(a.sparse){ if(a.sparse.indices) a.sparse.indices.bufferView=map[a.sparse.indices.bufferView];
        if(a.sparse.values) a.sparse.values.bufferView=map[a.sparse.values.bufferView]; } });
    let bad=false;
    (json.accessors||[]).forEach(a=>{ if(a.bufferView===undefined&&a.bufferView!==0) return;
      if(a.bufferView===undefined) bad=true; });
    if(webp){
      const set=new Set(json.extensionsUsed||[]); set.add('EXT_texture_webp');
      json.extensionsUsed=Array.from(set);
      const req=new Set(json.extensionsRequired||[]); req.add('EXT_texture_webp');
      json.extensionsRequired=Array.from(req);
      (json.textures||[]).forEach(t=>{
        if(t.source===undefined) return;
        if((imgs[t.source]||{}).mimeType!=='image/webp') return;
        t.extensions=t.extensions||{};
        t.extensions.EXT_texture_webp={source:t.source};
        delete t.source;
      });
    }
    if(bad) return {buf:buf,before:before,after:before,changed:false};
    const out=buildGLB(json,nbin);
    return testParseGLB(out).then(ok=>ok&&out.byteLength<before
      ? {buf:out,before:before,after:out.byteLength,changed:true}
      : {buf:buf,before:before,after:before,changed:false});
  }).catch(()=>({buf:buf,before:before,after:before,changed:false}));
}




/* ================= re-open a baked room =================
   Bake is an export, not a conversion — but a baked .html is also a complete
   record of the room, so the stager can read one back in. Framing is already
   flattened into the images at that point (a baked wall is one framed picture),
   so crops come back as-is rather than re-adjustable. Everything else returns. */
function extractBake(html){
  const key='window.HEXBAKE=';
  const at=html.indexOf(key); if(at<0) return null;
  let i=html.indexOf('{',at); if(i<0) return null;
  let depth=0, inStr=false, esc=false, start=i;
  for(;i<html.length;i++){
    const c=html[i];
    if(inStr){ if(esc) esc=false; else if(c==='\\') esc=true; else if(c==='"') inStr=false; continue; }
    if(c==='"') inStr=true;
    else if(c==='{') depth++;
    else if(c==='}'){ depth--; if(!depth){ 
      try{ return JSON.parse(html.slice(start,i+1)); }catch(e){ return null; } } }
  }
  return null;
}
function assetFromDataURL(url,name){
  return fetch(url).then(r=>r.blob()).then(bl=>{
    const f=new File([bl],name,{type:bl.type||'application/octet-stream'});
    return addAsset(f);
  });
}
function importBaked(html){
  const bake=extractBake(html);
  if(!bake) return Promise.reject(new Error('no room found in that file'));
  if((bake.shape||'hex')!==RM.shape){ shapeMismatch(bake.shape||'hex'); return Promise.resolve(); }
  const look=newLook();
  look.name=(bake.name||'baked room')+' (reopened)';
  if(bake.ui) look.ui=Object.assign({game:false,timer:true,rail:true,chip:true,walk:true},bake.ui);
  if(bake.lights) look.lights=JSON.parse(JSON.stringify(bake.lights));
  if(bake.boards&&bake.boards.game) look.boards=JSON.parse(JSON.stringify(bake.boards));
  if(bake.fx&&bake.fx.on) look.fx=JSON.parse(JSON.stringify(bake.fx));
  if(bake.orbit&&bake.orbit.dur) look.orbit=Object.assign(JSON.parse(JSON.stringify(bake.orbit)),{bake:true});
  if(bake.lit) look.lit=Object.assign({surfaces:false,ambient:.85},bake.lit);
  if(bake.mood&&!ISBOX&&(!MOODSP||spaceOf(bake.mood)!==CURSP)){ const sp=spaceOf(bake.mood); if(confirm('That’s '+SPNAME[sp]+'. Switch to that builder? Then open it again there.')){
      const u=new URL(location.href); u.searchParams.set('space',sp); location.href=u.toString(); } return Promise.resolve(); }
  if(bake.mood&&MOODSP){ const mm=JSON.parse(JSON.stringify(bake.mood)); delete mm.tex; if(mm.world) delete mm.world.kittex; look.mood=Object.assign(window.HEXCORE.moodDefaults(),mm); }
  const jobs=[];
  if(look.mood&&look.mood.world&&look.mood.world.lib) look.mood.world.lib.forEach(L=>{ const src=L.asset&&bake.assets&&bake.assets[L.asset];   /* v72: map pieces come back */
    if(!src){ L.asset=null; return; } jobs.push(assetFromDataURL(src,(L.name||'piece')+'.glb').then(a=>{ L.asset=a.id; }).catch(()=>{ L.asset=null; })); });
  const ext=u=>{ const m=/^data:([^;]+)/.exec(u||''); if(!m) return 'bin';
    return ({'image/webp':'webp','image/jpeg':'jpg','image/png':'png','video/mp4':'mp4',
             'audio/mpeg':'mp3','model/gltf-binary':'glb'})[m[1]]||'bin'; };

  /* stills */
  Object.keys(bake.surfaces||{}).forEach(id=>{
    if(!SBY[id]) return;
    const t=(bake.tints||{})[id]||{};
    jobs.push(assetFromDataURL(bake.surfaces[id], id+'.'+ext(bake.surfaces[id])).then(a=>{
      look.surfaces[id]=Object.assign(defSurf(),
        {asset:a.id, tint:t.tint||'#ffffff', bright:t.bright===undefined?1:t.bright});
    }).catch(()=>{}));
  });
  /* looping surfaces */
  Object.keys(bake.videos||{}).forEach(id=>{
    if(!SBY[id]) return;
    const v=bake.videos[id];
    const base=Object.assign(defSurf(),{scale:v.scale||1,ox:v.ox||0,oy:v.oy||0,
      tint:v.tint||'#ffffff',bright:v.bright===undefined?1:v.bright});
    if(/^data:/.test(v.src||'')){
      jobs.push(assetFromDataURL(v.src,id+'.'+ext(v.src)).then(a=>{
        look.surfaces[id]=Object.assign(base,{asset:a.id}); }).catch(()=>{}));
    } else { look.surfaces[id]=Object.assign(base,{url:v.src||''}); }
  });
  /* tiles */
  Object.keys(bake.racks||{}).forEach(kind=>{
    const rack=window.HEXCORE.newRack(kind);
    if(bake.racks[kind].wall!=null) rack.wall=bake.racks[kind].wall;
    (bake.racks[kind].tiles||[]).forEach((t,i)=>{
      const dst=rack.tiles[i]; if(!dst) return;
      Object.assign(dst,{fit:t.fit||'cover',scale:t.scale||1,ox:t.ox||0,oy:t.oy||0,
        rot:t.rot||0,tint:t.tint||'#ffffff',bright:t.bright===undefined?1:t.bright,
        title:t.title||'',payload:t.payload||null});
      if(t.url&&!/^data:/.test(t.url)){ dst.url=t.url; return; }
      const src=t.asset&&bake.assets?bake.assets[t.asset]:(/^data:/.test(t.url||'')?t.url:null);
      if(!src) return;
      jobs.push(assetFromDataURL(src,kind+(i+1)+'.'+ext(src)).then(a=>{ dst.asset=a.id; }).catch(()=>{}));
    });
    look.racks[kind]=rack;
  });
  /* props */
  const propAsset={};
  (bake.props||[]).forEach(p=>{
    const c=JSON.parse(JSON.stringify(p));
    look.props.push(c);
    if(c.screen&&c.screen.clips){ const old=c.screen.clips.slice(); c.screen.clips=[]; old.forEach(k=>{ const src=bake.assets&&bake.assets[k]; if(!src) return;   /* v70 */
      jobs.push(assetFromDataURL(src,'screen-clip.'+(/^data:/.test(src)?ext(src):'mp4')).then(a=>{ c.screen.clips.push(a.id); }).catch(()=>{})); }); }
    if(c.egg) (c.egg.blocks||[]).forEach(b=>{ if(!b.asset) return; const src=bake.assets&&bake.assets[b.asset];
      if(!src){ b.asset=null; return; }
      jobs.push(assetFromDataURL(src,'egg-'+b.t+'.'+(/^data:/.test(src)?ext(src):(src.split('.').pop()||'bin'))).then(a=>{ b.asset=a.id; }).catch(()=>{ b.asset=null; })); });
    look.seq=Math.max(look.seq,(parseInt(String(p.id).replace(/\D/g,''),10)||0)+1);
    if(!p.asset||!bake.assets||!bake.assets[p.asset]) return;
    if(propAsset[p.asset]){ jobs.push(propAsset[p.asset].then(a=>{ c.asset=a.id; })); return; }
    const src=bake.assets[p.asset];
    const job=assetFromDataURL(src,(p.name||'prop')+'.'+ext(src));
    propAsset[p.asset]=job;
    jobs.push(job.then(a=>{ c.asset=a.id; }).catch(()=>{ c.asset=null; }));
  });

  /* sets behind windows */
  const setAsset={};
  (bake.sets||[]).forEach(S0=>{
    const S=JSON.parse(JSON.stringify(S0)); look.sets.push(S);
    const fix=(o,key,nm)=>{ const id=o&&o[key]; if(!id||!bake.assets||!bake.assets[id]){ if(o) o[key]=null; return; }
      const src=bake.assets[id];
      if(!setAsset[id]) setAsset[id]=assetFromDataURL(src,nm+'.'+(/^data:/.test(src)?ext(src):(src.split('.').pop()||'bin')));
      jobs.push(setAsset[id].then(a=>{ o[key]=a.id; }).catch(()=>{ o[key]=null; })); };
    fix(S.floor,'asset','set-floor'); fix(S.middle,'asset','set-middle'); fix(S.back,'asset','set-back');
    (S.models||[]).forEach(M=>fix(M,'asset','set-model'));
    eggsOf(S).forEach(E=>(E.blocks||[]).forEach(b=>{ if('asset' in b) fix(b,'asset','egg-'+b.t); }));
  });
  Object.keys(bake.windows||{}).forEach(k=>{ const w=bake.windows[k]; look.windows[k]={on:!!w.on,set:w.set||null}; if(w.cut) look.windows[k].cut=JSON.parse(JSON.stringify(w.cut)); });
  return Promise.all(jobs).then(()=>{
    look.sets.forEach(S=>{ S.models=(S.models||[]).filter(M=>M.asset);
      eggsOf(S).forEach(E=>{ E.blocks=(E.blocks||[]).filter(b=>!('asset' in b)||b.asset); }); });
    LOOK=look; if(SETEDIT) exitSetEditor(true);
    applyAllSurfaces(); buildRacks(); rebuildProps(); rebuildLights(); rebuildBoards(); rebuildWindowsNow();
    applyRoomUI(); select(null); ui(); touch();
    const n=(bake.props||[]).length;
    tip('reopened “'+(bake.name||'baked room')+'” · '+n+' prop(s) back in the room');
  });
}

/* ================= mesh decimation =================
   Texture shrinking does nothing for a 13-million-triangle sculpt. This rebuilds
   each .glb from parsed data: simplify every triangle mesh down to a budget with
   meshoptimizer, drop animation/skin/morph data a static prop never uses, cap and
   re-encode the textures, then write a fresh container. The result is test-parsed
   before it is accepted — a failure falls back to the original bytes. */
const COMP={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const NCOMP={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const NORMDIV={5120:127,5121:255,5122:32767,5123:65535};

function readAccessor(json,bin,idx){
  const acc=json.accessors&&json.accessors[idx]; if(!acc) return null;
  const n=NCOMP[acc.type]; const A=COMP[acc.componentType];
  if(!n||!A) return null;
  const isFloatOut=(acc.componentType===5126)||acc.normalized;
  const Out=isFloatOut?Float32Array:(acc.componentType===5125?Uint32Array:A);
  const out=new Out(acc.count*n);
  if(acc.bufferView===undefined) return {data:out,n:n,float:isFloatOut};
  const bv=json.bufferViews[acc.bufferView];
  const base=(bv.byteOffset||0)+(acc.byteOffset||0);
  const elem=A.BYTES_PER_ELEMENT;
  const stride=bv.byteStride||(n*elem);
  const dv=new DataView(bin.buffer,bin.byteOffset,bin.byteLength);
  const div=acc.normalized?(NORMDIV[acc.componentType]||1):1;
  for(let i=0;i<acc.count;i++){
    const o=base+i*stride;
    for(let c=0;c<n;c++){
      const at=o+c*elem; let v=0;
      switch(acc.componentType){
        case 5120: v=dv.getInt8(at); break;
        case 5121: v=dv.getUint8(at); break;
        case 5122: v=dv.getInt16(at,true); break;
        case 5123: v=dv.getUint16(at,true); break;
        case 5125: v=dv.getUint32(at,true); break;
        default:   v=dv.getFloat32(at,true);
      }
      out[i*n+c]=acc.normalized?Math.max(-1,v/div):v;
    }
  }
  return {data:out,n:n,float:isFloatOut};
}

function crunchGLB(buf,opt){
  const maxTex=(opt&&opt.maxTex)||1024;
  const target=(opt&&opt.targetTris)||0;      /* 0 = leave geometry alone */
  const before=buf.byteLength;
  const fail=()=>({buf:buf,before:before,after:before,changed:false,tris:0,trisAfter:0});
  const g=parseGLB(buf); if(!g) return Promise.resolve(fail());
  const src=g.json; let bin=g.bin;
  const isPacked=(src.extensionsUsed||[]).indexOf('EXT_meshopt_compression')>=0;
  const ready=Promise.all([(target&&window.MeshoptSimplifier)?window.MeshoptSimplifier.ready:0,
    (isPacked&&window.MeshoptDecoder)?window.MeshoptDecoder.ready:0, window.MeshoptEncoder?window.MeshoptEncoder.ready:0]);

  return ready.then(()=>{
    /* v67: a compressed (meshopt) model is unpacked first — every packed bufferView is decoded into a plain copy */
    if(isPacked){ if(!window.MeshoptDecoder) throw new Error('no decoder');
      const extra=[]; let len=bin.byteLength;
      src.bufferViews=(src.bufferViews||[]).map(bv=>{ const X=bv.extensions&&bv.extensions.EXT_meshopt_compression; if(!X) return bv;
        if((X.buffer||0)!==0) throw new Error('packed data outside the GLB');
        const out=new Uint8Array(X.count*X.byteStride), srcB=new Uint8Array(bin.buffer, bin.byteOffset+(X.byteOffset||0), X.byteLength);
        window.MeshoptDecoder.decodeGltfBuffer(out, X.count, X.byteStride, srcB, X.mode, X.filter||'NONE');
        const pad=(4-(len%4))%4; len+=pad; const nb={buffer:0, byteOffset:len, byteLength:out.byteLength}; if(bv.byteStride) nb.byteStride=bv.byteStride; if(bv.target) nb.target=bv.target;
        extra.push([len,out]); len+=out.byteLength; return nb; });
      const nbin=new Uint8Array(len); nbin.set(bin,0); extra.forEach(([o,a])=>nbin.set(a,o)); bin=nbin; }
    /* ---- pull every primitive apart ---- */
    const prims=[]; let tris=0;
    (src.meshes||[]).forEach((mesh,mi)=>{
      (mesh.primitives||[]).forEach((pr,pi)=>{
        const mode=pr.mode===undefined?4:pr.mode;
        const attrs={}; let count=0, ok=true;
        Object.keys(pr.attributes||{}).forEach(k=>{
          if(/^(JOINTS|WEIGHTS)_/.test(k)) return;          /* static props don't skin */
          const r=readAccessor(src,bin,pr.attributes[k]);
          if(!r){ ok=false; return; }
          attrs[k]=r; count=r.data.length/r.n;
        });
        if(!ok||!attrs.POSITION){ prims.push(null); return; }
        let idx;
        if(pr.indices!==undefined){
          const r=readAccessor(src,bin,pr.indices);
          if(!r){ prims.push(null); return; }
          idx=r.data instanceof Uint32Array?r.data:new Uint32Array(r.data);
        } else {
          idx=new Uint32Array(count); for(let i=0;i<count;i++) idx[i]=i;
        }
        if(mode===4) tris+=idx.length/3;
        prims.push({mi:mi,pi:pi,mode:mode,attrs:attrs,idx:idx,count:count,material:pr.material});
      });
    });

    /* ---- simplify to the budget ---- */
    let trisAfter=tris;
    if(target&&tris>target&&window.MeshoptSimplifier){
      const ratio=Math.max(.004,target/tris);
      trisAfter=0;
      prims.forEach(p=>{
        if(!p||p.mode!==4) { if(p&&p.mode===4) trisAfter+=p.idx.length/3; return; }
        const pos=p.attrs.POSITION.data;
        let want=Math.floor((p.idx.length*ratio)/3)*3;
        want=Math.max(3,Math.min(p.idx.length,want));
        try{
          const res=window.MeshoptSimplifier.simplify(p.idx,pos,3,want,.05,['LockBorder']);
          const ni=res[0];
          const compact=new Uint32Array(ni);
          const rm=window.MeshoptSimplifier.compactMesh(compact);
          const remap=rm[0], unique=rm[1];
          Object.keys(p.attrs).forEach(k=>{
            const a=p.attrs[k], n=a.n;
            const out=new a.data.constructor(unique*n);
            for(let i=0;i<p.count;i++){
              const to=remap[i];
              if(to===0xffffffff||to>=unique) continue;
              for(let c=0;c<n;c++) out[to*n+c]=a.data[i*n+c];
            }
            a.data=out;
          });
          p.idx=compact; p.count=unique;
        }catch(e){}
        trisAfter+=p.idx.length/3;
      });
    }

    /* ---- textures ---- */
    const imgs=(src.images||[]).slice();
    const imgJobs=imgs.map(im=>{
      let bytes=null, mime=im.mimeType||'image/png';
      if(im.bufferView!==undefined&&src.bufferViews[im.bufferView]){
        const bv=src.bufferViews[im.bufferView], o=bv.byteOffset||0;
        bytes=bin.slice(o,o+bv.byteLength);
      } else if(im.uri&&/^data:/.test(im.uri)){
        const parts=im.uri.split(','); const mm=parts[0].match(/data:([^;]+)/);
        if(mm) mime=mm[1];
        try{ const b=atob(parts[1]); bytes=new Uint8Array(b.length);
          for(let k=0;k<b.length;k++) bytes[k]=b.charCodeAt(k); }catch(e){}
      }
      if(!bytes) return Promise.resolve(null);
      return reencodeImage(bytes,mime,maxTex,.85);
    });

    return Promise.all(imgJobs).then(images=>{
      /* ---- write a brand-new container ---- */
      const json={asset:{version:'2.0',generator:'THE HEX stager'},
        scene:src.scene||0, scenes:JSON.parse(JSON.stringify(src.scenes||[{nodes:[0]}])),
        nodes:(src.nodes||[]).map(n=>{ const c=Object.assign({},n);
          delete c.skin; delete c.camera; delete c.weights; return c; }),
        materials:JSON.parse(JSON.stringify(src.materials||[])),
        textures:JSON.parse(JSON.stringify(src.textures||[])),
        samplers:JSON.parse(JSON.stringify(src.samplers||[])),
        images:[], meshes:[], accessors:[], bufferViews:[], buffers:[]};
      const NOEXT=['EXT_meshopt_compression','KHR_mesh_quantization'];                /* we write plain floats, then pack them ourselves */
      if(src.extensionsUsed) json.extensionsUsed=src.extensionsUsed.filter(e=>NOEXT.indexOf(e)<0);
      if(src.extensionsRequired) json.extensionsRequired=src.extensionsRequired.filter(e=>NOEXT.indexOf(e)<0);
      const ENC=window.MeshoptEncoder&&window.MeshoptEncoder.supported?window.MeshoptEncoder:null;
      let fbCursor=0; const fb=[];                                                     /* v67: packed views point here (a data-less fallback buffer) */

      const chunks=[]; let cursor=0;
      const pushBV=(bytes,target)=>{
        const pad=(4-(cursor%4))%4; if(pad){ chunks.push(new Uint8Array(pad)); cursor+=pad; }
        const bv={buffer:0,byteOffset:cursor,byteLength:bytes.byteLength};
        if(target) bv.target=target;
        json.bufferViews.push(bv); chunks.push(new Uint8Array(bytes.buffer||bytes,bytes.byteOffset||0,bytes.byteLength));
        cursor+=bytes.byteLength;
        return json.bufferViews.length-1;
      };
      /* v67: lossless meshopt packing — the geometry comes back bit-for-bit */
      const pushPacked=(arr,count,stride,mode,target)=>{
        const raw=new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength);
        let enc=null; try{ enc=ENC.encodeGltfBuffer(raw,count,stride,mode); }catch(e){ enc=null; }
        if(!enc||enc.byteLength>=raw.byteLength) return null;                              /* not worth it — keep it plain */
        const pad=(4-(cursor%4))%4; if(pad){ chunks.push(new Uint8Array(pad)); cursor+=pad; }
        const fpad=(4-(fbCursor%4))%4; fbCursor+=fpad;
        const bv={buffer:1,byteOffset:fbCursor,byteLength:raw.byteLength,
          extensions:{EXT_meshopt_compression:{buffer:0,byteOffset:cursor,byteLength:enc.byteLength,byteStride:stride,count:count,mode:mode}}};
        if(mode==='ATTRIBUTES') bv.byteStride=stride; if(target) bv.target=target;
        json.bufferViews.push(bv); chunks.push(enc); cursor+=enc.byteLength; fbCursor+=raw.byteLength; fb.push(1);
        return json.bufferViews.length-1; };
      const pushAcc=(arr,type,compType,target,mm,mode)=>{
        const n=NCOMP[type], el=arr.BYTES_PER_ELEMENT, cnt=arr.length/n;
        let bv=null;
        if(ENC&&mode==='ATTRIBUTES'&&(n*el)%4===0&&n*el<=256) bv=pushPacked(arr,cnt,n*el,'ATTRIBUTES',target);
        else if(ENC&&mode==='TRIANGLES'&&arr.length%3===0) bv=pushPacked(arr,arr.length,el,'TRIANGLES',target);
        else if(ENC&&mode==='INDICES') bv=pushPacked(arr,arr.length,el,'INDICES',target);
        if(bv==null) bv=pushBV(arr,target);
        const acc={bufferView:bv,componentType:compType,count:arr.length/NCOMP[type],type:type};
        if(mm){ acc.min=mm[0]; acc.max=mm[1]; }
        json.accessors.push(acc); return json.accessors.length-1;
      };

      /* meshes */
      const byMesh={};
      prims.forEach((p,i)=>{
        if(!p) return;
        (byMesh[p.mi]=byMesh[p.mi]||[]).push(p);
      });
      const meshMap={};
      Object.keys(byMesh).forEach(mi=>{
        const list=byMesh[mi], out={primitives:[]};
        list.forEach(p=>{
          const a={attributes:{}};
          Object.keys(p.attrs).forEach(k=>{
            const at=p.attrs[k];
            const type=at.n===1?'SCALAR':(at.n===2?'VEC2':(at.n===3?'VEC3':'VEC4'));
            let mm=null;
            if(k==='POSITION'){
              const mn=[1e30,1e30,1e30], mx=[-1e30,-1e30,-1e30];
              for(let i=0;i<p.count;i++) for(let c=0;c<3;c++){
                const v=at.data[i*3+c]; if(v<mn[c])mn[c]=v; if(v>mx[c])mx[c]=v; }
              mm=[mn,mx];
            }
            const arr=at.data instanceof Float32Array?at.data:new Float32Array(at.data);
            a.attributes[k]=pushAcc(arr,type,5126,34962,mm,'ATTRIBUTES');
          });
          const big=p.count>65535;
          const iarr=big?new Uint32Array(p.idx):new Uint16Array(p.idx);
          a.indices=pushAcc(iarr,'SCALAR',big?5125:5123,34963,null,p.mode===4?'TRIANGLES':'INDICES');
          if(p.material!==undefined) a.material=p.material;
          if(p.mode!==4) a.mode=p.mode;
          out.primitives.push(a);
        });
        meshMap[mi]=json.meshes.length; json.meshes.push(out);
      });
      json.nodes.forEach(n=>{ if(n.mesh!==undefined) n.mesh=meshMap[n.mesh]; });
      json.nodes.forEach(n=>{ if(n.mesh===undefined) return;
        if(json.meshes[n.mesh]===undefined) delete n.mesh; });

      /* images */
      let webp=false;
      images.forEach((r,i)=>{
        if(!r){ json.images.push({uri:''}); return; }
        const bv=pushBV(r.bytes);
        json.images.push({bufferView:bv,mimeType:r.mime});
        if(r.mime==='image/webp') webp=true;
      });
      if(webp){
        const u=new Set(json.extensionsUsed||[]); u.add('EXT_texture_webp'); json.extensionsUsed=Array.from(u);
        const q=new Set(json.extensionsRequired||[]); q.add('EXT_texture_webp'); json.extensionsRequired=Array.from(q);
        (json.textures||[]).forEach(t=>{
          if(t.source===undefined) return;
          if((json.images[t.source]||{}).mimeType!=='image/webp') return;
          t.extensions=t.extensions||{};
          t.extensions.EXT_texture_webp={source:t.source};
          delete t.source;
        });
      }
      if(!json.images.length) delete json.images;
      if(!json.textures.length) delete json.textures;
      if(!json.samplers.length) delete json.samplers;
      if(!json.materials.length) delete json.materials;

      const nbin=new Uint8Array(cursor); let at=0;
      chunks.forEach(c=>{ nbin.set(c,at); at+=c.length; });
      json.buffers=[{byteLength:cursor}];
      if(fb.length){ json.buffers.push({byteLength:Math.max(4,fbCursor+((4-(fbCursor%4))%4)),extensions:{EXT_meshopt_compression:{fallback:true}}});
        const u=new Set(json.extensionsUsed||[]); u.add('EXT_meshopt_compression'); json.extensionsUsed=Array.from(u);
        const q=new Set(json.extensionsRequired||[]); q.add('EXT_meshopt_compression'); json.extensionsRequired=Array.from(q); }

      const out=buildGLB(json,nbin);
      return testParseGLB(out).then(ok=>{
        if(!ok) return fail();
        return {buf:out,before:before,after:out.byteLength,changed:true,
                tris:Math.round(tris),trisAfter:Math.round(trisAfter)};
      });
    });
  }).catch(()=>fail());
}

/* ================= weight + performance =================
   Two different questions: how heavy is the download (size), and why is the
   room stuttering (frame budget). The HUD answers the second continuously and
   the measure button answers the first on demand. */
let LASTMEASURE=null;
function bakeCfg(){
  if(!LOOK.bake) LOOK.bake={optimize:true,maxTex:1024,targetTris:60000};
  if(LOOK.bake.targetTris===undefined) LOOK.bake.targetTris=60000;
  if(!LOOK.ui) LOOK.ui={game:false,timer:true,rail:true,chip:true,walk:true,drive:'auto'};
  if(!LOOK.ui.drive) LOOK.ui.drive='auto';
  return LOOK.bake;
}
function shellBytes(){
  let n=document.documentElement.outerHTML.length;
  document.querySelectorAll('[data-stage]').forEach(x=>{ n-=x.outerHTML.length; });
  return Math.max(0,n);
}
function abToDataURL(ab,mime){
  const u=new Uint8Array(ab); let s=''; const CH=0x8000;
  for(let i=0;i<u.length;i+=CH) s+=String.fromCharCode.apply(null,u.subarray(i,i+CH));
  return 'data:'+mime+';base64,'+btoa(s);
}
const MB=b=>(b/1048576).toFixed(2)+' MB';

/* optimised bytes for one prop model, cached so measure and bake agree */
const GLBCACHE={};
function propBytes(a,cfg){
  if(a.k!=='glb'||!cfg.optimize) return Promise.resolve({data:null,size:Math.round(a.blob.size*1.34)});
  const key=a.id+':'+cfg.maxTex+':'+cfg.targetTris;
  if(GLBCACHE[key]) return Promise.resolve(GLBCACHE[key]);
  return a.blob.arrayBuffer()
    .then(ab=>crunchGLB(ab,{maxTex:cfg.maxTex,targetTris:cfg.targetTris}))
    .then(r=>{
      const rec={data:abToDataURL(r.buf,'model/gltf-binary'),size:Math.round(r.after*1.34),
        before:r.before,after:r.after,name:a.name,tris:r.tris,trisAfter:r.trisAfter};
      GLBCACHE[key]=rec; return rec;
    });
}

function measureSize(){
  const cfg=bakeCfg();
  const out={shell:shellBytes(),walls:0,tiles:0,props:0,clips:0,song:0,saved:[]};
  const jobs=[];
  SURF.forEach(d=>{
    const st=LOOK.surfaces[d.id]; if(!st) return;
    const a=st.asset?ASSETS[st.asset]:null;
    if(CANMOVE(d.kind)&&((a&&a.k==='video')||st.url)){
      if(!st.url&&a) out.clips+=Math.round(a.blob.size*1.34);
      return;
    }
    if(d.kind==='song'){ if(a&&!st.url) out.song+=Math.round(a.blob.size*1.34); return; }
    if(!a) return;
    jobs.push(bakedSurface(d).then(u=>{ if(u) out.walls+=u.length; }));
  });
  Object.keys(LOOK.racks||{}).forEach(kind=>{
    LOOK.racks[kind].tiles.forEach((t,i)=>{
      if(!t.asset&&!t.url) return;
      if(kind==='video'){ if(!t.url&&t.asset&&ASSETS[t.asset])
        out.clips+=Math.round(ASSETS[t.asset].blob.size*1.34); return; }
      jobs.push(bakedTile(kind,i).then(r=>{ if(r&&r.data) out.tiles+=r.data.length; }));
    });
  });
  const seen={};
  LOOK.props.forEach(p=>{
    if(!p.asset||seen[p.asset]||!ASSETS[p.asset]) return;
    seen[p.asset]=1;
    const a=ASSETS[p.asset];
    jobs.push(propBytes(a,cfg).then(r=>{ out.props+=r.size;
      if(r.tris){ out.tris=(out.tris||0)+r.tris; out.trisAfter=(out.trisAfter||0)+r.trisAfter; }
      if(r.before&&r.after<r.before) out.saved.push({name:r.name,before:r.before,after:r.after}); }));
  });
  return Promise.all(jobs).then(()=>{
    out.total=out.shell+out.walls+out.tiles+out.props+out.clips+out.song;
    LASTMEASURE=out; return out;
  });
}

/* the always-on HUD */
function statsBoot(){
  const hud=el('div'); hud.id='stgStats'; document.body.appendChild(hud);
  hud.addEventListener('click',e=>{
    if(e.target&&e.target.id==='stgMeasure'){
      hud.dataset.busy='1';
      measureSize().then(()=>{ hud.dataset.busy=''; ui(); });
    }
  });
  let frames=0,t0=performance.now(),fps=60,n=0;
  const vidList=window.HEXCORE.allVideos(()=>RACKS);
  HEX.onFrame.push(()=>{
    frames++; const now=performance.now();
    if(now-t0>500){ fps=frames*1000/(now-t0); frames=0; t0=now; }
    if((n++%20)!==0) return;
    const info=HEX.renderer.info, vids=vidList();
    let playing=0; vids.forEach(v=>{ if(v.video&&!v.video.paused) playing++; });
    const cls=fps<35?'bad':(fps<52?'warn':'ok');
    hud.innerHTML=
      '<span class="'+cls+'">'+Math.round(fps)+' fps</span>'+
      '<span>'+info.render.calls+' draws</span>'+
      '<span>'+Math.round(info.render.triangles/1000)+'k tris</span>'+
      '<span>'+info.memory.textures+' tex</span>'+
      '<span'+(playing>3?' class="warn"':'')+'>'+playing+'/'+vids.length+' clips</span>'+
      (LASTMEASURE?'<span class="sz">'+MB(LASTMEASURE.total)+'</span>':'')+
      '<button id="stgMeasure">'+(hud.dataset.busy?'…':'measure')+'</button>';
  });
}

/* ================= demo from the door =================
   Puts the room back on its entry screen with the panel, handles and HUD out of
   sight, so Adam can walk an artist in from the landing page. Tapping ENTER runs
   the room's own handler, which starts the song. Esc brings staging back. */
let DEMO=false;
function demoMode(on){
  DEMO=!!on;
  document.body.classList.toggle('demoing',DEMO);
  if(DEMO){
    select(null);
    /* the entrance is the real experience — visuals follow the song, whatever the
       editor was last left on */
    if(HEX.setDrive) HEX.setDrive('auto');
    if(LOOK.ui) LOOK.ui.drive='auto';        /* sticks, so coming back out stays reactive */
    window.HEXCORE.showWallTags(false);
    PANEL.classList.remove('open');
    document.body.classList.remove('staging');
    window.HEXCORE.EDIT=false;
    (LOOK.lights||[]).forEach(L=>window.HEXCORE.applyLight(L,LOBJ[L.id]));
    HEX.showPanel(LOOK.ui&&LOOK.ui.game!==false);
    if(HEX.showSplash) HEX.showSplash();
    tip('demo mode — tap to enter · Esc to come back');
  } else {
    document.body.classList.add('staging');
    window.HEXCORE.EDIT=litCfg().handles!==false;
    (LOOK.lights||[]).forEach(L=>window.HEXCORE.applyLight(L,LOBJ[L.id]));
    HEX.quietEnter(); applyPanel(); applyRoomUI();
    window.HEXCORE.showWallTags(litCfg().handles!==false);
    PANEL.classList.add('open');
    ui();
  }
}

/* ================= fan preview ================= */
function fanPreview(force){
  FAN=(force===undefined)?!FAN:force;
  document.body.classList.toggle('staging',!FAN);
  PANEL.classList.toggle('open',!FAN);
  document.getElementById('stgBtn').textContent=FAN?'back to staging':'stage';
  syncAdd();
  if(FAN){ window.HEXCORE.EDIT=false;
    window.HEXCORE.showWallTags(false);
    (LOOK.lights||[]).forEach(L=>window.HEXCORE.applyLight(L,LOBJ[L.id]));
    select(null); HEX.showPanel(true); HEX.setPanel(1);
    if(!fanPreview._ran){ fanPreview._ran=true; HEX.enterRoom(); } }
  else { window.HEXCORE.EDIT=litCfg().handles!==false;
    window.HEXCORE.showWallTags(litCfg().handles!==false);
    (LOOK.lights||[]).forEach(L=>window.HEXCORE.applyLight(L,LOBJ[L.id]));
    applyPanel(); }
}

/* ================= boot ================= */
function boot(){
  document.body.classList.add('staging');
  const btn=el('button','','stage'); btn.id='stgBtn';
  btn.onclick=()=>{ if(DEMO) return demoMode(false);
    if(FAN) return fanPreview(false); PANEL.classList.toggle('open'); };
  document.body.appendChild(btn);

  PANEL=el('div'); PANEL.id='stg'; PANEL.className='open';
  try{ new MutationObserver(syncWallTags).observe(PANEL,{attributes:true,attributeFilter:['class']}); }catch(e){}
  /* Adam's local file keeps its old name; the builder builds say which builder they are */
  const title=(!BUILDER&&!ISBOX)?'The Hex · staging':(SPACENAME+' · builder');
  const h=el('header','', '<b id="stgTitle">'+title+'</b>');
  if(BUILDER&&BUILDER.space==='admin'){
    const sw=el('button','','switch'); sw.title='Event Space ⇄ Room Space';
    sw.onclick=()=>{ put('kv',AUTOKEY,serialize()).catch(()=>{}).then(()=>{
      const u=new URL(location.href); u.searchParams.delete('space'); location.href=u.toString(); }); };
    h.appendChild(sw);
  }
  const hide=el('button','','hide'); hide.onclick=()=>PANEL.classList.remove('open');
  h.appendChild(hide);
  if(BUILDER&&BUILDER.space==='admin'&&!Q.has('space')) showGate();
  BODY=el('div'); BODY.id='stgBody';
  PANEL.appendChild(h); PANEL.appendChild(BODY); document.body.appendChild(PANEL);
  railBoot();

  const dz=el('div','','<div>drop it in</div>'); dz.id='stgDrop'; document.body.appendChild(dz);
  TIP=el('div'); TIP.id='stgTip'; document.body.appendChild(TIP);

  /* ---- navigation: the same rig a baked room gets ---- */
  window.HEXCORE.EDIT=true;
  NAVS=window.HEXCORE.navBoot(HEX);
  const modeB=el('button','','look around'); modeB.id='stgMode';
  modeB.onclick=()=>setMode(VIEW.mode==='edit'?'look':'edit');
  NAVS.el.insertBefore(modeB, NAVS.el.firstChild);
  NAV=NAVS.el;
  orbitBoot();                       /* the 360 button, and its frame handler */

  const addBtn=el('button','','＋ add art'); addBtn.id='stgAdd';
  addBtn.onclick=()=>{ const sid=addBtn.dataset.slot; if(!sid) return;
    let acc='image/*';
    if(sid.indexOf('T:')===0) acc=(sid.split(':')[1]==='video')?'video/*':'image/*';
    else if(SBY[sid]&&SBY[sid].kind==='song') acc='audio/*';
    else if(SBY[sid]&&CANMOVE(SBY[sid].kind)) acc='image/*,video/*';
    pick(acc,fs=>takeFiles(fs,{slot:sid})); };
  document.body.appendChild(addBtn);

  /* global drag & drop */
  let dcount=0;
  addEventListener('dragenter',e=>{ e.preventDefault(); dcount++; dz.classList.add('on'); });
  addEventListener('dragover',e=>{ e.preventDefault(); e.dataTransfer.dropEffect='copy'; });
  addEventListener('dragleave',e=>{ if(--dcount<=0){ dcount=0; dz.classList.remove('on'); } });
  addEventListener('drop',e=>{ e.preventDefault(); dcount=0; hideDrop();
    takeFiles(e.dataTransfer.files,{pt:{x:e.clientX,y:e.clientY}}); });

  /* capture-phase so the room's look-drag never starts on a prop */
  HEX.canvas.addEventListener('pointerdown',cutDown,true);
  HEX.canvas.addEventListener('pointerdown',onDown,true);
  HEX.canvas.addEventListener('touchstart',e=>{ if(FAN) return;
    const t=e.touches[0]; const hp=pickProp(t.clientX,t.clientY);
    if(hp){ e.stopPropagation(); select(hp.id); beginDrag(hp.id,t.clientX,t.clientY,false); } },true);
  addEventListener('touchmove',e=>{ if(DRAG&&e.touches[0]) moveDrag(e.touches[0].clientX,e.touches[0].clientY); },{passive:true});
  addEventListener('touchend',()=>{ if(DRAG){ DRAG=null; ui(); } });

  /* keep the camera where staging wants it, and the outline glued on */


  HEX.onFrame.push(window.HEXCORE.videoCuller(HEX, window.HEXCORE.allVideos(()=>RACKS)));
  statsBoot();
  HEX.onBoard=function(rows,over){ BOARDROWS=rows||[]; BOARDOVER=!!over; redrawBoards(); };
  HEX.onLine=function(lines){ BOARDLINES=lines||[]; redrawBoards(); };
  HEX.onFrame.push(window.HEXCORE.lightPulser(HEX,
    ()=>(LOOK&&LOOK.lights?LOOK.lights.map(L=>({L:L,g:LOBJ[L.id]})):[])));
  HEX.onFrame.push(refreshSel);
  LOOK=newLook();
  HEX.quietEnter(); applyPanel(); setMode('look'); applyRoomUI();
  const fresh=()=>{ applyAllSurfaces(); buildRacks(); rebuildLights(); rebuildBoards(); ui(); };
  get('kv',AUTOKEY).then(m=>{
    if(m&&(Object.keys(m.surfaces||{}).length||(m.props||[]).length||m.racks)) return hydrateFrom(m);
    fresh(); }).catch(fresh);
  setTimeout(()=>tip('joystick: up/down walks, left/right turns · click a wall or tile, then “add”'),900);
}
function hideDrop(){ const d=document.getElementById('stgDrop'); if(d) d.classList.remove('on'); }

/* ---- admin builder: pick a builder before anything else ---- */
function showGate(){
  const g=el('div'); g.id='hexGate';
  const hexSvg='<svg viewBox="0 0 100 100"><polygon points="50,6 88,28 88,72 50,94 12,72 12,28"/></svg>';
  const boxSvg='<svg viewBox="0 0 100 100"><rect x="18" y="10" width="64" height="80" rx="2"/></svg>';
  const moodSvg='<svg viewBox="0 0 100 100"><polygon points="50,6 88,28 88,72 50,94 12,72 12,28"/>'+
    '<polygon class="in" points="50,30 69,41 69,59 50,70 31,59 31,41"/></svg>';
  const worldSvg='<svg viewBox="0 0 100 100"><polygon points="50,22 92,46 50,70 8,46"/><path d="M36 40 v-12 h10 v18 M56 44 v-20 h8 v24"/><circle cx="72" cy="52" r="2.5"/></svg>';
  const openSvg='<svg viewBox="0 0 100 100"><polygon points="50,34 84,48 50,62 16,48"/><path d="M16 48 L50 90 L84 48"/><circle cx="22" cy="14" r="2"/><circle cx="78" cy="20" r="2"/><circle cx="60" cy="8" r="2"/></svg>';
  g.innerHTML='<div class="gIn"><b class="gK">TRIO · BUILDER</b><h2>What are you building?</h2>'+
    '<div class="gRow">'+
    '<button data-s="event">'+hexSvg+'<b>EVENT SPACE</b>'+
      '<span>The hexagon. Six walls, banners, the game wall and the live boards.</span></button>'+
    '<button data-s="room">'+boxSvg+'<b>ROOM SPACE</b>'+
      '<span>Four walls. The website room — art, props, lights, photos and video.</span></button>'+
    '<button data-s="mood" class="gMood">'+moodSvg+'<b>MOOD ROOM</b>'+
      '<span>The Mood Lab room. Dark, real textures, uplights and a halo — with everything the builder already does.</span></button>'+
    '<button data-s="open" class="gMood">'+openSvg+'<b>OPEN SPACE</b>'+
      '<span>The Mood Room on a floating platform in the night sky. Invisible walls — everything you hang floats.</span></button>'+
    '<button data-s="world" class="gMood">'+worldSvg+'<b>WORLD</b>'+
      '<span>A big piece of land — 128 m × 128 m. Buildings, doors into your rooms, lights and the map.</span><i>NEW</i></button>'+
    '</div><p>Each builder keeps its own saved looks. Switch any time from the panel header.</p></div>';
  g.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    const u=new URL(location.href); u.searchParams.set('space',b.dataset.s); location.href=u.toString(); });
  document.body.appendChild(g);
}

let MODE='surface';
if(document.readyState==='complete'||document.readyState==='interactive') boot();
else addEventListener('DOMContentLoaded',boot);
})();

