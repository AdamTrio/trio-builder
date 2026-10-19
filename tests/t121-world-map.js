// t121 — v72: the WORLD MAP — lay ground pieces on an 8×8 grid from above (place / turn / erase / 2×2 / red edges / sample town),
// add your own Blender piece (.glb, name parsed, BLOCK_ parts solid), walk it, bake it, reopen it. Rooms untouched.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
const PIECE=path.join(__dirname,'..','setassets','kit','TRIO_C20_test-block_1x1_CCCC.glb');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const open=async(q)=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(q+': '+e));
    await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html'+q,{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:90000}); await p.waitForTimeout(2500); return p; };
  const p=await open('?space=world');
  await p.evaluate(()=>{ window.confirm=()=>true; });
  check(await p.evaluate(()=>[...document.querySelectorAll('#stgTop button')].some(x=>x.textContent==='map')&&[...document.querySelectorAll('#stg button')].some(x=>x.textContent==='open the map')),'World: a "map" button up top and "open the map" in the World section');
  await p.evaluate(()=>[...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click()); await p.waitForTimeout(2000);
  await p.evaluate(()=>[...document.querySelectorAll('#wmap .wkits button')].find(x=>x.textContent==='Original kit').click()); await p.waitForTimeout(800);   /* v73: the Original kit */
  const m0=await p.evaluate(()=>({ov:!!document.getElementById('wmap'), count:window.__wmap().count(), pcs:document.querySelectorAll('#wmap .wpc').length, tabs:[...document.querySelectorAll('#wmap .wtabs button')].map(x=>x.textContent)}));
  check(m0.ov&&/^0 of 64/.test(m0.count)&&m0.pcs>=12&&m0.tabs.join()==='Nature,City','the map opens from above: 8×8 empty, a tray of pieces, Nature / City '+JSON.stringify(m0));
  await p.screenshot({path:path.join(__dirname,'..','out','t121-map-empty.png')});
  // real clicks: pick Crossroads, click square 0; pick Dense forest, click square 1 → the edge between them is red
  const pickPiece=(name)=>p.evaluate(n=>{ const fam=/^(Meadow|Bushes|Light forest|Dense forest|Path|Clearing|Rocks|Pond)/.test(n)?'Nature':'City'; [...document.querySelectorAll('#wmap .wtabs button')].find(x=>x.textContent===fam).click();
    [...document.querySelectorAll('#wmap .wpc')].find(x=>x.querySelector('s')&&x.querySelector('s').textContent===n).click(); },name);
  const clickCell=async i=>{ const [x,y]=await p.evaluate(i=>window.__wmap().screenOf(i),i); await p.mouse.click(x,y); await p.waitForTimeout(300); };
  await pickPiece('Crossroads'); await clickCell(0); await pickPiece('Dense forest'); await clickCell(1); await p.waitForTimeout(400);
  let st=await p.evaluate(()=>({cells:window.__wmap().cells.slice(0,2), warn:window.__wmap().warn()}));
  check(st.cells[0]&&st.cells[0].id==='C04'&&st.cells[1]&&st.cells[1].id==='N04','click a square → the piece goes down '+JSON.stringify(st.cells));
  check(/1 edge doesn’t join/.test(st.warn),'a road running into a forest is flagged red ('+st.warn+')');
  // drag paints a row
  await pickPiece('Meadow'); { const [x0,y0]=await p.evaluate(()=>window.__wmap().screenOf(16)), [x1,y1]=await p.evaluate(()=>window.__wmap().screenOf(19));
    await p.mouse.move(x0,y0); await p.mouse.down(); for(let k=1;k<=6;k++){ await p.mouse.move(x0+(x1-x0)*k/6,y0+(y1-y0)*k/6); await p.waitForTimeout(60); } await p.mouse.up(); }
  st=await p.evaluate(()=>window.__wmap().cells.slice(16,20).map(c=>c&&c.id));
  check(st.every(x=>x==='N01'),'drag across squares paints a row '+JSON.stringify(st));
  // turn + erase
  await pickPiece('Road straight'); await clickCell(2); await p.evaluate(()=>[...document.querySelectorAll('#wmap [data-t]')].find(x=>x.dataset.t==='turn').click()); await clickCell(2);
  st=await p.evaluate(()=>window.__wmap().cells[2]); check(st&&st.rot===1,'"turn" turns a placed piece a quarter '+JSON.stringify(st));
  await p.evaluate(()=>[...document.querySelectorAll('#wmap [data-t]')].find(x=>x.dataset.t==='erase').click()); await clickCell(1);
  st=await p.evaluate(()=>({c:window.__wmap().cells[1], warn:window.__wmap().warn()})); check(!st.c&&!st.warn,'"erase" clears a square (and the red edge goes) '+JSON.stringify(st));
  // R rotates the piece in hand
  await pickPiece('Road corner'); await p.keyboard.press('r'); await clickCell(3);
  st=await p.evaluate(()=>window.__wmap().cells[3]); check(st&&st.id==='C02'&&st.rot===1,'R turns the piece before you place it '+JSON.stringify(st));
  // your own piece
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>document.querySelector('#wmap .wadd').click())]); await fc.setFiles(PIECE);
  await p.waitForFunction(()=>window.__wmap().lib.length===1,null,{timeout:20000}); await p.waitForTimeout(2500);
  const L=await p.evaluate(()=>{ const L=window.__wmap().lib[0]; return {name:L.name,f:L.f,e:L.e,size:L.size,img:!!document.querySelector('#wmap .wpc.sel img'),ed:!!document.querySelector('#wmap .wed input')}; });
  check(L.name==='test block'&&L.f==='C'&&L.e==='CCCC'&&L.size===1,'"add your piece": a kit .glb comes in named and sorted from its file name '+JSON.stringify(L));
  check(L.img&&L.ed,'…with a top-down picture in the tray and its own little editor');
  // 2×2
  await p.evaluate(()=>[...document.querySelectorAll('#wmap .wed button')].find(x=>x.textContent==='2×2').click()); await p.waitForTimeout(300);
  await p.evaluate(()=>[...document.querySelectorAll('#wmap [data-t]')].find(x=>x.dataset.t==='paint').click()); await clickCell(40);
  st=await p.evaluate(()=>[40,41,48,49].map(i=>window.__wmap().cells[i]));
  check(st[0]&&st[0].id&&st[1]&&st[1].cover===40&&st[2].cover===40&&st[3].cover===40,'a 2×2 piece takes four squares '+JSON.stringify(st));
  await p.evaluate(()=>[...document.querySelectorAll('#wmap [data-t]')].find(x=>x.dataset.t==='erase').click()); await clickCell(49);
  st=await p.evaluate(()=>[40,41,48,49].map(i=>window.__wmap().cells[i])); check(st.every(c=>!c),'erasing any of its squares lifts the whole 2×2');
  await p.evaluate(()=>[...document.querySelectorAll('#wmap .wed button')].find(x=>x.textContent==='1×1').click());
  // sample town, then your piece on a lot
  await p.evaluate(()=>document.querySelector('#wmap [data-a="sample"]').click()); await p.waitForTimeout(2500);
  st=await p.evaluate(()=>({count:window.__wmap().count(), warn:window.__wmap().warn()}));
  check(/^64 of 64/.test(st.count)&&!st.warn,'"sample town": all 64 squares, every edge joins '+JSON.stringify(st));
  await p.evaluate(()=>{ [...document.querySelectorAll('#wmap .wtabs button')].find(x=>x.textContent==='City').click(); [...document.querySelectorAll('#wmap .wpc')].find(x=>/test block/.test(x.textContent)).click(); });
  await clickCell(36); st=await p.evaluate(()=>({c:window.__wmap().cells[36], warn:window.__wmap().warn()}));
  check(st.c&&/^u/.test(st.c.id)&&!st.warn,'your piece drops onto a lot and joins its neighbours '+JSON.stringify(st));
  await p.evaluate(()=>document.querySelector('#wmap [data-v="tilt"]').click()); await p.waitForTimeout(1500);
  await p.screenshot({path:path.join(__dirname,'..','out','t121-map-tilt.png')});
  // walk it
  await p.evaluate(()=>document.querySelector('#wmap [data-a="walk"]').click()); await p.waitForTimeout(4000);
  const w=await p.evaluate(()=>{ const X=window.HEX._world; return {ov:!!document.getElementById('wmap'), tiles:X.tiles?X.tiles.children.length:0, inst:X.tiles?X.tiles.children.every(o=>o.isInstancedMesh):false, ground:X.ground.visible, blocks:(X.tileBlocks||[]).length,
    out:window.HEXCORE.room(window.HEX).clamp(12,12,.8)}; });
  check(!w.ov&&w.tiles>10&&w.inst&&!w.ground,'"walk it": back in the world, the map laid down (each piece drawn once and repeated: '+w.tiles+' parts)');
  check(w.blocks===1&&(Math.abs(w.out.x-12)>2||Math.abs(w.out.z-12)>2),'your piece’s BLOCK_ part is solid — you can’t walk into it '+JSON.stringify(w.out));
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); const N=window.HEXCORE.NAV; N.pos.x=-46; N.pos.z=-8; window.HEX.setYaw(Math.PI/2); });
  await p.waitForTimeout(2500); await p.screenshot({path:path.join(__dirname,'..','out','t121-street.png')});
  // bake
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:120000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t121.html'); await dl.saveAs(bp); await p.close();
  const html=fs.readFileSync(bp,'utf8'); const bk=JSON.parse(/window\.HEXBAKE=(\{.*?\});<\/script>/s.exec(html)[1]);
  const lib=bk.mood.world.lib||[];
  check(bk.mood.world.map.cells.filter(Boolean).length===64&&lib.length===1&&bk.assets[lib[0].asset]&&!/id="wmap"/.test(html),'the bake carries the map and your piece file (not the map editor)');
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t121.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(5000);
  const pub=await q.evaluate(()=>{ const X=window.HEX._world; return {tiles:X&&X.tiles?X.tiles.children.length:0, blocks:(X&&X.tileBlocks||[]).length}; });
  check(pub.tiles===w.tiles&&pub.blocks===1,'published world: the same map, your piece solid '+JSON.stringify(pub));
  await q.evaluate(()=>{ const sp=document.getElementById('splash'); if(sp) sp.classList.add('gone'); const N=window.HEXCORE.NAV; N.pos.x=-46; N.pos.z=-8; window.HEX.setYaw(-Math.PI/2); }); await q.waitForTimeout(2000);
  await q.screenshot({path:path.join(__dirname,'..','out','t121-published.png')}); await q.close();
  // reopen the baked world in the builder
  const r=await open('?space=world'); await r.evaluate(()=>{ window.confirm=()=>true; });
  const [fc2]=await Promise.all([r.waitForEvent('filechooser'),r.evaluate(()=>[...document.querySelectorAll('button')].find(x=>/^open project/.test(x.textContent.trim())).click())]); await fc2.setFiles(bp);
  await r.waitForTimeout(8000);
  const re=await r.evaluate(async()=>{ const M=window.HEX._mood.M, L=M.world&&M.world.lib&&M.world.lib[0]; const buf=L?await window.HEXCORE.WORLDBUF(L.asset):null;
    return {cells:M.world&&M.world.map?M.world.map.cells.filter(Boolean).length:0, lib:!!L, buf:!!(buf&&buf.byteLength), tiles:window.HEX._world.tiles?window.HEX._world.tiles.children.length:0}; });
  check(re.cells===64&&re.lib&&re.buf&&re.tiles>10,'open the baked world in the builder: the map and your piece come back '+JSON.stringify(re));
  await r.close();
  // rooms untouched
  const m=await open('?space=mood');
  check(await m.evaluate(()=>![...document.querySelectorAll('#stgTop button')].some(x=>x.textContent==='map')&&!window.HEX._world),'Mood Room: no map button, no world');
  await m.close();
  check(!errs.length,'no page errors '+errs.join(' | '));
  console.log('PASS '+ok.length); ok.forEach(x=>console.log('  ✓ '+x)); bad.forEach(x=>console.log('  ✗ '+x));
  await b.close(); process.exit(bad.length?1:0);
})();
