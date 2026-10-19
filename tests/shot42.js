const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1280,height:800}});
  await p.goto('http://127.0.0.1:8765/dist/trio-builder-admin.html?space=mood',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.HEX&&window.HEX.ok&&document.querySelector('#stg .stsec')); await p.waitForTimeout(1500);
  for(const t of ['room','media','light']){ await p.evaluate(t=>{ const b=document.querySelector('#stgRail button[data-tab="'+t+'"]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); },t);
    await p.waitForTimeout(500); await p.screenshot({path:'/mnt/user-data/outputs/v42-mood-'+t+'.png'}); }
  await b.close(); })();
