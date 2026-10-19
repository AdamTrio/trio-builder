// t66 — the free-floating game screen: placement, art, bake, pill animation, tap → game (standalone + hosted).
const { chromium } = require('playwright'); const fs = require('fs');
const ok = [], bad = []; const check = (c, m) => (c ? ok : bad).push(m);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=event');
  await p.waitForFunction(() => window.HEX && window.HEX.ok); await p.waitForTimeout(3500);
  const clickText = t => p.evaluate(t => { const b = [...document.querySelectorAll('#stg button')].find(x => x.textContent.trim() === t); if (!b) return false; b.click(); return true; }, t);
  check(await clickText('free · over a model'), 'Placement switch is in the panel');
  await p.waitForTimeout(600);
  const f1 = await p.evaluate(() => { const r = window.HEXCORE.boardByKind('game'); return r ? { free: !!r.free, pos: r.group.position.toArray().map(v => +v.toFixed(2)) } : null; });
  check(f1 && f1.free, 'free screen built in front of the camera ' + JSON.stringify(f1 && f1.pos));
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), clickText('+ screen art / video (16:9)')]);
  await fc.setFiles('mock/tv-art.jpg'); await p.waitForTimeout(1500);
  const art = await p.evaluate(() => { const r = window.HEXCORE.boardByKind('game'); const im = r.mesh.material.map.image; return im && im.width; });
  check(art === 1280, 'screen art on the picture (' + art + ' px wide)');
  // move it with a slider
  await p.evaluate(() => { const lab = [...document.querySelectorAll('#stg label')].find(l => l.textContent === 'Height'); const r = lab.parentNode.querySelector('input[type=range]');
    r.value = '2.6'; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); });
  await p.waitForTimeout(400);
  const y = await p.evaluate(() => window.HEXCORE.boardByKind('game').group.position.y);
  check(Math.abs(y - 2.6) < 0.02, 'height slider moves it (' + y.toFixed(2) + ' m)');
  await p.screenshot({ path: 'shots/t66-builder.png' });
  // bake
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => [...document.querySelectorAll('button')].find(x => /bake \.html/.test(x.textContent)).click())]);
  await dl.saveAs('testroom/t66.html'); const h = fs.readFileSync('testroom/t66.html', 'utf8');
  check(/"place":"free"/.test(h) && /"screen":"screenart"/.test(h), 'published room carries the free screen + its art');
  // standalone
  const q = await ctx.newPage(); q.on('pageerror', e => errs.push('baked: ' + e));
  await q.goto('http://127.0.0.1:8765/testroom/t66.html'); await q.waitForFunction(() => window.HEX && window.HEX.ok); await q.waitForTimeout(1500);
  await q.evaluate(() => window.HEX.enterRoom()); await q.waitForTimeout(1500);
  const r = await q.evaluate(async () => { const g = window.HEXCORE.boardByKind('game'); const y0 = g.pill.position.y; await new Promise(r => setTimeout(r, 450)); const y1 = g.pill.position.y;
    return { free: g.free, art: g.mesh.material.map.image && g.mesh.material.map.image.width, moves: Math.abs(y1 - y0) > 1e-4, y: +g.group.position.y.toFixed(2) }; });
  check(r.free && r.art === 1280 && r.y === 2.6, 'published room: screen + art where it was placed');
  check(r.moves, 'TAP TO PLAY pill is moving');
  const aim = async (page, frame) => { const F = frame || page;
    await F.evaluate(() => { const H = window.HEX, T = window.THREE, g = window.HEXCORE.boardByKind('game'); const w = new T.Vector3(); g.mesh.getWorldPosition(w);
      const n = new T.Vector3(0, 0, 1).applyQuaternion(g.group.quaternion); const P = w.clone().add(n.multiplyScalar(4)); P.y = 1.7;
      H.onFrame.push(() => { H.cam.position.copy(P); H.cam.lookAt(w); }); });
    await page.waitForTimeout(600); return F.evaluate(() => ({ x: innerWidth / 2, y: innerHeight / 2 })); };
  const c = await aim(q); await q.screenshot({ path: 'shots/t66-baked-front.png' });
  await q.mouse.click(c.x, c.y); await q.waitForTimeout(400);
  check(await q.evaluate(() => document.getElementById('groom').classList.contains('open') && window.HEXSLEEP), 'standalone: tap the screen → game opens, room sleeps');
  // hosted
  fs.writeFileSync('testroom/t66-harness.html', fs.readFileSync('testroom/harness.html', 'utf8').replace('src="index.html"', 'src="t66.html"'));
  const hp = await ctx.newPage(); hp.on('pageerror', e => errs.push('hosted: ' + e));
  await hp.goto('http://127.0.0.1:8765/testroom/t66-harness.html'); await hp.waitForTimeout(6000);
  const fr = hp.frames().find(f => /t66\.html/.test(f.url()));
  const hc = await aim(hp, fr); await hp.evaluate(() => LOG.length = 0);
  await hp.mouse.click(hc.x, hc.y); await hp.waitForTimeout(400);
  const lg = await hp.evaluate(() => LOG.filter(m => m.trio === 'open').map(m => m.board));
  check(lg.length === 1 && lg[0] === 'game', 'inside a Trio page: tap the screen → {open, board:game}');
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  ok.forEach(m => console.log('PASS', m)); bad.forEach(m => console.log('FAIL', m)); console.log(`\n${ok.length}/${ok.length + bad.length}`);
})();
