// t60 — the 27s build: marquee hung above the front wall + the reel + the room sleeping under it.
// Needs the server on :8765 serving /home/claude/hex, and testroom/ built (three webm clips).
const { chromium } = require('playwright');
const ok = [], bad = [];
const check = (c, m) => (c ? ok : bad).push(m);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 420, height: 860 }, isMobile: true, hasTouch: false });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/testroom/index.html');
  await p.waitForFunction(() => window.HEX && window.HEX.ok);
  await p.waitForTimeout(1500);
  await p.evaluate(() => window.HEX.enterRoom());
  await p.waitForTimeout(1500);

  // marquee
  const mq = await p.evaluate(() => { const r = window.HEXCORE.boardByKind('game'), H = window.HEX;
    const q = r.mesh.position; return { y: q.y, d: Math.hypot(q.x, q.z), apo: H.APO, wall: r.wall, w: r.mesh.geometry.parameters.width,
      bannerY: H.banners[0].position.y }; });
  check(mq.wall === 0, 'marquee on the front wall (W0)');
  check(Math.abs(mq.y - 5.75) < 1e-6, 'marquee at 5.75 m (banners at ' + mq.bannerY.toFixed(2) + ')');
  check(Math.abs(mq.d - (mq.apo - 1.3)) < 1e-3, 'marquee hangs 1.3 m off the wall like the banners');
  check(Math.abs(mq.w - 8.1) < 1e-6, 'marquee 8.1 m wide');
  const base = await p.evaluate(async () => { let n = 0; window.HEX.onFrame.push(() => n++); await new Promise(r => setTimeout(r, 1000)); return n; });
  console.log('baseline frames/s', base);
  await p.evaluate(() => window.HEX.setYaw(0)); await p.waitForTimeout(500);
  await p.screenshot({ path: 'shots/t60-front-phone.png' });

  // face the video wall and tap the 2nd clip
  const pt = await p.evaluate(() => {
    const T = window.THREE, H = window.HEX, g = window.HEXCORE.TILES.video[1];
    const w = new T.Vector3(); g.getWorldPosition(w);
    let best = null;
    for (let a = -Math.PI; a < Math.PI; a += 0.02) { H.cam.rotation.set(0, 0, 0); H.cam.rotateY(-a); H.cam.updateMatrixWorld();
      const v = w.clone().project(H.cam); if (v.z < 1 && (!best || Math.abs(v.x) < Math.abs(best.x))) best = { a, x: v.x, y: v.y }; }
    H.setYaw(best.a); return best; });
  await p.waitForTimeout(700);
  const sp = await p.evaluate(pt => { const H = window.HEX, T = window.THREE, g = window.HEXCORE.TILES.video[1];
    const w = new T.Vector3(); g.getWorldPosition(w); const v = w.project(H.cam);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }, pt);
  await p.screenshot({ path: 'shots/t60-videowall.png' });
  await p.evaluate(()=>addEventListener('hex:tile',e=>window.__hit=e.detail));
  await p.mouse.click(sp.x, sp.y);
  await p.waitForTimeout(1500);
  const r1 = await p.evaluate(() => { const R = document.getElementById('hexReel'); const vs = [...R.querySelectorAll('video')];
    return { open: R.classList.contains('on'), n: vs.length, playing: vs.map(v => !v.paused), label: R.querySelector('.mt span').textContent,
      count: [...R.querySelectorAll('.mt s')].map(s => s.textContent), sleep: !!window.HEXSLEEP }; });
  check(r1.open, 'tapping a video tile opens the reel');
  check(r1.n === 3, 'reel holds the room\'s 3 clips (empty tiles skipped)');
    const hi = (await p.evaluate(()=>window.__hit)).index;
  check(r1.playing.every((pl,j)=>pl===(j===hi)), 'reel starts on the tile you tapped (tile '+(hi+1)+'), only it plays');
  check(r1.label === 'The 27s', 'label is the room name, as text');
  check(r1.sleep, 'room is asleep under the reel');
  const pl = await p.evaluate(() => [...document.querySelectorAll('#hexReel video')].map(v => v.preload));
  check(pl.filter(x => x === 'auto').length === 1, 'only the tapped clip preloads (' + pl.join(',') + ')');
  // frames stop
  const f = await p.evaluate(async () => { let n = 0; const H = window.HEX; H.onFrame.push(() => n++); const a = n;
    await new Promise(r => setTimeout(r, 1000)); return n - a; });
  check(f === 0, 'no room frames drawn while the reel is up (' + f + ' in 1 s)');
  const tv = await p.evaluate(() => window.HEXCORE.allVideos(window.HEXCORE.TILES)().every(r => r.video.paused));
  check(tv, 'every wall video paused under the reel');
  await p.screenshot({ path: 'shots/t60-reel.png' });
  // swipe to next
  await p.evaluate(() => { const s = document.querySelector('#hexReel .rs'); s.scrollTop = 2 * s.clientHeight; });
  await p.waitForTimeout(900);
  const r2 = await p.evaluate(() => [...document.querySelectorAll('#hexReel video')].map(v => !v.paused));
  check(r2[2] && r2.filter(Boolean).length===1, 'swiping moves to another clip, one plays at a time');
  // close
  await p.click('#hexReel .x'); await p.waitForTimeout(800);
  const f2 = await p.evaluate(async () => { let n = 0; const H = window.HEX; H.onFrame.push(() => n++);
    await new Promise(r => setTimeout(r, 1000)); return { n, open: document.getElementById('hexReel').classList.contains('on'), sleep: !!window.HEXSLEEP }; });
  check(!f2.open && !f2.sleep && f2.n > 0, 'closing wakes the room (' + f2.n + ' frames in 1 s)');
  // lazy: only the tapped clip preloads
  // photo tile → lightbox
  const pp = await p.evaluate(() => { const T = window.THREE, H = window.HEX, g = window.HEXCORE.TILES.photo[0];
    const w = new T.Vector3(); g.userData.art.getWorldPosition(w); let best = null;
    for (let a = -Math.PI; a < Math.PI; a += 0.01) { H.cam.rotation.set(0, 0, 0); H.cam.rotateY(-a); H.cam.updateMatrixWorld();
      const v = w.clone().project(H.cam); if (v.z < 1 && (!best || Math.abs(v.x) < Math.abs(best.x))) best = { a, x: v.x }; }
    H.setYaw(best.a); return best; });
  await p.waitForTimeout(800);
  const ps = await p.evaluate(() => { const H = window.HEX, T = window.THREE, g = window.HEXCORE.TILES.photo[0];
    const w = new T.Vector3(); g.userData.art.getWorldPosition(w); const v = w.project(H.cam);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
  await p.mouse.click(ps.x, ps.y); await p.waitForTimeout(600);
  const lb = await p.evaluate(() => { const R = document.getElementById('hexReel'); return { on: !!R && R.classList.contains('on'), img: !!(R && R.querySelector('img.ph')), sleep: !!window.HEXSLEEP }; });
  check(lb.on && lb.img && lb.sleep, 'tapping a photo opens the photo gallery, room asleep');
  await p.screenshot({ path: 'shots/t60-photo.png' });
  await p.click('#hexReel .x'); await p.waitForTimeout(500);
  const lb2 = await p.evaluate(() => { const R = document.getElementById('hexReel'); return { on: R.classList.contains('on'), sleep: !!window.HEXSLEEP }; });
  check(!lb2.on && !lb2.sleep, '✕ closes the gallery, room awake');
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  ok.forEach(m => console.log('PASS', m)); bad.forEach(m => console.log('FAIL', m));
  console.log(`\n${ok.length}/${ok.length + bad.length}`); process.exit(bad.length ? 1 : 0);
})();
