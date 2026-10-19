// t99 — v55: Cracked + Peeling paint packs on walls/floor; the bake carries them and the published room shows them
const { chromium } = require('playwright'); const path=require('path');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const tab=t=>p.evaluate(t=>{ const b=document.querySelector('#stgRail button[data-tab="'+t+'"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); },t);
  await tab('room'); await p.waitForTimeout(400);
  const opts=await p.evaluate(()=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='Walls'); return f?[...f.querySelectorAll('button')].map(x=>x.textContent):[]; });
  check(opts.includes('cracked')&&opts.includes('peeling paint'),'Walls offers cracked + peeling paint ('+opts.join('|')+')');
  await seg('Walls','cracked'); await seg('Floor','peeling paint'); await p.waitForTimeout(1500);
  await p.screenshot({path:'shots/t99-builder.png'});
  const libs=await p.evaluate(()=>Object.keys(window.HEXMOODTEX).filter(k=>/cracked|paint/.test(k)).sort().join(','));
  check(libs==='cracked_col,cracked_nrm,cracked_rgh,paint_col,paint_nrm,paint_rgh','all six maps are in the library');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t99.html'); await dl.saveAs(bp); await p.close();
  const q=await ctx.newPage(); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t99.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(3500);
  const pub=await q.evaluate(()=>{ const m=window.HEXBAKE.mood; return {walls:m.walls, floor:m.floor, tex:Object.keys(m.tex||{}).sort().join(',')}; });
  check(pub.walls==='cracked'&&pub.floor==='paint'&&/cracked_col/.test(pub.tex)&&/paint_col/.test(pub.tex),'the bake carries them ('+JSON.stringify(pub)+')');
  await q.evaluate(()=>window.HEX.setYaw(0)); await q.waitForTimeout(1500); await q.screenshot({path:'shots/t99-pub.png'});
  await q.close();
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
