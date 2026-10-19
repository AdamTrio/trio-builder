// t85 — Mood Room: switching a model lit/unlit must never turn the room's light back on (Adam 10/4)
const { chromium } = require('playwright'); const path=require('path');
const A=f=>path.join(__dirname,'..','setassets',f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const bright=async()=>{ await p.evaluate(()=>document.getElementById('stg').classList.remove('open')); await p.waitForTimeout(700);
    const buf=await p.screenshot({clip:{x:200,y:150,width:700,height:350}}); const png=require('zlib');
    return buf.length; };
  // brightness by sampling the canvas
  const lum=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>{ const c=document.createElement('canvas'); c.width=64; c.height=40; const g=c.getContext('2d');
    g.drawImage(window.HEX.renderer.domElement,0,0,64,40); const d=g.getImageData(0,0,64,40).data; let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2]; r(s/(d.length/4)/3); })));
  await p.evaluate(()=>{ window.HEX.renderer.domElement.getContext('webgl2',{preserveDrawingBuffer:true}); });
  await p.evaluate(()=>document.getElementById('stg').classList.remove('open')); await p.waitForTimeout(800);
  const l0=await lum();
  await p.evaluate(()=>document.querySelector('#stgRail button[data-tab="models"]').click()); await p.waitForTimeout(300);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>{ const s=[...document.querySelectorAll('#stgBody>.stsec')].find(x=>x.style.display!=='none');
    const b=[...s.querySelectorAll('button')].find(x=>x.textContent.trim()==='drop a model file…'); b.click(); })]);
  await fc.setFiles(A('model.glb')); await p.waitForFunction(()=>window.HEX.scene.children.some(o=>o.userData.isProp),null,{timeout:30000}); await p.waitForTimeout(800);
  await p.evaluate(()=>{ const s=[...document.querySelectorAll('#stgBody>.stsec')].find(x=>x.style.display!=='none'); const r=s.querySelector('.strow'); if(r&&!r.classList.contains('sel')) r.click(); }); await p.waitForTimeout(500);
  const flip=async()=>{ await p.evaluate(()=>{ const b=[...document.querySelectorAll('#stg button')].find(x=>/^(lit|unlit)$/.test(x.textContent.trim())); b.click(); }); await p.waitForTimeout(500); };
  await flip(); await flip(); await flip();
  console.log(await p.evaluate(()=>JSON.stringify({props:(window.HEX.scene.children.filter(o=>o.userData.isProp).length), btns:[...document.querySelectorAll('#stg button')].map(x=>x.textContent.trim()).filter(t=>/lit/.test(t))})));
  const st=await p.evaluate(()=>({pl:window.HEXCORE.propLights()?window.HEXCORE.propLights().visible:'none', hemi:window.HEX._mood.hemi.intensity}));
  check(st.pl!==true,'model light rig stays off in the Mood Room ('+st.pl+')');
  await p.evaluate(()=>document.getElementById('stg').classList.remove('open')); await p.waitForTimeout(800);
  const l1=await lum();
  check(l1<l0*1.6+3,'room stays dark after lit/unlit clicks ('+l0.toFixed(1)+' → '+l1.toFixed(1)+')');
  check(errs.length===0,'no errors'+(errs[0]?': '+errs[0]:''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
