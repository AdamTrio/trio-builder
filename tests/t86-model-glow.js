// t86 — Mood Room: glow on any model (colour, brightness, light on the room, behaviour), survives lit/unlit, bakes + publishes
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const slide=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab); const i=f.querySelector('input[type=range]'); i.value=v; i.dispatchEvent(new Event('input')); },[lab,v]);
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="models"]').click()); await p.waitForTimeout(300);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()==='drop a model file…').click())]);
  await fc.setFiles(A('model.glb')); await p.waitForFunction(()=>window.HEX.scene.children.some(o=>o.userData.isProp),null,{timeout:30000}); await p.waitForTimeout(800);
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stgBody>.stsec')].find(x=>x.style.display!=='none'); const r=s.querySelector('.strow'); if(r&&!r.classList.contains('sel')) r.click(); }); await p.waitForTimeout(500);
  const g=()=>p.evaluate(()=>{ const G=window.HEX.scene.children.find(o=>o.userData.isProp); const L=G.userData.glowLight; const ms=G.userData.glowMats||[];
    return {mats:ms.length, tm:ms.every(m=>m.toneMapped===false), light:!!(L&&L.parent), li:L?+L.intensity.toFixed(3):0, c:ms[0]?ms[0].color.r:0}; });
  await seg('Glow','on'); await p.waitForTimeout(400);
  let d=await g(); check(d.mats>0&&d.tm&&d.light&&d.c>1,'Glow on: model burns brighter than white + a light inside it ('+JSON.stringify(d)+')');
  await slide('Light on room',2); await p.waitForTimeout(200);
  d=await g(); check(Math.abs(d.li-6.4)<.01,'Light on room drives the light ('+d.li+')');
  await seg('Behaviour','flicker'); await p.waitForTimeout(100);
  const xs=[]; for(let i=0;i<12;i++){ xs.push((await g()).li); await p.waitForTimeout(90); }
  check(Math.max(...xs)-Math.min(...xs)>.3,'Flicker moves the light ('+Math.min(...xs).toFixed(2)+'…'+Math.max(...xs).toFixed(2)+')');
  await seg('Behaviour','strobe'); await p.waitForTimeout(100);
  const ys=[]; for(let i=0;i<12;i++){ ys.push((await g()).li); await p.waitForTimeout(40); }
  check(Math.min(...ys)<1&&Math.max(...ys)>6,'Strobe flashes');
  await seg('Behaviour','steady');
  // lit/unlit keeps the glow
  await p.evaluate(()=>[...document.querySelectorAll('#stg button')].find(x=>/^(lit|unlit)$/.test(x.textContent.trim())).click()); await p.waitForTimeout(500);
  d=await g(); check(d.mats>0&&d.light,'switching lit/unlit keeps the glow');
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); window.HEX.setYaw(0); }); await p.waitForTimeout(900);
  await p.screenshot({path:'shots/t86-glow.png'});
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="models"]').click()); await p.waitForTimeout(400);
  await p.screenshot({path:'shots/t86-glow-panel.png'});
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t86.html'); await dl.saveAs(bp);
  const q=await b.newPage({viewport:{width:1280,height:800}}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t86.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(3500);
  const d2=await q.evaluate(()=>{ const G=window.HEX.scene.children.find(o=>o.userData.isProp); return G?{mats:(G.userData.glowMats||[]).length, light:!!G.userData.glowLight, n:window.HEXCORE.GLOWS.length}:null; });
  check(d2&&d2.mats>0&&d2.light&&d2.n===1,'published room: the model glows ('+JSON.stringify(d2)+')');
  await q.screenshot({path:'shots/t86-published.png'}); await q.close();
  await seg('Glow','off'); await p.waitForTimeout(400);
  d=await g(); check(d.mats===0&&!d.light,'Glow off puts the model back as it was');
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
