/* ================= ADD-ON · CARVED LINE (v63) =================
   A channel carved round the walls with a neon line inside it. The room's shape never changes:
   each wall gets a thin "band" skin (a child of the wall, wearing the wall's own material — same texture,
   colour, art, window holes) that bulges into a soft roll above the line, dips into the channel, and
   lies flat again at its edges and at the corners. Cfg (M.addons.carved):
   {on, height 0..1, wave 0..1, depth 0..1, neon '#rrggbb', glow 0..1, music 'still'|'pulses'}
   A baked room only carries this file when the add-on is on. */
(function(){
  const CORE=window.HEXCORE; if(!CORE) return;
  CORE.ADDONS=CORE.ADDONS||{};
  const D={on:false, height:.48, wave:.55, depth:.6, neon:'#ffffff', glow:.7, music:'pulses'};
  const TAU=Math.PI*2;
  const sm=x=>{ x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
  function crestFn(c, WH){
    const base=.25*WH+(+c.height)*.5*WH, amp=(+c.wave)*1.1;
    return th=>Math.max(.55, Math.min(WH-.75, base+amp*(.7*Math.sin(2*th+.6)+.3*Math.sin(3*th+1.7)))); }
  function profile(g, R){                         /* how far the skin stands out of the wall at height g above the line */
    const roll=R*Math.exp(-Math.pow((g-.55)*1.5,2)), lip=.12*Math.exp(-Math.pow((g+.22)*5,2));
    const p=roll+lip; return p-p*.88*Math.exp(-Math.pow(g*6,2)); }
  function remove(H){ const X=H&&H._carved; if(!X) return;
    X.parts.forEach(o=>{ if(o.parent) o.parent.remove(o); if(o.geometry) o.geometry.dispose(); });
    X.mats.forEach(m=>m.dispose()); X.lights.forEach(l=>{ if(l.parent) l.parent.remove(l); });
    if(X.tick&&H.onFrame){ const i=H.onFrame.indexOf(X.tick); if(i>=0) H.onFrame.splice(i,1); }
    (X.hung||[]).forEach(o=>{ const u=o.userData; if(u._cvP&&o.position.distanceToSquared(u._cvP)<1e-8) o.position.copy(u._cvB); u._cvP=u._cvB=null; });
    X.dead=true; H._carved=null; }
  /* v63.2 · pictures hang OVER the carve: anything hung on a carved wall (photo / video tiles, posters, boards,
     models, eggs…) floats out just far enough to sit in front of it. The thing's own spot is kept, so moving it
     in the builder still works, and switching the add-on off puts everything back. */
  const BOX=new THREE.Box3(), VA=new THREE.Vector3(), VB=new THREE.Vector3(), NRM=new THREE.Vector3();
  function hang(H, X){
    const skip=new Set([].concat(H.walls||[], H.floor?[H.floor]:[]));
    (H.scene.children||[]).forEach(o=>{
      if(skip.has(o)||o.isLight||o.isCamera||!o.visible||(o.userData&&o.userData.moodCeil)) return;
      const u=o.userData;
      if(u.isSet||u.cutFrame||u.beams){ if(u._cvP){ o.position.copy(u._cvB); u._cvP=null; } return; }   /* v66.1: sets live behind the wall; frames stay on it */
      if(!(u._cvP&&o.position.distanceToSquared(u._cvP)<1e-8)){ u._cvB=o.position.clone(); u._cvP=null; }   /* moved by its owner: that's its spot now */
      const base=u._cvB;
      let best=null;
      X.walls.forEach(W=>{ VA.copy(base); W.w.worldToLocal(VA); if(Math.abs(VA.x)<=W.L/2+.2&&VA.z>-.05&&VA.z<.9&&(!best||VA.z<best.z)) best={W, z:VA.z}; });
      let push=0;
      if(best){ /* v69.1: measure the thing in the WALL's own frame (a world box round a turned panel is far too deep → boards flew 3 m out) */
        const W=best.W, keep=o.position.clone(); o.position.copy(base); o.updateMatrixWorld(true);
        let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,zb=1e9, any=false;
        o.traverse(m=>{ if(!m.isMesh||!m.geometry||m.visible===false) return; if(!m.geometry.boundingBox) m.geometry.computeBoundingBox(); const gb=m.geometry.boundingBox; if(!gb||gb.isEmpty()) return;
          for(let i=0;i<8;i++){ VA.set(i&1?gb.max.x:gb.min.x, i&2?gb.max.y:gb.min.y, i&4?gb.max.z:gb.min.z).applyMatrix4(m.matrixWorld);
            const wy=VA.y; W.w.worldToLocal(VA); any=true; x0=Math.min(x0,VA.x); x1=Math.max(x1,VA.x); y0=Math.min(y0,wy); y1=Math.max(y1,wy); zb=Math.min(zb,VA.z); } });
        o.position.copy(keep); o.updateMatrixWorld(true);
        if(any){ let pm=0; for(let a=0;a<=6;a++) for(let b=0;b<=6;b++) pm=Math.max(pm, W.prot(x0+(x1-x0)*a/6, y0+(y1-y0)*b/6));
          push=Math.max(0, pm+.03-zb); } }
      if(push>1e-3){ best.W.w.getWorldDirection(NRM); o.position.copy(base).addScaledVector(NRM,push); u._cvP=o.position.clone(); X.hung.add(o); }
      else if(u._cvP){ o.position.copy(base); u._cvP=null; }
    }); }
  function apply(H, cfg){
    const c=Object.assign({}, D, cfg||{});
    const S=H._mood; if(!S||!H.walls||!H.walls.length||(S.open&&S.open.on)){ remove(H); return; }   /* Open Space: no walls to carve */
    const key=JSON.stringify([c.height,c.wave,c.depth,c.neon,c.glow,c.music,H.walls.length,CORE.CUTVER||0]);
    if(H._carved&&H._carved.key===key) return;
    remove(H);
    const WH=H.WALL_H||4.6, crest=crestFn(c,WH), R=.1+(+c.depth)*.6;
    const X=H._carved={key, parts:[], mats:[], lights:[], tubes:[], c, walls:[], hung:new Set(), cutVer:CORE.CUTVER||0, cfg, M:arguments[2]};
    const neon=new THREE.Color(c.neon||'#ffffff');
    const core=new THREE.MeshBasicMaterial({color:neon.clone().multiplyScalar(1+1.1*c.glow), toneMapped:false});
    const halo1=new THREE.MeshBasicMaterial({color:neon, transparent:true, opacity:.25*c.glow, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false});
    const halo2=new THREE.MeshBasicMaterial({color:neon, transparent:true, opacity:.07*c.glow, blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false});
    X.mats.push(core,halo1,halo2); X.glowMats=[core,halo1,halo2];
    const v=new THREE.Vector3();
    H.walls.forEach(w=>{
      const P=w.geometry&&w.geometry.parameters; if(!P) return;
      const L=P.width, NX=Math.max(40,Math.round(L*16)), NY=60;
      w.updateMatrixWorld(true);
      const thAt=x=>{ v.set(x,0,0); w.localToWorld(v); return Math.atan2(v.z,v.x); };
      /* band height: from just under the lowest point of the line to well over its highest */
      let lo=1e9, hi=-1e9; for(let k=0;k<=NX;k++){ const y=crest(thAt(-L/2+L*k/NX)); lo=Math.min(lo,y); hi=Math.max(hi,y); }
      const y0=Math.max(.02,lo-.7), y1=Math.min(WH-.02,hi+2.1);
      /* v66.1: the neon doesn't cross a window opening (a closed window keeps it until it opens) */
      let hole=()=>false;
      const cv=w.userData.cutCanvas; if(cv&&w.material&&w.material.alphaMap&&w.material.alphaMap===w.userData.cutTex){
        try{ const id=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data, cw=cv.width, ch=cv.height;
          hole=(x,y)=>{ const px=Math.max(0,Math.min(cw-1,Math.round((x/L+.5)*cw))), py=Math.max(0,Math.min(ch-1,Math.round((1-y/WH)*ch))); return id[(py*cw+px)*4]<128; }; }catch(e){} }
      /* …and the carve lies flat round a window, so the opening stays a clean cut */
      const near=(x,y)=>{ let f=1; if(hole(x,y)) return 0; for(const r of [.15,.3,.45]) for(let a=0;a<8;a++){ if(hole(x+r*Math.cos(a*Math.PI/4), y+r*Math.sin(a*Math.PI/4))) f=Math.min(f,(r-.15)/.3); } return sm(f); };
      const g=new THREE.PlaneGeometry(L,y1-y0,NX,NY), pos=g.attributes.position, uv=g.attributes.uv;
      const fade=x=>sm((Math.min(x+L/2, L/2-x))/1.4);
      for(let i=0;i<pos.count;i++){
        const x=pos.getX(i), yl=pos.getY(i)+(y0+y1)/2, gg=yl-crest(thAt(x));
        const ev=sm(Math.min(yl-y0, y1-yl)/.45);
        pos.setXYZ(i, x, yl-WH/2, .012+profile(gg,R)*fade(x)*ev*near(x,yl));
        uv.setXY(i, x/L+.5, yl/WH);                                   /* the wall's own uv: art + window holes line up */
      }
      g.computeVertexNormals();
      X.walls.push({w, L, prot:(x,y)=>{ if(y<y0||y>y1||Math.abs(x)>L/2) return 0; const gg=y-crest(thAt(x));
        return .012+profile(gg,R)*fade(x)*sm(Math.min(y-y0,y1-y)/.45)*near(x,y)+(Math.abs(gg)<.3?.06:0); }});
      const band=new THREE.Mesh(g, w.material); band.userData.carved=true; band.raycast=()=>{};   /* clicks go to the wall */
      w.add(band); X.parts.push(band); band.onBeforeRender=()=>{ if(band.material!==w.material) band.material=w.material; };
      /* the neon, sitting in the channel */
      const pts=[]; for(let k=0;k<=NX;k++){ const x=-L/2+L*k/NX, y=crest(thAt(x));
        pts.push(new THREE.Vector3(x, y-WH/2, .012+profile(0,R)*fade(x)*near(x,y)+.035)); }
      const slot=w.userData.slot, closed=!!(CORE.WINPANES&&CORE.WINPANES[slot]);
      const runs=[]; let cur=null;
      pts.forEach((q,k)=>{ const h=hole(q.x, q.y+WH/2); if(!cur||cur.h!==h){ if(cur) cur.p.push(q); cur={h,p:[]}; runs.push(cur); } cur.p.push(q); });
      runs.forEach(rn=>{ if(rn.p.length<2||(rn.h&&!closed)) return;
        const curve=new THREE.CatmullRomCurve3(rn.p);
        [[.028,core],[.075,halo1],[.19,halo2]].forEach(([r,m])=>{ const t=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(4,rn.p.length*2),r,8,false),m);
          t.raycast=()=>{}; if(rn.h) t.userData.winKey=slot; w.add(t); X.parts.push(t); }); });
      const curve=new THREE.CatmullRomCurve3(pts);
      const lt=new THREE.PointLight(neon, 0, 6.5, 2); const mid=curve.getPoint(.5); lt.position.set(mid.x, mid.y, mid.z+.35); w.add(lt); X.lights.push(lt);
    });
    let lv=0, fr=0;
    const tick=()=>{ if(X.dead) return;
      if((CORE.CUTVER||0)!==X.cutVer){ apply(H, X.cfg, X.M); return; }       /* a window was cut / moved: re-carve round it */
      X.parts.forEach(t=>{ if(t.userData.winKey) t.visible=CORE.winK?CORE.winK(t.userData.winKey)<.5:false; });
      if(fr++%12===0) try{ hang(H,X); }catch(e){}
      let k=1;
      if(c.music==='pulses'){ const t=performance.now()/1000; let b=null;
        try{ if(H.hasAnalyser&&H.hasAnalyser()&&H.audioEl&&!H.audioEl.paused&&H.levels){ const a=H.levels(); b=((a[0]||0)+(a[1]||0)+(a[2]||0))/765; } }catch(e){}
        const want=b==null?.5+.5*Math.sin(t*1.7):Math.min(1,b*1.3);
        lv+=(want-lv)*(want>lv?.5:.12); k=.55+.8*lv; }
      core.color.copy(neon).multiplyScalar((1+1.1*c.glow)*k); halo1.opacity=.25*c.glow*k; halo2.opacity=.07*c.glow*k;
      X.lights.forEach(l=>{ l.intensity=2.2*c.glow*k; }); };
    X.tick=tick; tick(); if(H.onFrame) H.onFrame.push(tick);
  }
  CORE.ADDONS.carved={name:'Carved line', defaults:D, apply, remove};
})();
