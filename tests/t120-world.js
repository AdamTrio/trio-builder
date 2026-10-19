// t120 — v71: WORLD (World 1). One 128 m land tile in its own builder; doors into rooms; start spot; map; lights fade with distance;
// models at real size; solid models; bakes with world.js — and every other space is untouched (no world, no world.js in its bake)
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const open=async(q)=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(q+': '+e));
    await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html'+q,{waitUntil:'domcontentloaded'});
    if(q) { await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:90000}); await p.waitForTimeout(2500); }
    else await p.waitForTimeout(2500);
    return p; };
  const tab=(p,t)=>p.evaluate(t=>document.querySelector('#stgRail button[data-tab="'+t+'"]').click(),t);
  const btn=(p,t)=>p.evaluate(t=>{ const x=[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t); if(!x) return false; x.click(); return true; },t);
  const segClick=(p,lab,t)=>p.evaluate(([lab,t])=>{ const r=[...document.querySelectorAll('#stg .stf')].find(x=>x.querySelector('label')&&x.querySelector('label').textContent===lab); if(!r) return false;
    const x=[...r.querySelectorAll('button')].find(x=>x.textContent===t); if(!x) return false; x.click(); return true; },[lab,t]);

  // 0 · the gate offers WORLD
  const g=await open('');
  check(await g.evaluate(()=>!!document.querySelector('#hexGate button[data-s="world"]')),'the "What are you building?" screen offers WORLD');
  await g.close();

  // 1 · the World builder
  const p=await open('?space=world');
  const s0=await p.evaluate(()=>{ const H=window.HEX, X=H._world; return {world:!!X, floor:H.floor.visible, walls:H.walls.some(w=>w.visible), ground:X&&X.ground.visible,
    pos:[+H.cam.position.x.toFixed(1),+H.cam.position.z.toFixed(1)], edge:window.HEXCORE.room(H).clamp(100,-100,.8), title:document.getElementById('stgTitle').textContent,
    open:window.HEXCORE.WORLDON, map:!!document.getElementById('hexWorldMap'), tags:!!document.querySelector('.hexWallTag:not([style*="none"])') }; });
  check(s0.world&&s0.ground&&!s0.floor&&!s0.walls,'World: the land is there, the hexagon floor and walls are put away '+JSON.stringify(s0));
  check(s0.pos[0]===0&&s0.pos[1]===40,'you arrive at the start spot (0, 40) '+JSON.stringify(s0.pos));
  check(Math.abs(s0.edge.x-63.2)<.01&&Math.abs(s0.edge.z+63.2)<.01,'you can walk to the edge of the 128 m tile, not past it '+JSON.stringify(s0.edge));
  check(s0.map,'the corner map is there');
  const secs=await p.evaluate(()=>[...document.querySelectorAll('#stgBody>.stsec')].map(s=>s.dataset.t));
  check(secs.includes('World')&&!secs.includes('Walls & floor')&&!secs.includes('Windows & sets')&&!secs.includes('Uplights'),'panel: a World section; no walls, windows or uplights '+JSON.stringify(secs));
  check(await p.evaluate(()=>[...document.querySelectorAll('#stg .stf label')].some(l=>l.textContent==='Ground')),'Textures: the floor texture is called Ground');
  await tab(p,'models'); await p.waitForTimeout(300);
  const prims=await p.evaluate(()=>[...document.querySelectorAll('#stg button')].map(b=>b.textContent).filter(t=>/^\+ /.test(t)));
  check(prims.includes('+ Building block')&&prims.includes('+ Lamp post')&&prims.includes('+ Doorway')&&!prims.includes('+ Speaker stack'),'Models: world pieces (building block, tower, lamp post, doorway) '+JSON.stringify(prims));
  // a real model comes in at its real size
  let [fc]=await Promise.all([p.waitForEvent('filechooser'),btn(p,'drop a model file…')]); await fc.setFiles(path.join(__dirname,'..','setassets','model.glb'));
  await p.waitForFunction(()=>window.HEXCORE.WORLDPROPS().some(q=>q.type==='glb'&&window.HEXCORE.PROPG[q.id]),null,{timeout:60000}); await p.waitForTimeout(800);
  const real=await p.evaluate(()=>{ const q=window.HEXCORE.WORLDPROPS().find(q=>q.type==='glb'); return {w:q.size, lit:q.lit, z:+q.pos[2].toFixed(1)}; });
  check(Math.abs(real.w-.98)<.05&&real.lit,'a dropped model comes in at its real size (0.98 m, not shrunk to 1.6 m) and lit '+JSON.stringify(real));
  // a building with a door
  await btn(p,'+ Building block'); await p.waitForTimeout(800);
  const bid=await p.evaluate(()=>{ const q=window.HEXCORE.WORLDPROPS().find(q=>q.kind==='wblock'); q.pos=[-20,0,-10]; window.HEXCORE.apply(q,window.HEXCORE.PROPG[q.id]); return q.id; });
  const hasDoorUI=await segClick(p,'Opens a room','on'); await p.waitForTimeout(400);
  check(hasDoorUI,'a model has "Opens a room"');
  await p.evaluate(()=>{ const ins=[...document.querySelectorAll('#stg input')]; const n=ins.find(i=>/name over the door/.test(i.placeholder)), u=ins.find(i=>/room’s link/.test(i.placeholder));
    n.value='Knocked Loose'; n.dispatchEvent(new Event('input')); u.value='https://example.com/kl-room'; u.dispatchEvent(new Event('input')); });
  await segClick(p,'Walk through','no · solid'); await p.waitForTimeout(1500);
  const d1=await p.evaluate(id=>{ const X=window.HEX._world, D=X.doors[id]; return D&&D.mesh?{x:+D.at.x.toFixed(1),z:+D.at.z.toFixed(1),label:!!D.label,blocks:X.blocks.length}:null; },bid);
  check(d1&&d1.x===-20&&Math.abs(d1.z+4)<.3&&d1.label,'the door glows at the front of the building, with its name over it '+JSON.stringify(d1));
  const inside=await p.evaluate(()=>window.HEXCORE.room(window.HEX).clamp(-20,-10,.8));
  check(d1&&d1.blocks>=1&&(Math.abs(inside.x+20)>5.9||Math.abs(inside.z+10)>5.9),'solid: you can’t walk into the building '+JSON.stringify(inside));
  const drag=await p.evaluate(()=>window.HEXCORE.room(window.HEX).clamp(-20,-10,.35));
  check(drag.x===-20&&drag.z===-10,'…but you can still drag things anywhere in the builder');
  // walk up to the door → "Enter Knocked Loose"
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); const N=window.HEXCORE.NAV; N.pos.x=-20; N.pos.z=-1; window.HEX.setYaw(0); });
  await p.waitForTimeout(1500);
  const chip=await p.evaluate(()=>{ const c=document.getElementById('hexWorldEnter'); return {t:c.textContent,o:c.style.opacity}; });
  check(/Enter Knocked Loose/.test(chip.t)&&chip.o==='1','walk up to the door → "Enter Knocked Loose" '+JSON.stringify(chip));
  await p.screenshot({path:path.join(__dirname,'..','out','t120-door.png')});
  const url0=p.url(); await p.evaluate(()=>document.getElementById('hexWorldEnter').click()); await p.waitForTimeout(600);
  check(p.url()===url0,'in the builder the door only says where it goes (you never leave the editor)');
  // lights fade with distance
  await tab(p,'light'); await p.waitForTimeout(300);
  await btn(p,'+ Spotlight'); await p.waitForTimeout(1500);
  const lf=await p.evaluate(async()=>{ const X=window.HEX._world; const L=X.lights[0]; if(!L) return null; const near=L.intensity; const N=window.HEXCORE.NAV;
    const lp=L.getWorldPosition(new THREE.Vector3()); N.pos.x=Math.max(-63,Math.min(63,lp.x+70)); N.pos.z=Math.max(-63,Math.min(63,lp.z+60)); await new Promise(r=>setTimeout(r,1500));
    const far=L.intensity; N.pos.x=lp.x; N.pos.z=lp.z+3; await new Promise(r=>setTimeout(r,1500)); return {near,far,back:L.intensity,n:X.lights.length}; });
  check(lf&&lf.near>0&&lf.far===0&&Math.abs(lf.back-lf.near)<1e-3,'a light switches off far away and comes back as you walk up '+JSON.stringify(lf));
  // start spot
  await p.evaluate(()=>{ const N=window.HEXCORE.NAV; N.pos.x=10; N.pos.z=20; window.HEX.setYaw(1); document.getElementById('stg').classList.add('open'); });
  await tab(p,'room'); await p.waitForTimeout(400); await btn(p,'set start here'); await p.waitForTimeout(300);
  const st=await p.evaluate(()=>JSON.stringify(window.HEXCORE.WORLDPROPS&&window.HEX._world.cfg.start));
  check(st==='{"x":10,"z":20,"yaw":1}','"set start here" saves where you stand and the way you face '+st);
  await p.evaluate(()=>{ const N=window.HEXCORE.NAV; N.pos.x=-30; N.pos.z=-30; }); await btn(p,'go to start'); await p.waitForTimeout(1200);
  const at=await p.evaluate(()=>[+window.HEX.cam.position.x.toFixed(1),+window.HEX.cam.position.z.toFixed(1),+window.HEX.getYaw().toFixed(2)]);
  check(at[0]===10&&at[1]===20&&at[2]===1,'"go to start" puts you back there '+JSON.stringify(at));
  // arrow keys walk (nothing picked)
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); }); await p.keyboard.press('Escape');
  const z0=await p.evaluate(()=>window.HEXCORE.NAV.pos.z); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(300);
  const held=await p.evaluate(()=>window.HEXCORE.NAV.keys.w); await p.waitForTimeout(2000); await p.keyboard.up('ArrowUp');
  const z1=await p.evaluate(()=>window.HEXCORE.NAV.pos.z), rel=await p.evaluate(()=>window.HEXCORE.NAV.keys.w);
  check(held===true&&rel===false&&z1<z0,'arrow keys walk, like W ('+z0.toFixed(1)+' → '+z1.toFixed(1)+')');
  const w=await p.evaluate(()=>window.HEXCORE.WORLD.weight()); check(w.models===2&&w.level==='green','weight read-out '+JSON.stringify(w));
  await p.screenshot({path:path.join(__dirname,'..','out','t120-builder.png')});
  // bake
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:120000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t120.html'); await dl.saveAs(bp); await p.close();
  const html=fs.readFileSync(bp,'utf8');
  check(/data-world/.test(html)&&/CORE\.WORLD=W/.test(html),'the baked world carries the world file');
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t120.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(4000);
  await q.evaluate(()=>{ window.__msgs=[]; addEventListener('message',e=>{ if(e.data&&e.data.trio) window.__msgs.push(e.data); }); window.HEXCORE.HOSTED=true; const sp=document.getElementById('splash'); if(sp) sp.classList.add('gone'); });
  const pub=await q.evaluate(()=>{ const H=window.HEX, X=H._world; return {world:!!X, floor:H.floor.visible, map:!!document.getElementById('hexWorldMap'), pos:[+H.cam.position.x.toFixed(1),+H.cam.position.z.toFixed(1)], doors:X?Object.keys(X.doors).length:0}; });
  check(pub.world&&!pub.floor&&pub.map&&pub.pos[0]===10&&pub.pos[1]===20,'published world: the land, the map, and you start at the start spot '+JSON.stringify(pub));
  await q.evaluate(()=>{ const N=window.HEXCORE.NAV; N.pos.x=-20; N.pos.z=-1; window.HEX.setYaw(0); });
  await q.waitForFunction(()=>document.getElementById('hexWorldEnter').style.opacity==='1',null,{timeout:20000}); await q.waitForTimeout(800);
  await q.screenshot({path:path.join(__dirname,'..','out','t120-published.png')});
  await q.evaluate(()=>document.getElementById('hexWorldEnter').click()); await q.waitForTimeout(500);
  let ms=await q.evaluate(()=>window.__msgs);
  check(ms.some(m=>m.trio==='open'&&m.room==='https://example.com/kl-room'&&m.name==='Knocked Loose'),'"Enter Knocked Loose" asks the Trio page to open that room '+JSON.stringify(ms));
  await q.evaluate(()=>{ window.__msgs.length=0; });
  const xy=await q.evaluate(()=>{ const D=Object.values(window.HEX._world.doors)[0]; const v=D.at.clone().setY(1.5); v.project(window.HEX.cam); return {x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight}; });
  await q.mouse.click(xy.x,xy.y); await q.waitForTimeout(600); ms=await q.evaluate(()=>window.__msgs);
  check(ms.some(m=>m.trio==='open'&&m.room==='https://example.com/kl-room'),'tapping the doorway does the same '+JSON.stringify(ms));
  await q.close();
  // phone
  const ph=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); const r=await ph.newPage(); r.on('pageerror',x=>errs.push('phone: '+x));
  await r.goto('http://127.0.0.1:8765/out/t120.html',{waitUntil:'domcontentloaded',timeout:120000}); await r.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await r.waitForTimeout(4000);
  await r.evaluate(()=>{ const sp=document.getElementById('splash'); if(sp) sp.classList.add('gone'); const N=window.HEXCORE.NAV; N.pos.x=-14; N.pos.z=8; window.HEX.setYaw(-.5); }); await r.waitForTimeout(1500);
  await r.screenshot({path:path.join(__dirname,'..','out','t120-phone.png')}); await ph.close();

  // 2 · every other space is untouched
  const m=await open('?space=mood');
  const mm=await m.evaluate(()=>({world:!!window.HEX._world, on:!!window.HEXCORE.WORLDON, floor:window.HEX.floor.visible, map:!!document.getElementById('hexWorldMap'), clampR:Math.hypot(...Object.values(window.HEXCORE.room(window.HEX).clamp(100,0,.8)))}));
  check(!mm.world&&!mm.on&&mm.floor&&!mm.map&&Math.abs(mm.clampR-(10*Math.cos(Math.PI/6)-.8))<.01,'Mood Room: no world, its floor, its own walls '+JSON.stringify(mm));
  await tab(m,'models'); await m.waitForTimeout(300);
  const mp=await m.evaluate(()=>[...document.querySelectorAll('#stg button')].map(b=>b.textContent).filter(t=>/^\+ /.test(t)));
  check(!mp.includes('+ Building block')&&mp.includes('+ Speaker stack'),'Mood Room: its own built-ins, no world pieces');
  const [dm]=await Promise.all([m.waitForEvent('download',{timeout:120000}),m.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const mpth=path.join(__dirname,'..','out','t120-mood.html'); await dm.saveAs(mpth); await m.close();
  const mh=fs.readFileSync(mpth,'utf8');
  check(!/data-world/.test(mh)&&!/CORE\.WORLD=W/.test(mh),'a Mood Room bake carries no world file');
  const o=await open('?space=open');
  check(await o.evaluate(()=>!window.HEX._world&&window.HEX._mood.open.g.visible),'Open Space: its floating platform, no world');
  await o.close();

  check(!errs.length,'no page errors '+errs.join(' | '));
  console.log('PASS '+ok.length); ok.forEach(x=>console.log('  ✓ '+x)); bad.forEach(x=>console.log('  ✗ '+x));
  await b.close(); process.exit(bad.length?1:0);
})();
