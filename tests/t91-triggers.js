// t91 — triggers: a glint switch sets off a dark glowing model + the uplights; builder play/reset; published room tap
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  const tab=t=>p.evaluate(t=>{ const b=document.querySelector('#stgRail button[data-tab="'+t+'"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); },t);
  // the cross stand-in: a model that glows, dark at the start
  await tab('models'); await p.waitForTimeout(300);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),btn('drop a model file…')]); await fc.setFiles(A('model.glb'));
  await p.waitForFunction(()=>window.HEX.scene.children.some(o=>o.userData.isProp),null,{timeout:30000}); await p.waitForTimeout(600);
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stgBody>.stsec')].find(x=>x.style.display!=='none'); const r=s.querySelector('.strow'); if(r&&!r.classList.contains('sel')) r.click(); }); await p.waitForTimeout(400);
  await seg('Glow','on'); await p.waitForTimeout(300); await seg('Glow at the start','dark · waits'); await p.waitForTimeout(400);
  const st=()=>p.evaluate(()=>{ const g=Object.values(window.HEXCORE.PROPG).find(x=>x.userData.glowLight); const S=window.HEX._mood;
    return {k:g?+(g.userData.glowK||0).toFixed(2):null, li:g?+g.userData.glowLight.intensity.toFixed(2):null, up:S&&S.ups?+S.ups[0].sp.intensity.toFixed(2):null}; });
  let s0=await st(); check(s0.k===0&&s0.li===0,'glow "dark · waits": the model starts dark ('+JSON.stringify(s0)+')');
  // uplights start off
  await tab('light'); await p.waitForTimeout(300); await seg('At the start','off · waits'); await p.waitForTimeout(300);
  s0=await st(); check(s0.up===0,'uplights "off · waits" start dark');
  // hidden · waits: a ghost in the builder, and it comes back when set to shown (Adam lost his model)
  await tab('models'); await p.waitForTimeout(300);
  await seg('At the start','hidden · waits'); await p.waitForTimeout(400);
  const gh=await p.evaluate(()=>{ const g=Object.values(window.HEXCORE.PROPG).find(x=>x.userData.glowLight); return {vis:g.visible, ghost:!!g.userData.ghosted, sc:+g.scale.x.toFixed(2)}; });
  check(gh.vis&&gh.ghost&&gh.sc>.5,'hidden · waits shows as a ghost in the builder ('+JSON.stringify(gh)+')');
  await seg('At the start','shown'); await p.waitForTimeout(400);
  const bk=await p.evaluate(()=>{ const g=Object.values(window.HEXCORE.PROPG).find(x=>x.userData.glowLight); return {vis:g.visible, ghost:!!g.userData.ghosted, sc:+g.scale.x.toFixed(2)}; });
  check(bk.vis&&!bk.ghost&&bk.sc>.5,'setting it back to shown brings it back ('+JSON.stringify(bk)+')');
  // the switch
  await tab('models'); await p.waitForTimeout(300); await btn('+ trigger (glint)'); await p.waitForTimeout(800);
  check(await p.evaluate(()=>[...document.querySelectorAll('#stg .strow .nm s')].some(x=>/^trigger/.test(x.textContent))),'"+ trigger (glint)" adds a switch');
  await btn('+ something happens'); await p.waitForTimeout(300);
  await btn('+ something happens'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const ss=[...document.querySelectorAll('#stg .stctl select')]; const s=ss[1]; s.value='uplights'; s.dispatchEvent(new Event('change')); }); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const f=[...document.querySelectorAll('#stg .stf')].filter(x=>(x.querySelector('label')||{}).textContent==='· fade'); f.forEach(x=>{ const i=x.querySelector('input'); i.value=1; i.dispatchEvent(new Event('input')); }); });
  await p.waitForTimeout(300);
  await btn('▶ play the moment'); await p.waitForTimeout(3500);
  let s1=await st(); check(s1.k>.95&&s1.li>1&&s1.up>1,'play the moment: the model ignites and the uplights come up ('+JSON.stringify(s1)+')');
  console.log('DBG', await p.evaluate(()=>JSON.stringify({n:window.HEXCORE.GLOWS.length, same:window.HEXCORE.GLOWS.map(e=>Object.values(window.HEXCORE.PROPG).includes(e.g)), light:window.HEXCORE.GLOWS.map(e=>[e.p.glow.light,e.g.userData.glowLight&&e.g.userData.glowLight.intensity])})));
  await btn('reset the room'); await p.waitForTimeout(500);
  s1=await st(); console.log('RESET',JSON.stringify(s1)); check(s1.k===0&&s1.up===0,'reset puts the room back to dark');
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); window.HEX.setYaw(0); }); await p.waitForTimeout(900);
  await p.screenshot({path:'shots/t91-before.png'});
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t91.html'); await dl.saveAs(bp);
  const q=await b.newPage({viewport:{width:1280,height:800}}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t91.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(3500);
  const qs=()=>q.evaluate(()=>{ const g=Object.values(window.HEXCORE.PROPG).find(x=>x.userData.glowLight); const S=window.HEX._mood;
    return {k:g?+(g.userData.glowK||0).toFixed(2):null, up:S&&S.ups?+S.ups[0].sp.intensity.toFixed(2):null}; });
  const q0=await qs(); check(q0.k===0&&q0.up===0,'published room starts dark ('+JSON.stringify(q0)+')');
  await q.screenshot({path:'shots/t91-pub-before.png'});
  const sp=await q.evaluate(()=>{ const sw=Object.values(window.HEXCORE.PROPG).find(x=>x.userData.halo); if(!sw) return null; const v=sw.userData.halo.getWorldPosition(new THREE.Vector3()).project(window.HEX.cam); return {x:(v.x+1)/2*innerWidth, y:(1-v.y)/2*innerHeight, z:v.z}; });
  console.log('SP',JSON.stringify(sp), await q.evaluate(()=>JSON.stringify(window.HEXBAKE.props.map(p=>[p.type,p.trig&&p.trig.on]))));
  if(sp&&sp.z<1){ await q.mouse.click(sp.x,sp.y); }
  await q.waitForTimeout(2200);
  const q1=await qs(); check(sp&&q1.k>.95&&q1.up>1,'tapping the glint in the published room ignites it ('+JSON.stringify(q1)+')');
  await q.screenshot({path:'shots/t91-pub-after.png'}); await q.close();
  check(errs.length===0&&e2.length===0,'no errors'+((errs[0]||e2[0])?': '+(errs[0]||e2[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
