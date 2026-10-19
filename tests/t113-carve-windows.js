// t113 — v66.1: Carved line + windows: sets stay behind the wall (only wall-hung things float out); the neon skips a window opening, closed windows keep it until they open
const { chromium } = require('playwright');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(2500);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  const tab=t=>p.evaluate(t=>{ const b=document.querySelector('#stgRail button[data-tab="'+t+'"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); },t);
  await tab('addons'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const c=[...document.querySelectorAll('#stg .stcard')].find(x=>x.querySelector('b')&&x.querySelector('b').firstChild.textContent==='Carved line'); c.querySelector('.sttog').click(); }); await p.waitForTimeout(1500);
  const tubes=()=>p.evaluate(()=>{ const w=window.HEX.walls[0]; const t=w.children.filter(c=>c.isMesh&&c.geometry&&c.geometry.type==='TubeGeometry'); return {n:t.length, win:t.filter(c=>c.userData.winKey).length, vis:t.filter(c=>c.visible).length}; });
  const t0=await tubes(); check(t0.n===3,'wall 0 before a window: one neon line ('+JSON.stringify(t0)+')');
  await tab('windows'); await p.waitForTimeout(300); await btn('+ cut a window here'); await p.waitForTimeout(800);
  await btn('+ new set'); await p.waitForTimeout(2500);
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='back to the room'); if(b) b.click(); }); await p.waitForTimeout(1200);
  await tab('windows'); await p.waitForTimeout(400);
  const sets=await p.evaluate(()=>window.HEX.scene.children.filter(o=>o.userData.isSet).map(o=>({p:!!o.userData._cvP, vis:o.visible})));
  check(sets.length>0&&sets.every(s=>!s.p),'the set stays behind the wall — never pushed forward ('+JSON.stringify(sets)+')');
  const t1=await tubes(); check(t1.n===6&&t1.win===0,'open window: the neon stops at the opening and picks up after it ('+JSON.stringify(t1)+')');
  await seg('At the start','closed · opens on a trigger'); await p.waitForTimeout(2000);
  const t2=await tubes(); check(t2.win===3&&t2.vis===9,'closed window: the neon runs across it until it opens ('+JSON.stringify(t2)+')');
  await p.evaluate(()=>window.HEXCORE.winK('wall0',1)); await p.waitForTimeout(800);
  const t3=await tubes(); check(t3.vis===6,'window opens: that piece of neon goes ('+JSON.stringify(t3)+')');
  // a photo tile still floats out
  const hung=await p.evaluate(()=>window.HEX.scene.children.filter(o=>o.userData._cvP&&!o.userData.isSet).length);
  check(hung>0,'photo / video tiles still float over the carve ('+hung+')');
  check(!errs.length,'no errors '+errs.join(' | '));
  ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(ok.length+'/'+(ok.length+bad.length)); await b.close();
})();
