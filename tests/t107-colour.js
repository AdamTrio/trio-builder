// t107 — v62: Colour — walls / floor / ceiling take any colour over any texture; "original" = today's look; Open Space too; bakes
const { chromium } = require('playwright'); const path=require('path');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
const lin=v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);
const near=(c,h)=>{ const n=parseInt(h.slice(1),16); const t=[(n>>16)/255,((n>>8)&255)/255,(n&255)/255].map(lin); const m=Math.max(...c)||1, k=Math.max(...t)||1; return c.every((v,i)=>Math.abs(v/m-t[i]/k)<.08); };
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true});
  const cols=pg=>pg.evaluate(()=>{ const H=window.HEX, S=H._mood, f=m=>m.color.toArray().map(v=>+v.toFixed(3)); return {walls:H.walls.map(w=>f(w.material)), floor:f(H.floor.material), ceil:f(S.ceil.material)}; });
  // 0 · original look matches v61 exactly
  const base={};
  for(const [k,u] of [['v61','out/v61/index.html'],['v62','dist/trio-builder-admin.html']]){ const p=await ctx.newPage();
    await p.goto('http://127.0.0.1:8765/'+u+'?space=mood',{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(3000);
    base[k]=JSON.stringify(await cols(p)); await p.close(); }
  check(base.v61===base.v62,'nothing picked: the room looks exactly like v61');
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(2500);
  const rows=()=>p.evaluate(()=>[...document.querySelectorAll('#stg .stswr')].map(r=>r.querySelector('label').textContent+':'+(r.querySelector('.on')||{}).className));
  let r=await rows(); check(r.length===3&&r.every(x=>/orig on/.test(x)),'Colour: Walls, Floor, Ceiling — all on "original" ('+r.join(', ')+')');
  const dot=(row,h)=>p.evaluate(([row,h])=>{ const r=[...document.querySelectorAll('#stg .stswr')].find(x=>x.querySelector('label').textContent===row); r.querySelector('button.dot[title="'+h+'"]').click(); },[row,h]);
  await dot('Walls','#ff1f7e'); await p.waitForTimeout(3000);
  let c=await cols(p); check(c.walls.every(w=>near(w,'#ff1f7e'))&&near(c.floor,'#ff1f7e')&&near(c.ceil,'#ff1f7e'),'all the same: hot pink on walls, floor and ceiling ('+JSON.stringify(c.walls[0])+')');
  await p.evaluate(()=>[...document.querySelectorAll('#stg .stseg button')].find(x=>x.textContent==='each on its own').click()); await p.waitForTimeout(300);
  await dot('Floor','#1fb865'); await p.waitForTimeout(1200);
  c=await cols(p); check(near(c.walls[0],'#ff1f7e')&&near(c.floor,'#1fb865'),'each on its own: pink walls, green floor');
  await p.evaluate(()=>[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='Walls'&&[...x.querySelectorAll('button')].some(y=>y.textContent==='glossy')).querySelectorAll('button').forEach(b=>{ if(b.textContent==='glossy') b.click(); })); await p.waitForFunction(()=>{ const P=window.HEX.walls[0].userData.moodPack; return P&&P.map&&P.map.userData.avg; },null,{timeout:30000}).catch(()=>{}); await p.waitForTimeout(800);
  c=await cols(p); check(near(c.walls[0],'#ff1f7e'),'glossy walls stay pink ('+JSON.stringify(c.walls[0])+')');
  const shot=path.join(__dirname,'..','out','t107-pink.png'); await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); window.HEX.setYaw(0); }); await p.waitForTimeout(800); await p.screenshot({path:shot});
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:120000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  await dl.saveAs(path.join(__dirname,'..','out','t107.html'));
  await p.evaluate(()=>document.getElementById('stg').classList.add('open')); await p.waitForTimeout(300);
  await p.evaluate(()=>[...document.querySelectorAll('#stg .stswr')].find(x=>x.querySelector('label').textContent==='Walls').querySelector('button.orig').click()); await p.waitForTimeout(1200);
  c=await cols(p); check(!near(c.walls[0],'#ff1f7e'),'original: walls go back to the texture\'s own colour');
  await p.close();
  const q=await ctx.newPage(); const e2=[]; q.on('pageerror',x=>e2.push(String(x)));
  await q.goto('http://127.0.0.1:8765/out/t107.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(4000);
  c=await cols(q); check(near(c.walls[0],'#ff1f7e')&&near(c.floor,'#1fb865')&&near(c.ceil,'#ff1f7e'),'published room keeps the colours ('+JSON.stringify(c)+')');
  await q.close();
  const o=await ctx.newPage(); o.on('pageerror',e=>errs.push(String(e)));
  await o.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=open',{waitUntil:'domcontentloaded'});
  await o.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:60000}); await o.waitForTimeout(2500);
  const orow=await o.evaluate(()=>[...document.querySelectorAll('#stg .stswr label:first-child')].map(x=>x.textContent).filter(t=>t!=='+ any'));
  check(orow.join()==='Walls,Floor','Open Space: Colour for Walls and Floor ('+orow.join()+')');
  await o.evaluate(()=>[...document.querySelectorAll('#stg .stswr')].find(x=>x.querySelector('label').textContent==='Floor').querySelector('button.dot[title="#2b5bff"]').click()); await o.waitForTimeout(1500);
  const fl=await o.evaluate(()=>window.HEX.floor.material.color.toArray()); check(near(fl,'#2b5bff'),'Open Space: platform floor turns blue');
  check(!errs.length&&!e2.length,'no errors '+errs.concat(e2).join(' | '));
  ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(ok.length+'/'+(ok.length+bad.length)); await b.close();
})();
