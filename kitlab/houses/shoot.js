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
    R.setSize(1600,900); let C=new T.PerspectiveCamera(42,1600/900,.1,400); C.position.set(-3,8.5,29); C.lookAt(-3,4.2,-13); C.fov=44; C.updateProjectionMatrix();
    out.dusk=(R.render(street(false),C),R.domElement.toDataURL('image/jpeg',.9));
    out.night=(R.render(street(true),C),R.domElement.toDataURL('image/jpeg',.9));
    // the same house, four looks
    const VAR=[LOOKS.sub,{walls:{t:'brick',c:'#ffffff'},roof:{t:'shingles',c:'#3b3b3b'},trim:'#f3eee4',door:'#1f3a5f'},
      {walls:{t:'siding',c:'#2f4f6e'},roof:{t:'metal',c:'#9aa0a6'},trim:'#ffffff',door:'#f0c445',porch:false},
      {walls:{t:'stone',c:'#e9e2d6'},roof:{t:'tiles',c:'#b5583a'},trim:'#3a2e25',door:'#3a2e25',garage:false}];
    R.setSize(800,500); C=new T.PerspectiveCamera(38,800/500,.1,200); C.position.set(9,6.5,17); C.lookAt(0,3,0); out.v=[];
    VAR.forEach(L=>{ const S=new T.Scene(); S.background=new T.Color(0x3d3352); light(S,false); lawn(S,40,40,0); S.add(H.build('suburban',L)); R.render(S,C); out.v.push(R.domElement.toDataURL('image/jpeg',.9)); });
    return out; });
  const W=(n,d)=>fs.writeFileSync('out/houses/'+n+'.jpg',Buffer.from(d.split(',')[1],'base64'));
  W('street-dusk',shots.dusk); W('street-night',shots.night); shots.v.forEach((d,i)=>W('var'+i,d));
  console.log('errors',errs.slice(0,5)); await b.close();
})();
