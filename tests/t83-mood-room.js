// t83 — the Mood Room: a third builder. Textures, dark room, uplights, ceiling, halo; photos/videos on any wall or hidden;
// bakes with only the texture packs it uses; Event Space untouched.
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f);
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  // the start screen
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html',{waitUntil:'domcontentloaded'}); await p.waitForSelector('#hexGate'); await p.waitForTimeout(400);
  const cards=await p.evaluate(()=>[...document.querySelectorAll('#hexGate button')].map(x=>x.dataset.s));
  check(cards.join()==='event,room,mood,open,world','start screen offers event, room, mood, open (v59) and world (v71) ('+cards+')');
  await p.screenshot({path:'shots/t83-gate.png'});
  await p.evaluate(()=>document.querySelector('#hexGate button[data-s=mood]').click());
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const d=await p.evaluate(()=>{ const H=window.HEX, S=H._mood;
    return {url:location.search, on:!!(S&&S.on), std:H.walls.every(w=>w.material.isMeshStandardMaterial), floor:H.floor.material.isMeshStandardMaterial,
      tex:H.walls[2].material.map&&H.walls[2].material.map.userData.moodTex, ceil:S&&S.ceil&&S.ceil.visible, post:typeof H.post==='function',
      aur:H.aurora.visible, ban:H.banners.some(x=>x.visible), ups:S&&S.ups.filter(u=>u.sp.visible).length,
      title:document.getElementById('stgTitle').textContent, top:document.querySelector('#stgTop b').textContent,
      wallsRow:[...document.querySelectorAll('#stg .strow .nm b')].map(x=>x.textContent).filter(t=>/^Banner/.test(t)).length}; });
  check(d.url.indexOf('space=mood')>=0&&d.top==='Mood Room','opens the Mood Room builder ('+d.top+')');
  check(d.on&&d.std&&d.floor&&d.tex,'walls + floor are real-light materials with the concrete texture');
  check(d.ceil&&d.post&&!d.aur&&!d.ban&&d.ups===6,'ceiling on, halo on, sky glow + banners gone, 6 uplights');
  check(d.wallsRow===0,'no banner slots in the Mood Room');
  const corners=await p.evaluate(()=>{ const S=window.HEX._mood, rc=new THREE.Raycaster(); let hit=0;
    const C=k=>{ const a=k*Math.PI/3; return new THREE.Vector3(Math.cos(a)*10,1,Math.sin(a)*10); };   /* the walls' corners */
    for(let k=0;k<6;k++){ [0,.05,-.05].forEach(f=>{ const c=C(k), o=f>0?C(k+1):C(k+5); const q=c.clone().lerp(o,Math.abs(f)).multiplyScalar(.985); q.y=1;
      rc.set(q,new THREE.Vector3(0,1,0)); if(rc.intersectObject(S.ceil,false).length) hit++; }); } return hit; });
  check(corners===18,'the ceiling reaches every corner ('+corners+'/18)');
  const tabs=await p.evaluate(()=>{ const out={}; ['room','light','media'].forEach(t=>{ document.querySelector('#stgRail button[data-tab="'+t+'"]').click();
    out[t]=[...document.querySelectorAll('#stgBody>.stsec')].filter(s=>s.style.display!=='none').map(s=>s.dataset.t); }); return out; });
  check(tabs.room.includes('Mood')&&tabs.room.includes('Textures'),'Room tab: Mood + Textures ('+tabs.room.join(' | ')+')');
  check(tabs.light[0]==='Uplights','Light tab: Uplights first');
  check(tabs.media[0]==='Where they hang','Media tab: Where they hang first');
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const rackWall=k=>p.evaluate(k=>{ const g=window.HEXCORE&&window.HEX.scene.children.filter(o=>o.userData.isTile&&o.userData.tile.kind===k); if(!g.length) return -1;
    const pp=g[2].position; const a=Math.atan2(pp.x,-pp.z); return ((Math.round(a/(Math.PI/3))%6)+6)%6; },k);
  check(await rackWall('photo')===5&&await rackWall('video')===1,'default: photos on wall 5, videos on wall 1');
  await seg('Photos on','2'); await p.waitForTimeout(300);
  check(await rackWall('photo')===2,'photos move to wall 2');
  await seg('Videos on','2'); await p.waitForTimeout(300);
  check(await rackWall('video')===2&&await rackWall('photo')===1,'videos onto a taken wall → they swap');
  await seg('Photos on',"don't show"); await p.waitForTimeout(300);
  check(await rackWall('photo')===-1,'photos can be hidden');
  await seg('Photos on','5'); await p.waitForTimeout(300);
  // textures + light
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="room"]').click());
  const m0=await p.evaluate(()=>window.HEX.walls[2].material.map.uuid);
  await seg('Walls','brick'); await p.waitForTimeout(400);
  check(await p.evaluate(m0=>window.HEX.walls[2].material.map.uuid!==m0,m0),'Walls · brick swaps the texture');
  await seg('Look','gallery'); await p.waitForTimeout(300);
  check(await p.evaluate(()=>Math.abs(window.HEX._mood.hemi.intensity-.75*1.6)<.01),'Look · gallery brightens the room');
  await seg('Look','dark'); await p.waitForTimeout(300);
  // a window with a set, like the other builders
  const choose=async(fn,f)=>{ const [fc]=await Promise.all([p.waitForEvent('filechooser'),fn()]); await fc.setFiles(f); await p.waitForTimeout(1000); };
  const rowBtn=l=>p.evaluate(l=>[...document.querySelectorAll('#stg .strow')].find(x=>(x.querySelector('.nm b')||{}).textContent===l).querySelector('button.add').click(),l);
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  await choose(()=>rowBtn('Wall 0 · FRONT'),A('wall-window.png'));
  await btn('+ new set'); await p.waitForTimeout(600);
  await choose(()=>rowBtn('Background'),A('pano.jpg'));
  await btn('done & lock'); await p.waitForTimeout(600);
  await p.evaluate(()=>{ const b=document.querySelector('#stgRail button[data-tab="windows"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); }); await p.waitForTimeout(300);
  await btn('use my art’s see-through part');   /* v43: the old way, still there in the Mood Room */
  await p.waitForTimeout(1500);
  const w0=await p.evaluate(()=>({std:window.HEX.walls[0].material.isMeshStandardMaterial, at:window.HEX.walls[0].material.alphaTest,
    set:window.HEX.scene.children.some(o=>o.userData&&o.userData.isSet&&o.position.y>-50)}));
  check(w0.std&&w0.at===.5&&w0.set,'a window with a set works in the Mood Room ('+JSON.stringify(w0)+')');
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); window.HEX.setYaw(0); }); await p.waitForTimeout(800);
  await p.screenshot({path:'shots/t83-mood.png'});
  await p.evaluate(()=>window.HEX.setYaw(Math.PI*.33)); await p.waitForTimeout(600);
  await p.screenshot({path:'shots/t83-mood-photos.png'});
  // bake
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t83.html'); await dl.saveAs(bp);
  const html=fs.readFileSync(bp,'utf8');
  check(/"mood":\{/.test(html)&&/brick_col/.test(html)&&/concrete_col/.test(html)&&!/metal_col/.test(html),'bake carries the mood + only the packs it uses');
  check(!/HEXMOODTEX|stgRail|stgTop/.test(html),'no builder library or editor chrome in the bake');
  await p.close(); /*t83fix*/
  const q=await b.newPage({viewport:{width:1280,height:800}}); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t83.html',{waitUntil:'domcontentloaded'}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok); await q.waitForTimeout(2500);
  const d2=await q.evaluate(()=>{ const H=window.HEX, S=H._mood; const g=H.scene.children.filter(o=>o.userData.isTile&&o.userData.tile.kind==='video');
    return {on:!!(S&&S.on), std:H.walls.every(w=>w.material.isMeshStandardMaterial), post:typeof H.post==='function', ceil:S&&S.ceil.visible,
      vids:g.length, ups:S&&S.ups.filter(u=>u.sp.visible).length}; });
  check(d2.on&&d2.std&&d2.post&&d2.ceil&&d2.ups===6&&d2.vids===5,'published room: mood, ceiling, halo, uplights, videos on their wall');
  await q.screenshot({path:'shots/t83-published.png'});
  // Event Space untouched
  await q.close(); await p.close();
  const r=await b.newPage({viewport:{width:1280,height:800}}); const e3=[]; r.on('pageerror',x=>e3.push(String(x)));
  await r.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=event',{waitUntil:'domcontentloaded'}); await r.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await r.waitForTimeout(1200);
  const d3=await r.evaluate(()=>({mood:!!window.HEX._mood, basic:window.HEX.walls.every(w=>w.material.isMeshBasicMaterial), post:window.HEX.post,
    secs:[...document.querySelectorAll('#stgBody>.stsec')].map(s=>s.dataset.t).filter(t=>/Mood|Textures|Uplights|Where they hang/.test(t)).length,
    ban:[...document.querySelectorAll('#stg .strow .nm b')].filter(x=>/^Banner/.test(x.textContent)).length}));
  check(!d3.mood&&d3.basic&&d3.post===null&&d3.secs===0&&d3.ban===2,'Event Space unchanged (no mood, flat walls, banners kept)');
  check(errs.length===0&&e2.length===0&&e3.length===0,'no errors'+((errs[0]||e2[0]||e3[0])?': '+(errs[0]||e2[0]||e3[0]):''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
