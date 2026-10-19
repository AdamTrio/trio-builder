/* ================= v76 · BIG SCREENS — models that play the artist's clips (and the fan board, giant size) =================
   Jumbotron (16:9 on truss towers), Portrait tower (9:16, both sides), Drive-in screen (16:9), Fan board wall.
   v78: + Banner plane (flies laps, the banner plays the clips both sides). Big screens loop all the time (v78), not only in view.
   Each screen is a part named SCREEN, so the v70 screen engine plays its clips (only while in view). The clip is
   cropped to fill the screen (a 9:16 clip on the tower, 16:9 on the others). The fan board wall draws the room's fan
   board live from the page's `chat` rows (never a database) and a tap asks the page to open it. Standard: every editor
   (in a room they come in small — size them up). Builder: Models → + Jumbotron / + Portrait tower / + Drive-in screen / + Fan board wall. */
(function(){
  const CORE=window.HEXCORE; if(!CORE||!CORE.PRIMS) return;
  const T=THREE;
  /* lit when there are lights (World, Open Space), still readable in an unlit room: a little self-glow */
  const MAT={};
  const mat=(k,c,o)=>MAT[k]||(MAT[k]=new T.MeshStandardMaterial(Object.assign({color:c,emissive:new T.Color(c).multiplyScalar(.35),roughness:.6,metalness:.4},o||{})));
  const steel=()=>mat('steel',0x2b2e36,{metalness:.8,roughness:.4}), black=()=>mat('black',0x121216,{metalness:.2}), conc=()=>mat('conc',0x6d6a72,{metalness:0,roughness:.9}), white=()=>mat('white',0xdedcd6,{metalness:0,roughness:.7});
  const led=c=>MAT['led'+c]||(MAT['led'+c]=new T.MeshBasicMaterial({color:c,toneMapped:false}));
  const box=(g,w,h,d,m,x,y,z)=>{ const o=new T.Mesh(new T.BoxGeometry(w,h,d),m); o.position.set(x,y+h/2,z); g.add(o); return o; };
  /* the glass: UVs flipped so the video (flipY off, as for model files) lands right way up */
  function screen(g,w,h,x,y,z,name){ const geo=new T.PlaneGeometry(w,h), uv=geo.attributes.uv; for(let i=0;i<uv.count;i++) uv.setY(i,1-uv.getY(i));
    const m=new T.Mesh(geo,new T.MeshBasicMaterial({color:0x07060f,toneMapped:false})); m.position.set(x,y+h/2,z); m.name=name||'SCREEN'; m.userData.screenAspect=w/h; g.add(m); return m; }
  let GLOW=null; function glowTex(){ if(GLOW) return GLOW; const c=document.createElement('canvas'); c.width=c.height=64; const x=c.getContext('2d'), gr=x.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=gr; x.fillRect(0,0,64,64); return GLOW=new T.CanvasTexture(c); }
  function halo(g,x,y,z,s,c){ const sp=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:c,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false})); sp.position.set(x,y,z); sp.scale.set(s,s*.7,1); sp.userData.glint=true; g.add(sp); }
  function truss(g,x,z,H){ for(let k=0;k<4;k++) box(g,.12,H,.12,steel(),x+(k%2?.5:-.5),0,z+(k<2?.5:-.5)); for(let y=1;y<H;y+=1.2){ box(g,1.1,.06,.06,steel(),x,y,z+.5); box(g,1.1,.06,.06,steel(),x,y,z-.5); box(g,.06,.06,1.1,steel(),x+.5,y,z); box(g,.06,.06,1.1,steel(),x-.5,y,z); } }
  const P=CORE.PRIMS;
  /* Jumbotron: a 16 × 9 m screen hung between two truss towers, speaker stacks, a stage deck */
  P.jumbotron={label:'Jumbotron', screen:'16:9', big:true, build(){ const g=new T.Group(), sw=16, sh=9, y0=6;
    [-1,1].forEach(s=>{ truss(g,s*(sw/2+.9),0,y0+sh+2); for(let k=0;k<3;k++) box(g,1.6,1.3,1.4,black(),s*12,k*1.3,1.4); });
    box(g,sw+3.2,.5,1,steel(),0,y0+sh+1.6,0); box(g,sw+.8,sh+.8,.6,black(),0,y0-.4,-.2);
    screen(g,sw,sh,0,y0,.12);
    box(g,sw+.9,.12,.1,led(0xb48cff),0,y0-.48,.15); box(g,sw+.9,.12,.1,led(0xb48cff),0,y0+sh+.36,.15);
    box(g,18,1.2,6,mat('deck',0x1b1a22,{metalness:.1,roughness:.7}),0,0,3.4); halo(g,0,y0+sh/2,-.6,30,0x7aa8ff); return g; }};
  /* Portrait tower: a 9:16 screen on a slim pylon — the clip plays on both sides */
  P.ptower={label:'Portrait tower', screen:'9:16', big:true, build(){ const g=new T.Group(), sw=6.4, sh=sw*16/9, y0=4.2;
    box(g,4.2,.5,3,conc(),0,0,0); box(g,1.4,y0,1,steel(),0,.5,-.2); box(g,sw+.7,sh+.7,.7,black(),0,y0-.35,-.35);
    screen(g,sw,sh,0,y0,.02); const back=screen(g,sw,sh,0,y0,-.72,'SCREEN_BACK'); back.rotation.y=Math.PI; back.userData.screenTwin=true;
    const L=led(0xff5fa2); box(g,.1,sh+.8,.1,L,-(sw/2+.38),y0-.4,.02); box(g,.1,sh+.8,.1,L,(sw/2+.38),y0-.4,.02); box(g,sw+.86,.1,.1,L,0,y0+sh+.32,.02);
    box(g,sw+1.2,.3,1.1,steel(),0,y0+sh+.45,-.3); halo(g,0,y0+sh/2,-1,18,0xff7ab8); return g; }};
  /* Drive-in screen: a 20 m wide 16:9 screen on posts, white frame — park cars in front */
  P.drivein={label:'Drive-in screen', screen:'16:9', big:true, build(){ const g=new T.Group(), sw=20, sh=sw*9/16, y0=3;
    [-1,1].forEach(s=>{ box(g,.45,y0+sh+.6,.45,steel(),s*(sw/2-.6),0,-.5); box(g,.3,y0+sh*.7,.3,steel(),s*(sw/2-.6),0,-3); });
    box(g,sw+.7,sh+.7,.35,white(),0,y0-.35,-.2); screen(g,sw,sh,0,y0,.0); box(g,sw+1,.25,.6,steel(),0,y0+sh+.35,-.2); halo(g,0,y0+sh/2,-.8,34,0x9ad0ff); return g; }};
  /* Fan board wall: the room's fan board, 16 m wide, fed live by the page; a tap opens the board */
  const WALLS=new Set(); let ROWS=null, COUNT=undefined;
  const SAMPLE=[{name:'luna',text:'this drop is insane',role:'fan'},{name:'kai',text:'who else is here rn?',role:'fan'},{name:'mira',text:'see you at the show',role:'fan'},{name:'jojo',text:'best world yet',role:'fan'}];
  function paintWall(w){ if(!CORE.drawFanBoard) return; CORE.drawFanBoard(w.c, ROWS||SAMPLE, {count:ROWS?COUNT:128, title:w.title||'FAN BOARD', top:true}); w.t.needsUpdate=true; }
  CORE.CHATFEED=CORE.CHATFEED||[]; CORE.CHATFEED.push((rows,count)=>{ ROWS=rows; COUNT=count; WALLS.forEach(w=>{ if(!w.mesh.parent) WALLS.delete(w); else paintWall(w); }); });
  P.fanwall={label:'Fan board wall', board:true, big:true, build(){ const g=new T.Group(), bw=16, bh=bw*472/1024, y0=1.6;
    const c=document.createElement('canvas'); c.width=1024; c.height=472; const t=new T.CanvasTexture(c); t.colorSpace=T.SRGBColorSpace; t.anisotropy=4;
    box(g,bw+.8,bh+.8,.5,black(),0,y0-.4,-.3); [-1,1].forEach(s=>box(g,.5,y0,.5,steel(),s*(bw/2-1),0,-.3));
    const m=new T.Mesh(new T.PlaneGeometry(bw,bh),new T.MeshBasicMaterial({map:t,transparent:true,toneMapped:false})); m.position.set(0,y0+bh/2,.0); m.userData.fanWall=true; g.add(m);
    box(g,bw+.9,.1,.1,led(0xf5d400),0,y0-.42,0); box(g,bw+.9,.1,.1,led(0xf5d400),0,y0+bh+.32,0); halo(g,0,y0+bh/2,-.8,26,0xb48cff);
    const w={c,t,mesh:m}; WALLS.add(w); paintWall(w); try{ if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>paintWall(w)); }catch(e){}
    g.userData.fanWall=m; setTimeout(()=>{ try{ CORE.fanWallWire(window.HEX); }catch(e){} },0); return g; }};
  /* tap the wall → the page opens the fan board (published, inside a Trio page) */
  CORE.fanWallWire=function(H){ if(CORE._fwWired||!H||!H.canvas) return; CORE._fwWired=1; const ray=new T.Raycaster(), ptr=new T.Vector2(); let dn=null;
    H.canvas.addEventListener('pointerdown',e=>{ dn=[e.clientX,e.clientY]; },true);
    H.canvas.addEventListener('click',e=>{ if(CORE.EDIT) return; if(dn&&Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>10) return; if(CORE.REELOPEN||CORE.EGGOPEN) return;
      ptr.x=e.clientX/innerWidth*2-1; ptr.y=-(e.clientY/innerHeight)*2+1; ray.setFromCamera(ptr,H.cam);
      for(const w of WALLS){ if(!w.mesh.parent) continue; const h=ray.intersectObject(w.mesh,false)[0]; if(h&&h.distance<70){ if(!CORE.post({trio:'open', board:'chat'})) CORE.toast&&CORE.toast('the fan board opens here inside the Trio page'); return; } } }); };
  /* v78 · Banner plane: a red-and-white tow plane flying laps, pulling a 32:9 banner that plays the clips (both sides).
     The model's spot is the middle of its loop (a ring on the ground shows it in the builder). p.fly={loop:'small'|'medium'|'large', height:'low'|'mid'|'high'} */
  const PLANES=new Set(); let PT=false;
  const LOOP={small:38,medium:64,large:100}, HIGH={low:20,mid:30,high:44};
  function planeTick(){ if(PT) return; const H=window.HEX; if(!H||!H.onFrame){ setTimeout(planeTick,300); return; } PT=true;
    H.onFrame.push(()=>{ const t=performance.now()/1000; PLANES.forEach(P=>{ if(!P.g.parent){ if(++P.gone>600) PLANES.delete(P); return; } P.gone=0;
      const u=P, th=t*u.w+u.ph; u.rig.rotation.y=th; u.craft.rotation.z=.14+Math.sin(t*1.3)*.03; u.craft.position.y=u.h+Math.sin(t*.8)*.5; u.prop.rotation.x=t*40;
      const a=u.bg.attributes.position.array, b=u.base, BW=u.BW; for(let i=0;i<a.length;i+=3){ const x=b[i], y=b[i+1], k=(BW/2-x)/BW, amp=.12+k*k*1.2; a[i]=x; a[i+1]=y+Math.sin(t*5.1+k*7)*k*.25; a[i+2]=Math.sin(t*6.3+k*9+y*.15)*amp; }
      u.bg.attributes.position.needsUpdate=true; u.pad.visible=!!CORE.EDIT; }); }); }
  P.bannerplane={label:'Banner plane', screen:'32:9', big:true, build(p){ const g=new T.Group(), F=(p&&p.fly)||{}, R=LOOP[F.loop]||LOOP.medium, Hh=HIGH[F.height]||HIGH.mid;
    const red=mat('pred',0xc8262c,{metalness:.2,roughness:.45}), wht=mat('pwht',0xf3f1ec,{metalness:0,roughness:.5}), dk=mat('pdk',0x1d2026,{metalness:.5,roughness:.4}), gl=mat('pgl',0x1b2a3a,{metalness:.6,roughness:.1});
    /* the spot: a dashed ring + a pin, only while building */
    const pad=new T.Group(); const ring=new T.Mesh(new T.RingGeometry(R-.4,R,96),new T.MeshBasicMaterial({color:0xf5d400,transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false})); ring.rotation.x=-Math.PI/2; ring.position.y=.06; pad.add(ring);
    const pin=new T.Mesh(new T.CylinderGeometry(1.2,1.2,.12,24),led(0xf5d400)); pin.position.y=.06; pad.add(pin); g.add(pad);
    const rig=new T.Group(); g.add(rig); const craft=new T.Group(); craft.position.set(R,Hh,0); rig.add(craft);
    const body=new T.Group(); body.rotation.y=Math.PI/2; craft.add(body);   /* the plane's nose (+x) points along the loop */
    const add=(geo,m,x,y,z,rx,ry,rz)=>{ const o=new T.Mesh(geo,m); o.position.set(x,y,z); o.rotation.set(rx||0,ry||0,rz||0); body.add(o); return o; };
    const fus=new T.CylinderGeometry(.55,.3,6.2,16); fus.rotateZ(Math.PI/2); add(fus,wht,0,0,0); const nose=new T.CylinderGeometry(.62,.55,1.1,16); nose.rotateZ(Math.PI/2); add(nose,red,3.6,0,0);
    const stripe=new T.CylinderGeometry(.565,.5,1.6,16,1,true); stripe.rotateZ(Math.PI/2); add(stripe,red,.6,0,0);
    add(new T.SphereGeometry(.55,14,10,0,Math.PI*2,0,Math.PI/2),gl,1.4,.32,0).scale.set(1.4,.8,.9);
    add(new T.BoxGeometry(1.5,.12,10.4),wht,1.1,.55,0); [-1,1].forEach(s=>add(new T.BoxGeometry(1.52,.13,1.3),red,1.1,.56,s*4.6));
    add(new T.BoxGeometry(.9,.08,3.4),wht,-2.9,.1,0); add(new T.BoxGeometry(1,1.3,.08),red,-2.95,.7,0);
    add(new T.CylinderGeometry(.15,.15,.25,12).rotateZ(Math.PI/2),dk,4.2,0,0);
    const prop=new T.Mesh(new T.CircleGeometry(1.15,32),new T.MeshBasicMaterial({color:0x222222,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false})); prop.rotation.y=Math.PI/2; prop.position.x=4.32; body.add(prop);
    [-1,1].forEach(s=>{ add(new T.CylinderGeometry(.05,.05,1,6),dk,1.6,-.9,s*.9,s*.35,0,0); add(new T.CylinderGeometry(.28,.28,.16,12).rotateX(Math.PI/2),dk,1.6,-1.35,s*1.05); });
    add(new T.SphereGeometry(.12,8,6),led(0xff2020),1.1,.56,5.2); add(new T.SphereGeometry(.12,8,6),led(0x20ff60),1.1,.56,-5.2);
    /* the banner: 22 × 6.2 m (32:9), trailing 15 m behind on a rope bridle; the clip plays on both faces */
    const BW=22, BH=BW*9/32, bx=-15-BW/2, by=-1.2;
    const bg=new T.PlaneGeometry(BW,BH,40,6), uv=bg.attributes.uv; for(let i=0;i<uv.count;i++) uv.setY(i,1-uv.getY(i));
    const cloth=new T.MeshStandardMaterial({color:0xf4f2ee,emissive:0x3a3934,roughness:.85,side:T.DoubleSide});
    const ban=new T.Mesh(bg,cloth); ban.name='SCREEN'; ban.userData.screenAspect=BW/BH; ban.userData.screenDouble=true; ban.frustumCulled=false; ban.position.set(bx,by,0); body.add(ban);
    const pole=new T.Mesh(new T.CylinderGeometry(.07,.07,BH+.8,8),dk); pole.position.set(bx+BW/2+.3,by,0); body.add(pole);
    const rp=[]; for(let k=0;k<9;k++){ const q=k/8; rp.push(new T.Vector3(-3.1+(bx+BW/2+.3+3.1)*q, -.1+(by+.1)*q-Math.sin(q*Math.PI)*.8, 0)); }
    [BH/2-.1,-(BH/2-.1)].forEach(dy=>{ const pts=rp.map((v,k)=>v.clone().setY(v.y+dy*(k/8))); body.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x222222}))); });
    const ph=(String((p&&p.id)||'').split('').reduce((a,c)=>a*31+c.charCodeAt(0),7)%628)/100;
    const u={g,rig,craft,prop,pad,bg,base:bg.attributes.position.array.slice(),BW,h:Hh,w:16/R,ph,gone:0}; PLANES.add(u); planeTick();
    g.userData.plane=u; return g; }};
  CORE.BIGSCREENS=['jumbotron','ptower','drivein','fanwall','bannerplane'];
})();
