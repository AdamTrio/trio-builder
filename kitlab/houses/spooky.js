// renders the coded-houses mock (street + variants) inside the builder page (THREE + room textures + kit pieces)
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(''+e)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text().slice(0,200)); });
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&window.HEXCORE.WORLD,null,{timeout:90000}); await p.waitForTimeout(1500);
  await p.addScriptTag({content:fs.readFileSync('kitlab/houses/houses.js','utf8')});
  const shots=await p.evaluate(async()=>{ const T=THREE, W=window.HEXCORE.WORLD, H=window.TRIOHOUSE;
    ['C01R','N03R','N04R'].forEach(id=>W.buildPiece(id)); H.preload(); await W.texReady(); await H.ready(); await new Promise(r=>setTimeout(r,1200));
    const R=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.ACESFilmicToneMapping; R.toneMappingExposure=1.0; R.shadowMap.enabled=true; R.shadowMap.type=T.PCFSoftShadowMap;
    const light=(S,night)=>{ S.add(new T.HemisphereLight(night?0x5a6aa8:0xa9bde8,0x3a2f2a,night?.35:.7)); const d=new T.DirectionalLight(night?0x8fa2d8:0xffb27a,night?.5:1.9); d.position.set(-30,22,26); d.castShadow=true; d.shadow.mapSize.set(2048,2048);
      const c=d.shadow.camera; c.left=-50; c.right=50; c.top=40; c.bottom=-40; c.far=140; d.shadow.bias=-.0004; S.add(d); };
    const lawn=(S,w,d,z)=>{ const g=new T.PlaneGeometry(w,d); g.rotateX(-Math.PI/2); const uv=g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*w/8,uv.getY(i)*d/8); const m=new T.Mesh(g,W.realMat().ground); m.position.z=z; m.receiveShadow=true; S.add(m); };
    const piece=(S,id,x,z,r)=>{ const g=W.buildPiece(id); g.position.set(x,0,z); g.rotation.y=r||0; g.traverse(o=>{ if(o.isMesh){ o.receiveShadow=true; o.castShadow=true; } }); S.add(g); };
    const LOOKS={
      bA:{walls:{t:'brick',c:'#ffffff'},roof:{t:'flat',c:'#777'},trim:'#e9e1d1',door:'#29453a'},
      bB:{walls:{t:'brick',c:'#a88672'},roof:{t:'flat',c:'#777'},trim:'#f1e9da',door:'#5b1e24'},
      shop:{walls:{t:'stucco',c:'#e7d5b5'},roof:{t:'flat',c:'#777'},trim:'#2b2b2b',door:'#2b2b2b',awning:'#2f6b4f',sign:'CORNER SHOP'},
      sub:{walls:{t:'siding',c:'#dbe5ea'},roof:{t:'shingles',c:'#4a4d57'},trim:'#ffffff',door:'#a3262a'},
      cot:{walls:{t:'siding',c:'#c4d8bd'},roof:{t:'shingles',c:'#6e4c3b'},trim:'#ffffff',door:'#f0c445'},
      mod:{walls:{t:'stucco',c:'#f2f2f0'},roof:{t:'flat',c:'#777'},trim:'#202022',door:'#202022'}};
    const street=(night)=>{ const S=new T.Scene(); const sc=document.createElement('canvas'); sc.width=4; sc.height=256; const sx=sc.getContext('2d'), gr=sx.createLinearGradient(0,0,0,256); if(night){ gr.addColorStop(0,'#05040e'); gr.addColorStop(1,'#1b1838'); } else { gr.addColorStop(0,'#2b2f63'); gr.addColorStop(.6,'#8a5a86'); gr.addColorStop(1,'#f0a070'); } sx.fillStyle=gr; sx.fillRect(0,0,4,256); const bt=new T.CanvasTexture(sc); bt.colorSpace=T.SRGBColorSpace; S.background=bt; S.fog=new T.Fog(night?0x14122a:0x7a5a80,70,160); light(S,night);
      for(let x=-48;x<=48;x+=16){ piece(S,'C01R',x,0,Math.PI/2); if(night) [-1,1].forEach(s=>{ const L=new T.PointLight(0xffc887,3.2,16,2); L.position.set(x,4.9,s*5.7); S.add(L); }); }
      lawn(S,112,26,-21); lawn(S,112,20,18);
      for(let x=-48;x<=48;x+=16) piece(S,(x/16)%2?'N04R':'N03R',x,-40);
      const put=(type,L,x,z)=>{ const g=H.build(type,L); g.position.set(x,0,z); S.add(g); };
      put('brownstone',LOOKS.bA,-33.2,-14); put('brownstone',LOOKS.bB,-26.8,-14); put('shop',LOOKS.shop,-15.5,-13); put('suburban',LOOKS.sub,-1.5,-16); put('cottage',LOOKS.cot,13,-15); put('modern',LOOKS.mod,27,-15.5);
      return S; };
    const out={};
    const AB=L=>Object.assign({},L,{wear:'abandoned'});
    const spooky=()=>{ const S=new T.Scene(); const sc=document.createElement('canvas'); sc.width=4; sc.height=256; const sx=sc.getContext('2d'), gr=sx.createLinearGradient(0,0,0,256); gr.addColorStop(0,'#04060a'); gr.addColorStop(.7,'#16201f'); gr.addColorStop(1,'#2c3a33'); sx.fillStyle=gr; sx.fillRect(0,0,4,256); const bt=new T.CanvasTexture(sc); bt.colorSpace=T.SRGBColorSpace; S.background=bt;
      S.fog=new T.Fog(0x22302c,18,85);
      S.add(new T.HemisphereLight(0x7f9fae,0x1f1a14,.75)); const d=new T.DirectionalLight(0xc4dcff,1.35); d.position.set(26,30,18); d.castShadow=true; d.shadow.mapSize.set(2048,2048); const c=d.shadow.camera; c.left=-50; c.right=50; c.top=40; c.bottom=-40; c.far=140; d.shadow.bias=-.0004; S.add(d);
      const moon=new T.Mesh(new T.SphereGeometry(4,24,16),new T.MeshBasicMaterial({color:0xe8f0ff,fog:false})); moon.position.set(14,34,-110); S.add(moon);
      for(let x=-48;x<=48;x+=16) piece(S,'C01R',x,0,Math.PI/2);
      const L1=new T.PointLight(0xffb070,2.2,14,2); L1.position.set(-16,4.9,-5.7); S.add(L1);
      lawn(S,112,26,-21); lawn(S,112,20,18);
      for(let x=-48;x<=48;x+=16) piece(S,'N04R',x,-40);
      const put=(type,L,x,z)=>{ const g=H.build(type,L); g.position.set(x,0,z); S.add(g); };
      put('brownstone',AB(LOOKS.bA),-33.2,-14); put('brownstone',AB(LOOKS.bB),-26.8,-14); put('shop',AB(LOOKS.shop),-15.5,-13); put('suburban',AB(LOOKS.sub),-1.5,-16); put('cottage',AB(LOOKS.cot),13,-15); put('modern',AB(LOOKS.mod),27,-15.5);
      const yard=new T.Group(); [[-8,-6],[6,-5],[20,-6],[-21,-7],[34,-6]].forEach(([x,z])=>H.deadTree(yard,x,z,1.1)); S.add(yard);
      return S; };
    const RG=W.realMat().glass, g0=RG.emissiveIntensity; RG.emissiveIntensity=.25;
    R.setSize(1600,900); let C=new T.PerspectiveCamera(44,1600/900,.1,400); C.position.set(-3,8.5,29); C.lookAt(-3,4.2,-13);
    out.spooky=(R.render(spooky(),C),R.domElement.toDataURL('image/jpeg',.9));
    RG.emissiveIntensity=g0;
    R.setSize(800,560); C=new T.PerspectiveCamera(40,800/560,.1,200); C.position.set(9,6,17.5); C.lookAt(0,3.2,0); out.pair=[];
    [LOOKS.sub,AB(LOOKS.sub),LOOKS.cot,AB(LOOKS.cot)].forEach((L,i)=>{ const S=new T.Scene(); const ab=L.wear==='abandoned'; S.background=new T.Color(ab?0x18211f:0x3d3352); if(ab) S.fog=new T.Fog(0x22302c,14,60);
      if(ab){ S.add(new T.HemisphereLight(0x7f9fae,0x1f1a14,.75)); const d=new T.DirectionalLight(0xc4dcff,1.35); d.position.set(-14,20,18); d.castShadow=true; d.shadow.mapSize.set(1024,1024); S.add(d); } else light(S,false); lawn(S,40,40,0); const t=i<2?'suburban':'cottage'; S.add(H.build(t,L)); if(t==='cottage'){ C.position.set(7,5,15); C.lookAt(0,2.4,1); } R.render(S,C); out.pair.push(R.domElement.toDataURL('image/jpeg',.9)); });
    return out; });
  const W=(n,d)=>fs.writeFileSync('out/houses/'+n+'.jpg',Buffer.from(d.split(',')[1],'base64'));
  W('spooky-street',shots.spooky); shots.pair.forEach((d,i)=>W('pair'+i,d));
  console.log('errors',errs.slice(0,5)); await b.close();
})();
