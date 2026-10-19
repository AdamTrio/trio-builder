// t128 — v79: Realistic kit batch 2 (nature): stream, stream bend, stream pool, flower meadow, birch grove, autumn forest, boulder hill.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(''+e));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:90000}); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ window.confirm=()=>true; });
  const NEW={N11R:'WNWN',N12R:'WWNN',N13R:'WNNN',N14R:'NNNN',N15R:'NNNN',N16R:'NNNN',N17R:'NNNN'};
  const pcs=await p.evaluate(NEW=>{ const W=window.HEXCORE.WORLD, out={}, R=W.realMat(), SURF=[R.ground,R.bed,R.water,R.lily];
    Object.keys(NEW).forEach(id=>{ const pc=W.piece(id), g=W.buildPiece(id); g.updateMatrixWorld(true); let minY=1e9, tris=0, maxXZ=0;
      g.traverse(o=>{ if(!o.isMesh) return; const G=o.geometry; tris+=(G.index?G.index.count:G.attributes.position.count)/3; const bb=new THREE.Box3().setFromObject(o); if(SURF.includes(o.material)) minY=Math.min(minY,bb.min.y); maxXZ=Math.max(maxXZ,Math.abs(bb.min.x),Math.abs(bb.max.x),Math.abs(bb.min.z),Math.abs(bb.max.z)); });
      out[id]={e:pc&&pc.e, kit:pc&&pc.kit, name:pc&&pc.name, minY:+minY.toFixed(3), tris:Math.round(tris), ext:+maxXZ.toFixed(2)}; }); return out; },NEW);
  check(Object.keys(NEW).every(id=>pcs[id].kit==='real'&&pcs[id].e===NEW[id]),'7 new Realistic nature pieces with the right edges '+JSON.stringify(Object.keys(NEW).map(k=>pcs[k].name+':'+pcs[k].e)));
  check(Object.keys(pcs).every(id=>pcs[id].minY>=-0.02),'nothing dips under the world floor '+JSON.stringify(Object.keys(pcs).map(k=>k+':'+pcs[k].minY)));
  check(Object.keys(pcs).every(id=>pcs[id].ext<=9.2),'nothing reaches far past its square '+JSON.stringify(Object.keys(pcs).map(k=>k+':'+pcs[k].ext)));
  check(Object.keys(pcs).every(id=>pcs[id].tris<40000),'each piece stays light (under 40k triangles) '+JSON.stringify(Object.keys(pcs).map(k=>k+':'+pcs[k].tris)));
  const mt=await p.evaluate(()=>{ const M=window.HEXCORE.WORLD.MATCH; return {ww:M.W.indexOf('W')>=0, wn:M.W.indexOf('N')>=0||M.N.indexOf('W')>=0}; });
  check(mt.ww&&!mt.wn,'a stream edge joins only another stream');
  // lay a stream across the map: it joins cleanly; a stream running into grass shows the red edge
  await p.evaluate(()=>[...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click()); await p.waitForTimeout(3000);
  const names=await p.evaluate(()=>{ [...document.querySelectorAll('#wmap .wkits button')].find(x=>x.textContent==='Realistic kit').click(); [...document.querySelectorAll('#wmap .wtabs button')].find(x=>x.textContent==='Nature').click(); return [...document.querySelectorAll('#wmap .wpc')].map(x=>x.textContent.trim()); });
  check(['Stream','Stream bend','Stream pool','Flower meadow','Birch grove','Autumn forest','Boulder hill'].every(n=>names.some(t=>t.indexOf(n)>=0)),'the Realistic Nature tray offers them '+JSON.stringify(names.slice(-8)));
  const good=await p.evaluate(()=>{ const M=window.__wmap(); M.place(19,'N13R',2); M.place(27,'N11R',0); M.place(35,'N13R',0); M.place(26,'N16R',0); M.place(28,'N15R',0); M.check(); return M.warn(); });
  const badJ=await p.evaluate(()=>{ const M=window.__wmap(); M.place(43,'N11R',0); M.check(); return M.warn(); });
  const cnt=w=>(w||'').trim().length;
  check(cnt(good)===0&&cnt(badJ)>0,'a stream with a pool at each end joins cleanly; a stream running into grass shows the red edge '+JSON.stringify([good,badJ]));
  await p.evaluate(()=>{ window.__wmap().place(43,null,0); document.querySelector('#wmap [data-a="walk"]').click(); }); await p.waitForTimeout(7000);
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); const N=window.HEXCORE.NAV; N.pos.x=-4; N.pos.z=24; N.eye=8; window.HEX.setYaw(0); }); await p.waitForTimeout(3000);
  await p.screenshot({path:path.join(__dirname,'..','out','t128-stream.png')});
  const tiles=await p.evaluate(()=>window.HEX._world.tiles.children.length);
  check(tiles>0,'walking it: the pieces are laid ('+tiles+' parts)');
  check(!errs.length,'no page errors '+JSON.stringify(errs.slice(0,3)));
  await b.close();
  ok.forEach(m=>console.log('  ✓ '+m)); bad.forEach(m=>console.log('  ✗ '+m)); console.log((bad.length?'FAIL ':'PASS ')+ok.length+' / '+(ok.length+bad.length));
})();
