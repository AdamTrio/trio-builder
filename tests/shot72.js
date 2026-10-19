const { chromium } = require('playwright'); const path=require('path');
const A = f => path.join(__dirname, '..', 'setassets', f);
(async () => {
  const space=process.argv[2]||'room', wallLabel=process.argv[3]||'Wall 0 · FRONT', wi=+(process.argv[4]||0);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs=[]; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space='+space);
  await p.waitForFunction(() => window.HEX && window.HEX.ok && document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  const choose = async (fn, f) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), fn()]); await fc.setFiles(f); await p.waitForTimeout(900); };
  const openSec = t => p.evaluate(t => { const h = [...document.querySelectorAll('#stg .stsec>h4')].find(x => x.textContent.indexOf(t) >= 0); if (h && h.parentNode.classList.contains('closed')) h.click(); }, t);
  const rowBtn = l => p.evaluate(l => [...document.querySelectorAll('#stg .strow')].find(x => (x.querySelector('.nm b')||{}).textContent === l).querySelector('button.add').click(), l);
  const btn = t => p.evaluate(t => [...document.querySelectorAll('#stg button')].find(x => x.textContent.trim() === t).click(), t);
  await openSec('Walls'); await openSec('2 ·');
  await choose(() => rowBtn(wallLabel), A('wall-window.png'));
  await openSec('Windows & sets'); await btn('+ new set'); await p.waitForTimeout(600);
  await choose(() => rowBtn('Floor'), A('floor.jpg')); await choose(() => rowBtn('Middle ground'), A('middle.png'));
  await choose(() => rowBtn('Background'), A('pano.jpg')); await choose(() => btn('+ model (.glb)'), A('model.glb'));
  await p.waitForTimeout(1200); await p.screenshot({ path: 'shots/v36-set-editor-'+space+'.png' });
  await btn('still'); await p.waitForTimeout(300);
  await p.evaluate(() => { const f=[...document.querySelectorAll('#stg .stf')].find(x=>(x.querySelector('label')||{}).textContent==='Look from'); const i=f.querySelector('input'); i.value=-1; i.dispatchEvent(new Event('input')); });
  await p.waitForTimeout(500); await p.screenshot({ path: 'shots/v36-set-editor-side-'+space+'.png' });
  await btn('done & lock'); await p.waitForTimeout(500); await openSec('Windows & sets');
  await p.evaluate(l => { const f = [...document.querySelectorAll('#stg .stf')].find(x => (x.querySelector('label')||{}).textContent === l);
    [...f.querySelectorAll('button')].find(x => x.textContent === 'on').click(); }, wallLabel.replace(/ ·.*$/,'')+' window');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'shots/v36-panel-'+space+'.png' });
  await p.evaluate(() => { document.getElementById('stg').classList.remove('open'); const g=document.getElementById('gwall'); if(g) g.style.display='none'; });
  for (const [x,n,k] of [[-1.6,'left',.25],[1.6,'right',.25],[0,'close',.78]]) {
    await p.evaluate(([x,wi,k]) => { const N = window.HEXCORE.NAV, R=window.HEX.ROOM||window.HEXCORE.room(window.HEX);
      const c=R.wallPoint(wi,0,0,0); const d=Math.hypot(c.x,c.z); const t=Math.atan2(c.x,-c.z);
      N.pos.x = Math.cos(t)*x + Math.sin(t)*(d*k); N.pos.z = Math.sin(t)*x - Math.cos(t)*(d*k); N.pos.init = true; N.eye=1.6; window.HEX.setYaw(t); if(k>.5) window.HEX.addPitch(-.45-window.HEX.getPitch()); }, [x,wi,k]);
    await p.waitForTimeout(900); await p.screenshot({ path: 'shots/v36-window-'+space+'-'+n+'.png' });
  }
  console.log('errors', errs); await b.close();
})();
