// t126 — v77: OUTSIDE KITS (Coded Kit Spec): Block Town + Neon City join the map as kit tabs, their models join Models
// (look / parts / extras / door), lamps feed the pool, Neon streets get wet, bakes carry only the kits used. + the map tray scrolls.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const open=async q=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(q+': '+e));
    await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html'+q,{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:120000}); await p.waitForTimeout(2000);
    await p.evaluate(()=>{ window.confirm=()=>true; }); return p; };
  const bake=async(p,name)=>{ await p.evaluate(()=>document.getElementById('stg').classList.remove('open'));
    const [dl]=await Promise.all([p.waitForEvent('download',{timeout:240000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]); const f=path.join(__dirname,'..','out',name); await dl.saveAs(f); return f; };
  const w=await open('?space=world');
  // 1 · the kits are in
  const kits=await w.evaluate(()=>window.HEXCORE.WORLD.KITS.map(k=>k.id+':'+k.name));
  check(kits.includes('blocktown:Block Town')&&kits.includes('cyber:Neon City'),'Block Town and Neon City join Original + Realistic '+JSON.stringify(kits));
  const n=await w.evaluate(()=>{ const K=window.HEXCORE.WORLD.KIT; return {bt:K.filter(k=>k.kit==='blocktown').length, cy:K.filter(k=>k.kit==='cyber').length}; });
  check(n.bt===26&&n.cy===27,'all their ground pieces (Block Town '+n.bt+', Neon City '+n.cy+')');
  // 2 · the map: kit tabs, scrolling tray, pictures
  await w.evaluate(()=>[...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click()); await w.waitForTimeout(2500);
  const tabs=await w.evaluate(()=>[...document.querySelectorAll('#wmap .wkits button')].map(x=>x.textContent));
  check(tabs.join()==='Original kit,Realistic kit,Block Town kit,Neon City kit,Ember & Crystal kit','the map shows five kit tabs '+JSON.stringify(tabs));
  await w.evaluate(()=>{ [...document.querySelectorAll('#wmap .wkits button')].find(x=>x.textContent==='Block Town kit').click(); [...document.querySelectorAll('#wmap .wtabs button')].find(x=>x.textContent==='Nature').click(); }); await w.waitForTimeout(6000);
  const sc=await w.evaluate(()=>{ const P=document.querySelector('#wmap .wpcs'); return {sh:P.scrollHeight, ch:P.clientHeight}; });
  check(sc.sh>sc.ch+50,'Block Town nature has more pieces than fit ('+sc.sh+' > '+sc.ch+' px)');
  const box=await w.evaluate(()=>{ const r=document.querySelector('#wmap .wpcs').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
  await w.mouse.move(box.x,box.y); for(let i=0;i<6;i++){ await w.mouse.wheel(0,300); await w.waitForTimeout(150); }
  const st=await w.evaluate(()=>document.querySelector('#wmap .wpcs').scrollTop);
  check(st>200,'the wheel scrolls the piece list down to the rest ('+st+' px)');
  const pics=await w.evaluate(async()=>{ await new Promise(r=>setTimeout(r,3000)); return [...document.querySelectorAll('#wmap .wpc img')].length; });
  check(pics>=10,'Block Town pieces have tray pictures ('+pics+')');
  await w.evaluate(()=>{ [...document.querySelectorAll('#wmap .wkits button')].find(x=>x.textContent==='Neon City kit').click(); [...document.querySelectorAll('#wmap .wtabs button')].find(x=>x.textContent==='City').click(); }); await w.waitForTimeout(9000);
  const npic=await w.evaluate(()=>{ const im=[...document.querySelectorAll('#wmap .wpc img')][0]; if(!im) return -1; const c=document.createElement('canvas'); c.width=c.height=24; const x=c.getContext('2d'); x.drawImage(im,0,0,24,24); const d=x.getImageData(0,0,24,24).data; let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2]; return s/(24*24*3); });
  check(npic>25,'Neon City tray pictures wait for its textures (not black: '+Math.round(npic)+')');
  // a town of both kits; edges join across kits
  const t=await w.evaluate(()=>{ const M=window.__wmap(); [[27,'CYBER-C01',0],[35,'CYBER-C04',0],[43,'CYBER-C01',0],[34,'CYBER-C01',1],[36,'CYBER-C01',1],[26,'CYBER-C20',0],[28,'CYBER-C24',0],[42,'CYBER-N02',0],
      [19,'BLOCKTOWN-C01',0],[33,'BLOCKTOWN-C01',1],[37,'C01R',1],[44,'BLOCKTOWN-N01',0],[25,'BLOCKTOWN-C06',0],[20,'BLOCKTOWN-N02',0]].forEach(([i,id,r])=>M.place(i,id,r)); M.check(); return {count:M.count(), warn:M.warn()}; });
  check(/14/.test(t.count)&&!t.warn,'Block Town, Neon City and Realistic roads join on one map, no red edges '+JSON.stringify(t));
  await w.evaluate(()=>document.querySelector('#wmap [data-a="walk"]').click()); await w.waitForTimeout(8000);
  const wl=await w.evaluate(()=>{ const X=window.HEX._world; return {tiles:X.tiles.children.length, lamps:(X.lampPts||[]).length, pool:(X.pool||[]).filter(L=>L.intensity>0).length}; });
  const vc=await w.evaluate(()=>{ let bt=0,col=0; window.HEX._world.tiles.children.forEach(o=>{ const m=o.material; if(o.geometry&&m&&m.vertexColors){ bt++; if(o.geometry.attributes.color) col++; } }); return {bt,col}; });
  check(vc.bt>0&&vc.col===vc.bt,'Block Town pieces keep their colours on the map (not black) '+JSON.stringify(vc));
  check(wl.tiles>20&&wl.lamps>=10&&wl.pool>0,'walking it: kit pieces laid, their street lamps feed the light pool '+JSON.stringify(wl));
  await w.evaluate(()=>document.querySelector('#stgRail button[data-tab="room"]').click()); await w.waitForTimeout(300);
  await w.evaluate(()=>{ const r=[...document.querySelectorAll('#stg .stf')].find(x=>x.querySelector('label')&&x.querySelector('label').textContent==='Streets'); [...r.querySelectorAll('button')].find(x=>x.textContent==='wet · shiny').click(); }); await w.waitForTimeout(1500);
  const wet=await w.evaluate(()=>{ let m=null; window.HEX._world.tiles.traverse(o=>{ if(!m&&o.material&&o.material.userData&&o.material.userData.kitRole==='asphalt') m=o.material; }); return m?{r:+m.roughness.toFixed(2),r0:m.userData._dryR,env:!!m.envMap}:null; });
  check(wet&&wet.r<wet.r0&&wet.env,'Streets → wet makes Neon City asphalt glossy '+JSON.stringify(wet));
  await w.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); const N=window.HEXCORE.NAV; N.pos.x=0; N.pos.z=26; N.eye=9; window.HEX.setYaw(0); }); await w.waitForTimeout(3000);
  await w.screenshot({path:path.join(__dirname,'..','out','t126-town.png')});
  // 3 · models: kit rows, look/parts/extras, door
  await w.evaluate(()=>{ document.getElementById('stg').classList.add('open'); document.querySelector('#stgRail button[data-tab="models"]').click(); }); await w.waitForTimeout(400);
  const heads=await w.evaluate(()=>[...document.querySelectorAll('#stg .stsub')].map(x=>x.textContent).filter(t=>/models$/.test(t)));
  check(heads.includes('Block Town models')&&heads.includes('Neon City models'),'Models lists each kit’s models '+JSON.stringify(heads));
  const btn=t=>w.evaluate(t=>{ const x=[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t); if(!x) return false; x.click(); return true; },t);
  check(await w.evaluate(()=>{ const h=[...document.querySelectorAll('#stg .stsub')].find(x=>x.textContent==='Block Town models'); const x=h&&[...h.nextElementSibling.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Cottage'); if(!x) return false; x.click(); return true; }),'"+ Cottage" (Block Town) adds it'); await w.waitForTimeout(2000);
  const cot=await w.evaluate(()=>{ const p=window.HEXCORE.WORLDPROPS().find(q=>q.kind==='kit_BLOCKTOWN-P01'); const g=window.HEXCORE.PROPG[p.id]; let tri=0; g.traverse(o=>{ if(o.isMesh){ const G=o.geometry; tri+=(G.index?G.index.count:G.attributes.position.count)/3; } });
    return {door:!!(p.door&&p.door.on), solid:!!p.solid, tri:Math.round(tri), look:p.kit&&p.kit.look, labels:[...document.querySelectorAll('#stg .stf label')].map(l=>l.textContent), subs:[...document.querySelectorAll('#stg .stsub')].map(x=>x.textContent)}; });
  check(cot.door&&cot.solid&&cot.tri>500,'the cottage is solid and its front door can open a room '+JSON.stringify({door:cot.door,solid:cot.solid,tri:cot.tri}));
  check(['Look','Walls','Walls colour','Roof','Shutters','Glow lights','Fence'].every(x=>cot.labels.includes(x)),'its panel: Look, Walls finish + colour, Roof, Shutters, lights, extras '+JSON.stringify(cot.labels.slice(0,16)));
  const seg=(lab,t)=>w.evaluate(([lab,t])=>{ const h=[...document.querySelectorAll('#stg .stsub')].find(x=>x.textContent==='Block Town · Cottage'); const all=[...document.querySelectorAll('#stg .stf')].filter(x=>h&&(h.compareDocumentPosition(x)&Node.DOCUMENT_POSITION_FOLLOWING)); const r=all.find(x=>x.querySelector('label')&&x.querySelector('label').textContent===lab); if(!r) return false; const x=[...r.querySelectorAll('button')].find(x=>x.textContent===t); if(!x) return false; x.click(); return true; },[lab,t]);
  const tri0=cot.tri; await seg('Look','abandoned'); await w.waitForTimeout(1500); await seg('Walls','brick'); await w.waitForTimeout(1500);
  const cot2=await w.evaluate(()=>{ const p=window.HEXCORE.WORLDPROPS().find(q=>q.kind==='kit_BLOCKTOWN-P01'); const g=window.HEXCORE.PROPG[p.id]; let tri=0; g.traverse(o=>{ if(o.isMesh){ const G=o.geometry; tri+=(G.index?G.index.count:G.attributes.position.count)/3; } }); return {look:p.kit.look, walls:p.kit.parts.walls&&p.kit.parts.walls.finish, tri:Math.round(tri)}; });
  check(cot2.look==='abandoned'&&cot2.walls==='brick'&&cot2.tri!==tri0,'Look → abandoned and Walls → brick rebuild the cottage '+JSON.stringify(cot2));
  check(await btn('+ Video screen'),'"+ Video screen" (Block Town) adds it'); await w.waitForTimeout(2000);
  const vs=await w.evaluate(()=>{ const p=window.HEXCORE.WORLDPROPS().find(q=>q.kind==='kit_BLOCKTOWN-P08'); return {screen:!!(p.screen), sec:[...document.querySelectorAll('#stg .stsub')].some(x=>x.textContent==='Screen')}; });
  check(vs.screen&&vs.sec,'Block Town’s video screen gets the Screen section (clips)');
  check(await btn('+ Street food cart'),'"+ Street food cart" (Neon City) adds it'); await w.waitForTimeout(2000);
  const cart=await w.evaluate(()=>[...document.querySelectorAll('#stg .stf label')].map(l=>l.textContent));
  check(cart.length>0,'Neon City models get colour pickers for their parts '+JSON.stringify(cart.slice(0,6)));
  // 4 · bake + publish
  const bp=await bake(w,'t126.html'); await w.close(); const html=fs.readFileSync(bp,'utf8');
  check(/data-wkit="blocktown"/.test(html)&&/data-wkit="cyber"/.test(html),'a world using both kits carries both');
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t126.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(9000);
  const pub=await q.evaluate(()=>{ const X=window.HEX._world; const kinds=(window.HEXBAKE.props||[]).map(p=>p.kind); return {tiles:X.tiles.children.length, lamps:(X.lampPts||[]).length, props:kinds.filter(k=>window.HEXCORE.PROPG&&Object.values(window.HEXCORE.PROPG).length).length, built:Object.keys(window.HEXCORE.PROPG||{}).length, doors:Object.keys(X.doors||{}).filter(k=>X.doors[k].at).length}; });
  check(pub.tiles>20&&pub.lamps>=10&&pub.built>=3&&pub.doors>=1,'published world: both kits’ pieces, lamps, models and the cottage door '+JSON.stringify(pub));
  await q.close();
  const ctx2=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const r=await (async()=>{ const p=await ctx2.newPage(); p.on('pageerror',e=>errs.push('plain: '+e)); await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:120000}); await p.waitForTimeout(2000); await p.evaluate(()=>{ window.confirm=()=>true; }); return p; })(); await r.evaluate(()=>{ [...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click(); }); await r.waitForTimeout(2000);
  await r.evaluate(()=>{ const M=window.__wmap(); M.place(27,'C01R',0); M.check(); document.querySelector('#wmap [data-a="walk"]').click(); }); await r.waitForTimeout(3000);
  const rp=await bake(r,'t126-plain.html'); const rh=fs.readFileSync(rp,'utf8'); check(!/data-wkit/.test(rh),'a world without them carries neither kit ('+Math.round(rh.length/1048576*10)/10+' MB)'); await r.close();
  check(errs.length===0,'no page errors '+errs.slice(0,3).join(' | '));
  await b.close();
  console.log((bad.length?'FAIL ':'PASS ')+ok.length+(bad.length?' / FAIL '+bad.length:''));
  ok.forEach(m=>console.log('  ✓ '+m)); bad.forEach(m=>console.log('  ✗ '+m));
  process.exit(bad.length?1:0);
})();
