const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  for (const f of ['ref/trio-builder-admin-v33.html','dist/trio-builder-admin.html']) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.goto('http://127.0.0.1:8765/' + f + '?space=event'); await p.waitForFunction(() => window.HEX && window.HEX.ok); await p.waitForTimeout(3000);
    const r = await p.evaluate(() => ({ heads: [...document.querySelectorAll('#stg .sthead, #stg h3, #stg .sect > b, #stg summary')].map(x => x.textContent.trim()).slice(0, 30),
      vibe: /Vibe/.test(document.getElementById('stg').textContent), hang: /hang above the front wall/.test(document.getElementById('stg').textContent) }));
    console.log(f, JSON.stringify(r)); await p.close(); }
  await b.close(); })();
