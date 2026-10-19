// t72 — v36 Windows & Sets. Builds a set in the set editor, locks it, flies it into wall 3's
// window, checks the opening and the parallax, bakes, reopens the bake, and splits it to a folder.
//   node tests/t72-windows-sets.js     (server on :8765 serving /home/claude/hex)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ok = [], bad = [];
const check = (c, m) => (c ? ok : bad).push(m);
const A = f => path.join(__dirname, '..', 'setassets', f);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=event');
  await p.waitForFunction(() => window.HEX && window.HEX.ok && document.querySelector('#stg .stsec'));
  await p.waitForTimeout(1500);
  const choose = async (clickFn, file) => {
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), clickFn()]);
    await fc.setFiles(file); await p.waitForTimeout(900);
  };
  const openSec = async t => p.evaluate(t => { const h = [...document.querySelectorAll('#stg .stsec>h4')].find(x => x.textContent.indexOf(t) >= 0);
    if (h && h.parentNode.classList.contains('closed')) h.click(); }, t);
  const rowBtn = (label) => p.evaluate(l => { const r = [...document.querySelectorAll('#stg .strow')].find(x => (x.querySelector('.nm b') || {}).textContent === l);
    r.querySelector('button.add').click(); }, label);
  const btn = t => p.evaluate(t => { const x = [...document.querySelectorAll('#stg button')].find(x => x.textContent.trim() === t); x.click(); }, t);

  // 1 · wall art with a see-through hole on wall 3
  await choose(() => rowBtn('Wall 3 · ENTRY'), A('wall-window.png'));
  // 2 · Windows & sets → new set → editor
  await openSec('Windows & sets');
  await btn('+ new set'); await p.waitForTimeout(800);
  const ed = await p.evaluate(() => ({ on: document.body.classList.contains('stsetedit'), head: (document.querySelector('.stsethead') || {}).textContent || '' }));
  check(ed.on && /SET EDITOR/.test(ed.head), 'new set opens the set editor, room hidden');
  await choose(() => rowBtn('Floor'), A('floor.jpg'));
  await choose(() => rowBtn('Middle ground'), A('middle.png'));
  await choose(() => rowBtn('Background'), A('back.jpg'));
  await choose(() => btn('+ model (.glb)'), A('model.glb'));
  await btn('+ bulb'); await p.waitForTimeout(400);
  await p.waitForTimeout(1500);
  const sc = await p.evaluate(() => { const g = window.HEX.scene.children.find(o => o.userData.isSet); if (!g) return null;
    let lights = 0, meshes = 0; g.traverse(o => { if (o.isLight) lights++; if (o.isMesh) meshes++; });
    return { y: g.position.y, lights, meshes, dims: g.userData.dims }; });
  check(sc && sc.y === -500, 'set built on its own stage, away from the room');
  check(sc && sc.lights === 2, 'set has its 2 lights (spot + bulb) — got ' + (sc && sc.lights));
  const nLights = await p.evaluate(() => [...document.querySelectorAll('#stg button')].some(x => x.textContent === '+ spot'));
  await btn('+ spot'); await p.waitForTimeout(300);
  const capped = await p.evaluate(() => ![...document.querySelectorAll('#stg button')].some(x => x.textContent === '+ spot'));
  check(nLights && capped, 'lights cap at 3 — the add buttons go away');
  await p.screenshot({ path: 'shots/t72-editor.png' });
  // sway shows depth: two frames from two camera positions differ
  const camX = await p.evaluate(async () => { const a = window.HEX.cam.position.x; await new Promise(r => setTimeout(r, 900)); return [a, window.HEX.cam.position.x]; });
  check(Math.abs(camX[0] - camX[1]) > .05, 'editor camera sways to show the depth');
  await btn('done & lock'); await p.waitForTimeout(800);
  const ex = await p.evaluate(() => ({ on: document.body.classList.contains('stsetedit'), set: !!window.HEX.scene.children.find(o => o.userData.isSet && o.position.y < -100) }));
  check(!ex.on && !ex.set, 'done & lock returns to the room and clears the stage');
  // 3 · fly it into wall 3's window
  await openSec('Windows & sets');
  await p.evaluate(() => { const f = [...document.querySelectorAll('#stg .stf')].find(x => (x.querySelector('label') || {}).textContent === 'Wall 3 window');
    [...f.querySelectorAll('button')].find(x => x.textContent === 'on').click(); });
  await p.waitForTimeout(1500);
  const win = await p.evaluate(() => { const H = window.HEX, m = H.walls[3];
    const sets = H.scene.children.filter(o => o.userData.isSet);
    const hint = [...document.querySelectorAll('#stg .sthint')].map(x => x.textContent).find(t => /Opening found|No opening|Add wall art/.test(t));
    const sel = [...document.querySelectorAll('#stg select')].map(s => s.options[s.selectedIndex] && s.options[s.selectedIndex].textContent);
    const T = window.THREE, wp = new T.Vector3(), gp = new T.Vector3(); m.getWorldPosition(wp); sets[0] && sets[0].getWorldPosition(gp);
    return { cut: m.material.alphaTest, n: sets.length, hint, sel, behind: sets[0] ? Math.hypot(gp.x, gp.z) - Math.hypot(wp.x, wp.z) : null }; });
  check(win.cut === .5, 'wall 3 drops its see-through pixels (alphaTest ' + win.cut + ')');
  check(win.n === 1, 'one set sits in the room');
  check(win.behind !== null && win.behind > -0.05, 'the set sits behind the wall, outside the room');
  check(/Opening found/.test(win.hint || ''), 'builder finds the opening: ' + win.hint);
  check(win.sel.some(t => /set 1 🔒/.test(t || '')), 'window picks the locked set');
  // face wall 3 from two spots: the set's floor moves against the wall → parallax
  const look = async (x) => { await p.evaluate(x => { const N = window.HEXCORE.NAV; N.pos.x = x; N.pos.z = 0; N.pos.init = true; window.HEX.setYaw(Math.PI); }, x); await p.waitForTimeout(700); };
  const proj = () => p.evaluate(() => { const T = window.THREE, H = window.HEX; H.cam.updateMatrixWorld();
    const g = H.scene.children.find(o => o.userData.isSet); const d = g.userData.dims;
    const deep = g.localToWorld(new T.Vector3(0, 0, -d.D)).project(H.cam), edge = H.walls[3].localToWorld(new T.Vector3(0, 0, 0)).project(H.cam);
    return deep.x - edge.x; });
  await p.evaluate(() => { document.getElementById('stg').classList.remove('open'); });
  await look(-2); const a1 = await proj(); await p.screenshot({ path: 'shots/t72-window-left.png' });
  await look(2); const a2 = await proj(); await p.screenshot({ path: 'shots/t72-window-right.png' });
  await look(0); await p.screenshot({ path: 'shots/t72-window-centre.png' });
  check(Math.abs(a1 - a2) > .02, 'parallax: the back of the set shifts against the wall as you move (' + (a1 - a2).toFixed(3) + ')');
  await p.evaluate(() => { document.getElementById('stg').classList.add('open'); });

  // 4 · project round trip keeps sets + windows
  const ser = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('hexstage', 1); q.onsuccess = () => {
    const t = q.result.transaction('kv', 'readonly').objectStore('kv').get('auto'); t.onsuccess = () => r(t.result); }; }));
  await p.waitForTimeout(900);
  const ser2 = await p.evaluate(() => new Promise(r => { const q = indexedDB.open('hexstage', 1); q.onsuccess = () => {
    const t = q.result.transaction('kv', 'readonly').objectStore('kv').get('auto'); t.onsuccess = () => r(t.result); }; }));
  check(ser2 && ser2.sets && ser2.sets.length === 1 && ser2.sets[0].locked && ser2.windows.wall3.on, 'autosave carries the set and the window');
  check(ser2 && Object.keys(ser2.assets).length >= 5, 'autosave keeps every set file (' + (ser2 ? Object.keys(ser2.assets).length : 0) + ' assets)');

  // reload the builder: autosave brings the window back
  await p.reload(); await p.waitForFunction(() => window.HEX && window.HEX.ok && document.querySelector('#stg .stsec'));
  await p.waitForTimeout(3000);
  const back = await p.evaluate(() => ({ n: window.HEX.scene.children.filter(o => o.userData.isSet).length, cut: window.HEX.walls[3].material.alphaTest }));
  check(back.n === 1 && back.cut === .5, 'reload: window and set come back from autosave');

  // 5 · bake
  const [dlv] = await Promise.all([p.waitForEvent('download'), btn('bake .html')]);
  const bp = path.join(__dirname, '..', 'out', 't72-baked.html'); await dlv.saveAs(bp);
  const html = fs.readFileSync(bp, 'utf8');
  const bake = JSON.parse(html.match(/window\.HEXBAKE=(\{.*?\});<\/script>/s)[1].replace(/\\u003c/g, '<'));
  check(bake.windows && bake.windows.wall3 && bake.windows.wall3.rect.length === 4, 'bake carries the window and its opening');
  check(bake.sets && bake.sets.length === 1 && bake.sets[0].models.length === 1, 'bake carries the set with its model');
  check(/^data:image\/(webp|png)/.test(bake.surfaces.wall3 || ''), 'window wall bakes with see-through pixels (' + (bake.surfaces.wall3 || '').slice(0, 16) + ')');
  check(!/supabase/i.test(html), 'no database anything in the room');
  const pb = await b.newPage({ viewport: { width: 420, height: 860 } }); const e2 = []; pb.on('pageerror', e => e2.push(String(e)));
  await pb.goto('http://127.0.0.1:8765/out/t72-baked.html'); await pb.waitForFunction(() => window.HEX && window.HEX.ok);
  await pb.waitForTimeout(2500); await pb.evaluate(() => window.HEX.enterRoom && window.HEX.enterRoom()); await pb.waitForTimeout(1500);
  const pr = await pb.evaluate(() => ({ n: (window.HEXCORE.WINSETS || []).length, cut: window.HEX.walls[3].material.alphaTest,
    model: (() => { let k = 0; (window.HEXCORE.WINSETS || []).forEach(g => g.traverse(o => { if (o.userData.propId === 'set:' + 'x') k++; if (o.userData.isProp) k++; })); return k; })() }));
  check(pr.n === 1 && pr.cut === .5, 'published room: set behind the window');
  check(pr.model > 0, 'published room: the model stands in the set');
  await pb.evaluate(() => window.HEX.setYaw(Math.PI)); await pb.waitForTimeout(800);
  await pb.screenshot({ path: 'shots/t72-published-phone.png' });
  check(e2.length === 0, 'published room: no errors' + (e2.length ? ': ' + e2[0] : ''));
  // 6 · reopen the bake in the builder
  await choose(() => btn('open project or baked room…'), bp); await p.waitForTimeout(2500);
  const ro = await p.evaluate(() => ({ n: window.HEX.scene.children.filter(o => o.userData.isSet).length }));
  check(ro.n === 1, 'a baked room reopens with its window and set');
  // 7 · split into a folder
  const outDir = path.join(__dirname, '..', 'out', 't72-folder');
  fs.rmSync(outDir, { recursive: true, force: true });
  console.log(execSync(`python3 tools/split_room.py ${bp} ${outDir}`, { cwd: path.join(__dirname, '..') }).toString());
  const pf = await b.newPage({ viewport: { width: 420, height: 860 } }); const e3 = []; pf.on('pageerror', e => e3.push(String(e)));
  await pf.goto('http://127.0.0.1:8765/out/t72-folder/index.html'); await pf.waitForFunction(() => window.HEX && window.HEX.ok);
  await pf.waitForTimeout(3500);
  const fr = await pf.evaluate(() => { let k = 0; (window.HEXCORE.WINSETS || []).forEach(g => g.traverse(o => { if (o.userData.isProp) k++; })); return { n: (window.HEXCORE.WINSETS || []).length, k }; });
  check(fr.n === 1 && fr.k > 0, 'folder room: set + model load from media/');
  check(e3.length === 0, 'folder room: no errors' + (e3.length ? ': ' + e3[0] : ''));
  check(errs.length === 0, 'builder: no page errors' + (errs.length ? ': ' + errs[0] : ''));
  await b.close();
  ok.forEach(m => console.log('PASS', m)); bad.forEach(m => console.log('FAIL', m));
  console.log(`\n${ok.length}/${ok.length + bad.length}`); process.exit(bad.length ? 1 : 0);
})();
