// t94 — tapping an egg's glint sets off the model's trigger too (one moment); the card says "collect"
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
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
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stgBody>.stsec')].find(x=>x.style.display!=='none'); const b=[...s.querySelectorAll('button')].find(x=>/^\+ /.test(x.textContent)&&!/upload|hang|play-me|trigger/.test(x.textContent)); b.click(); });
  await p.waitForTimeout(800);
  await seg('Easter egg','on'); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const t=[...document.querySelectorAll('#stg .stctl input')].find(i=>i.placeholder==='a short title'); t.value='The crate'; t.dispatchEvent(new Event('input')); });
  await seg('Tap sets things off','on'); await p.waitForTimeout(300);
  await btn('+ something happens'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stg select')].find(x=>x.querySelector('optgroup')); s.value='uplights'; s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='· fade'); const i=f.querySelector('input'); i.value=.3; i.dispatchEvent(new Event('input')); });
  await seg('Each tap','flips on / off'); await p.waitForTimeout(800);
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t94.html'); await dl.saveAs(bp); await p.close();
  const q=await b.newPage({viewport:{width:1280,height:800}}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t94.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(3500);
  const up=()=>q.evaluate(()=>+window.HEXCORE.upK(window.HEX).toFixed(2));
  check(await up()===0,'uplights start off');
  const gp=await q.evaluate(()=>{ const E=window.HEXCORE.ROOMEGGS.userData.eggs[0]; const v=E.glint.getWorldPosition(new THREE.Vector3()).project(window.HEX.cam); return {x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight}; });
  await q.mouse.click(gp.x,gp.y); await q.waitForTimeout(2500);
  const r=await q.evaluate(()=>({on:document.getElementById('hexEgg').classList.contains('on'), btn:[...document.querySelectorAll('#hexEgg button.pl')].map(x=>x.textContent)}));
  check(r.on,'tapping the glint opens the egg');
  check(await up()<.05,'v58: while the egg is open, the room waits (uplights still off)');
  check(r.btn.includes('collect')&&!r.btn.includes('back to the room'),'the card says "collect" ('+r.btn+')');
  await q.evaluate(()=>[...document.querySelectorAll('#hexEgg button.pl')].find(x=>x.textContent==='collect').click()); await q.waitForTimeout(2500);
  check(await up()>.95,'v58: collect → the room reacts (uplights on)');
  // tap the model itself: one moment, not two (flips once → off)
  const mp=await q.evaluate(()=>{ const E=window.HEXCORE.ROOMEGGS.userData.eggs[0]; const r=new THREE.Raycaster(); for(let y=.25;y<.95;y+=.02) for(let x=.1;x<.9;x+=.02){ r.setFromCamera(new THREE.Vector2(x*2-1,-(y*2-1)),window.HEX.cam); if(r.intersectObject(E.obj,true).filter(h=>h.object!==E.obj.userData.shadow).length) return {x:x*innerWidth,y:y*innerHeight}; } return null; });
  if(mp){ await q.mouse.click(mp.x,mp.y); await q.waitForTimeout(2500); }
  check(mp&&await up()<.05,'tapping the model: egg + trigger count as one tap (flips once)');
  await q.close();
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
