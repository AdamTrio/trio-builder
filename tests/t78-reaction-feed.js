// t78 — reactions as a right-side feed (desktop + phone): no overlap with joystick / tabs
const { chromium } = require('playwright'); const path=require('path');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
 await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=event'); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1000);
 const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()==='bake .html').click())]);
 const bp=path.join(__dirname,'..','out','t78-baked.html'); await dl.saveAs(bp);
 for(const [w,h,name,mob] of [[1280,720,'desktop',false],[390,844,'phone',true]]){
  const q=await b.newPage({viewport:{width:w,height:h},isMobile:mob,hasTouch:mob}); const e=[]; q.on('pageerror',x=>e.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t78-baked.html'); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(1500);
  await q.evaluate(()=>window.HEX.enterRoom&&window.HEX.enterRoom()); await q.waitForTimeout(1500);
  for(const t of ['🔥','⚡','💀']){ const r=await q.evaluate(t=>{ const b=document.querySelector('#reacts button[data-r="'+t+'"]').getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; },t);
    await q.mouse.click(r.x,r.y); await q.waitForTimeout(150); }
  const top=await q.evaluate(()=>{ const b=document.querySelector('#reacts button').getBoundingClientRect(); const e=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return e&&e.closest('#reacts')?'ok':(e?e.id||e.tagName:'none'); });
  check(top==='ok',name+': the emoji buttons are on top (nothing covers them: '+top+')');
  await q.waitForTimeout(9000);
  const r=await q.evaluate(()=>{ const box=s=>{ const n=document.querySelector(s); if(!n||getComputedStyle(n).display==='none') return null; const r=n.getBoundingClientRect(); return r.width?{l:r.left,t:r.top,r:r.right,b:r.bottom}:null; };
    const hit=(a,b)=>a&&b&&a.l<b.r&&b.l<a.r&&a.t<b.b&&b.t<a.b;
    const rail=box('#rail'), nav=box('#hexStick'); const bs=[...document.querySelectorAll('#hexTabs button')].map(x=>x.getBoundingClientRect()).filter(r=>r.width); const tabs=bs.length?{l:Math.min(...bs.map(r=>r.left)),t:Math.min(...bs.map(r=>r.top)),r:Math.max(...bs.map(r=>r.right)),b:Math.max(...bs.map(r=>r.bottom))}:null;
    return {rail, nav:!!nav, tabs:!!tabs, overNav:hit(rail,nav), overTabs:hit(rail,tabs), n:document.querySelectorAll('#tl .m').length, me:!!document.querySelector('#tl .m.me'), right:innerWidth-(rail?rail.r:0)}; });
  check(r.rail&&r.n>=3,name+': feed shows bubbles ('+r.n+')');
  check(r.me,name+': your reaction is highlighted');
  check(!r.overNav&&!r.overTabs,name+': feed clears the joystick and the tabs (nav '+r.nav+', tabs '+r.tabs+')');
  check(r.right<20,name+': feed hugs the right side');
  check(e.length===0,name+': no errors'+(e[0]?': '+e[0]:''));
  await q.screenshot({path:'shots/t78-'+name+'.png'}); await q.close();
 }
 await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`); })();
