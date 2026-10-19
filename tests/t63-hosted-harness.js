// t63 — the room inside a Trio page: the addendum §9 checks, in a parent-frame harness.
const { chromium } = require('playwright');
const ok = [], bad = []; const check = (c, m) => (c ? ok : bad).push(m);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 420, height: 860 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e))); let dialog = false; p.on('dialog', d => { dialog = true; d.dismiss(); });
  await p.goto('http://127.0.0.1:8765/testroom/harness.html');
  const fr = () => p.frames().find(f => /testroom\/index\.html/.test(f.url()));
  await p.waitForFunction(() => LOG.some(m => m.trio === 'ready'), null, { timeout: 15000 }).catch(() => {});
  const rd = await p.evaluate(() => { const r = LOG.find(m => m.trio === 'ready'); return r ? r.at - T0 : null; });
  check(rd !== null, 'ready sent (' + (rd ? (rd / 1000).toFixed(1) + ' s after the frame started loading' : 'never') + ')');
  const f = fr(); await f.waitForFunction(() => window.HEX && window.HEX.ok);
  await p.waitForTimeout(1200);
  const st = await f.evaluate(() => ({ hosted: window.HEXCORE.HOSTED, splash: getComputedStyle(document.getElementById('splash')).display,
    song: document.getElementById('track').getAttribute('src'), chip: getComputedStyle(document.getElementById('evchip')).display }));
  check(st.hosted, 'room knows it is inside a page');
  check(st.splash === 'none', 'no splash in hosted mode');
  check(!st.song, 'room carries no audio of its own');
  check(st.chip === 'none', 'top-left corner clear (event chip hidden)');
  const frames = () => f.evaluate(async () => { let n = 0; window.HEX.onFrame.push(() => n++); await new Promise(r => setTimeout(r, 1000)); return n; });
  const f0 = await frames();
  await p.evaluate(() => send({ trio: 'cover' })); await p.waitForTimeout(200);
  const f1 = await frames();
  const vp = await f.evaluate(() => window.HEXCORE.allVideos(window.HEXCORE.TILES)().every(r => r.video.paused));
  check(f0 > 0 && f1 === 0, 'cover → frames stop (' + f0 + ' → ' + f1 + '/s)');
  check(vp, 'cover → wall videos paused');
  await p.evaluate(() => send({ trio: 'uncover' })); await p.waitForTimeout(200);
  const f2 = await frames(); check(f2 > 0, 'uncover → moving again (' + f2 + '/s)');
  // levels
  await p.evaluate(() => { window._lv = setInterval(() => send({ trio: 'levels', b: Math.random(), m: Math.random(), t: Math.random() }), 33); });
  await p.waitForTimeout(600);
  check(await f.evaluate(() => typeof window.HEXFX.feed === 'function'), 'levels accepted by the visualizers');
  await p.evaluate(() => clearInterval(window._lv));
  // rows in — hostile names render as text
  await p.evaluate(() => { send({ trio: 'board', rows: [{ rank: 1, name: 'Zed', score: 4210, you: false }, { rank: 2, name: '<img src=x onerror=alert(1)>', score: 3000, you: true }] });
    send({ trio: 'chat', rows: [{ name: '<img src=x onerror=alert(1)>', txt: 'first!', you: false }, { name: 'Adam', txt: 'tech run', you: true }] }); });
  await p.waitForTimeout(800);
  const inj = await f.evaluate(() => document.querySelectorAll('img[src="x"]').length);
  check(inj === 0 && !dialog, 'hostile names drawn as text — no element, no alert');
  // taps out
  const tapBoard = async (kind) => {
    const pt = await f.evaluate(k => { const T = window.THREE, H = window.HEX, r = window.HEXCORE.boardByKind(k); const w = new T.Vector3(); r.mesh.getWorldPosition(w);
      let best = null; for (let a = -Math.PI; a < Math.PI; a += 0.01) { H.cam.rotation.set(0, 0, 0); H.cam.rotateY(-a); H.cam.updateMatrixWorld();
        const v = w.clone().project(H.cam); if (v.z < 1 && (!best || Math.abs(v.x) < Math.abs(best.x))) best = { a, x: v.x }; } H.setYaw(best.a); return best; }, kind);
    await p.waitForTimeout(700);
    const sp = await f.evaluate(k => { const H = window.HEX, T = window.THREE, r = window.HEXCORE.boardByKind(k); const w = new T.Vector3(); r.mesh.getWorldPosition(w);
      const v = w.project(H.cam); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; }, kind);
    await p.evaluate(() => LOG.length = 0);
    await p.mouse.click(sp.x, sp.y); await p.waitForTimeout(400);
    return p.evaluate(() => LOG.filter(m => m.trio === 'open').map(m => m.board));
  };
  const g = await tapBoard('game'); check(g.length === 1 && g[0] === 'game', 'tap the game sign → {open, board:game}');
  const gs = await f.evaluate(() => document.getElementById('groom').classList.contains('open'));
  check(!gs, '…and the room does NOT open the game itself');
  await p.screenshot({ path: 'shots/t63-game-wall.png' });
  const c = await tapBoard('chat'); check(c.length === 1 && c[0] === 'chat', 'tap the chat board → {open, board:chat}');
  await p.screenshot({ path: 'shots/t63-chat-wall.png' });
  const l = await tapBoard('leader'); check(l.length === 1 && l[0] === 'game', 'tap the live board → {open, board:game}');
  await p.screenshot({ path: 'shots/t63-leader-wall.png' });
  const db = await f.evaluate(() => /supabase|lobby_|apikey/i.test(document.documentElement.outerHTML));
  check(!db, 'no database address, key or table name anywhere in the room');
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  ok.forEach(m => console.log('PASS', m)); bad.forEach(m => console.log('FAIL', m)); console.log(`\n${ok.length}/${ok.length + bad.length}`);
})();
