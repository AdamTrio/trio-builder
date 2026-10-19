const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=event'); await p.waitForFunction(() => window.HEX && window.HEX.ok); await p.waitForTimeout(3500);
  const r = await p.evaluate(async () => { const F = window.HEXFX, out = { fresh: F.activeCount() };
    for (const k of Object.keys(F.PRESETS)) { const c = F.newCfg(); c.preset = k; Object.assign(c.on, F.PRESETS[k].on || {}); if (F.PRESETS[k].sky) c.sky = F.PRESETS[k].sky; F.apply(c); await new Promise(r => setTimeout(r, 300)); out[k] = F.activeCount(); }
    return out; });
  console.log('event space fx:', JSON.stringify(r), 'errors', errs.length, errs.slice(0,2)); await b.close(); })();
