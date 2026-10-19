// t93 — the floating Easter egg (Mood Room): card hangs beside the tapped thing, thread of light, room keeps playing, folds away; own colours; published + phone
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
  await tab('room'); await p.waitForTimeout(300);
  check(await p.evaluate(()=>[...document.querySelectorAll('#stgBody>.stsec')].some(s=>s.dataset.t==='Easter egg pop-ups'&&s.style.display!=='none')),'Room tab has "Easter egg pop-ups"');
  await btn('show me a pop-up'); await p.waitForTimeout(2500);
  const st=()=>p.evaluate(()=>{ const E=document.getElementById('hexEgg'); if(!E) return null; const c=E.querySelector('.c'); if(!c) return {on:E.classList.contains('on')}; const r=c.getBoundingClientRect();
    const th=E.querySelector('svg.th path'); return {on:E.classList.contains('on'), fl:E.classList.contains('fl'), w:Math.round(r.width), x:Math.round(r.left), op:c?+getComputedStyle(c).opacity:0,
      thread:!!(th&&th.getAttribute('d')), sleeping:!!window.HEXSLEEP, bg:getComputedStyle(c).backgroundColor, title:(c.querySelector('h3')||{}).textContent}; });
  let d=await st(); check(d&&d.on&&d.fl&&d.w>=280&&d.w<=345&&d.op>.9&&d.thread,'it opens as a floating card with a thread of light ('+JSON.stringify(d)+')');
  check(d&&!d.sleeping,'the room keeps playing behind it');
  await p.evaluate(()=>document.getElementById('stg').classList.remove('open')); await p.waitForTimeout(500);
  await p.screenshot({path:'shots/t93-float.png'});
  await p.evaluate(()=>[...document.querySelectorAll('#hexEgg button')].find(x=>x.textContent==='collect').click()); await p.waitForTimeout(2200);
  d=await st(); check(d&&!d.on,'back to the room: it folds away');
  // my own colours
  await p.evaluate(()=>document.getElementById('stg').classList.add('open')); await tab('room'); await p.waitForTimeout(300);
  await seg('Colours','my own'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='Highlight'); const i=f.querySelector('input'); i.value='#ff3b30'; i.dispatchEvent(new Event('input')); });
  await btn('show me a pop-up'); await p.waitForTimeout(900);
  const hot=await p.evaluate(()=>getComputedStyle(document.querySelector('#hexEgg .k')).color);
  check(/255, 59, 48/.test(hot),'my own highlight colour reaches the card ('+hot+')');
  await p.evaluate(()=>document.getElementById('stg').classList.remove('open')); await p.waitForTimeout(400);
  await p.screenshot({path:'shots/t93-float-red.png'});
  await p.evaluate(()=>[...document.querySelectorAll('#hexEgg button')].find(x=>x.textContent==='collect').click()); await p.waitForTimeout(600);
  await seg('Colours','mood'); await p.waitForTimeout(300);
  // a room model with an egg → published
  await p.evaluate(()=>document.getElementById('stg').classList.add('open')); await tab('models'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stgBody>.stsec')].find(x=>x.style.display!=='none'); const b=[...s.querySelectorAll('button')].find(x=>/^\+ /.test(x.textContent)&&!/upload|hang|play-me|trigger/.test(x.textContent)); b.click(); });
  await p.waitForTimeout(800);
  await seg('Easter egg','on'); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const t=[...document.querySelectorAll('#stg .stctl input')].find(i=>i.placeholder==='a short title'); t.value='The crate'; t.dispatchEvent(new Event('input'));
    const ta=document.querySelector('#stg .stctl textarea'); ta.value='It came with them on every tour.'; ta.dispatchEvent(new Event('input')); });
  await p.waitForTimeout(700);
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t93.html'); await dl.saveAs(bp);
  const bake=JSON.parse(fs.readFileSync(bp,'utf8').match(/window\.HEXBAKE=(\{.*?\});<\/script>/s)[1].replace(/\\u003c/g,'<'));
  check(bake.ui.eggStyle&&bake.ui.eggStyle.float!==false,'bake carries the pop-up style');
  await p.close();
  for(const vp of [{width:1280,height:800,n:'desk'},{width:390,height:844,n:'phone'}]){
    const q=await b.newPage({viewport:{width:vp.width,height:vp.height}}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
    await q.goto('http://127.0.0.1:8765/out/t93.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(3500);
    const pt=await q.evaluate(()=>{ const E=window.HEXCORE.ROOMEGGS.userData.eggs[0]; if(!E) return null; const r=new THREE.Raycaster();
      for(let y=.25;y<.95;y+=.02) for(let x=.1;x<.9;x+=.02){ r.setFromCamera(new THREE.Vector2(x*2-1,-(y*2-1)),window.HEX.cam); if(r.intersectObject(E.obj,true).length) return {x:x*innerWidth,y:y*innerHeight}; } return null; });
    if(pt){ await q.mouse.click(pt.x,pt.y); await q.waitForTimeout(1000); }
    const r=await q.evaluate(()=>{ const E=document.getElementById('hexEgg'); if(!E) return null; const c=E.querySelector('.c').getBoundingClientRect(); return {on:E.classList.contains('on'), fl:E.classList.contains('fl'), l:Math.round(c.left), w:Math.round(c.width), b:Math.round(innerHeight-c.bottom)}; });
    check(pt&&r&&r.on&&r.fl,vp.n+': tapping the model opens the floating card ('+JSON.stringify(r)+')');
    if(vp.n==='phone') check(r&&r.l<=14&&r.w>330&&r.b<=24,'phone: the card comes forward, low on the screen');
    await q.screenshot({path:'shots/t93-pub-'+vp.n+'.png'});
    if(pt){ await q.mouse.click(vp.width*.5, 130); await q.waitForTimeout(2500); }
    const off=await q.evaluate(()=>{ const E=document.getElementById('hexEgg'); return E&&E.classList.contains('on'); });
    check(!off,vp.n+': tapping the room folds it away');
    check(e2.length===0,vp.n+': no errors'+(e2[0]?': '+e2[0]:''));
    await q.close();
  }
  check(errs.length===0,'builder: no errors'+(errs[0]?': '+errs[0]:''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
