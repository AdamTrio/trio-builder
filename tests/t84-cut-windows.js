// t84 — Mood Room: cut a window straight into a wall (shape, size, frame, drag handles), a set behind it, bakes + publishes.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const choose=async(fn,f)=>{ const [fc]=await Promise.all([p.waitForEvent('filechooser'),fn()]); await fc.setFiles(f); await p.waitForTimeout(1000); };
  const rowBtn=l=>p.evaluate(l=>[...document.querySelectorAll('#stg .strow')].find(x=>(x.querySelector('.nm b')||{}).textContent===l).querySelector('button.add').click(),l);
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const slide=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab); const i=f.querySelector('input[type=range]'); i.value=v; i.dispatchEvent(new Event('input')); },[lab,v]);
  const st=()=>p.evaluate(()=>{ const m=window.HEX.walls[0]; return {am:!!m.material.alphaMap, at:m.material.alphaTest, frame:!!(m.userData.cutFrame&&m.userData.cutFrame.parent),
    set:window.HEX.scene.children.some(o=>o.userData&&o.userData.isSet&&o.position.y>-50), handles:(window.HEX.scene.children.find(o=>o.userData.cutHandles)||{}).visible}; });
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="windows"]').click()); await p.waitForTimeout(300);
  check(await p.evaluate(()=>[...document.querySelectorAll('#stg button')].some(x=>x.textContent.trim()==='+ cut a window here')),'Windows tab offers "+ cut a window here"');
  await btn('+ cut a window here'); await p.waitForTimeout(700);
  let s1=await st(); check(s1.am&&s1.at===.5&&s1.frame&&s1.handles,'the wall gets an opening, a frame and drag dots ('+JSON.stringify(s1)+')');
  const look=()=>p.evaluate(()=>JSON.parse(JSON.stringify(window.HEX.walls[0].userData)).cutFrame===undefined?null:null);
  // shape + size
  await p.evaluate(()=>document.querySelector('#stg .stshape button[data-shape="circle"]').click()); await p.waitForTimeout(300);
  await slide('Width',3); await p.waitForTimeout(300);
  const c1=await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.open('hexstage',1); q.onsuccess=()=>{ setTimeout(()=>{ const t=q.result.transaction('kv','readonly').objectStore('kv').get('auto:mood'); t.onsuccess=()=>r(t.result.windows.wall0.cut); },900); }; }));
  check(c1&&c1.shape==='circle'&&Math.abs(c1.w-3)<.01,'shape + width saved ('+JSON.stringify(c1)+')');
  await seg('Frame','thick'); await p.waitForTimeout(300);
  // a set behind it
  await btn('+ new set'); await p.waitForTimeout(600);
  await choose(()=>rowBtn('Background'),A('pano.jpg'));
  await btn('done & lock'); await p.waitForTimeout(800);
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="windows"]').click()); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const b=document.querySelector('#stgRail button[data-tab="windows"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); }); await p.waitForTimeout(800);
  s1=await st(); check(s1.set&&s1.handles,'the new set sits behind the cut window');
  // drag the top-left dot
  const scr=await p.evaluate(()=>{ const g=window.HEX.scene.children.find(o=>o.userData.cutHandles); const h=g.children.find(x=>x.userData.cut&&x.userData.cut[0]===-1&&x.userData.cut[1]===1);
    const v=h.position.clone().project(window.HEX.cam); return {x:(v.x+1)/2*innerWidth, y:(1-v.y)/2*innerHeight}; });
  const w0=await p.evaluate(()=>window.HEX.walls[0].userData.cutFrame&&1);
  await p.mouse.move(scr.x,scr.y); await p.mouse.down(); await p.mouse.move(scr.x-40,scr.y-25,{steps:6}); await p.mouse.up(); await p.waitForTimeout(800);
  const c2=await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.open('hexstage',1); q.onsuccess=()=>{ setTimeout(()=>{ const t=q.result.transaction('kv','readonly').objectStore('kv').get('auto:mood'); t.onsuccess=()=>r(t.result.windows.wall0.cut); },900); }; }));
  check(c2.w>3.2&&c2.h>c1.h,'dragging the corner dot makes it bigger ('+c2.w.toFixed(2)+' × '+c2.h.toFixed(2)+')');
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); window.HEX.setYaw(0); }); await p.waitForTimeout(900);
  check(!(await st()).handles,'dots hide when the panel closes');
  await p.screenshot({path:'shots/t84-cut.png'});
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="windows"]').click()); await p.waitForTimeout(400);
  await p.screenshot({path:'shots/t84-cut-panel.png'});
  // bake
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t84.html'); await dl.saveAs(bp);
  const html=fs.readFileSync(bp,'utf8'); const bake=JSON.parse(html.match(/window\.HEXBAKE=(\{.*?\});<\/script>/s)[1].replace(/\\u003c/g,'<'));
  check(bake.windows&&bake.windows.wall0&&bake.windows.wall0.cut&&bake.windows.wall0.cut.shape==='circle'&&bake.sets.length===1,'bake carries the cut window + its set');
  const q=await b.newPage({viewport:{width:1280,height:800}}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t84.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(2500);
  const d2=await q.evaluate(()=>{ const m=window.HEX.walls[0]; return {std:m.material.isMeshStandardMaterial, am:!!m.material.alphaMap, at:m.material.alphaTest, frame:!!m.userData.cutFrame,
    set:window.HEX.scene.children.some(o=>o.userData&&o.userData.isSet)}; });
  check(d2.std&&d2.am&&d2.at===.5&&d2.frame&&d2.set,'published room: textured wall with the cut opening, frame and set ('+JSON.stringify(d2)+')');
  await q.screenshot({path:'shots/t84-published.png'}); await q.close();
  // remove
  await btn('remove window'); await p.waitForTimeout(600);
  const s3=await st(); check(!s3.am&&!s3.frame,'remove window closes the wall up again');
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
