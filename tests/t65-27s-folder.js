// t65 — The 27s: the folder room looks the same as the single-file bake, loads everything, 0 404s; hosted checks.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const shoot = async (url, tag) => {
    const p = await b.newPage({ viewport: { width: 420, height: 860 } }); const errs = [], bad = [];
    p.on('pageerror', e => errs.push(String(e))); p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().split('/').pop()); });
    await p.goto(url); await p.waitForFunction(() => window.HEX && window.HEX.ok); await p.waitForTimeout(2000);
    await p.evaluate(() => window.HEX.enterRoom && window.HEX.enterRoom()); await p.waitForTimeout(6000);
    const info = await p.evaluate(() => { let meshes = 0, glb = 0; window.HEX.scene.traverse(o => { if (o.isMesh) meshes++; if (o.userData && o.userData.prop) glb++; });
      const vids = window.HEXCORE.allVideos(window.HEXCORE.TILES)().map(r => r.video.readyState);
      const walls = window.HEX.walls.map(w => !!(w.material.map && w.material.map.image && (w.material.map.image.width || w.material.map.image.videoWidth)));
      return { meshes, walls, vids, title: document.title }; });
    for (const [i, yaw] of [[0, 0], [1, Math.PI], [2, Math.PI / 2], [3, -Math.PI / 2]]) { await p.evaluate(y => window.HEX.setYaw(y), yaw); await p.waitForTimeout(700); await p.screenshot({ path: `shots/t65-${tag}-${i}.png` }); }
    await p.close(); return { ...info, errs, bad };
  };
  const a = await shoot('http://127.0.0.1:8765/testroom/the-27s-baked.html', 'single');
  const f = await shoot('http://127.0.0.1:8765/out/the27s/room/index.html', 'folder');
  console.log('single:', JSON.stringify(a)); console.log('folder:', JSON.stringify(f));
  await b.close();
})();
