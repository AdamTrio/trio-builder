const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=event');
  await p.waitForFunction(() => window.HEX && window.HEX.ok); await p.waitForTimeout(4000);
  const info = await p.evaluate(() => { const C = window.HEXCORE, H = window.HEX;
    const r = C.boardByKind('game'); const bn = H.banners.map(x => [x.position.x, x.position.y, x.position.z]);
    return { game: r ? { wall: r.wall, pos: r.mesh.position.toArray(), w: r.mesh.geometry.parameters } : null, bn,
      cam: H.cam.position.toArray(), stg: !!document.getElementById('stg') }; });
  console.log(JSON.stringify(info));
  const place = async (y, inset, out) => {
    await p.evaluate(([y, inset]) => { const C = window.HEXCORE, H = window.HEX, T = window.THREE;
      try { document.getElementById('stg').classList.remove('open'); C.showWallTags && C.showWallTags(false); } catch (e) {}
      const r = C.boardByKind('game'); const RM = C.room(H);
      r.mesh.position.copy(RM.wallPoint(0, 0, y, inset)); r.mesh.lookAt(0, y, 0); r.mesh.scale.setScalar(window.__S||1);
    }, [y, inset]);
    await p.waitForTimeout(700); await p.screenshot({ path: out });
  };
  await p.evaluate(()=>window.__S=1.5); await place(5.75, 1.3, 'shots/mock-marquee-A.png');
  await p.evaluate(()=>window.__S=1.45); await place(4.75, 0.4, 'shots/mock-marquee-B.png');
  await b.close();
})();
