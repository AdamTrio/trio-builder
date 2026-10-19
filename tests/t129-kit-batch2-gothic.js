// t129 — v80: Realistic kit batch 2 (gothic): Dead forest, Graveyard, Swamp tiles + Gothic models (chapel ruin, iron gate, iron fence, gas lamp, 3 dead trees)
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(''+e));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:90000}); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ window.confirm=()=>true; });
  const NEW={N18R:'Dead forest',N19R:'Graveyard',N20R:'Swamp'};
  const pcs=await p.evaluate(NEW=>{ const W=window.HEXCORE.WORLD, out={}, R=W.realMat(), SURF=[R.mud,R.moss,R.swamp,R.lily,R.ground];
    Object.keys(NEW).forEach(id=>{ const pc=W.piece(id), g=W.buildPiece(id); g.updateMatrixWorld(true); let minY=1e9, tris=0, ext=0;
      g.traverse(o=>{ if(!o.isMesh) return; const G=o.geometry; tris+=(G.index?G.index.count:G.attributes.position.count)/3; const bb=new THREE.Box3().setFromObject(o); if(SURF.includes(o.material)) minY=Math.min(minY,bb.min.y); ext=Math.max(ext,Math.abs(bb.min.x),Math.abs(bb.max.x),Math.abs(bb.min.z),Math.abs(bb.max.z)); });
      out[id]={name:pc&&pc.name, e:pc&&pc.e, kit:pc&&pc.kit, minY:+minY.toFixed(3), tris:Math.round(tris), ext:+ext.toFixed(2), lamps:(g.userData.lamps||[]).length}; }); return out; },NEW);
  check(Object.keys(NEW).every(id=>pcs[id].kit==='real'&&pcs[id].name===NEW[id]&&pcs[id].e==='NNNN'),'3 gothic tiles in the Realistic kit '+JSON.stringify(Object.values(pcs).map(x=>x.name)));
  check(Object.keys(pcs).every(id=>pcs[id].minY>=-0.01),'nothing dips under the world floor '+JSON.stringify(Object.keys(pcs).map(k=>k+':'+pcs[k].minY)));
  check(Object.keys(pcs).every(id=>pcs[id].ext<=9.2),'nothing reaches far past its square '+JSON.stringify(Object.keys(pcs).map(k=>k+':'+pcs[k].ext)));
  check(Object.keys(pcs).every(id=>pcs[id].tris<40000),'each stays light '+JSON.stringify(Object.keys(pcs).map(k=>k+':'+pcs[k].tris)));
  check(pcs.N19R.lamps===2,'the graveyard’s two gas lamps join the street-lamp light pool');
  // models
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="models"]').click()); await p.waitForTimeout(400);
  const btns=await p.evaluate(()=>{ const h=[...document.querySelectorAll('#stg .stsub')].find(x=>x.textContent==='Gothic models'); return h?[...h.nextElementSibling.querySelectorAll('button')].map(b=>b.textContent):[]; });
  check(['+ Chapel ruin','+ Iron gate','+ Iron fence','+ Gas lamp','+ Dead tree','+ Twisted dead tree','+ Leaning dead tree'].every(t=>btns.includes(t)),'Models → Gothic models '+JSON.stringify(btns));
  for(const t of btns){ await p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t); await p.waitForTimeout(900); }
  const pr=await p.evaluate(()=>{ const out={}; window.HEXCORE.WORLDPROPS().forEach(q=>{ const g=window.HEXCORE.PROPG[q.id]; if(!g) return; let tri=0; const bb=new THREE.Box3().setFromObject(g); g.traverse(o=>{ if(o.isMesh){ const G=o.geometry; tri+=(G.index?G.index.count:G.attributes.position.count)/3; } }); out[q.kind]={tri:Math.round(tri),h:+(bb.max.y-bb.min.y).toFixed(1)}; }); return out; });
  check(['gchapel','ggate','gfence','glamp','gdead1','gdead2','gdead3'].every(k=>pr[k]&&pr[k].tri>50),'each gothic model builds '+JSON.stringify(pr));
  check(pr.gchapel&&pr.gchapel.h>10,'the chapel ruin stands tall (rose window up top)');
  const fl=await p.evaluate(async()=>{ const q=window.HEXCORE.WORLDPROPS().find(q=>q.kind==='glamp'), g=window.HEXCORE.PROPG[q.id]; let sp=null; g.traverse(o=>{ if(o.isSprite) sp=o; }); const a=sp.material.opacity; await new Promise(r=>setTimeout(r,300)); return [a,sp.material.opacity]; });
  check(fl[0]!==fl[1],'the gas lamp flickers '+JSON.stringify(fl));
  // a bake carries them
  await p.evaluate(()=>document.getElementById('stg').classList.remove('open'));
  const bp=path.join(__dirname,'..','out','t129.html'); const [dl]=await Promise.all([p.waitForEvent('download',{timeout:180000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]); await dl.saveAs(bp);
  const q=await ctx.newPage(); q.on('pageerror',e=>errs.push('pub: '+e)); await q.goto('http://127.0.0.1:8765/out/t129.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForTimeout(9000);
  const pub=await q.evaluate(()=>Object.keys(window.HEXCORE.PROPG||{}).length);
  check(pub>=7,'published: the gothic models are there ('+pub+')'); await q.close();
  check(!errs.length,'no page errors '+JSON.stringify(errs.slice(0,3)));
  await b.close();
  ok.forEach(m=>console.log('  ✓ '+m)); bad.forEach(m=>console.log('  ✗ '+m)); console.log((bad.length?'FAIL ':'PASS ')+ok.length+' / '+(ok.length+bad.length));
})();
