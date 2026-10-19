/* ================= ADD-ON · BEAM CEILING (v66) =================
   The ceiling lifts up and glows softly; big beams hang underneath (pattern A: long beams + diagonal braces,
   from Adam's red-room reference). The lifted ceiling is the room's own ceiling — same texture + colour — and the
   short band of wall up to it wears the ceiling too. The roof still opens: when the sky opens the ceiling fades
   like always, and the beams fade with it (or stay, against the sky). Cfg (M.addons.beams):
   {on, beam:'match'|'#rrggbb', glow 0..1, glowColor '#rrggbb', depth 0..1, roof:'fade'|'stay'}
   A baked room only carries this file when the add-on is on. */
(function(){
  const CORE=window.HEXCORE; if(!CORE) return;
  CORE.ADDONS=CORE.ADDONS||{};
  const D={on:false, beam:'match', glow:.5, glowColor:'#ffd2c0', depth:.5, roof:'fade'};
  const TAU=Math.PI*2, LIFT=1.1;
  function remove(H){ const X=H&&H._beams; if(!X) return;
    if(X.g.parent) X.g.parent.remove(X.g); X.g.traverse(o=>{ if(o.geometry) o.geometry.dispose(); });
    X.mats.forEach(m=>m.dispose());
    if(X.tick&&H.onFrame){ const i=H.onFrame.indexOf(X.tick); if(i>=0) H.onFrame.splice(i,1); }
    if(X.tick&&CORE.SKYHOOKS){ const i=CORE.SKYHOOKS.indexOf(X.hook); if(i>=0) CORE.SKYHOOKS.splice(i,1); }
    const S=H._mood; if(S&&S.ceil){ S.ceil.position.y=X.WH; const cm=S.ceil.material; if(cm&&cm.emissive){ cm.emissive.setRGB(0,0,0); cm.emissiveIntensity=0; cm.needsUpdate=true; } }
    X.dead=true; H._beams=null; }
  function apply(H, cfg, M){
    const c=Object.assign({}, D, cfg||{});
    const S=H._mood; if(!S||!S.ceil||(S.open&&S.open.on)){ remove(H); return; }   /* Open Space: no ceiling */
    const key=JSON.stringify([c.beam,c.glow,c.glowColor,c.depth,c.roof,(M&&M.color&&M.color.ceil)||'']);
    if(H._beams&&H._beams.key===key){ H._beams.hold(); return; }
    remove(H);
    const RM=CORE.room(H), R=RM.R||10, WH=H.WALL_H||4.6, k=R/10;
    const X=H._beams={key, mats:[], WH, c};
    const g=new THREE.Group(); g.userData.beams=true; H.scene.add(g); X.g=g;
    const ceilHex=(M&&M.color&&M.color.ceil)||null;
    const bm=new THREE.MeshStandardMaterial({color:new THREE.Color(c.beam&&c.beam!=='match'?c.beam:(ceilHex||'#3a3633')), roughness:.85, metalness:0});
    X.mats.push(bm); X.bm=bm;
    const BD=.3+(+c.depth)*.7, BW=.38;
    const V=i=>new THREE.Vector3(Math.cos(i*TAU/6)*R,0,Math.sin(i*TAU/6)*R);
    const top=WH+LIFT;
    /* the band of wall from the room's top up to the lifted ceiling — it wears the ceiling */
    for(let i=0;i<6;i++){ const a=V(i), b=V(i+1), L=a.distanceTo(b);
      const m=new THREE.Mesh(new THREE.PlaneGeometry(L,LIFT+.02), S.ceil.material); m.position.copy(a.clone().add(b).multiplyScalar(.5)).setY(WH+LIFT/2); m.lookAt(0,WH+LIFT/2,0);
      m.onBeforeRender=()=>{ if(m.material!==S.ceil.material) m.material=S.ceil.material; }; m.userData.well=true; g.add(m); }
    /* beams */
    const inHex=(x,z)=>{ for(let i=0;i<6;i++){ const a=(i+.5)*TAU/6; if(x*Math.cos(a)+z*Math.sin(a)>R*Math.cos(Math.PI/6)-.02) return false; } return true; };
    const run=(x0,z0,dx,dz)=>{ let t=0; while(t<6*R&&inHex(x0+dx*t,z0+dz*t)) t+=.02; return t; };
    const box=(L,h,w,x,y,z,ang)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(L,h,w),bm); m.position.set(x,y,z); m.rotation.y=-ang; g.add(m); return m; };
    const beam=(cx,cz,ang)=>{ const dx=Math.cos(ang), dz=Math.sin(ang), a=run(cx,cz,dx,dz), b=run(cx,cz,-dx,-dz);
      box(a+b, BD, BW, cx+dx*(a-b)/2, top-BD/2-.02, cz+dz*(a-b)/2, ang); };
    [-4.2,0,4.2].forEach(z=>beam(0,z*k,0));                                 /* long beams */
    [-5.6,5.6].forEach(x=>beam(x*k,0,Math.PI/2));                           /* cross beams */
    const da=Math.atan2(4.2,5.6), DL=Math.hypot(5.6,4.2)*k;                 /* diagonal braces between them */
    [[-2.8,-2.1,da],[2.8,-2.1,-da],[-2.8,2.1,-da],[2.8,2.1,da]].forEach(([x,z,a])=>box(DL,BD*.8,BW*.9,x*k,top-BD*.4-.02,z*k,a));
    /* a rim beam round the top of the walls, so the beams sit on something */
    for(let i=0;i<6;i++){ const a=V(i).multiplyScalar(.985), b=V(i+1).multiplyScalar(.985), L=a.distanceTo(b);
      const m=new THREE.Mesh(new THREE.BoxGeometry(L,.5,.45),bm); m.position.copy(a.clone().add(b).multiplyScalar(.5)).setY(WH+.25); m.lookAt(0,m.position.y,0); g.add(m); }
    /* the soft glow from above */
    const gc=new THREE.Color(c.glowColor||'#ffd2c0');
    const lights=[]; { const L=new THREE.PointLight(gc, 0, 3.2*R, 1.3); L.position.set(0,top-.25,0); g.add(L); lights.push([L,1]); }
    for(let i=0;i<6;i++){ const L=new THREE.PointLight(gc,0,1.1*R,1.6); const v=V(i+.5).multiplyScalar(.55); L.position.set(v.x,top-.3,v.z); g.add(L); lights.push([L,.35]); }
    X.hold=()=>{ S.ceil.position.y=top; const cm=S.ceil.material; if(cm&&cm.emissive){ cm.emissive.copy(gc); cm.emissiveIntensity=.35*c.glow; } };
    X.hold();
    const tick=()=>{ if(X.dead) return;
      X.hold();
      const sk=CORE.skyK(H), op=c.roof==='stay'?1:1-sk;                 /* the roof opens: beams go with it (or stay) */
      g.children.forEach(o=>{ if(o.userData.well) o.visible=sk<.999; });
      bm.opacity=op; const tr=op<.999; if(bm.transparent!==tr){ bm.transparent=tr; bm.needsUpdate=true; } bm.depthWrite=!tr;
      g.children.forEach(o=>{ if(o.isMesh&&o.material===bm) o.visible=op>.002; });
      lights.forEach(([L,f])=>{ L.intensity=1.6*c.glow*f*(1-sk); }); };
    X.tick=tick; X.hook=(h)=>{ if(h===H) tick(); }; tick(); if(H.onFrame) H.onFrame.push(tick); if(CORE.SKYHOOKS) CORE.SKYHOOKS.push(X.hook);   /* the roof moving updates the beams at once */
  }
  CORE.ADDONS.beams={name:'Beam ceiling', defaults:D, apply, remove};
})();
