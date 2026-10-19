// t92 — room triggers reach models inside sets; the Models tab stays put; a hidden set editor can come back
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const choose=async(fn,f)=>{ const [fc]=await Promise.all([p.waitForEvent('filechooser'),fn()]); await fc.setFiles(f); await p.waitForTimeout(1200); };
  const rowBtn=l=>p.evaluate(l=>[...document.querySelectorAll('#stg .strow')].find(x=>(x.querySelector('.nm b')||{}).textContent===l).querySelector('button.add').click(),l);
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const tab=t=>p.evaluate(t=>{ const b=document.querySelector('#stgRail button[data-tab="'+t+'"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); },t);
  const cur=()=>p.evaluate(()=>{ const b=document.querySelector('#stgRail button[aria-pressed=true]'); return b?b.dataset.tab:null; });
  // a window with a set holding a model that glows, dark at the start
  await tab('windows'); await p.waitForTimeout(300); await btn('+ cut a window here'); await p.waitForTimeout(600);
  await btn('+ new set'); await p.waitForTimeout(700);
  await p.evaluate(()=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='Floor height'); const i=f.querySelector('input'); i.value=1; i.dispatchEvent(new Event('input')); });
  await choose(()=>rowBtn('Background'),A('pano.jpg'));
  await choose(()=>btn('+ model (.glb)'),A('model.glb')); await p.waitForTimeout(1500);
  await seg('· glow','on'); await p.waitForTimeout(800); await seg('· glow at the start','dark · waits'); await p.waitForTimeout(800);
  // the hidden-editor trap
  await p.evaluate(()=>document.querySelector('#stg header button:last-child').click()); await p.waitForTimeout(400);
  const pill=await p.evaluate(()=>{ const b=document.getElementById('stgBtn'); const cs=getComputedStyle(b); return {shown:cs.display!=='none', txt:b.textContent}; });
  check(pill.shown&&pill.txt==='show editor','set editor: hiding the panel leaves a "show editor" button ('+JSON.stringify(pill)+')');
  await p.evaluate(()=>document.getElementById('stgBtn').click()); await p.waitForTimeout(400);
  check(await p.evaluate(()=>document.getElementById('stg').classList.contains('open')),'…and it brings the editor back');
  await btn('done & lock'); await p.waitForTimeout(2500);
  // a room model as the trigger
  await tab('models'); await p.waitForTimeout(300);
  await choose(()=>btn('drop a model file…'),A('model.glb'));
  await p.waitForFunction(()=>window.HEX.scene.children.some(o=>o.userData.isProp),null,{timeout:30000}); await p.waitForTimeout(800);
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stgBody>.stsec')].find(x=>x.style.display!=='none'); const r=s.querySelector('.strow'); if(r&&!r.classList.contains('sel')) r.click(); }); await p.waitForTimeout(500);
  check(await cur()==='models','selecting a model keeps you in Models (was jumping to Windows)');
  await seg('Tap sets things off','on'); await p.waitForTimeout(300);
  await btn('+ something happens'); await p.waitForTimeout(400);
  const og=await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stg select')].find(x=>x.querySelector('optgroup')); return [...s.querySelectorAll('optgroup')].map(g=>g.label+':'+g.children.length); });
  console.log('OG',og, await p.evaluate(()=>[...document.querySelectorAll('#stg .strow .nm b')].map(x=>x.textContent).join('|')));
  check(og.some(x=>/^In set 1:1/.test(x)),'the "this" list includes the set’s models ('+og.join(', ')+')');
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stg select')].find(x=>x.querySelector('optgroup')); const o=[...s.querySelectorAll('optgroup')].find(g=>/^In set/.test(g.label)).children[0]; s.value=o.value; s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(400);
  await p.evaluate(()=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='· fade'); const i=f.querySelector('input'); i.value=.5; i.dispatchEvent(new Event('input')); });
  check(await cur()==='models','still in Models after editing the trigger');
  const k=()=>p.evaluate(()=>{ const L=window.HEXCORE.trigGroups(Object.keys(window.HEXCORE.SETG)[0]); return L.map(g=>+(g.userData.glowK||0).toFixed(2)); });
  const k0=await k(); check(k0.length>=1&&k0.every(v=>v===0),'the set model starts dark ('+k0+')');
  await btn('▶ play the moment'); await p.waitForTimeout(2500);
  const k1=await k(); check(k1.length>=1&&k1.every(v=>v>.95),'play the moment lights the model inside the set ('+k1+')');
  await btn('reset the room'); await p.waitForTimeout(500);
  const k2=await k(); check(k2.every(v=>v===0),'reset the room darkens it again');
  // published room: tap the room model, the set model lights
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t92.html'); await dl.saveAs(bp);
  await p.close();
  const q=await b.newPage({viewport:{width:1280,height:800}}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t92.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(4000);
  const qk=()=>q.evaluate(()=>{ const id=Object.keys(window.HEXCORE.SETG)[0]; return id?window.HEXCORE.trigGroups(id).map(g=>+(g.userData.glowK||0).toFixed(2)):[]; });
  const q0=await qk(); check(q0.length>=1&&q0.every(v=>v===0),'published: the set model starts dark ('+q0+')');
  const sp=await q.evaluate(()=>{ const g=window.HEXCORE.PROPG.p1, r=new THREE.Raycaster(); for(let y=.3;y<.98;y+=.02) for(let x=.2;x<.8;x+=.02){ r.setFromCamera(new THREE.Vector2(x*2-1,-(y*2-1)),window.HEX.cam); if(r.intersectObject(g,true).filter(h=>h.object!==g.userData.shadow).length) return {x:x*innerWidth,y:y*innerHeight,z:0}; } return {z:2}; });
  console.log('SP',JSON.stringify(sp), await q.evaluate(()=>JSON.stringify(window.HEXBAKE.props.map(p=>[p.id,p.type,p.pos,p.trig&&p.trig.on]))), await q.evaluate(()=>JSON.stringify(window.HEX.cam.position)));
  if(sp.z<1) await q.mouse.click(sp.x,sp.y); await q.waitForTimeout(2000);
  console.log('RAY', await q.evaluate(([x,y])=>{ const r=new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(x/innerWidth*2-1,-(y/innerHeight)*2+1),window.HEX.cam); const g=window.HEXCORE.PROPG.p1; return JSON.stringify({has:!!g, vis:g&&g.visible, hits:g?r.intersectObject(g,true).length:-1, sc:g&&g.scale.x}); },[sp.x,sp.y]));
  console.log('FIRED', await q.evaluate(()=>JSON.stringify([window.HEXCORE.TRIGFIRED, window.HEXCORE._trigWired, document.elementFromPoint(640,420).id||document.elementFromPoint(640,420).tagName, window.HEXCORE.ANIMS.length])));
  const q1=await qk(); check(q1.length>=1&&q1.every(v=>v>.95),'published: tapping the room model lights the set model ('+q1+')');
  await q.close();
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
