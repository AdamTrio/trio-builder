// t112 — v66: add-on "Beam ceiling" — ceiling lifts + glows, pattern-A beams under it; the roof still opens (beams fade or stay); bakes only when on
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(2500);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const tab=t=>p.evaluate(t=>{ const b=document.querySelector('#stgRail button[data-tab="'+t+'"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); },t);
  const tog=name=>p.evaluate(n=>{ const c=[...document.querySelectorAll('#stg .stcard')].find(x=>x.querySelector('b')&&x.querySelector('b').firstChild.textContent===n); c.querySelector('.sttog').click(); },name);
  const st=pg=>pg.evaluate(()=>{ const H=window.HEX, X=H._beams, S=H._mood; if(!X) return {on:false, ceilY:+S.ceil.position.y.toFixed(2)};
    const beams=X.g.children.filter(o=>o.isMesh&&o.material===X.bm);
    return {on:true, ceilY:+S.ceil.position.y.toFixed(2), wall:H.WALL_H, beams:beams.length, beamsVis:beams.filter(o=>o.visible).length, well:X.g.children.filter(o=>o.userData.well&&o.visible).length, ceilVis:S.ceil.visible}; });
  await tab('addons'); await p.waitForTimeout(400);
  const names=await p.evaluate(()=>[...document.querySelectorAll('#stg .stcard b')].map(x=>x.firstChild.textContent));
  check(names.includes('Beam ceiling'),'drawer: "Beam ceiling" ('+names.join(', ')+')');
  let s=await st(p); check(!s.on,'off by default: nothing built ('+JSON.stringify(s)+')');
  await tog('Beam ceiling'); await p.waitForTimeout(1500);
  s=await st(p); check(s.on&&s.beams===15&&s.ceilY>s.wall+1&&s.well===6&&s.ceilVis,'on: ceiling lifts, 15 beams + the band up to it ('+JSON.stringify(s)+')');
  const labs=await p.evaluate(()=>[...document.querySelectorAll('#stg .stcard.on .stf label')].map(x=>x.textContent));
  check(['Beams','Beam depth','Glow','Glow colour','Roof opens'].every(l=>labs.includes(l)),'dials: Beams, Beam depth, Glow, Glow colour, Roof opens');
  // the roof still opens
  await tab('room'); await p.waitForTimeout(300); await seg('Roof','open sky'); await p.waitForTimeout(1200);
  s=await st(p); check(!s.ceilVis&&s.beamsVis===0&&s.well===0,'Roof → open sky: ceiling, beams and band all go — the sky shows ('+JSON.stringify(s)+')');
  await seg('Roof','on'); await p.waitForTimeout(1200);
  s=await st(p); check(s.ceilVis&&s.beamsVis===15,'Roof → on: all back');
  await tab('addons'); await p.waitForTimeout(300); await seg('Roof opens','beams stay'); await p.waitForTimeout(600);
  await p.evaluate(()=>window.HEXCORE.skyK(window.HEX,1)); await p.waitForTimeout(900);
  s=await st(p); check(!s.ceilVis&&s.beamsVis===15,'"beams stay": roof opens, beams hang against the sky ('+JSON.stringify(s)+')');
  await p.evaluate(()=>window.HEXCORE.skyK(window.HEX,0)); await seg('Roof opens','beams fade too'); await p.waitForTimeout(600);
  // bake on
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); }); await p.waitForTimeout(400);
  let [dl]=await Promise.all([p.waitForEvent('download',{timeout:120000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const on=path.join(__dirname,'..','out','t112-on.html'); await dl.saveAs(on);
  const html=fs.readFileSync(on,'utf8'); check(html.includes('data-addon="beams"')&&!html.includes('data-addon="carved"'),'bake: carries Beam ceiling, not Carved line (off)');
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="addons"]').click()); await p.waitForTimeout(400);
  await tog('Beam ceiling'); await p.waitForTimeout(1000);
  s=await st(p); check(!s.on&&Math.abs(s.ceilY-(await p.evaluate(()=>window.HEX.WALL_H)))<.01,'off: ceiling back down, beams gone');
  await p.close();
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t112-on.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(4000);
  s=await st(q); check(s.on&&s.beams===15&&s.ceilY>s.wall+1,'published room: beam ceiling there ('+JSON.stringify(s)+')');
  await q.evaluate(()=>window.HEXCORE.trigAct({t:'sky',w:'open',fade:.3},window.HEX)); await q.waitForFunction(()=>window.HEXCORE.skyK(window.HEX)>.999,null,{timeout:15000}).catch(()=>{}); await q.waitForTimeout(800);
  s=await st(q); check(!s.ceilVis&&s.beamsVis===0,'published: a "sky opens" moment fades the ceiling and the beams');
  check(!errs.length,'no errors '+errs.join(' | '));
  ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(ok.length+'/'+(ok.length+bad.length)); await b.close();
})();
