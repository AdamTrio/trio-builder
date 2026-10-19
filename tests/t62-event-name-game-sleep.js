// t62 — Event name replaces the Romy words at publish (blank = unchanged); the room sleeps while the game is up.
const { chromium } = require('playwright'); const fs = require('fs');
const ok = [], bad = []; const check = (c, m) => (c ? ok : bad).push(m);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=event');
  await p.waitForFunction(() => window.HEX && window.HEX.ok); await p.waitForTimeout(3500);
  const bake = async () => { const [dl] = await Promise.all([p.waitForEvent('download'),
    p.evaluate(() => [...document.querySelectorAll('button')].find(x => /bake \.html/.test(x.textContent)).click())]);
    const f = 'testroom/t62.html'; await dl.saveAs(f); return fs.readFileSync(f, 'utf8'); };
  // blank name → Romy words untouched
  let h = await bake();
  check(/DEATH BY ROMY Event Night/.test(h) && /welcome to the DEATH BY ROMY event/.test(h) && /orion-attacks-triogames/.test(h), 'blank event name: publishes the Romy words exactly as before');
  // name it
  await p.evaluate(() => { const lab = [...document.querySelectorAll('#stg label')].find(l => l.textContent === 'Event name');
    const i = lab.parentNode.querySelector('input'); i.value = 'The 27s'; i.dispatchEvent(new Event('change')); });
  await p.evaluate(()=>{ const h=[...document.querySelectorAll('#stg .stsec>h4')].find(x=>x.textContent.indexOf('Game wall')>=0); if(h) h.click(); }); await p.waitForTimeout(200);
  await p.locator('button', { hasText: 'hang above the front wall' }).first().click(); await p.waitForTimeout(600);
  h = await bake();
  const romyLeft = (h.match(/DEATH BY ROMY|Death By Romy|orion attacks|Orion Attacks/g) || []);
  check(/<title>The 27s — live on Trio<\/title>/.test(h), 'tab title = The 27s — live on Trio');
  check(/og:title" content="The 27s — live on Trio"/.test(h), 'link preview = The 27s — live on Trio');
  check(/play soundwave survival · climb the board · music on/.test(h), 'splash line names the real game');
  check(/Soundwave Survival · The 27s/.test(h), 'game bar = Soundwave Survival · The 27s');
  check(/welcome to The 27s/.test(h), 'welcome line = welcome to The 27s');
  check(/const GAME_URL='https:\/\/sws-triogames/.test(h), 'the on-screen Play button opens the marquee\'s game');
  console.log('   Romy words still in the file:', romyLeft.length, [...new Set(romyLeft)].join(', '));
  // game sleep, in the published room
  const q = await ctx.newPage(); q.on('pageerror', e => errs.push('baked: ' + e));
  await q.goto('http://127.0.0.1:8765/testroom/t62.html'); await q.waitForFunction(() => window.HEX && window.HEX.ok); await q.waitForTimeout(1500);
  await q.evaluate(() => window.HEX.enterRoom()); await q.waitForTimeout(1200);
  const count = () => q.evaluate(async () => { let n = 0; window.HEX.onFrame.push(() => n++); await new Promise(r => setTimeout(r, 1000)); return n; });
  const f0 = await count();
  await q.evaluate(() => window.HEX.openGame('about:blank', 'Soundwave Survival')); await q.waitForTimeout(300);
  const f1 = await count();
  check(f0 > 0 && f1 === 0, 'game open → room draws nothing (' + f0 + ' → ' + f1 + ' frames/s)');
  await q.evaluate(() => { const au = document.getElementById('track'); au.play = () => Promise.resolve(); Object.defineProperty(au, 'paused', { value: false, configurable: true }); });
  await q.evaluate(() => window.postMessage({ trio: 'audio', state: 'game' }, '*')); await q.waitForTimeout(200);
  check(await q.evaluate(() => window._gameTookAudio === true), 'game says it brings its own track → room song steps aside');
  await q.evaluate(() => window.postMessage({ trio: 'exit' }, '*')); await q.waitForTimeout(400);
  const f2 = await count();
  check(f2 > 0 && !(await q.evaluate(() => window.HEXSLEEP)), 'game exit → room awake again (' + f2 + ' frames/s)');
  check(await q.evaluate(() => window._gameTookAudio === false), '…and the room song comes back');
  await q.evaluate(() => document.getElementById('play').click()); await q.waitForTimeout(300);
  check(await q.evaluate(() => window.HEXSLEEP === true), 'on-screen Play button also sleeps the room');
  await q.evaluate(() => document.getElementById('back').click()); await q.waitForTimeout(300);
  check(await q.evaluate(() => !window.HEXSLEEP), '"back to the room" wakes it');
  check(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  ok.forEach(m => console.log('PASS', m)); bad.forEach(m => console.log('FAIL', m)); console.log(`\n${ok.length}/${ok.length + bad.length}`);
})();
