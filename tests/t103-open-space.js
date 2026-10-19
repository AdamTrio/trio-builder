// t103 — v59: Open Space — 4th card; Mood Room controls + a floating platform; invisible walls (art floats); bakes + publishes
const { chromium } = require('playwright'); const path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); let p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2500);
  const cards=await p.evaluate(()=>[...document.querySelectorAll('#hexGate button b')].map(x=>x.textContent));
  check(cards.includes('OPEN SPACE')&&cards.length===5,'start screen: 5 cards incl. OPEN SPACE + WORLD v71 ('+cards.join(', ')+')');
  await p.evaluate(()=>[...document.querySelectorAll('#hexGate button')].find(x=>x.dataset.s==='open').click());
  await p.waitForFunction(()=>location.search.indexOf('space=open')>=0&&window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:60000}); await p.waitForTimeout(2500);
  const st=()=>p.evaluate(()=>{ const H=window.HEX, S=H._mood, X=S&&S.open; return {open:!!(X&&X.on), mood:!!(S&&S.on), walls:H.walls.map(w=>w.visible?(w.material.opacity<.5?'ghost':'art'):'off'),
    ceil:S&&S.ceil.visible, stars:H.stars.visible, isl:X&&X.isl.visible, title:document.title}; });
  let s=await st(); check(s.open&&s.mood,'Open Space runs the Mood Room + the platform ('+JSON.stringify(s)+')');
  check(s.walls.every(w=>w==='ghost'),'builder: walls show faintly so you can click them');
  check(!s.ceil&&s.stars&&s.isl,'roof open, stars and floating islands on');
  check(await p.evaluate(()=>[...document.querySelectorAll('#stg .stf label')].some(l=>l.textContent==='Edge glow')),'Room tab: Open space section (Edge glow, Floating islands)');
  // wall art on the front wall → it floats
  await p.evaluate(()=>{ const b=document.querySelector('#stgRail button[data-tab="walls"]'); b.click(); }); await p.waitForTimeout(500);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>{ const r=[...document.querySelectorAll('#stg .strow')].find(x=>/Wall 0/.test(x.textContent)); r.querySelector('button.add').click(); })]);
  await fc.setFiles(A('back.jpg')); await p.waitForTimeout(2500); await p.waitForFunction(()=>window.HEX.walls[0].material.opacity>.5,null,{timeout:15000}).catch(()=>{});
  s=await st(); check(s.walls[0]==='art'&&s.walls.slice(1).every(w=>w==='ghost'),'wall art: that wall shows (a floating panel), the rest stay faint ('+s.walls.join(',')+')');
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); window.HEX.setYaw(0); }); await p.waitForTimeout(800);
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t103.html'); await dl.saveAs(bp); await p.close();
  const q=await ctx.newPage(); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t103.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(3500);
  const pub=await q.evaluate(()=>{ const H=window.HEX, S=H._mood, X=S&&S.open; return {bake:!!(window.HEXBAKE.mood&&window.HEXBAKE.mood.open), open:!!(X&&X.on), walls:H.walls.map(w=>w.visible?'on':'off'), ceil:S.ceil.visible, stars:H.stars.visible}; });
  check(pub.bake&&pub.open,'published: the bake carries Open Space');
  check(pub.walls[0]==='on'&&pub.walls.slice(1).every(w=>w==='off'),'published: empty walls invisible, the art wall floats ('+pub.walls.join(',')+')');
  check(!pub.ceil&&pub.stars,'published: open sky');
  for(const [n,y] of [['front',0],['side',2.2],['back',Math.PI]]){ await q.evaluate(v=>window.HEX.setYaw(v),y); await q.waitForTimeout(1500); await q.screenshot({path:'shots/t103-'+n+'.png'}); }
  await q.close();
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
