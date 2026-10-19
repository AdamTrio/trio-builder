// t61 — builder: "hang above the front wall" moves the marquee; the published room keeps it there.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8766/dist/trio-builder-admin.html?space=event');
  await p.waitForFunction(() => window.HEX && window.HEX.ok); await p.waitForTimeout(3500);
  const before = await p.evaluate(() => { const r = window.HEXCORE.boardByKind('game'); return [r.wall, r.mesh.position.y]; });
  const btn = p.locator('button', { hasText: 'hang above the front wall' });
  console.log('button found:', await btn.count());
  await btn.first().scrollIntoViewIfNeeded(); await btn.first().click(); await p.waitForTimeout(800);
  const after = await p.evaluate(() => { const r = window.HEXCORE.boardByKind('game'), q = r.mesh.position; return [r.wall, +q.y.toFixed(2), +Math.hypot(q.x, q.z).toFixed(3)]; });
  console.log('before', before, 'after', after);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => [...document.querySelectorAll('button')].find(x => /bake \.html|publish room/.test(x.textContent)).click())]);
  const path = 'testroom/baked-from-builder.html'; await dl.saveAs(path);
  const html = fs.readFileSync(path, 'utf8');
  console.log('baked', (html.length / 1048576).toFixed(2), 'MB · has reel:', html.includes('CORE.openReel'), '· has sleep:', html.includes('HEXSLEEP'), '· builder stripped:', !html.includes('HEXBUILDER={'));
  const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push('baked: ' + e));
  await p2.goto('http://127.0.0.1:8766/' + path); await p2.waitForFunction(() => window.HEX && window.HEX.ok); await p2.waitForTimeout(2500);
  const baked = await p2.evaluate(() => { const r = window.HEXCORE.boardByKind('game'), q = r.mesh.position; return [r.wall, +q.y.toFixed(2), +Math.hypot(q.x, q.z).toFixed(3), !!document.getElementById('stg')]; });
  console.log('baked room marquee', baked, '· errors', errs.length, errs.slice(0, 3));
  // visualizers present in Event Space + fan preview
  const vib = await p.evaluate(() => ({ vibe: /Vibe/.test(document.getElementById('stg').textContent), hexfx: !!window.HEXFX }));
  console.log('event space vibe section:', vib.vibe, '· HEXFX:', vib.hexfx);
  const [pop] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(() => [...document.querySelectorAll('button')].find(x => /preview as a fan/.test(x.textContent)).click())]);
  await pop.waitForFunction(() => window.HEX && window.HEX.ok, null, { timeout: 60000 }); await pop.waitForTimeout(1500);
  const fan = await pop.evaluate(() => ({ url: location.protocol, baked: !!window.HEXBAKE, editor: !!document.getElementById('stg'), splash: !!document.getElementById('enter'),
    marquee: (() => { const r = window.HEXCORE.boardByKind('game'); return r ? [r.wall, +r.mesh.position.y.toFixed(2)] : null; })() }));
  console.log('fan preview:', JSON.stringify(fan), '· errors', errs.length, errs.slice(0,3));
  await b.close();
})();
