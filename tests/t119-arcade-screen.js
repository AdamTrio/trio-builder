// t119 — v70: a model with a SCREEN part (the KATSEYE × TRIO arcade) plays clips on it; real size; plays only in view; tap → the page opens the arcade; preset file round-trips; bakes
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const A=f=>path.join(__dirname,'..','setassets','arcade',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const open=async()=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(String(e)));
    await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500); return p; };
  const p=await open();
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="models"]').click()); await p.waitForTimeout(300);
  check(await p.evaluate(()=>[...document.querySelectorAll('#stg button')].some(b=>b.textContent==='open model preset…')),'Models: "open model preset…"');
  let [fc]=await Promise.all([p.waitForEvent('filechooser'),btn('drop a model file…')]); await fc.setFiles(A('katseye-arcade.glb'));
  await p.waitForFunction(()=>window.HEX.scene.children.some(o=>o.userData.isProp&&o.userData.hasScreen),null,{timeout:60000}); await p.waitForTimeout(1500);
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stgBody>.stsec')].find(x=>x.style.display!=='none'); const r=s.querySelector('.strow'); if(r&&!r.classList.contains('sel')) r.click(); }); await p.waitForTimeout(600);
  const h=await p.evaluate(()=>{ const g=window.HEX.scene.children.find(o=>o.userData.hasScreen); const sz=new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()); return +sz.y.toFixed(2); });
  check(h>1.75&&h<1.85,'the cabinet comes in at its real size ('+h+' m tall)');
  check(await p.evaluate(()=>[...document.querySelectorAll('#stg .stsub')].some(x=>x.textContent==='Screen')),'model editor shows a "Screen" section');
  [fc]=await Promise.all([p.waitForEvent('filechooser'),btn('+ clip')]); await fc.setFiles(A('teaser1.webm')); await p.waitForTimeout(2500);
  const st=pg=>pg.evaluate(()=>{ const S=Object.values(window.HEXCORE.SCREENS)[0]; if(!S) return null; return {playing:!S.v.paused, t:+S.v.currentTime.toFixed(2), basic:S.mesh.material.isMeshBasicMaterial, video:!!(S.mesh.material.map&&S.mesh.material.map.isVideoTexture), w:S.v.videoWidth}; });
  let s1=await st(p); check(s1&&s1.basic&&s1.video,'"+ clip": the clip goes on the SCREEN (white unlit video) '+JSON.stringify(s1));
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); const g=window.HEX.scene.children.find(o=>o.userData.hasScreen); const c=window.HEX.cam.position; g.position.set(c.x+Math.sin(0)*0,0,c.z-3.2); g.rotation.y=0; }); await p.waitForTimeout(2500);
  s1=await st(p); await p.waitForTimeout(1200); const s2=await st(p);
  check(s2&&s2.playing&&s2.t!==s1.t,'in view: the clip plays ('+s1.t+' → '+s2.t+')');
  await p.screenshot({path:path.join(__dirname,'..','out','t119-builder.png')});
  await p.evaluate(()=>window.HEX.setYaw(Math.PI)); await p.waitForTimeout(2000);
  const s3=await st(p);
  check(s3&&!s3.playing,'turned away: the clip pauses (saves phones)');
  await p.evaluate(()=>window.HEX.setYaw(0)); await p.waitForTimeout(1500);
  // preset
  await p.evaluate(()=>document.getElementById('stg').classList.add('open')); await p.waitForTimeout(300);
  const [dp]=await Promise.all([p.waitForEvent('download',{timeout:60000}),btn('save as preset')]);
  const pp=path.join(__dirname,'..','out','t119.hexmodel.json'); await dp.saveAs(pp);
  const pm=JSON.parse(fs.readFileSync(pp,'utf8')); check(pm.kind==='hexmodel'&&Object.keys(pm.assets).length===2&&pm.prop.screen.clips.length===1,'save as preset: one file with the model + its clip');
  // bake
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); }); await p.waitForTimeout(300);
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:120000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t119.html'); await dl.saveAs(bp); await p.close();
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t119.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(5000);
  await q.evaluate(()=>{ const sp=document.getElementById('splash'); if(sp) sp.classList.add('gone'); window.HEX.setYaw(0); }); await q.waitForTimeout(2000);
  const q1=await st(q); await q.waitForTimeout(1200); const q2=await st(q);
  check(q2&&q2.video&&q2.playing&&q2.t!==q1.t,'published room: the cabinet plays its teaser');
  const tap=await q.evaluate(async()=>{ window.HEXCORE.HOSTED=true; let got=null; addEventListener('message',e=>{ if(e.data&&e.data.trio) got=e.data; });
    const S=Object.values(window.HEXCORE.SCREENS)[0]; const v=new THREE.Vector3(); S.mesh.getWorldPosition(v); v.project(window.HEX.cam);
    const x=(v.x+1)/2*innerWidth, y=(1-v.y)/2*innerHeight; return {x,y}; });
  await q.mouse.click(tap.x,tap.y); await q.waitForTimeout(800);
  const got=await q.evaluate(()=>new Promise(r=>{ let g=null; addEventListener('message',e=>{ if(e.data&&e.data.trio) g=e.data; }); setTimeout(()=>r(window.__lastTrio||g),50); }));
  const msg=await q.evaluate(()=>window.__msgs||null);
  check(true,'(tap sent)');
  await q.close();
  // the tap message, checked with a listener set before the tap
  const q3=await ctx.newPage();
  await q3.goto('http://127.0.0.1:8765/out/t119.html',{waitUntil:'domcontentloaded',timeout:120000}); await q3.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q3.waitForTimeout(5000);
  await q3.evaluate(()=>{ window.__msgs=[]; addEventListener('message',e=>{ if(e.data&&e.data.trio) window.__msgs.push(e.data); }); window.HEXCORE.HOSTED=true; const sp=document.getElementById('splash'); if(sp) sp.classList.add('gone'); window.HEX.setYaw(0); }); await q3.waitForTimeout(1500);
  const xy=await q3.evaluate(()=>{ const S=Object.values(window.HEXCORE.SCREENS)[0]; const v=new THREE.Vector3(); S.mesh.getWorldPosition(v); v.project(window.HEX.cam); return {x:(v.x+1)/2*innerWidth, y:(1-v.y)/2*innerHeight}; });
  await q3.mouse.click(xy.x,xy.y); await q3.waitForTimeout(800);
  const ms=await q3.evaluate(()=>window.__msgs);
  check(ms.some(m=>m.trio==='open'&&m.board==='arcade'),'tap the cabinet → the page is asked to open the arcade '+JSON.stringify(ms));
  await q3.close();
  // preset into a fresh room
  const r=await open(); const btnR=t=>r.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  await r.evaluate(()=>document.querySelector('#stgRail button[data-tab="models"]').click()); await r.waitForTimeout(300);
  [fc]=await Promise.all([r.waitForEvent('filechooser'),btnR('open model preset…')]); await fc.setFiles(pp);
  await r.waitForFunction(()=>Object.keys(window.HEXCORE.SCREENS).length>0,null,{timeout:60000}).catch(()=>{}); await r.waitForTimeout(1500);
  const rp=await st(r); check(rp&&rp.video,'open model preset…: the cabinet + its clip arrive in another room');
  check(!errs.length,'no errors '+errs.join(' | '));
  ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(ok.length+'/'+(ok.length+bad.length)); await b.close();
})();
