// quick smoke: room build is a box with no Romy bytes; screenshots of v30 vs v33 hexagon
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const shot = async (path, out) => { const p = await b.newPage({ viewport: { width: 1000, height: 640 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto('http://127.0.0.1:8765/' + path); await p.waitForFunction(() => window.HEX && window.HEX.ok);
    await p.waitForTimeout(2500);
    const info = await p.evaluate(() => { try { const s = document.getElementById('stg'); if (s) s.classList.remove('open');
      window.HEXCORE && window.HEXCORE.showWallTags && window.HEXCORE.showWallTags(false); } catch (e) {}
      const sp = document.getElementById('splash'); if (sp) sp.style.display = 'none';
      return { shape: HEX.ROOM ? HEX.ROOM.shape : 'hex', walls: HEX.walls.length }; });
    await p.waitForTimeout(600); if (out) await p.screenshot({ path: out }); await p.close();
    console.log(path, JSON.stringify(info), 'errors', errs.length); };
  await shot('base/eventspace-src-stage30.html?stage=0', 'shots/hex-v30.png');
  await shot('dist/eventspace-src-staged.html?stage=0', 'shots/hex-v33.png');
  await shot('dist/trio-room-builder.html', 'shots/room-public.png');
  await b.close();
})();
