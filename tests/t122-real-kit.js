// t122 — v73: the Realistic kit (room-quality textures) beside the Original kit; lamp bulbs glow (pool of real lights); wet streets;
// textures ride in a bake only when the Realistic kit is used.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const open=async(q)=>{ const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(q+': '+e));
    await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html'+q,{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:90000}); await p.waitForTimeout(2500); return p; };
  const p=await open('?space=world'); await p.evaluate(()=>{ window.confirm=()=>true; });
  await p.evaluate(()=>[...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click()); await p.waitForTimeout(2500);
  const kits=await p.evaluate(()=>[...document.querySelectorAll('#wmap .wkits button')].map(x=>x.textContent+(x.classList.contains('on')?'*':'')));
  check(kits.slice(0,2).join()==='Original kit,Realistic kit*','the map tray has Original and Realistic first (open on Realistic) '+JSON.stringify(kits));
  const count=async kit=>p.evaluate(k=>{ [...document.querySelectorAll('#wmap .wkits button')].find(x=>x.textContent===k).click(); const n={};
    ['Nature','City'].forEach(f=>{ [...document.querySelectorAll('#wmap .wtabs button')].find(x=>x.textContent===f).click(); n[f]=[...document.querySelectorAll('#wmap .wpc s')].map(x=>x.textContent).filter(t=>t!=='add your piece'); }); return n; },kit);
  const orig=await count('Original kit'), real=await count('Realistic kit');
  check(orig.Nature.length===10&&orig.City.length===11,'Original kit: all 21 original pieces kept ('+orig.Nature.length+' nature, '+orig.City.length+' city)');
  check(real.Nature.join()==='Meadow,Light forest,Dense forest,Dirt path,Path corner,Path fork,Pond,Stream,Stream bend,Stream pool,Flower meadow,Birch grove,Autumn forest,Boulder hill,Dead forest,Graveyard,Swamp'&&real.City.join()==='Road straight,Crosswalk,Road corner,T-junction,Crossroads,Dead end','Realistic kit (v80): 17 nature + 6 city pieces '+JSON.stringify(real));
  const th=await p.evaluate(()=>[...document.querySelectorAll('#wmap .wpc img')].length); check(th>=1,'Realistic pieces get a top-down picture in the tray');
  await p.evaluate(()=>document.querySelector('#wmap [data-a="sample"]').click()); await p.waitForTimeout(3000);
  const sm=await p.evaluate(()=>{ const c=window.__wmap().cells; return {r:c.filter(x=>x&&/R$/.test(x.id)).length, warn:window.__wmap().warn()}; });
  check(sm.r>=10&&!sm.warn,'sample town on the Realistic kit uses its road + forest and every edge still joins '+JSON.stringify(sm));
  await p.evaluate(()=>document.querySelector('#wmap [data-a="walk"]').click()); await p.waitForTimeout(5000);
  const w=await p.evaluate(()=>{ const X=window.HEX._world, R=window.HEXCORE.WORLD.realMat();
    return {lamps:(X.lampPts||[]).length, pool:(X.pool||[]).length, lit:(X.pool||[]).filter(L=>L.intensity>0).length, halos:!!(X.halos&&X.halos.visible), tex:!!(R.asphalt.map&&R.asphalt.map.image), glow:R.glass.emissiveIntensity,
      uv:X.tiles.children.every(o=>!!o.geometry.attributes.uv)}; });
  check(w.tex&&w.uv,'the Realistic pieces wear their textures in the world');
  check(w.lamps>=10&&w.pool>=4&&w.lit>0&&w.halos&&w.glow>0,'street lamps: only the bulbs glow, and a few real lights follow you to the nearest lamps '+JSON.stringify(w));
  // streets + lamps settings
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="room"]').click()); await p.waitForTimeout(300);
  const seg=(lab,t)=>p.evaluate(([lab,t])=>{ const r=[...document.querySelectorAll('#stg .stf')].find(x=>x.querySelector('label')&&x.querySelector('label').textContent===lab); [...r.querySelectorAll('button')].find(x=>x.textContent===t).click(); },[lab,t]);
  await seg('Streets','wet · shiny'); await p.waitForTimeout(1200);
  const wet=await p.evaluate(()=>{ const R=window.HEXCORE.WORLD.realMat(); return {r:R.asphalt.roughness, env:!!R.asphalt.envMap}; });
  check(wet.r<.4&&wet.env,'Streets → wet: the asphalt turns glossy and reflects '+JSON.stringify(wet));
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); const N=window.HEXCORE.NAV; N.pos.x=-24; N.pos.z=10; window.HEX.setYaw(0); }); await p.waitForTimeout(3000);
  await p.screenshot({path:path.join(__dirname,'..','out','t122-wet-night.png')});
  await p.evaluate(()=>document.getElementById('stg').classList.add('open'));
  await seg('Street lamps','off'); await p.waitForTimeout(1200);
  const off=await p.evaluate(()=>{ const X=window.HEX._world, R=window.HEXCORE.WORLD.realMat(); return {lit:X.pool.filter(L=>L.intensity>0).length, halos:X.halos.visible, glow:R.glass.emissiveIntensity}; });
  check(off.lit===0&&!off.halos&&off.glow===0,'Street lamps → off: bulbs, halos and lights all go dark '+JSON.stringify(off));
  await seg('Street lamps','on · bulbs glow'); await seg('Streets','dry'); await p.waitForTimeout(800);
  // bake: textures ride along only with the Realistic kit
  const bake=async(pg,name)=>{ await pg.evaluate(()=>document.getElementById('stg').classList.remove('open'));
    const [dl]=await Promise.all([pg.waitForEvent('download',{timeout:180000}),pg.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]); const f=path.join(__dirname,'..','out',name); await dl.saveAs(f); return f; };
  const bp=await bake(p,'t122.html'); const html=fs.readFileSync(bp,'utf8'), bk=JSON.parse(/window\.HEXBAKE=(\{.*?\});<\/script>/s.exec(html)[1]);
  const kt=bk.mood.world.kittex||{}; const ktKB=Math.round(JSON.stringify(kt).length/1024);
  check(Object.keys(kt).length===23&&!/window\.HEXKITTEX=/.test(html),'the bake carries the kit textures once ('+ktKB+' KB) — not the builder’s library');
  check(ktKB<800,'kit textures stay light (under 800 KB inside the page): '+ktKB+' KB');
  // a world on the Original kit only carries none
  await p.evaluate(()=>{ [...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click(); }); await p.waitForTimeout(2000);
  await p.evaluate(()=>{ [...document.querySelectorAll('#wmap .wkits button')].find(x=>x.textContent==='Original kit').click(); document.querySelector('#wmap [data-a="sample"]').click(); }); await p.waitForTimeout(2500);
  await p.evaluate(()=>document.querySelector('#wmap [data-a="walk"]').click()); await p.waitForTimeout(3000);
  const bp2=await bake(p,'t122-orig.html'); const bk2=JSON.parse(/window\.HEXBAKE=(\{.*?\});<\/script>/s.exec(fs.readFileSync(bp2,'utf8'))[1]);
  check(!bk2.mood.world.kittex,'a world built only from the Original kit carries no kit textures');
  await p.close();
  // published
  const q=await ctx.newPage(); q.on('pageerror',x=>errs.push('pub: '+x));
  await q.goto('http://127.0.0.1:8765/out/t122.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForFunction(()=>window.HEX&&window.HEX.ok,null,{timeout:120000}); await q.waitForTimeout(7000);
  const pub=await q.evaluate(()=>{ const X=window.HEX._world, R=window.HEXCORE.WORLD.realMat(); return {tex:!!(R.asphalt.map&&R.asphalt.map.image&&R.asphalt.map.image.width), lamps:(X.lampPts||[]).length, lit:(X.pool||[]).filter(L=>L.intensity>0).length}; });
  check(pub.tex&&pub.lamps>=10&&pub.lit>0,'published world: textured pieces, glowing lamps '+JSON.stringify(pub));
  await q.evaluate(()=>{ const sp=document.getElementById('splash'); if(sp) sp.classList.add('gone'); const N=window.HEXCORE.NAV; N.pos.x=-14; N.pos.z=20; window.HEX.setYaw(.5); }); await q.waitForTimeout(3000);
  await q.screenshot({path:path.join(__dirname,'..','out','t122-published.png')}); await q.close();
  check(!errs.length,'no page errors '+errs.join(' | '));
  console.log('PASS '+ok.length); ok.forEach(x=>console.log('  ✓ '+x)); bad.forEach(x=>console.log('  ✗ '+x));
  await b.close(); process.exit(bad.length?1:0);
})();
