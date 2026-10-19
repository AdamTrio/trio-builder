// Media-in-the-world mock #8 (10/17): a prop plane towing a banner that plays the artist's video, over the coded-houses street.
// Renders N frames inside the builder page → out/plane/frames/*.jpg → ffmpeg makes the mp4.
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const VF=fs.readdirSync('out/plane/vf').sort().map(f=>'data:image/jpeg;base64,'+fs.readFileSync('out/plane/vf/'+f).toString('base64'));
const N=+(process.argv[2]||144), W=+(process.argv[3]||960), H=Math.round(W*9/16), MODE=process.argv[4]||'video';
(async()=>{
  fs.mkdirSync('out/plane/frames',{recursive:true});
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(''+e));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&window.HEXCORE.WORLD,null,{timeout:90000}); await p.waitForTimeout(1500);
  await p.addScriptTag({content:fs.readFileSync('kitlab/houses/houses.js','utf8')});
  await p.evaluate(async([VF,W,H])=>{ const T=THREE, Wd=window.HEXCORE.WORLD, Hs=window.TRIOHOUSE;
    ['C01R','N03R','N04R'].forEach(id=>Wd.buildPiece(id)); Hs.preload(); await Wd.texReady(); await Hs.ready();
    const TL=new T.TextureLoader(); const VT=await Promise.all(VF.map(u=>new Promise(r=>TL.load(u,t=>{ t.colorSpace=T.SRGBColorSpace; t.repeat.set(1,(4/3)/(22/6.1)); t.offset.set(0,(1-(4/3)/(22/6.1))/2); r(t); }))));
    const R=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.ACESFilmicToneMapping; R.toneMappingExposure=1.0; R.shadowMap.enabled=true; R.setSize(W,H);
    const S=new T.Scene(); const c=document.createElement('canvas'); c.width=4; c.height=256; const x=c.getContext('2d'), g=x.createLinearGradient(0,0,0,256);
    g.addColorStop(0,'#3d6fb8'); g.addColorStop(.55,'#8fb5e0'); g.addColorStop(.85,'#f2c28e'); g.addColorStop(1,'#f6a56e'); x.fillStyle=g; x.fillRect(0,0,4,256); const bt=new T.CanvasTexture(c); bt.colorSpace=T.SRGBColorSpace; S.background=bt; S.fog=new T.Fog(0xe9c8a8,90,260);
    S.add(new T.HemisphereLight(0xcfe0ff,0x5a4a3a,1.0)); const sun=new T.DirectionalLight(0xffd9b0,2.3); sun.position.set(-40,30,30); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); Object.assign(sun.shadow.camera,{left:-60,right:60,top:50,bottom:-50,far:200}); S.add(sun);
    /* clouds */ const cm=new T.MeshStandardMaterial({color:0xffffff,emissive:0x8a8f9a,roughness:1,transparent:true,opacity:.85}); [[-60,52,-90,1.4],[30,60,-110,1.8],[90,48,-80,1.1],[-20,70,-140,2.2]].forEach(([cx,cy,cz,s])=>{ for(let k=0;k<6;k++){ const m=new T.Mesh(new T.SphereGeometry(4*s*(0.7+Math.random()*.5),16,12),cm); m.position.set(cx+(k-2.5)*4*s,cy+Math.random()*2*s,cz+Math.random()*3); m.scale.y=.55; S.add(m); } });
    /* the street (Realistic kit + coded houses) */
    const piece=(id,px,pz,r)=>{ const q=Wd.buildPiece(id); q.position.set(px,0,pz); q.rotation.y=r||0; q.traverse(o=>{ if(o.isMesh){ o.receiveShadow=o.castShadow=true; } }); S.add(q); };
    for(let px=-64;px<=64;px+=16){ piece('C01R',px,0,Math.PI/2); piece(((px/16)%2)?'N04R':'N03R',px,-40); piece('N03R',px,40); }
    const lawn=(w,d,z)=>{ const pg=new T.PlaneGeometry(w,d); pg.rotateX(-Math.PI/2); const uv=pg.attributes.uv; for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*w/8,uv.getY(i)*d/8); const m=new T.Mesh(pg,Wd.realMat().ground); m.position.z=z; m.receiveShadow=true; S.add(m); }; lawn(150,24,-20); lawn(150,24,20);
    const put=(t,L,px,pz,ry)=>{ const h=Hs.build(t,L); h.position.set(px,0,pz); h.rotation.y=ry||0; S.add(h); };
    put('brownstone',{walls:{t:'brick',c:'#ffffff'},roof:{t:'flat',c:'#777'},trim:'#e9e1d1',door:'#29453a',glow:{on:false}},-33,-14); put('brownstone',{walls:{t:'brick',c:'#a88672'},roof:{t:'flat',c:'#777'},trim:'#f1e9da',door:'#5b1e24',glow:{on:false}},-26.6,-14);
    put('shop',{walls:{t:'stucco',c:'#e7d5b5'},roof:{t:'flat',c:'#777'},trim:'#2b2b2b',door:'#2b2b2b',awning:'#2f6b4f'},-15.5,-13); put('suburban',{walls:{t:'siding',c:'#dbe5ea'},roof:{t:'shingles',c:'#4a4d57'},trim:'#ffffff',door:'#a3262a',glow:{on:false}},-1.5,-16);
    put('cottage',{walls:{t:'siding',c:'#c4d8bd'},roof:{t:'shingles',c:'#6e4c3b'},trim:'#ffffff',door:'#f0c445',glow:{on:false}},13,-15); put('modern',{walls:{t:'stucco',c:'#f2f2f0'},roof:{t:'flat',c:'#777'},trim:'#202022',door:'#202022',glow:{on:false}},27,-15.5);
    put('suburban',{walls:{t:'brick',c:'#ffffff'},roof:{t:'shingles',c:'#3b3b3b'},trim:'#f3eee4',door:'#1f3a5f',glow:{on:false}},-8,15,Math.PI); put('cottage',{walls:{t:'siding',c:'#2f4f6e'},roof:{t:'metal',c:'#9aa0a6'},trim:'#ffffff',door:'#f0c445',glow:{on:false}},8,14,Math.PI);
    /* ---- the plane: a little red-and-white tow plane ---- */
    const P=new T.Group(), red=new T.MeshStandardMaterial({color:0xc8262c,roughness:.45,metalness:.2}), white=new T.MeshStandardMaterial({color:0xf3f1ec,emissive:0x55524c,roughness:.5}), dark=new T.MeshStandardMaterial({color:0x1d2026,roughness:.4,metalness:.5}), glassM=new T.MeshStandardMaterial({color:0x1b2a3a,roughness:.1,metalness:.6});
    const add=(geo,m,px,py,pz,rx,ry,rz)=>{ const o=new T.Mesh(geo,m); o.position.set(px,py,pz); o.rotation.set(rx||0,ry||0,rz||0); o.castShadow=true; P.add(o); return o; };
    const fus=new T.CylinderGeometry(.55,.3,6.2,16); fus.rotateZ(Math.PI/2); add(fus,white,0,0,0); const nose=new T.CylinderGeometry(.62,.55,1.1,16); nose.rotateZ(Math.PI/2); add(nose,red,3.6,0,0);
    const stripe=new T.CylinderGeometry(.565,.5,1.6,16,1,true); stripe.rotateZ(Math.PI/2); add(stripe,red,.6,0,0);
    add(new T.SphereGeometry(.55,14,10,0,Math.PI*2,0,Math.PI/2),glassM,1.4,.32,0,0,0,0).scale.set(1.4,.8,.9);
    add(new T.BoxGeometry(1.5,.12,10.4),white,1.1,.55,0); [-1,1].forEach(s=>add(new T.BoxGeometry(1.52,.13,1.3),red,1.1,.56,s*4.6));
    add(new T.BoxGeometry(.9,.08,3.4),white,-2.9,.1,0); add(new T.BoxGeometry(1,1.3,.08),red,-2.95,.7,0);
    add(new T.CylinderGeometry(.15,.15,.25,12).rotateZ(Math.PI/2),dark,4.2,0,0);
    const prop=new T.Mesh(new T.CircleGeometry(1.15,32),new T.MeshBasicMaterial({color:0x222222,transparent:true,opacity:.22,side:T.DoubleSide})); prop.rotation.y=Math.PI/2; prop.position.x=4.32; P.add(prop);
    [-1,1].forEach(s=>{ add(new T.CylinderGeometry(.05,.05,1,6),dark,1.6,-.9,s*.9,s*.35,0,0); add(new T.CylinderGeometry(.28,.28,.16,12).rotateX(Math.PI/2),dark,1.6,-1.35,s*1.05); });
    const navR=new T.Mesh(new T.SphereGeometry(.09,8,6),new T.MeshBasicMaterial({color:0xff2020,toneMapped:false})); navR.position.set(1.1,.56,5.2); P.add(navR); const navG=navR.clone(); navG.material=new T.MeshBasicMaterial({color:0x20ff60,toneMapped:false}); navG.position.z=-5.2; P.add(navG);
    S.add(P);
    /* ---- the banner: 18 m × 5 m cloth, white hem, rope bridle to the plane ---- */
    const BW=22, BH=6.1, seg=48; const bg=new T.PlaneGeometry(BW,BH,seg,6); const base=bg.attributes.position.array.slice();
    const banner=new T.Mesh(bg,new T.MeshBasicMaterial({map:VT[0],side:T.DoubleSide,toneMapped:false})); S.add(banner);
    const hemG=new T.PlaneGeometry(BW+.5,BH+.5,seg,6), hbase=hemG.attributes.position.array.slice(); const hem=new T.Mesh(hemG,new T.MeshStandardMaterial({color:0xf4f2ee,side:T.DoubleSide,roughness:.8})); S.add(hem);
    const pole=new T.Mesh(new T.CylinderGeometry(.06,.06,BH+.8,8),dark); S.add(pole);
    const ropeG=new T.BufferGeometry(); ropeG.setAttribute('position',new T.Float32BufferAttribute(new Array(9*3).fill(0),3)); const rope=new T.Line(ropeG,new T.LineBasicMaterial({color:0x222222})); S.add(rope);
    const wave=(arr,src,t,lead)=>{ for(let i=0;i<arr.length;i+=3){ const u=src[i], v=src[i+1]; const k=(BW/2-u)/BW; const amp=.15+k*k*1.4; arr[i]=u; arr[i+1]=v+Math.sin(t*5.1+k*7)*k*.25; arr[i+2]=Math.sin(t*6.3+k*9+v*.15)*amp; } };
    const cam=new T.PerspectiveCamera(46,W/H,.1,600);
    window.__frame=(f,n,mode)=>{ const t=f/24; const span=200, sp=span/(n/24); let px=-100+sp*t, py=27+Math.sin(t*.8)*.6, pz=-46;
      if(mode==='still'){ px=14; }
      P.position.set(px,py,pz); P.rotation.set(Math.sin(t*1.3)*.04,0,Math.sin(t*.9)*.02); prop.rotation.x=t*40;
      const bx=px-15-BW/2, by=py-1.2; banner.position.set(bx,by,pz); hem.position.set(bx,by,pz-.02); pole.position.set(bx+BW/2+.3,by,pz);
      const a=bg.attributes.position.array; wave(a,base,t); bg.attributes.position.needsUpdate=true; bg.computeVertexNormals();
      const ha=hemG.attributes.position.array; wave(ha,hbase,t); hemG.attributes.position.needsUpdate=true;
      banner.material.map=VT[f%VT.length]; banner.material.needsUpdate=true;
      const r=ropeG.attributes.position.array, A=new T.Vector3(px-3.1,py-.1,pz), B=new T.Vector3(bx+BW/2+.3,by,pz); for(let k=0;k<9;k++){ const q=k/8; r[k*3]=A.x+(B.x-A.x)*q; r[k*3+1]=A.y+(B.y-A.y)*q-Math.sin(q*Math.PI)*.8; r[k*3+2]=pz; } ropeG.attributes.position.needsUpdate=true;
      if(mode==='still'){ cam.position.set(-4,1.8,7); cam.lookAt(-6,15,-46); }
      else { cam.position.set(-6,1.8,7); cam.lookAt(px*.45-12,15,-46); }
      R.render(S,cam); return R.domElement.toDataURL('image/jpeg',.9); };
  },[VF,W,H]);
  if(MODE==='still'){ const d=await p.evaluate(()=>window.__frame(60,144,'still')); fs.writeFileSync('out/plane/still.jpg',Buffer.from(d.split(',')[1],'base64')); }
  else for(let f=0;f<N;f++){ const d=await p.evaluate(([f,N])=>window.__frame(f,N,'video'),[f,N]); fs.writeFileSync('out/plane/frames/'+String(f).padStart(4,'0')+'.jpg',Buffer.from(d.split(',')[1],'base64')); }
  console.log('errors',errs.slice(0,3)); await b.close();
})();
