// t73 — set layers get the wall framing controls (fit/scale/across/up-down/rotate/brightness/tint)
const { chromium } = require('playwright'); const path=require('path');
const A = f => path.join(__dirname, '..', 'setassets', f); const ok=[],bad=[]; const check=(c,m)=>(c?ok:bad).push(m);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=room');
  await p.waitForFunction(() => window.HEX && window.HEX.ok && document.querySelector('#stg .stsec')); await p.waitForTimeout(1200);
  const choose = async (fn, f) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), fn()]); await fc.setFiles(f); await p.waitForTimeout(900); };
  const openSec = t => p.evaluate(t => { const h = [...document.querySelectorAll('#stg .stsec>h4')].find(x => x.textContent.indexOf(t) >= 0); if (h && h.parentNode.classList.contains('closed')) h.click(); }, t);
  const rowBtn = l => p.evaluate(l => [...document.querySelectorAll('#stg .strow')].find(x => (x.querySelector('.nm b')||{}).textContent === l).querySelector('button.add').click(), l);
  const btn = t => p.evaluate(t => [...document.querySelectorAll('#stg button')].find(x => x.textContent.trim() === t).click(), t);
  const setSlider = (lab, v) => p.evaluate(([lab,v]) => { const f=[...document.querySelectorAll('#stg .stctl .stf')].find(x=>(x.querySelector('label')||{}).textContent===lab);
    const i=f.querySelector('input[type=range]'); i.value=v; i.dispatchEvent(new Event('input')); }, [lab,v]);
  const px = key => p.evaluate(k => { const g=window.HEX.scene.children.find(o=>o.userData.isSet&&o.position.y<-100); const L=g.userData.layers[k];
    const d=L.canvas.getContext('2d').getImageData(0,0,L.canvas.width,L.canvas.height).data; let s=0; for(let i=0;i<d.length;i+=97) s+=d[i]; return s; }, key);
  await openSec('Windows & sets'); await btn('+ new set'); await p.waitForTimeout(500);
  await choose(() => rowBtn('Background'), A('back.jpg'));
  await choose(() => rowBtn('Middle ground'), A('middle.png'));
  await p.waitForTimeout(600);
  const ctl = await p.evaluate(() => [...document.querySelectorAll('#stg .stctl label')].map(l=>l.textContent));
  check(['Fit','Scale','Across','Up/down','Rotate','Brightness','Tint','Distance','Plate size','Plate height'].every(x=>ctl.includes(x)), 'middle ground shows the wall controls + placement: '+ctl.join(', '));
  const m0=await px('middle'); await setSlider('Scale',2); await setSlider('Up/down',.3); await p.waitForTimeout(300); const m1=await px('middle');
  check(m0!==m1, 'scale + up/down redraw the middle ground picture');
  const sameG=await p.evaluate(()=>{ window.__g=window.HEX.scene.children.find(o=>o.userData.isSet&&o.position.y<-100); return true; });
  await setSlider('Rotate',20); await p.waitForTimeout(400);
  check(await p.evaluate(()=>window.HEX.scene.children.includes(window.__g)), 'framing is instant — the set is not rebuilt');
  await setSlider('Brightness',1.6); await p.waitForTimeout(200);
  const em=await p.evaluate(()=>window.__g.userData.layers.middle.mesh.material.emissiveIntensity);
  check(em>1.4, 'brightness reaches the layer ('+em.toFixed(2)+')');
  await p.screenshot({ path: 'shots/t73-framing.png' });
  // open background, frame it
  await p.evaluate(()=>[...document.querySelectorAll('#stg .strow')].find(x=>(x.querySelector('.nm b')||{}).textContent==='Background').click()); await p.waitForTimeout(400);
  const b0=await px('back'); await setSlider('Scale',1.5); await p.waitForTimeout(200);
  check(b0!==await px('back'), 'background picture scales');
  // saved + survives done & lock and the room
  await p.waitForTimeout(900);
  const sv=await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.open('hexstage',1); q.onsuccess=()=>{ const t=q.result.transaction('kv','readonly').objectStore('kv').get('auto:room'); t.onsuccess=()=>r(t.result); }; }));
  const S=sv.sets[0]; check(S.middle.scale===2&&S.middle.oy===.3&&S.middle.rot===20&&S.back.scale===1.5, 'framing saves with the set');
  check(errs.length===0,'no errors'+(errs[0]?': '+errs[0]:''));
  await b.close(); ok.forEach(m=>console.log('PASS',m)); bad.forEach(m=>console.log('FAIL',m)); console.log(`\n${ok.length}/${ok.length+bad.length}`);
})();
