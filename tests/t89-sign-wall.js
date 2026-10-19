// t89 — Sign the wall (builder demo): pad → signature on the wall, looks, tap to see it big, never baked
const { chromium } = require('playwright'); const fs=require('fs'), path=require('path');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1280,height:800},acceptDownloads:true}); const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const seg=(lab,v)=>p.evaluate(([lab,v])=>{ const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab&&[...x.querySelectorAll('button')].some(y=>y.textContent===v)); [...f.querySelectorAll('button')].find(x=>x.textContent===v).click(); },[lab,v]);
  const btn=t=>p.evaluate(t=>[...document.querySelectorAll('#stg button')].find(x=>x.textContent.trim()===t).click(),t);
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="boards"]').click()); await p.waitForTimeout(300);
  check(await p.evaluate(()=>[...document.querySelectorAll('#stgBody>.stsec')].some(s=>s.dataset.t==='Signature wall (demo)'&&s.style.display!=='none')),'Boards tab has the Signature wall (demo)');
  await seg('Signature wall','on'); await p.waitForTimeout(300); await seg('On wall','0'); await p.waitForTimeout(300);
  const sign=async(name,line,pen,shape)=>{
    await btn('✍ sign the wall'); await p.waitForSelector('#stgSigPad canvas');
    if(pen) await p.click('#stgSigPad [data-pen="'+pen+'"]');
    const r=await p.evaluate(()=>{ const c=document.querySelector('#stgSigPad canvas').getBoundingClientRect(); return {x:c.left,y:c.top,w:c.width,h:c.height}; });
    for(const st of shape){ await p.mouse.move(r.x+st[0][0]*r.w, r.y+st[0][1]*r.h); await p.mouse.down();
      for(const q of st.slice(1)) await p.mouse.move(r.x+q[0]*r.w, r.y+q[1]*r.h,{steps:6}); await p.mouse.up(); }
    await p.fill('#stgSigPad input.nm',name); await p.fill('#stgSigPad input.ln',line);
    await p.click('#stgSigPad button.go'); await p.waitForTimeout(500); };
  const loop=[[.15,.6],[.25,.3],[.32,.65],[.42,.35],[.5,.62],[.6,.3],[.7,.6],[.85,.45]];
  await sign('Maya','first! come to Denver',null,[loop,[[.2,.75],[.8,.72]]]);
  await sign('Zed','',"#f2f0ea",[[[.2,.4],[.3,.7],[.4,.4],[.5,.7],[.6,.4]],[[.65,.4],[.8,.65]]]);
  const st=await p.evaluate(()=>{ const m=window.HEX.scene.children.find(o=>o.userData.sigWall); return {mesh:!!m}; });
  check(st.mesh,'signatures land on the wall');
  check(await p.evaluate(()=>[...document.querySelectorAll('#stg .strow .nm b')].map(x=>x.textContent).join(',')).then(t=>/Zed/.test(t)&&/Maya/.test(t)),'both signatures listed');
  await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); window.HEX.setYaw(0); }); await p.waitForTimeout(900);
  await p.screenshot({path:'shots/t89-marker.png'});
  // tap one in the room
  const hit=await p.evaluate(()=>{ const m=window.HEX.scene.children.find(o=>o.userData.sigWall); const rc=new THREE.Raycaster(); const c=window.HEX.cam;
    for(let y=.2;y<.9;y+=.02) for(let x=.05;x<.95;x+=.02){ rc.setFromCamera(new THREE.Vector2(x*2-1,-(y*2-1)),c); const h=rc.intersectObject(m,false)[0]; if(!h||(1-h.uv.y)<.32) continue;   /* v86: below the wall's title */
      const cv=m.material.map.image, g=cv.getContext('2d'); const px=g.getImageData(Math.floor(h.uv.x*cv.width),Math.floor((1-h.uv.y)*cv.height),1,1).data; if(px[3]>100) return {x:x*innerWidth,y:y*innerHeight}; } return null; });
  if(hit){ await p.mouse.click(hit.x,hit.y); await p.waitForTimeout(500); }
  const card=await p.evaluate(()=>{ const c=document.getElementById('stgSigCard'); return c?c.querySelector('.nm').textContent:null; });
  check(!!card,'tapping a signature in the room opens it big ('+card+')');
  await p.screenshot({path:'shots/t89-card.png'});
  await p.evaluate(()=>{ const c=document.getElementById('stgSigCard'); if(c) c.remove(); });
  for(const lk of ['paint pen','chalk','carved']){ await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="boards"]').click()); await p.waitForTimeout(200);
    await p.evaluate(()=>{ const b=document.querySelector('#stgRail button[data-tab="boards"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); });
    await seg('Look',lk); await p.waitForTimeout(300); await p.evaluate(()=>{ document.getElementById('stg').classList.remove('open'); }); await p.waitForTimeout(700);
    await p.screenshot({path:'shots/t89-'+lk.replace(' ','')+'.png'}); }
  // saved in the look, never baked
  await p.waitForTimeout(1200);
  const saved=await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.open('hexstage',1); q.onsuccess=()=>{ const t=q.result.transaction('kv','readonly').objectStore('kv').get('auto:mood'); t.onsuccess=()=>r(((t.result||{}).sigwall||{}).sigs?t.result.sigwall.sigs.length:0); }; }));
  check(saved===2,'signatures save with the look ('+saved+')');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.evaluate(()=>document.querySelector('#stgTop button.hot:last-child').click())]);
  const bp=path.join(__dirname,'..','out','t89.html'); await dl.saveAs(bp);
  const html=fs.readFileSync(bp,'utf8');
  check(!/come to Denver|stgSigPad/.test(html),'demo signatures are never baked');
  check(errs.length===0,'no errors'+(errs[0]?': '+errs[0]:''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
