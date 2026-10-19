// t123 — v74: EVENT SEARCHLIGHTS (a standard light type, any editor) + the first WORLD ADD-ON (the KATSEYE building)
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const open=async(q)=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(q+': '+e));
    await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html'+q,{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:90000}); await p.waitForTimeout(2500); return p; };
  const btn=(p,t)=>p.evaluate(t=>{ const x=[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t); if(!x) return false; x.click(); return true; },t);
  const seg=(p,lab,t)=>p.evaluate(([lab,t])=>{ const r=[...document.querySelectorAll('#stg .stf')].find(x=>x.querySelector('label')&&x.querySelector('label').textContent===lab); if(!r) return false; const x=[...r.querySelectorAll('button')].find(x=>x.textContent===t); if(!x) return false; x.click(); return true; },[lab,t]);
  const tab=(p,t)=>p.evaluate(t=>document.querySelector('#stgRail button[data-tab="'+t+'"]').click(),t);
  const bake=async(p,name)=>{ await p.evaluate(()=>document.getElementById('stg').classList.remove('open'));
    const [dl]=await Promise.all([p.waitForEvent('download',{timeout:180000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]); const f=path.join(__dirname,'..','out',name); await dl.saveAs(f); return f; };

  // 1 · searchlights in a Mood Room
  const m=await open('?space=mood'); await m.evaluate(()=>{ window.confirm=()=>true; window.HEXCORE.applyMood(window.HEX,Object.assign(window.HEX._mood.M,{ceiling:'off'}),window.HEXMOODTEX); });
  await tab(m,'light'); await m.waitForTimeout(300);
  check(await btn(m,'+ Event searchlight'),'Lighting has "+ Event searchlight"');
  await m.waitForTimeout(1500);
  const s0=await m.evaluate(()=>{ const g=window.HEXCORE.SEARCHES[0]; if(!g) return null; const u=g.userData; return {kind:u.L.kind, beam:u.beam.visible, y:+g.position.y.toFixed(2), r0:u.yoke.rotation.y}; });
  check(s0&&s0.kind==='search'&&s0.beam&&s0.y===0,'a searchlight stands on the ground with its beam on '+JSON.stringify(s0));
  await m.waitForTimeout(1500);
  const r1=await m.evaluate(()=>window.HEXCORE.SEARCHES[0].userData.yoke.rotation.y);
  check(s0&&Math.abs(r1-s0.r0)>.01,'it sweeps on its own');
  const ctl=await m.evaluate(()=>[...document.querySelectorAll('#stg .stf label')].map(l=>l.textContent));
  check(['Sweep','Swing','Tilt','Beam length','Trailer','Beam at the start'].every(x=>ctl.includes(x)),'its own controls: sweep, swing, tilt, length, trailer, at the start '+JSON.stringify(ctl.filter(x=>/Sweep|Swing|Tilt|Beam|Trailer|start/.test(x))));
  await seg(m,'Beam length','x'); await seg(m,'Trailer','hidden · just the beam'); await seg(m,'Beam at the start','off · waits for a trigger'); await m.waitForTimeout(800);
  const s1=await m.evaluate(()=>{ const u=window.HEXCORE.SEARCHES[0].userData; return {beam:u.beam.visible, start:u.L.search.start, base:u.L.search.base}; });
  check(!s1.beam&&s1.start==='off'&&s1.base===false,'"At the start: off" waits dark; the trailer can hide '+JSON.stringify(s1));
  const tg=await m.evaluate(async()=>{ window.HEXCORE.SEARCHK=1; await new Promise(r=>setTimeout(r,500)); const a=window.HEXCORE.SEARCHES[0].userData.beam.visible; window.HEXCORE.trigReset([],window.HEX,[]); await new Promise(r=>setTimeout(r,500)); return [a, window.HEXCORE.SEARCHES[0].userData.beam.visible]; });
  check(tg[0]===true&&tg[1]===false,'a trigger fades them on; "reset the room" puts them back '+JSON.stringify(tg));
  await seg(m,'Beam at the start','on'); await m.waitForTimeout(400);
  // trigger target listed
  await tab(m,'models'); await m.waitForTimeout(300); await btn(m,'+ Speaker stack'); await m.waitForTimeout(1200);
  await seg(m,'Tap sets things off','on'); await m.waitForTimeout(500); await btn(m,'+ something happens'); await m.waitForTimeout(500);
  const opts=await m.evaluate(()=>[...document.querySelectorAll('#stg select option')].map(o=>o.textContent));
  check(opts.includes('the event searchlights'),'triggers can target "the event searchlights"');
  const mp=await bake(m,'t123-mood.html'); await m.close();
  const mh=fs.readFileSync(mp,'utf8'); check(!/data-waddon/.test(mh),'a Mood Room bake carries no world add-on');
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('mood pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t123-mood.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(5000);
  const pq=await q.evaluate(async()=>{ const g=window.HEXCORE.SEARCHES[0]; if(!g) return null; const a=g.userData.yoke.rotation.y; await new Promise(r=>setTimeout(r,1200)); return {beam:g.userData.beam.visible, moved:Math.abs(g.userData.yoke.rotation.y-a)>.005, base:g.userData.base.visible}; });
  check(pq&&pq.beam&&pq.moved&&pq.base===false,'published room: the searchlight sweeps (trailer hidden as asked) '+JSON.stringify(pq));
  await q.close();

  // 2 · the KATSEYE add-on in a World
  const w=await open('?space=world'); await w.evaluate(()=>{ window.confirm=()=>true; });
  await tab(w,'models'); await w.waitForTimeout(300);
  check(!(await w.evaluate(()=>[...document.querySelectorAll('#stg button')].some(x=>x.textContent==='+ KATSEYE building'))),'the KATSEYE building is hidden until its add-on is on');
  await tab(w,'addons'); await w.waitForTimeout(300);   /* v85: world add-ons live in the Add-ons tab */
  check(await w.evaluate(()=>{ const c=[...document.querySelectorAll('#stg .stcard')].find(x=>x.textContent.indexOf('KATSEYE building')===0); if(!c) return false; c.querySelector('.sttog').click(); return true; }),'World → Add-ons → KATSEYE building: on'); await w.waitForTimeout(400);
  await tab(w,'models'); await w.waitForTimeout(300);
  check(await btn(w,'+ KATSEYE building'),'Models now offers "+ KATSEYE building"');
  await w.waitForTimeout(2500);
  const k=await w.evaluate(()=>{ const p=window.HEXCORE.WORLDPROPS().find(q=>q.kind==='katseye'); const g=window.HEXCORE.PROPG[p.id]; const s=new THREE.Box3().setFromObject(g.children.find(c=>c!==g.userData.shadow)).getSize(new THREE.Vector3());
    p.pos=[0,0,-20]; p.rot[1]=0; window.HEXCORE.apply(p,g); return {w:+s.x.toFixed(1),h:+s.y.toFixed(1),solid:p.solid,door:p.door&&p.door.on,name:p.door.name,sign:p.sign,id:p.id}; });
  check(k.w>20&&k.w<23&&k.h>7.5&&k.h<9.5&&k.solid&&k.door&&k.name==='KATSEYE'&&k.sign==='on','it comes in at full size (about '+k.w+' m across, '+k.h+' m tall), solid, with its door ready to link');
  await w.evaluate(()=>{ const ins=[...document.querySelectorAll('#stg input')]; const u=ins.find(i=>/room’s link/.test(i.placeholder)); u.value='https://example.com/katseye'; u.dispatchEvent(new Event('input')); });
  await w.waitForTimeout(1500);
  const d=await w.evaluate(id=>{ const D=window.HEX._world.doors[id]; return D?{at:D.at&&[+D.at.x.toFixed(1),+D.at.z.toFixed(1)],mesh:!!D.mesh,label:!!D.label}:null; },k.id);
  check(d&&d.at&&Math.abs(d.at[0])<.5&&d.at[1]>-11.5&&d.at[1]<-9&&!d.mesh&&!d.label,'its own arched door is the door: no extra doorway, a pin + "Enter" at the arch '+JSON.stringify(d));
  const inside=await w.evaluate(()=>window.HEXCORE.room(window.HEX).clamp(0,-20,.8));
  check(Math.hypot(inside.x,inside.z+20)>8,'solid: you can’t walk into it '+JSON.stringify(inside));
  await w.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); const N=window.HEXCORE.NAV; N.pos.x=0; N.pos.z=-7.5; window.HEX.setYaw(0); });
  await w.waitForFunction(()=>document.getElementById('hexWorldEnter').style.opacity==='1',null,{timeout:20000}).catch(()=>{});
  check(/Enter KATSEYE/.test(await w.evaluate(()=>document.getElementById('hexWorldEnter').textContent)),'walk up to the arch → "Enter KATSEYE"');
  // a searchlight next to it
  await w.evaluate(()=>document.getElementById('stg').classList.add('open')); await tab(w,'light'); await w.waitForTimeout(300); await btn(w,'+ Event searchlight'); await w.waitForTimeout(800);
  await w.evaluate(()=>{ const L=window.HEX._mood&&null; });
  await w.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); const N=window.HEXCORE.NAV; N.pos.x=8; N.pos.z=14; window.HEX.setYaw(.3); window.HEX.addPitch&&window.HEX.addPitch(.3); }); await w.waitForTimeout(3000);
  await w.screenshot({path:path.join(__dirname,'..','out','t123-world.png')});
  // sign off
  await w.evaluate(()=>document.getElementById('stg').classList.add('open')); await tab(w,'models'); await w.waitForTimeout(300);
  await w.evaluate(id=>{ const r=[...document.querySelectorAll('#stg .strow')].find(x=>/KATSEYE/i.test(x.textContent)); if(r&&!r.classList.contains('sel')) r.click(); },k.id); await w.waitForTimeout(500);
  await seg(w,'Sign','off'); await w.waitForTimeout(1200);
  const so=await w.evaluate(()=>{ let v=null; window.HEXCORE.PROPG[window.HEXCORE.WORLDPROPS().find(q=>q.kind==='katseye').id].traverse(o=>{ if(o.material&&o.material.emissiveMap&&o.material.map&&o.material.map.image&&o.material.map.image.width===2048) v=o.material.emissiveIntensity; }); return v; });
  check(so===0,'Sign → off: the letters go dark ('+so+')');
  await seg(w,'Sign','lit'); await w.waitForTimeout(600);
  const wp=await bake(w,'t123-world.html'); await w.close();
  const wh=fs.readFileSync(wp,'utf8'); check(/data-waddon="katseye"/.test(wh)&&/CORE\.PRIMS\.katseye/.test(wh),'the world bake carries the KATSEYE add-on');
  const r=await ctx.newPage(); r.on('pageerror',x=>errs.push('world pub: '+x));
  await r.goto('http://127.0.0.1:8765/out/t123-world.html',{waitUntil:'domcontentloaded',timeout:120000}); await r.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await r.waitForTimeout(6000);
  await r.evaluate(()=>{ window.__msgs=[]; addEventListener('message',e=>{ if(e.data&&e.data.trio) window.__msgs.push(e.data); }); window.HEXCORE.HOSTED=true; const sp=document.getElementById('splash'); if(sp) sp.classList.add('gone'); const N=window.HEXCORE.NAV; N.pos.x=0; N.pos.z=-7.5; window.HEX.setYaw(0); });
  await r.waitForFunction(()=>document.getElementById('hexWorldEnter').style.opacity==='1',null,{timeout:20000}).catch(()=>{});
  await r.evaluate(()=>document.getElementById('hexWorldEnter').click()); await r.waitForTimeout(500);
  const ms=await r.evaluate(()=>({m:window.__msgs, s:window.HEXCORE.SEARCHES.length, k:!!Object.values(window.HEXCORE.PROPG).length}));
  check(ms.m.some(x=>x.trio==='open'&&x.room==='https://example.com/katseye')&&ms.s===1,'published world: the building + searchlight; "Enter KATSEYE" asks the page to open the room '+JSON.stringify(ms));
  await r.evaluate(()=>{ const N=window.HEXCORE.NAV; N.pos.x=10; N.pos.z=12; window.HEX.setYaw(.4); }); await r.waitForTimeout(2500);
  await r.screenshot({path:path.join(__dirname,'..','out','t123-published.png')}); await r.close();
  // a world without it carries none
  const ctx2=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const open2=async q=>{ const p=await ctx2.newPage(); await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html'+q,{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:90000}); await p.waitForTimeout(2500); return p; };
  const w2=await open2('?space=world'); const w2p=await bake(w2,'t123-world-plain.html'); await w2.close();
  check(!/data-waddon/.test(fs.readFileSync(w2p,'utf8')),'a world that doesn’t use it carries no add-on');
  check(!errs.length,'no page errors '+errs.join(' | '));
  console.log('PASS '+ok.length); ok.forEach(x=>console.log('  ✓ '+x)); bad.forEach(x=>console.log('  ✗ '+x));
  await b.close(); process.exit(bad.length?1:0);
})();
