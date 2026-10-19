// t114 — v66.1: Adam's Katseye room (real project file): the glowing cube's light sits ON the cube inside the set — not 11 m out in the room aiming back
const { chromium } = require('playwright'); const path=require('path');
const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
const URL=process.argv[2]||'dist/trio-builder-admin.html';
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}); const p=await b.newPage({viewport:{width:1280,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('dialog',d=>d.accept());
  await p.goto('http://127.0.0.1:8765/'+URL+'?space=mood',{waitUntil:'domcontentloaded'}); await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(2000);
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.evaluate(()=>[...document.querySelectorAll('button')].find(x=>/^open project/.test(x.textContent.trim())).click())]);
  await fc.setFiles(path.join(__dirname,'..','setassets','katseye.hexlook.json'));
  await p.waitForFunction(()=>{ let n=0; window.HEX.scene.traverse(o=>{ if(o.isLight&&o.userData.glowLight) n++; }); return n>0; },null,{timeout:150000}).catch(()=>{}); await p.waitForTimeout(6000);
  const r=await p.evaluate(()=>{ let L=null; window.HEX.scene.traverse(o=>{ if(o.isLight&&o.userData.glowLight) L=o; }); if(!L) return null;
    const g=L.parent, bb=new THREE.Box3(); g.traverse(m=>{ if(m.isMesh&&m!==g.userData.shadow) bb.expandByObject(m); });
    const c=bb.getCenter(new THREE.Vector3()), lp=L.getWorldPosition(new THREE.Vector3()), tp=L.target.getWorldPosition(new THREE.Vector3());
    return {gap:+lp.distanceTo(c).toFixed(2), deeper:tp.length()>lp.length()}; });
  check(r&&r.gap<.5,'the glow light sits on the cube ('+JSON.stringify(r)+')');
  check(r&&r.deeper,'it shines deeper into the set, away from the room');
  check(!errs.length,'no errors '+errs.join(' | '));
  ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(ok.length+'/'+(ok.length+bad.length)); await b.close();
})();
