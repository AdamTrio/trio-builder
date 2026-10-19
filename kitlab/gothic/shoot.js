const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&window.HEXCORE.WORLD,null,{timeout:90000}); await p.waitForTimeout(1500);
  await p.evaluate(async()=>{ const W=window.HEXCORE.WORLD; ['N03R','N10R'].forEach(id=>W.buildPiece(id)); await W.texReady(); });
  await p.addScriptTag({content:fs.readFileSync('kitlab/gothic/pieces.js','utf8')});
  const shots=await p.evaluate(async()=>{ const T=THREE, G=window.TRIOGOTH, P=G.P; await new Promise(r=>setTimeout(r,800));
    const R=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); R.setSize(1600,900); R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.ACESFilmicToneMapping; R.shadowMap.enabled=true; R.shadowMap.type=T.PCFSoftShadowMap;
    const sky=(a,b2,c)=>{ const cv=document.createElement('canvas'); cv.width=4; cv.height=256; const x=cv.getContext('2d'), gr=x.createLinearGradient(0,0,0,256); gr.addColorStop(0,a); gr.addColorStop(.65,b2); gr.addColorStop(1,c); x.fillStyle=gr; x.fillRect(0,0,4,256); const t=new T.CanvasTexture(cv); t.colorSpace=T.SRGBColorSpace; return t; };
    const sun=(S,col,int,pos)=>{ const d=new T.DirectionalLight(col,int); d.position.set(...pos); d.castShadow=true; d.shadow.mapSize.set(2048,2048); const c=d.shadow.camera; c.left=-45; c.right=45; c.top=40; c.bottom=-40; c.far=160; d.shadow.bias=-.0004; S.add(d); };
    const add=(S,g,x,z,ry)=>{ g.position.x+=x; g.position.z+=z; if(ry) g.rotation.y=ry; g.traverse(o=>{ if(o.isMesh){ o.castShadow=o.castShadow||false; o.receiveShadow=true; } }); S.add(g); return g; };
    const out={};
    /* 1 · GOTHIC at night: graveyard · chapel ruin on dead forest · swamp, gate + fence + gas lamps on a path */
    { const S=new T.Scene(); S.background=sky('#05060c','#1a2028','#3a4440'); S.fog=new T.Fog(0x283230,22,95);
      S.add(new T.HemisphereLight(0x7d93a8,0x1c1812,.55)); { const big=new T.Mesh(new T.PlaneGeometry(400,400),new T.MeshStandardMaterial({color:0x2a3226,roughness:1})); big.rotation.x=-Math.PI/2; big.position.y=-.02; S.add(big); } sun(S,0x9fb6ee,.75,[24,30,10]);
      const moon=new T.Mesh(new T.SphereGeometry(4.5,24,16),new T.MeshBasicMaterial({color:0xeef3ff,fog:false})); moon.position.set(30,42,-120); S.add(moon);
      add(S,P.graveyard(),-16,-16); add(S,P.deadForest(),0,-16); const ch=G.chapel(new T.Group(),0,0); add(S,ch,0,-17,0); add(S,P.swamp(),16,-16);
      add(S,P.deadForest(),-16,-32); add(S,P.deadForest(),0,-32); add(S,P.deadForest(),16,-32);
      const front=new T.Group(); G.ground(front,window.TRIOGOTH.RM.dirt); add(S,front,0,0); const nightG=new T.MeshStandardMaterial({color:0x4a5a3c,map:window.TRIOGOTH.RM.ground.map,roughness:1}); const f2=new T.Group(); G.ground(f2,nightG); add(S,f2,-16,0); const f3=new T.Group(); G.ground(f3,nightG); add(S,f3,16,0);
      const gt=G.gate(new T.Group(),0,0); add(S,gt,0,-7.6); G.fence(S,-24,-7.8,-2.2,-7.8,2); G.fence(S,2.2,-7.8,8,-7.8,2);
      const L=[]; [-4,4].forEach(x=>add(S,G.gasLamp(new T.Group(),0,0,L),x,-5.5)); add(S,G.gasLamp(new T.Group(),0,0,L),-12,-3);
      [[-10,3,1.3],[12,2,1.5],[20,-4,1.2]].forEach(([x,z,s])=>G.deadTree(S,x,z,s,1.6)); G.mist(S,.5,.12);
      const cam=new T.PerspectiveCamera(48,16/9,.1,400); cam.position.set(2,4.2,12); cam.lookAt(0,4.5,-18); R.render(S,cam); out.gothic=R.domElement.toDataURL('image/jpeg',.9);
      cam.position.set(-24,16,14); cam.lookAt(-6,0,-18); R.render(S,cam); out.gothicHigh=R.domElement.toDataURL('image/jpeg',.9); }
    /* 2 · NATURE by day: birch · autumn · boulders · stream · flower meadow */
    { const S=new T.Scene(); S.background=sky('#3f74b8','#9cc4e6','#e6eef0'); S.fog=new T.Fog(0xcfe0ea,60,200);
      S.add(new T.HemisphereLight(0xbcd6f0,0x4a3f30,.9)); { const big=new T.Mesh(new T.PlaneGeometry(400,400),window.TRIOGOTH.RM.ground); big.rotation.x=-Math.PI/2; big.position.y=-.02; big.receiveShadow=true; S.add(big); } sun(S,0xfff0d8,2.2,[-30,40,20]);
      add(S,P.flowers(),-16,0); add(S,P.stream(),0,0); add(S,P.boulders(),16,0);
      add(S,P.birch(),-16,-16); add(S,P.stream(),0,-16); add(S,P.autumn(),16,-16); add(S,P.autumn(),-16,-32); add(S,P.birch(),0,-32); add(S,P.autumn(),16,-32);
      const cam=new T.PerspectiveCamera(50,16/9,.1,400); cam.position.set(-4,11,14); cam.lookAt(2,0,-14); R.render(S,cam); out.nature=R.domElement.toDataURL('image/jpeg',.9); }
    return out; });
  for(const k of Object.keys(shots)) fs.writeFileSync('/mnt/user-data/outputs/kit2-'+k+'.jpg',Buffer.from(shots[k].split(',')[1],'base64'));
  console.log(Object.keys(shots), errs); await b.close(); })();
