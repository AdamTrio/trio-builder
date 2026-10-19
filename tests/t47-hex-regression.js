// t47 — HEX REGRESSION. The hexagon must be unchanged against the v30 baseline.
//   node tests/t47-hex-regression.js            (server on :8765 serving /home/claude/hex)
// Two checks:
//   A. the named shell pieces (6 walls, banners, floor, every pole/beam/board/tile/tag the
//      shell builds) — world position + rotation, one by one, in build order.
//   B. every mesh in the v30 scene must exist in the new scene at the same place
//      (extra new things are allowed — visualizers etc. — missing or moved ones fail).
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:8765/';
const PAGES = {
  v30:          'base/eventspace-src-stage30.html?stage=0',
  local:        'dist/eventspace-src-staged.html?stage=0',
  local_stage:  'dist/eventspace-src-staged.html?stage=1',
  admin_event:  'dist/trio-builder-admin.html?space=event',
};
const EPS = 1e-4;

async function snap(browser, path) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForFunction(() => window.HEX && window.HEX.ok && window.HEX.scene, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const data = await page.evaluate(() => {
    const T = window.THREE, H = window.HEX, v = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3();
    const r = n => Math.round(n * 1e4) / 1e4;
    /* the 24 perimeter poles dance to the music (y + height) — park them at rest so we compare where they STAND */
    (window._cols || []).forEach(c => { c.core.position.y = .5; c.halo.position.y = .5; });
    const rec = (o, tag) => { o.updateWorldMatrix(true, false); o.matrixWorld.decompose(v, q, s);
      return { tag, type: o.type, geo: o.geometry ? o.geometry.type : '', p: [r(v.x), r(v.y), r(v.z)],
               q: [r(q.x), r(q.y), r(q.z), r(q.w)] }; };
    const named = [];
    (H.walls || []).forEach((o, i) => named.push(rec(o, 'wall' + i)));
    (H.banners || []).forEach((o, i) => named.push(rec(o.mesh || o, 'banner' + i)));
    if (H.floor) named.push(rec(H.floor, 'floor'));
    (H.clickable || []).forEach((o, i) => o && o.isObject3D && named.push(rec(o, 'click' + i)));
    const all = [];
    H.scene.traverse(o => { if (o.isMesh || o.isLine || o.isPoints || o.isSprite) all.push(rec(o, '')); });
    return { named, all, shape: H.ROOM ? H.ROOM.shape : 'hex(v30)', R: H.R, APO: H.APO, H: H.WALL_H };
  });
  await ctx.close();
  return { ...data, errs };
}
const same = (a, b) => a.p.every((x, i) => Math.abs(x - b.p[i]) < EPS) &&
  a.q.every((x, i) => Math.abs(x - b.q[i]) < EPS);

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const S = {};
  for (const [k, p] of Object.entries(PAGES)) S[k] = await snap(browser, p);
  await browser.close();
  const base = S.v30; let fail = 0;
  console.log(`v30 baseline: R=${base.R} APO=${base.APO} H=${base.H} · ${base.named.length} named pieces · ${base.all.length} meshes · errors ${base.errs.length}`);
  for (const k of Object.keys(PAGES).filter(k => k !== 'v30')) {
    const c = S[k];
    let nOk = 0; const nBad = [];
    base.named.forEach((b, i) => { const x = c.named.find(n => n.tag === b.tag);
      if (x && same(b, x) && x.geo === b.geo) nOk++; else nBad.push(b.tag); });
    const pool = c.all.slice(); let aOk = 0; const aBad = [];
    base.all.forEach(b => { const j = pool.findIndex(x => x.geo === b.geo && x.type === b.type && same(b, x));
      if (j >= 0) { pool.splice(j, 1); aOk++; } else aBad.push(b); });
    const dims = c.R === base.R && c.APO === base.APO && c.H === base.H;
    const ok = nBad.length === 0 && aBad.length === 0 && dims && c.shape === 'hex';
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${k.padEnd(12)} shape=${c.shape} dims ${dims ? 'same' : 'DIFF'} · named ${nOk}/${base.named.length} · meshes ${aOk}/${base.all.length} (+${pool.length} new) · errors ${c.errs.length}`);
    if (nBad.length) console.log('   moved/missing named:', nBad.join(' '));
    aBad.slice(0, 12).forEach(b => console.log('   missing/moved mesh:', JSON.stringify(b)));
    c.errs.slice(0, 5).forEach(e => console.log('   page error:', e));
  }
  console.log(fail ? `\nHEX REGRESSION: ${fail} FAILED` : '\nHEX REGRESSION: ALL PASS');
  process.exit(fail ? 1 : 0);
})();
