// t71 — the picture follows the frame (iPhone bar) + the Play tab has no ▶ glyph.
const { chromium } = require('playwright'); const fs = require('fs');
const ok = [], bad = []; const check = (c, m) => (c ? ok : bad).push(m);
fs.writeFileSync('out/the27s/harness-resize.html', `<!DOCTYPE html><html><body style="margin:0;background:#300">
<iframe id="f" src="room/index.html" style="position:fixed;left:0;top:0;width:100%;height:600px;border:0"></iframe>
<script>window.LOG=[];addEventListener('message',e=>{ if(e.source===document.getElementById('f').contentWindow) LOG.push(e.data); });</script></body></html>`);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/out/the27s/harness-resize.html');
  await p.waitForFunction(() => LOG.some(m => m.trio === 'ready'), null, { timeout: 20000 });
  const f = p.frames().find(x => /room\/index/.test(x.url())); f.page().on('pageerror', e => errs.push(String(e)));
  const size = () => f.evaluate(() => { const c = document.getElementById('gl'); const r = c.getBoundingClientRect();
    return { inner: innerHeight, box: Math.round(r.height), buf: c.height, dpr: devicePixelRatio, inline: c.style.height || '' }; });
  const s0 = await size();
  check(s0.box === 600 && Math.abs(s0.buf - 600 * s0.dpr) < 2, 'at load: picture fills the 600-tall frame ' + JSON.stringify(s0));
  await p.evaluate(() => document.getElementById('f').style.height = '844px'); await p.waitForTimeout(700);
  const s1 = await size();
  check(s1.inner === 844 && s1.box === 844 && Math.abs(s1.buf - 844 * s1.dpr) < 2 && !s1.inline, 'frame grows to 844 → picture follows, nothing dark below ' + JSON.stringify(s1));
  await p.screenshot({ path: 'shots/t71-grown.png' });
  await p.evaluate(() => document.getElementById('f').style.height = '700px'); await p.waitForTimeout(700);
  const s2 = await size();
  check(s2.box === 700 && Math.abs(s2.buf - 700 * s2.dpr) < 2, 'frame shrinks to 700 → picture follows ' + JSON.stringify(s2));
  await p.evaluate(() => document.getElementById('f').style.height = '844px'); await p.waitForTimeout(500);
  await f.evaluate(() => [...document.querySelectorAll('#hexTabs button')].find(x => x.dataset.k === 'game').click()); await p.waitForTimeout(2600);
  const tab = await f.evaluate(() => { const b = document.querySelector('#hexTabs button[data-k=game]'); return { text: b.textContent, svg: !!b.querySelector('svg') }; });
  check(tab.text === 'Play' && tab.svg, 'Play tab: drawn arrow, no ▶ character (' + JSON.stringify(tab) + ')');
  const s3 = await size(); check(s3.box === 844, 'after the Play tab, the floor still reaches the bottom');
  await p.screenshot({ path: 'shots/t71-play-tab.png' });
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  ok.forEach(m => console.log('PASS', m)); bad.forEach(m => console.log('FAIL', m)); console.log(`\n${ok.length}/${ok.length + bad.length}`);
})();
