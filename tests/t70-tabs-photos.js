// t70 — phone: tabs glide to each part of the room, joystick bottom-right; photos swipe + close.
const { chromium } = require('playwright');
const ok = [], bad = []; const check = (c, m) => (c ? ok : bad).push(m);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: false }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/out/the27s/room/index.html'); await p.waitForFunction(() => window.HEX && window.HEX.ok);
  await p.waitForTimeout(2000); await p.evaluate(() => window.HEX.enterRoom()); await p.waitForTimeout(2500);
  const L = await p.evaluate(() => { const r = document.getElementById('hexTabs'); const j = document.getElementById('hexNav').getBoundingClientRect();
    return { tabs: r ? [...r.children].map(x => x.textContent) : null, joyRight: innerWidth - j.right, joyLeft: j.left, spinBtn: document.getElementById('hexSpin') ? getComputedStyle(document.getElementById('hexSpin')).display : 'none' }; });
  check(L.tabs && L.tabs.join('|') === 'Play|Fan board|Clips|Photos|Leaderboard|360', 'tabs: ' + (L.tabs || []).join(' · '));
  check(L.joyRight < 40 && L.joyLeft > 200, 'joystick bottom-right on a phone (' + Math.round(L.joyRight) + ' px from the edge)');
  check(L.spinBtn === 'none', 'the separate 360 button folds into the 360 tab');
  await p.screenshot({ path: 'shots/t70-arrive.png' });
  const aim = async (k, label, shot) => {
    await p.evaluate(t => [...document.querySelectorAll('#hexTabs button')].find(x => x.textContent === t).click(), label);
    await p.waitForTimeout(2600);
    const r = await p.evaluate(k => { const C = window.HEXCORE, T = window.THREE, H = window.HEX;
      let o = k === 'clips' ? C.TILES.video[2] : k === 'photos' ? C.TILES.photo[2] : C.boardByKind(k).mesh;
      const w = new T.Vector3(); o.getWorldPosition(w); const v = w.project(H.cam);
      return { x: +v.x.toFixed(2), y: +v.y.toFixed(2), front: v.z < 1, on: document.querySelector('#hexTabs button.on') && document.querySelector('#hexTabs button.on').textContent }; }, k);
    await p.screenshot({ path: 'shots/t70-' + shot + '.png' });
    check(r.front && Math.abs(r.x) < .35 && Math.abs(r.y) < .6 && r.on === label, `"${label}" → glides there, facing it (${r.x}, ${r.y})`);
  };
  await aim('game', 'Play', 'tv'); await aim('chat', 'Fan board', 'fan'); await aim('clips', 'Clips', 'clips');
  await aim('leader', 'Leaderboard', 'board'); await aim('photos', 'Photos', 'photos');
  // photos: tap the middle photo → swipeable gallery
  await p.mouse.click(195, 422); await p.waitForTimeout(900);
  const g = await p.evaluate(() => { const R = document.getElementById('hexReel'); return { on: R && R.classList.contains('on'), imgs: R ? R.querySelectorAll('img.ph').length : 0, count: R && R.querySelector('.mt s') && [...R.querySelectorAll('.mt s')].map(s => s.textContent)[0], sleep: !!window.HEXSLEEP }; });
  check(g.on && g.imgs === 5 && g.sleep, 'tap a photo → all 5 photos, full screen, room asleep');
  await p.screenshot({ path: 'shots/t70-gallery.png' });
  await p.evaluate(() => { const s = document.querySelector('#hexReel .rs'); s.scrollTop = s.clientHeight * 3; }); await p.waitForTimeout(500);
  check(await p.evaluate(() => Math.round(document.querySelector('#hexReel .rs').scrollTop / document.querySelector('#hexReel .rs').clientHeight) === 3), 'swipes to another photo');
  await p.click('#hexReel .x'); await p.waitForTimeout(400);
  check(await p.evaluate(() => !document.getElementById('hexReel').classList.contains('on') && !window.HEXSLEEP), '✕ closes it, room awake, you stay where you were');
  await p.mouse.click(195, 422); await p.waitForTimeout(800);
  await p.mouse.click(195, 60); await p.waitForTimeout(400);   // tap the dark above the photo
  check(await p.evaluate(() => !document.getElementById('hexReel').classList.contains('on')), 'tapping the dark around a photo also closes it');
  // spin tab
  await p.evaluate(() => [...document.querySelectorAll('#hexTabs button')].find(x => x.textContent === '360').click()); await p.waitForTimeout(800);
  const sp = await p.evaluate(() => ({ spin: document.body.classList.contains('hexspinning'), tabs: getComputedStyle(document.getElementById('hexTabs')).visibility, stop: getComputedStyle(document.getElementById('hexSpin')).display }));
  check(sp.spin && sp.tabs === 'hidden' && sp.stop !== 'none', '360 tab spins the room; only STOP shows');
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  ok.forEach(m => console.log('PASS', m)); bad.forEach(m => console.log('FAIL', m)); console.log(`\n${ok.length}/${ok.length + bad.length}`);
})();
