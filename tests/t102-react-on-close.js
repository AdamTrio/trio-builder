// t102 — v58: the room reacts when the egg is put away — ✕ and collect are the same; tapping the model with a live egg waits
const { chromium } = require('playwright'); const path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  const tab=t=>p.evaluate(t=>{ const b=document.querySelector('#stgRail button[data-tab="'+t+'"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); },t);
  await tab('light'); await p.waitForTimeout(300); await seg('At the start','off · waits'); await p.waitForTimeout(300);
  await tab('models'); await p.waitForTimeout(300);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),btn('drop a model file…')]); await fc.setFiles(A('model.glb'));
  await p.waitForFunction(()=>window.HEX.scene.children.some(o=>o.userData.isProp),null,{timeout:30000}); await p.waitForTimeout(600);
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stgBody>.stsec')].find(x=>x.style.display!=='none'); const r=s.querySelector('.strow'); if(r&&!r.classList.contains('sel')) r.click(); }); await p.waitForTimeout(400);
  await seg('Easter egg','on'); await p.waitForTimeout(400);
  await seg('Tap sets things off','on'); await p.waitForTimeout(300);
  await btn('+ something happens'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stg select')].find(x=>x.querySelector('optgroup')); s.value='uplights'; s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='· fade'); const i=f.querySelector('input'); i.value=.3; i.dispatchEvent(new Event('input')); });
  await p.waitForTimeout(500);
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t102.html'); await dl.saveAs(bp); await p.close();
  const q=await ctx.newPage(); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t102.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(3500);
  const up=()=>q.evaluate(()=>+window.HEXCORE.upK(window.HEX).toFixed(2));
  const open=()=>q.evaluate(()=>{ const e=document.getElementById('hexEgg'); return !!(e&&e.classList.contains('on')); });
  // tap the MODEL (not the glint): egg opens, room waits
  const mp=await q.evaluate(()=>{ const E=window.HEXCORE.ROOMEGGS.userData.eggs[0]; const r=new THREE.Raycaster(); for(let y=.3;y<.95;y+=.02) for(let x=.1;x<.9;x+=.02){ r.setFromCamera(new THREE.Vector2(x*2-1,-(y*2-1)),window.HEX.cam); if(r.intersectObject(E.obj,true).filter(h=>h.object!==E.obj.userData.shadow).length) return {x:x*innerWidth,y:y*innerHeight}; } return null; });
  await q.mouse.click(mp.x,mp.y); await q.waitForTimeout(2200);
  check(await open(),'tapping the model opens its egg');
  check(await up()<.05,'…and the room waits while it is open');
  // ✕ = collect
  await q.evaluate(()=>document.querySelector('#hexEgg button.x').click()); await q.waitForTimeout(2200);
  check(await up()>.95,'✕ puts it away → the room reacts');
  check(await q.evaluate(()=>Object.keys(window.HEXCORE.EGGGONE).length===1),'✕ counts as collected (glint goes away)');
  // egg gone: tapping the model now sets off its moment straight away (once mode: stays)
  await q.close();
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
