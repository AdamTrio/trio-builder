// t109 — v63.1: the hidden "+ any" colour picker must stay inside its chip — real mouse clicks elsewhere in the editor still work
const { chromium } = require('playwright');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
const URL=process.argv[2]||'dist/trio-builder-admin.html';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/'+URL+'?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ const b=document.querySelector('#stgRail button[data-tab="room"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); }); await p.waitForTimeout(500);
  const hits=await p.evaluate(()=>{ const r=document.getElementById('stg').getBoundingClientRect(); let n=0, bad=0;
    for(let x=r.left+10;x<r.right-10;x+=25) for(let y=r.top+10;y<Math.min(r.bottom,800)-10;y+=25){ n++; const e=document.elementFromPoint(x,y); if(e&&e.matches('input[type=color]')&&!e.closest('label.any')) bad++;
      if(e&&e.matches('label.any input')){ const a=e.closest('label.any').getBoundingClientRect(); if(x<a.left-1||x>a.right+1||y<a.top-1||y>a.bottom+1) bad++; } }
    return {n,bad}; });
  check(hits.bad===0,'no hidden colour picker outside the "+ any" chips ('+JSON.stringify(hits)+')');
  // a real mouse click on "gallery" and on a pink swatch
  const box=async sel=>p.evaluate(sel=>{ const e=eval(sel); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; },sel);
  let [x,y]=await box(`[...document.querySelectorAll('#stg .stseg button')].find(b=>b.textContent==='gallery')`); await p.mouse.click(x,y); await p.waitForTimeout(500);
  check(await p.evaluate(()=>window.HEX._mood.M.look==='gallery'),'real click: Look → gallery works');
  [x,y]=await box(`document.querySelector('#stg .stswr button.dot[title="#ff1f7e"]')`); await p.mouse.click(x,y); await p.waitForTimeout(500);
  check(await p.evaluate(()=>(window.HEX._mood.M.color||{}).walls==='#ff1f7e'),'real click: a colour swatch works');
  // a drag-select across the swatches, then a click elsewhere still works
  [x,y]=await box(`document.querySelector('#stg .stswr')`); await p.mouse.move(x-120,y); await p.mouse.down(); await p.mouse.move(x+140,y+120,{steps:8}); await p.mouse.up(); await p.waitForTimeout(300);
  [x,y]=await box(`[...document.querySelectorAll('#stg .stseg button')].find(b=>b.textContent==='dusk')`); await p.mouse.click(x,y); await p.waitForTimeout(500);
  check(await p.evaluate(()=>window.HEX._mood.M.look==='dusk'),'after a drag across the swatches: clicks still work');
  check(!errs.length,'no errors '+errs.join(' | '));
  ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(ok.length+'/'+(ok.length+bad.length)); await b.close();
})();
