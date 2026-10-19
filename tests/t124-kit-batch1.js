// t124 — v75: Realistic kit batch 1. The road sits ON the floor (no see-through), tray pictures aren't black,
// the 11 new pieces build with their textures, lamps and edges, the pond stays above the floor, and a bake carries them.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(''+e));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:90000}); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ window.confirm=()=>true; });
  // every piece builds; nothing sits below the floor; edges as promised
  const NEW={C13R:'RCRC',C02R:'RRCC',C03R:'RRRC',C04R:'RRRR',C05R:'RCCC',N01R:'NNNN',N04R:'NNNN',N05R:'PNPN',N06R:'PPNN',N07R:'PPPN',N10R:'NNNN'};
  const pcs=await p.evaluate(NEW=>{ const W=window.HEXCORE.WORLD, out={};
    Object.keys(NEW).concat(['C01R']).forEach(id=>{ const pc=W.piece(id), g=W.buildPiece(id); g.updateMatrixWorld(true); let minY=1e9, tris=0;
      const RMt=W.realMat(), SURF=[RMt.ground,RMt.dirt,RMt.bed,RMt.water,RMt.asphalt,RMt.slab,RMt.curb,RMt.lily]; g.traverse(o=>{ if(!o.isMesh) return; const G=o.geometry; tris+=(G.index?G.index.count:G.attributes.position.count)/3; if(SURF.includes(o.material)){ const bb=new THREE.Box3().setFromObject(o); minY=Math.min(minY,bb.min.y); } });
      out[id]={e:pc&&pc.e, kit:pc&&pc.kit, minY:+minY.toFixed(3), tris:Math.round(tris), lamps:(g.userData.lamps||[]).length}; }); return out; },NEW);
  check(Object.keys(NEW).every(id=>pcs[id].kit==='real'&&pcs[id].e===NEW[id]),'11 new Realistic pieces with the right edges '+JSON.stringify(Object.keys(NEW).map(k=>k+':'+pcs[k].e)));
  check(Object.keys(pcs).every(id=>pcs[id].minY>=-0.001),'no ground, road or water dips under the world floor (ground, paths, road, sidewalks, pond) '+JSON.stringify(Object.keys(pcs).map(k=>k+':'+pcs[k].minY)));
  check(['C01R','C13R','C02R','C03R','C04R','C05R'].every(id=>pcs[id].lamps>=2),'every street piece has its lamps');
  check(Object.keys(pcs).every(id=>pcs[id].tris<40000),'each piece stays light (under 40k triangles) '+JSON.stringify(Object.keys(pcs).map(k=>k+':'+pcs[k].tris)));
  // the asphalt is above the floor and the road shows asphalt from above
  const road=await p.evaluate(()=>{ const W=window.HEXCORE.WORLD, g=W.buildPiece('C01R'), R=W.realMat(); let a=null; g.traverse(o=>{ if(o.isMesh&&o.material===R.asphalt) a=o; }); return a?+a.position.y.toFixed(3):null; });
  check(road!==null&&road>0,'Road straight: the asphalt sits on top of the floor (y '+road+')');
  // tray pictures: open the map, wait, and check a Realistic picture is not black
  await p.evaluate(()=>[...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click()); await p.waitForTimeout(6000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#wmap .wtabs button')].find(x=>x.textContent==='Nature').click(); [...document.querySelectorAll('#wmap .wtabs button')].find(x=>x.textContent==='City').click(); }); await p.waitForTimeout(2500);
  const bright=await p.evaluate(async()=>{ const im=[...document.querySelectorAll('#wmap .wpc img')][0]; if(!im) return -1; await im.decode().catch(()=>{});
    const c=document.createElement('canvas'); c.width=32; c.height=32; const x=c.getContext('2d'); x.drawImage(im,0,0,32,32); const d=x.getImageData(0,0,32,32).data; let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2]; return s/(32*32*3); });
  check(bright>40,'the Road straight tray picture is not black (brightness '+Math.round(bright)+')');
  // a little town of new pieces joins up and walks
  const t=await p.evaluate(()=>{ const M=window.__wmap(); [[18,'C02R',3],[19,'C13R',1],[20,'C03R',2],[21,'C01R',1],[22,'C04R',0],[23,'C05R',3],[28,'C01R',0],[30,'C01R',0],[26,'N05R',0],[34,'N07R',0],[42,'N06R',3],[35,'N10R',0],[27,'N01R',0],[36,'N04R',0]].forEach(([i,id,r])=>M.place(i,id,r)); M.check(); return {count:M.count(),warn:M.warn()}; });
  check(/14/.test(t.count),'a small town of the new pieces goes down ('+t.count+')');
  await p.evaluate(()=>document.querySelector('#wmap [data-a="walk"]').click()); await p.waitForTimeout(5000);
  const w=await p.evaluate(()=>{ const X=window.HEX._world, R=window.HEXCORE.WORLD.realMat(); return {pieces:X.tiles.children.length, lamps:(X.lampPts||[]).length, water:!!(R.water&&R.water.normalMap&&R.water.normalMap.image), env:!!(R.water&&R.water.envMap), dirt:!!(R.dirt.map&&R.dirt.map.image)}; });
  check(w.pieces>10&&w.lamps>=10&&w.water&&w.dirt,'walking it: textured pieces, lamps, dirt paths, pond water '+JSON.stringify(w));
  check(w.env,'the pond reflects the sky');
  const o1=await p.evaluate(()=>window.HEXCORE.WORLD.realMat().water.normalMap.offset.x); await p.waitForTimeout(1500); const o2=await p.evaluate(()=>window.HEXCORE.WORLD.realMat().water.normalMap.offset.x);
  check(o2!==o1,'the water ripples slowly');
  await p.screenshot({path:path.join(__dirname,'..','out','t124-town.png')});
  // bake
  await p.evaluate(()=>document.getElementById('stg').classList.remove('open'));
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:180000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const f=path.join(__dirname,'..','out','t124.html'); await dl.saveAs(f); const html=fs.readFileSync(f,'utf8'); const bk=JSON.parse(/window\.HEXBAKE=(\{.*?\});<\/script>/s.exec(html)[1]);
  const kt=bk.mood.world.kittex||{}; check(['dirt_col','flowers','fern','water_nrm'].every(k=>kt[k]),'the bake carries the new textures (dirt, flowers, fern, water)');
  await p.close();
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t124.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(7000);
  const pub=await q.evaluate(()=>{ const X=window.HEX._world, R=window.HEXCORE.WORLD.realMat(); return {pieces:X.tiles.children.length, dirt:!!(R.dirt.map&&R.dirt.map.image&&R.dirt.map.image.width), lamps:(X.lampPts||[]).length}; });
  check(pub.pieces>10&&pub.dirt&&pub.lamps>=10,'published world: the new pieces arrive textured '+JSON.stringify(pub));
  await q.close();
  check(errs.length===0,'no page errors '+errs.slice(0,3).join(' | '));
  await b.close();
  console.log((bad.length?'FAIL ':'PASS ')+ok.length+(bad.length?' / FAIL '+bad.length:''));
  ok.forEach(m=>console.log('  ✓ '+m)); bad.forEach(m=>console.log('  ✗ '+m));
  process.exit(bad.length?1:0);
})();
