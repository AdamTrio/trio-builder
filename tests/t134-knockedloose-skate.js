// t134 — v85: Knocked Loose world add-on = the Spray Park skate bowls (sunken pieces, Spec v1.1) + walking on the ground
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const errs=[];
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(''+e));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=world',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec'),null,{timeout:120000}); await p.waitForTimeout(2500); await p.evaluate(()=>{ window.confirm=()=>true; });
  // the map hides the add-on's kit until it's on
  await p.evaluate(()=>[...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click()); await p.waitForTimeout(2500);
  const t0=await p.evaluate(()=>[...document.querySelectorAll('#wmap .wkits button')].map(x=>x.textContent));
  check(!t0.includes('Knocked Loose'),'with the add-on off, the map has no Knocked Loose tab '+JSON.stringify(t0));
  await p.evaluate(()=>{ const c=document.querySelector('#wmap [data-a="close"]')||[...document.querySelectorAll('#wmap button')].find(b=>/close|done|walk/i.test(b.textContent)); if(c) c.click(); }); await p.waitForTimeout(1500);
  // Add-ons tab in a World: only world add-ons
  await p.evaluate(()=>{ document.getElementById('stg').classList.add('open'); document.querySelector('#stgRail button[data-tab="addons"]').click(); }); await p.waitForTimeout(500);
  const cards=await p.evaluate(()=>[...document.querySelectorAll('#stg .stcardh b')].map(x=>x.firstChild.textContent));
  check(cards.includes('Knocked Loose')&&cards.includes('KATSEYE building')&&!cards.includes('Carved line'),'World → Add-ons lists the world add-ons (KATSEYE, Knocked Loose), not the room ones '+JSON.stringify(cards));
  await p.evaluate(()=>{ const c=[...document.querySelectorAll('#stg .stcard')].find(x=>x.textContent.indexOf('Knocked Loose')===0); c.querySelector('.sttog').click(); }); await p.waitForTimeout(500);
  await p.evaluate(()=>[...document.querySelectorAll('#stgTop button')].find(x=>x.textContent==='map').click()); await p.waitForTimeout(3000);
  const t1=await p.evaluate(()=>[...document.querySelectorAll('#wmap .wkits button')].map(x=>x.textContent));
  check(t1.includes('Knocked Loose'),'switched on, the map gets a Knocked Loose tab '+JSON.stringify(t1));
  await p.evaluate(()=>[...document.querySelectorAll('#wmap .wkits button')].find(x=>x.textContent==='Knocked Loose').click()); await p.waitForTimeout(5000);
  const tray=await p.evaluate(()=>[...document.querySelectorAll('#wmap .wpc')].map(x=>x.textContent.trim()));
  check(tray.some(t=>/Bowl with tunnel/.test(t))&&tray.some(t=>/Big bowl with tunnel/.test(t)),'its tray: the two bowls '+JSON.stringify(tray));
  const pcs=await p.evaluate(()=>{ const W=window.HEXCORE.WORLD; return ['SKATE-C04','SKATE-C11'].map(id=>{ const k=W.piece(id); return {id, size:k.size, sink:k.sink, hole:(k.hole||[]).length}; }); });
  check(pcs[0].sink>2&&pcs[0].hole>50&&pcs[1].size===2&&pcs[1].sink>2&&pcs[1].hole>50,'both are sunken pieces with their outline '+JSON.stringify(pcs));
  await p.evaluate(()=>{ const M=window.__wmap(); M.place(18,'SKATE-C11',0); M.place(37,'SKATE-C04',1); for(const i of [16,17,24,25,32,33,34,35,36]) M.place(i,'C01R',0); document.querySelector('#wmap [data-a="walk"]').click(); }); await p.waitForTimeout(12000);
  const hole=await p.evaluate(()=>{ const X=window.HEX._world, G=X.ground.geometry; return {type:G.type, hm:Object.keys(window.HEXCORE.WORLD.heightMaps).sort()}; });
  check(hole.type==='ShapeGeometry'&&hole.hm.includes('SKATE-C11')&&hole.hm.includes('SKATE-C04'),'the world floor opens under the bowls, and each piece is measured for walking '+JSON.stringify(hole));
  const path_=(x,z,dx,dz,dist)=>p.evaluate(([x,z,dx,dz,dist])=>{ const N={}; N.foot=window.HEXCORE.groundHere(x,z,N); let px=x,pz=z, lo=N.foot, moved=0;
    for(let d=0;d<dist;d+=.05){ const r=window.HEXCORE.groundStep(px,pz,px+dx*.05,pz+dz*.05,N); moved+=Math.hypot(r.x-px,r.z-pz); px=r.x; pz=r.z; lo=Math.min(lo,N.foot); }
    return {end:+(N.foot).toFixed(2), lo:+lo.toFixed(2), moved:+moved.toFixed(2)}; },[x,z,dx,dz,dist]);
  const c=await p.evaluate(()=>window.HEXCORE.WORLD.cellXZ(18,2));
  const down=await path_(c[0]-15.2,c[1]-2,1,0,8); check(down.end<-2.5&&down.moved>7.5,'walk down the pool steps to the bottom of the big bowl '+JSON.stringify(down));
  const up=await path_(c[0]-10.5,c[1]-2,-1,0,6); check(up.end>0.1,'…and back up the steps onto the deck '+JSON.stringify(up));
  const lip=await path_(c[0]-7,c[1]+14,0,-1,6); check(lip.end>0.1&&lip.moved<3,'the bowl’s edge stops you (no falling in) '+JSON.stringify(lip));
  const road=await p.evaluate(()=>{ const N={}; return +window.HEXCORE.groundHere(-48+8,-48+8+16*2,N).toFixed(2); });
  check(road>=0&&road<.3,'a street square: you walk at street / kerb height '+road);
  // camera rises and falls with the ground
  await p.evaluate(([cx,cz])=>{ document.getElementById('stg').classList.remove('open'); const N=window.HEXCORE.NAV; N.pos.x=cx-7; N.pos.z=cz+3; N.eye=1.7; },c); await p.waitForTimeout(6000);
  const cam=await p.evaluate(()=>+window.HEX.cam.position.y.toFixed(2));
  check(cam<0,'standing in the bowl, your eyes are below the deck ('+cam+' m)');
  await p.screenshot({path:path.join(__dirname,'..','out','t134-bowl.png')});
  // bake: carries the skate kit + the add-on only when used
  const [dl]=await Promise.all([p.waitForEvent('download',{timeout:180000}),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t134.html'); await dl.saveAs(bp); const html=fs.readFileSync(bp,'utf8');
  check(/data-wkit="skate"/.test(html)&&!/data-wkit="ember"/.test(html),'the bake carries the skate bowls and not unused kits ('+Math.round(html.length/1048576*10)/10+' MB)');
  const q=await ctx.newPage(); q.on('pageerror',e=>errs.push('pub: '+e)); await q.goto('http://127.0.0.1:8765/out/t134.html',{waitUntil:'domcontentloaded',timeout:120000}); await q.waitForTimeout(14000);
  const pub=await q.evaluate(()=>{ const X=window.HEX&&window.HEX._world; if(!X) return null; const N={}; return {holes:X.ground.geometry.type, hm:Object.keys(window.HEXCORE.WORLD.heightMaps).length}; });
  check(pub&&pub.holes==='ShapeGeometry'&&pub.hm>=2,'published: the bowls open into the ground and you can walk them '+JSON.stringify(pub)); await q.close();
  check(!errs.length,'no page errors '+JSON.stringify(errs.slice(0,3)));
  await b.close();
  ok.forEach(m=>console.log('  ✓ '+m)); bad.forEach(m=>console.log('  ✗ '+m)); console.log((bad.length?'FAIL ':'PASS ')+ok.length+' / '+(ok.length+bad.length));
})();
