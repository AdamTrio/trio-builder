// t98 — v54.1: preview as a fan shows the record pill; the downloaded room doesn't
const { chromium } = require('playwright'); const path=require('path');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const [w]=await Promise.all([ctx.waitForEvent('page'), p.evaluate(()=>[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='preview as a fan').click())]);
  await w.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await w.waitForTimeout(2500);
  const pill=await w.evaluate(()=>{ const e=document.getElementById('hexRec'); return e?[...e.querySelectorAll('button')].map(x=>x.textContent).join('|'):null; });
  check(pill&&/record 360/.test(pill),'preview as a fan: the record pill is there ('+pill+')');
  await w.close();
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t98.html'); await dl.saveAs(bp); await p.close();
  const q=await ctx.newPage(); await q.goto('http://127.0.0.1:8765/out/t98.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(2000);
  check(!(await q.$('#hexRec')),'the downloaded room: no pill (fans never see it)');
  await q.close();
  check(errs.length===0,'no errors'+(errs[0]?': '+errs[0]:''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
