// t115 — v67: compressed models (EXT_meshopt_compression) open in the builder; publishing packs every model losslessly; published rooms open them
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
const glbJson=b=>{ const dv=new DataView(b.buffer,b.byteOffset,b.byteLength); return JSON.parse(new TextDecoder().decode(b.subarray(20,20+dv.getUint32(12,true)))); };
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(2000);
  check(await p.evaluate(()=>!!(window.MeshoptDecoder&&window.MeshoptEncoder)),'builder carries the decoder + encoder');
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  const verts=()=>p.evaluate(()=>window.HEX.scene.children.filter(o=>o.userData.isProp).map(g=>{ let n=0; g.traverse(m=>{ if(m.isMesh&&m.geometry&&m!==g.userData.shadow) n+=m.geometry.attributes.position.count; }); return n; }));
  await p.evaluate(()=>{ const b=document.querySelector('#stgRail button[data-tab="models"]'); b.click(); }); await p.waitForTimeout(300);
  for(const f of ['model.glb','model-meshopt.glb']){ const [fc]=await Promise.all([p.waitForEvent('filechooser'),btn('drop a model file…')]); await fc.setFiles(A(f));
    await p.waitForFunction(n=>window.HEX.scene.children.filter(o=>o.userData.isProp).length>=n,f==='model.glb'?1:2,{timeout:30000}).catch(()=>{}); await p.waitForTimeout(1200); }
  const v=await verts(); check(v.length===2&&v[0]>0&&v[0]===v[1],'a compressed model opens in the builder, same as the plain one ('+v.join(' / ')+' points)');
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); }); await p.waitForTimeout(400);
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:120000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t115.html'); await dl.saveAs(bp); await p.close();
  const html=fs.readFileSync(bp,'utf8'); const bake=JSON.parse(html.match(/window\.HEXBAKE=(\{.*?\});<\/script>/s)[1].replace(/\\u003c/g,'<'));
  const glbs=Object.values(bake.assets||{}).filter(u=>/^data:model|^data:application\/octet/.test(u)||/gltf/.test(u.slice(0,40)));
  const packed=glbs.map(u=>{ const bb=Buffer.from(u.split(',')[1],'base64'); return {size:bb.length, ext:(glbJson(new Uint8Array(bb)).extensionsUsed||[]).includes('EXT_meshopt_compression')}; });
  check(packed.length>=1&&packed.every(x=>x.ext),'publishing packs the models (EXT_meshopt_compression) '+JSON.stringify(packed));
  check(html.includes('var MeshoptDecoder')&&!html.includes('var MeshoptEncoder'),'the published room carries the decoder only (encoder stays in the builder)');
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t115.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(5000);
  const pv=await q.evaluate(()=>window.HEX.scene.children.filter(o=>o.userData.isProp).map(g=>{ let n=0; g.traverse(m=>{ if(m.isMesh&&m.geometry&&m!==g.userData.shadow) n+=m.geometry.attributes.position.count; }); return n; }));
  check(pv.length===2&&pv.every(n=>n>0),'published room opens both packed models ('+pv.join(' / ')+')');
  check(!errs.length,'no errors '+errs.join(' | '));
  ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(ok.length+'/'+(ok.length+bad.length)); await b.close();
})();
