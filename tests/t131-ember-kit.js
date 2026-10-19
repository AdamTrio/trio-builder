// t131 — v82: the Ember & Crystal kit (outside kit, trio-kit-ember.js v1.0.0) — its own map tab, 24 pieces, 10 models, coloured glows in the light pool
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
const TOWN=[["EMBER-N12",-2,-2,0],["EMBER-N01",-1,-2,1],["EMBER-C03",0,-2,0],["EMBER-N11",1,-2,0],["EMBER-C06",2,-2,0],["EMBER-N10",-2,-1,0],["EMBER-C08",-1,-1,0],["EMBER-N07",0,-1,0],["EMBER-N14",1,-1,2],["EMBER-C07",2,-1,0],["EMBER-C04",-2,0,1],["EMBER-N04",-1,0,0],["EMBER-N04",0,0,0],["EMBER-C10",1,0,0],["EMBER-N13",2,0,0],["EMBER-N03",-2,1,0],["EMBER-N06",-1,1,0],["EMBER-N07",0,1,0],["EMBER-C05",1,1,0],["EMBER-N05",2,1,3],["EMBER-N11",-2,2,0],["EMBER-C01",-1,2,0],["EMBER-N09",0,2,1],["EMBER-C09",1,2,0],["EMBER-N02",2,2,0]];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(''+e));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:120000}); await p.waitForTimeout(2500); await p.evaluate(()=>{ window.confirm=()=>true; });
  const reg=await p.evaluate(()=>{ const W=window.HEXCORE.WORLD; const pcs=W.KIT.filter(k=>k.kit==='ember'); return {n:pcs.length, C:pcs.filter(k=>k.f==='C').length, N:pcs.filter(k=>k.f==='N').length, props:Object.keys(window.HEXCORE.PRIMS).filter(k=>/^kit_EMBER-P/.test(k)).length}; });
  check(reg.n===24&&reg.C===10&&reg.N===14,'24 Ember pieces registered (10 ruins, 14 nature) '+JSON.stringify(reg));
  check(reg.props===10,'10 Ember models');
  await p.evaluate(()=>[...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click()); await p.waitForTimeout(3000);
  const kits=await p.evaluate(()=>[...document.querySelectorAll('#wmap .wkits button')].map(x=>x.textContent));
  check(kits.includes('Ember & Crystal kit'),'the map has an Ember & Crystal kit tab '+JSON.stringify(kits));
  await p.evaluate(()=>{ [...document.querySelectorAll('#wmap .wkits button')].find(x=>x.textContent==='Ember & Crystal kit').click(); }); await p.waitForTimeout(6000);
  const tray=await p.evaluate(async()=>{ const ims=[...document.querySelectorAll('#wmap .wpc img')]; const im=ims[0]; if(!im) return {n:0}; await im.decode().catch(()=>{}); const c=document.createElement('canvas'); c.width=c.height=24; const x=c.getContext('2d'); x.drawImage(im,0,0,24,24); const d=x.getImageData(0,0,24,24).data; let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2]; return {n:ims.length, lit:Math.round(s/(24*24*3))}; });
  check(tray.n>0&&tray.lit>8,'its tray pictures draw (not black) '+JSON.stringify(tray));
  await p.evaluate(T=>{ const M=window.__wmap(); T.forEach(([id,gx,gz,r])=>M.place((gz+3)*8+(gx+3),id,r)); document.querySelector('#wmap [data-a="walk"]').click(); },TOWN); await p.waitForTimeout(10000);
  const info=await p.evaluate(()=>{ const X=window.HEX._world; const cols={}; (X.lampPts||[]).forEach(v=>{ cols[v.c||'none']=(cols[v.c||'none']||0)+1; }); const hc=X.halos&&X.halos.geometry.attributes.color;
    return {tiles:X.tiles.children.length, lamps:(X.lampPts||[]).length, cols, poolCols:[...new Set((X.pool||[]).filter(L=>L.intensity>0).map(L=>'#'+L.color.getHexString()))], haloCol:!!hc}; });
  check(info.tiles>50&&info.lamps>=40,'the sample town lays and walks '+JSON.stringify({tiles:info.tiles,lamps:info.lamps}));
  check(info.cols['#3fb0ff']>0&&info.cols['#ff4a1a']>0&&info.cols['#ff8a3a']>0,'every crystal, ember and flame is a lamp in its own colour '+JSON.stringify(info.cols));
  check(info.poolCols.length>0&&info.haloCol,'the light pool and the glow halos take the lamp colours '+JSON.stringify(info.poolCols));
  // a model with parts
  await p.evaluate(()=>{ document.getElementById('stg').classList.add('open'); document.querySelector('#stgRail button[data-tab="models"]').click(); }); await p.waitForTimeout(500);
  const heads=await p.evaluate(()=>[...document.querySelectorAll('#stg .stsub')].map(x=>x.textContent));
  check(heads.includes('Ember & Crystal models'),'Models lists the Ember & Crystal models');
  const added=await p.evaluate(()=>{ const h=[...document.querySelectorAll('#stg .stsub')].find(x=>x.textContent==='Ember & Crystal models'); const x=h&&[...h.nextElementSibling.querySelectorAll('button')].find(b=>b.textContent.trim()==='+ Brazier'); if(!x) return false; x.click(); return true; }); await p.waitForTimeout(1500);
  const labs=await p.evaluate(()=>[...document.querySelectorAll('#stg .stf label')].map(l=>l.textContent));
  check(added&&labs.includes('Stand')&&labs.includes('Flame'),'"+ Brazier" adds it with a colour for each part');
  // bake carries ember only when used
  await p.evaluate(()=>document.getElementById('stg').classList.remove('open'));
  const bp=path.join(__dirname,'..','out','t131.html'); const [dl]=await Promise.all([p.waitForEvent('download',{timeout:180000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]); await dl.saveAs(bp);
  const html=fs.readFileSync(bp,'utf8'); check(/data-wkit="ember"/.test(html)&&!/data-wkit="cyber"/.test(html),'the bake carries the Ember kit (and not the unused ones) — '+Math.round(html.length/1048576*10)/10+' MB');
  const q=await ctx.newPage(); q.on('pageerror',e=>errs.push('pub: '+e)); await q.goto('http://127.0.0.1:8765/out/t131.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForTimeout(12000);
  const pub=await q.evaluate(()=>{ const X=window.HEX&&window.HEX._world; return X?{tiles:X.tiles.children.length, lamps:(X.lampPts||[]).length}:null; });
  check(pub&&pub.tiles>50&&pub.lamps>=40,'published: the Ember town and its glows '+JSON.stringify(pub)); await q.close();
  check(!errs.length,'no page errors '+JSON.stringify(errs.slice(0,3)));
  await b.close();
  ok.forEach(m=>console.log('  ✓ '+m)); bad.forEach(m=>console.log('  ✗ '+m)); console.log((bad.length?'FAIL ':'PASS ')+ok.length+' / '+(ok.length+bad.length));
})();
